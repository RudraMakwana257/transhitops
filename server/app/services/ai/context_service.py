import logging
import time
from datetime import date, timedelta
from typing import Dict, Any, Tuple

from app.services.ai.intent_classifier import Intent, IntentResult
from app.services.ai.tools.registry import execute_tool

logger = logging.getLogger(__name__)

class ContextService:
    """
    Lazy-loading, intent-aware context provider.
    Executes only business tools relevant to the user's detected intent via central ToolRegistry.
    Falls back to full context when intent is GENERAL or confidence is low.
    """

    @staticmethod
    def get_context_for_intent(intent_result: IntentResult, company_id) -> Tuple[Dict[str, Any], int]:
        """
        Builds dynamic context based on IntentResult by executing registered tools.
        Returns tuple: (context_dict, total_db_queries_executed)
        """
        start_time = time.monotonic()
        today = date.today()
        thirty_days_ago = today - timedelta(days=30)
        query_count = 0

        intent = intent_result.intent

        # Section presence map
        fetched_flags = {
            "vehicles": False,
            "drivers": False,
            "trips": False,
            "maintenance": False,
            "analytics": False
        }

        # Empty fallback defaults
        vehicles_ctx = {"total": 0, "available": 0, "on_trip": 0, "in_shop": 0, "utilization_pct": 0}
        drivers_ctx = {"total": 0, "available": 0, "suspended": 0, "licenses_expiring_soon": 0, "licenses_expired": 0}
        trips_ctx = {"active": 0, "draft": 0, "completed_this_month": 0}
        maint_ctx = {"open_jobs": 0}

        if intent == Intent.VEHICLE:
            res = execute_tool("vehicle.summary", company_id=company_id)
            if res.success and res.data:
                vehicles_ctx = res.data
            fetched_flags["vehicles"] = True
            query_count += 1

        elif intent == Intent.DRIVER:
            res = execute_tool("driver.summary", company_id=company_id, today=today)
            if res.success and res.data:
                drivers_ctx = res.data
            fetched_flags["drivers"] = True
            query_count += 2

        elif intent == Intent.TRIP:
            res = execute_tool("trip.summary", company_id=company_id, thirty_days_ago=thirty_days_ago)
            if res.success and res.data:
                trips_ctx = res.data
            fetched_flags["trips"] = True
            query_count += 2

        elif intent == Intent.MAINTENANCE:
            res = execute_tool("maintenance.open", company_id=company_id)
            if res.success and res.data:
                maint_ctx = res.data
            fetched_flags["maintenance"] = True
            query_count += 1

        elif intent == Intent.ANALYTICS:
            v_res = execute_tool("vehicle.summary", company_id=company_id)
            t_res = execute_tool("trip.summary", company_id=company_id, thirty_days_ago=thirty_days_ago)
            m_res = execute_tool("maintenance.open", company_id=company_id)

            if v_res.success and v_res.data: vehicles_ctx = v_res.data
            if t_res.success and t_res.data: trips_ctx = t_res.data
            if m_res.success and m_res.data: maint_ctx = m_res.data

            fetched_flags["vehicles"] = True
            fetched_flags["trips"] = True
            fetched_flags["maintenance"] = True
            fetched_flags["analytics"] = True
            query_count += 4

        else:  # GENERAL or fallback
            v_res = execute_tool("vehicle.summary", company_id=company_id)
            d_res = execute_tool("driver.summary", company_id=company_id, today=today)
            t_res = execute_tool("trip.summary", company_id=company_id, thirty_days_ago=thirty_days_ago)
            m_res = execute_tool("maintenance.open", company_id=company_id)

            if v_res.success and v_res.data: vehicles_ctx = v_res.data
            if d_res.success and d_res.data: drivers_ctx = d_res.data
            if t_res.success and t_res.data: trips_ctx = t_res.data
            if m_res.success and m_res.data: maint_ctx = m_res.data

            fetched_flags["vehicles"] = True
            fetched_flags["drivers"] = True
            fetched_flags["trips"] = True
            fetched_flags["maintenance"] = True
            query_count += 6

        context = {
            "today": today.strftime('%d %B %Y'),
            "vehicles": vehicles_ctx,
            "drivers": drivers_ctx,
            "trips": trips_ctx,
            "maintenance": maint_ctx,
            "intent": intent.value,
            "fetched_flags": fetched_flags
        }

        elapsed_ms = (time.monotonic() - start_time) * 1000
        approx_tokens = len(str(context)) // 4

        logger.info(
            "ai_context_fetched intent=%s confidence=%.2f queries=%d latency_ms=%.2f context_size=%d approx_tokens=%d fallback=%s",
            intent.value,
            intent_result.confidence,
            query_count,
            elapsed_ms,
            len(str(context)),
            approx_tokens,
            "true" if intent == Intent.GENERAL else "false"
        )

        return context, query_count
