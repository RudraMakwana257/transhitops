import os
import re
import time
import uuid
import logging
from datetime import date, timedelta
from flask import g

from app import db
from app.models.vehicle import Vehicle
from app.models.driver import Driver
from app.models.trip import Trip
from app.models.maintenance_log import MaintenanceLog
from app.services.ai.intent_classifier import classify_intent, IntentResult, Intent
from app.services.ai.context_service import ContextService
from app.services.ai.prompt_builder import (
    build_system_prompt as pb_build_system_prompt,
    format_history_layer as pb_format_history_layer
)
from app.services.ai.memory.memory_manager import MemoryManager
from app.services.ai.memory.token_manager import TokenManager
from app.services.ai.performance.metrics_collector import (
    AIMetricsCollector,
    RequestMetrics
)
from app.services.ai.agent.agent_runtime import AgentRuntime
from app.services.ai.agent.execution_engine import AgentExecutionResult

logger = logging.getLogger(__name__)

# Global Services
memory_manager = MemoryManager()
metrics_collector = AIMetricsCollector()

# ponytail: in-memory rate limiter, replace with Redis if multi-process
_rate_store: dict[str, list[float]] = {}

def check_rate_limit(key: str, max_requests: int = 20, window_seconds: int = 60) -> bool:
    now = time.time()
    window_start = now - window_seconds
    if key not in _rate_store:
        _rate_store[key] = []
    _rate_store[key] = [t for t in _rate_store[key] if t > window_start]
    if len(_rate_store[key]) >= max_requests:
        return False
    _rate_store[key].append(now)
    return True

PROMPT_INJECTION_PATTERNS = [
    r'(?i)(?<!\w)(ignore|disregard|forget|override|bypass)\s+(all\s+)?(previous|above|system|instructions|directives)',
    r'(?i)system\s*(prompt|message|instruction|directive)',
    r'(?i)you\s+are\s+(now|free|not\s+bound|released)',
    r'(?i)(reveal|show|print|output|display|leak|dump)\s+(your\s+)?(system|instructions|prompt|directives|rules)',
    r'(?i)act\s+as\s+(if\s+you\s+are|though\s+you\s+are)',
    r'(?i)role.?play|roleplay',
    r'(?i)developer\s+mode|debug\s+mode|admin\s+mode',
    r'(?i)how\s+(do|can)\s+(I|you)\s+(delete|drop|remove|modify|change|update)\s+(all|any|the)\s+(data|records|vehicles|drivers|trips)',
    r'(?i)(password|secret|key|token|credential)s?\s*(for|of|is|:)',
    r'(?i)sql\s*(injection|query|command)',
    r'(?i)how\s+(do|can)\s+(I|you)\s+(hack|exploit|break\s+into|access|bypass)',
    r'(?i)(DROP|DELETE|TRUNCATE|ALTER|UPDATE|INSERT)\s+(TABLE|DATABASE|FROM|INTO)',
]

def contains_injection(text: str) -> tuple[bool, str | None]:
    for pattern in PROMPT_INJECTION_PATTERNS:
        match = re.search(pattern, text)
        if match:
            return True, match.group(0)
    return False, None

def sanitize_output(text: str) -> str:
    text = re.sub(r'<script[^>]*>.*?</script>', '', text, flags=re.DOTALL | re.IGNORECASE)
    text = re.sub(r'<[^>]*on\w+\s*=[^>]*>', '', text, flags=re.DOTALL | re.IGNORECASE)
    return text

def _extract_user_info_from_g() -> dict:
    """Helper: safely extracts framework context into a plain dict for prompt builder."""
    user = getattr(g, 'user', None)
    company = getattr(g, 'company', None)
    claims = getattr(g, 'claims', {}) or {}
    
    user_name = getattr(user, 'name', None) if user else None
    user_id = str(getattr(user, 'id', 'anonymous')) if user else 'anonymous'
    role = getattr(user, 'role', None) or claims.get('role') if user or claims else None
    company_name = getattr(company, 'name', None) if company else None
    company_id = str(getattr(g, 'company_id', 'global'))
    
    return {
        "user_name": user_name,
        "user_id": user_id,
        "role": role,
        "company_name": company_name,
        "company_id": company_id
    }

def get_fleet_context(user_message: str | None = None, history: list[dict] | None = None):
    """
    Backward-compatible context fetcher.
    If user_message is provided, runs intent classification and lazy-loads relevant data.
    If user_message is None, fetches full context.
    """
    company_id = getattr(g, 'company_id', None)
    intent_res = classify_intent(user_message or "", history)
    context, _ = ContextService.get_context_for_intent(intent_res, company_id)
    return context

def build_system_prompt(ctx):
    """
    Backward-compatible build_system_prompt wrapper.
    Extracts user_info from g and delegates to prompt_builder.
    Returns the string prompt for legacy consumers.
    """
    user_info = _extract_user_info_from_g()
    prompt_meta = pb_build_system_prompt(ctx, user_info=user_info)
    return prompt_meta["prompt"]

def get_ai_response(user_message, history=None):
    start_time = time.monotonic()
    request_id = f"req_{uuid.uuid4().hex[:8]}"

    is_injection, matched = contains_injection(user_message)
    if is_injection:
        return "I can only answer fleet-related questions about the data provided."

    userId = getattr(g, 'user', None)
    user_key = str(userId.id) if userId else "global"
    
    if not check_rate_limit(user_key):
        return "Too many requests. Please wait before sending more messages."

    user_info = _extract_user_info_from_g()
    company_id = user_info["company_id"]
    user_id = user_info["user_id"]
    session_id = f"session_{company_id}_{user_id}"

    req_metrics = RequestMetrics(
        request_id=request_id,
        session_id=session_id,
        llm_provider="Groq",
        llm_model="llama-3.3-70b-versatile"
    )

    # 1. Load server-side MemoryContext
    memory_ctx = memory_manager.get_memory_context(
        session_id=session_id,
        company_id=company_id,
        user_id=user_id
    )

    # 2. Stage: Intent Classification
    with metrics_collector.time_stage(req_metrics, "intent"):
        intent_result = classify_intent(user_message, history or memory_ctx.recent_messages)
    req_metrics.intent = intent_result.intent.value

    # 3. Stage: Autonomous Agent Execution via AgentRuntime
    try:
        exec_result: AgentExecutionResult = AgentRuntime.execute(
            message=user_message,
            session_id=session_id,
            company_id=company_id,
            user_id=user_id,
            intent=intent_result.intent.value,
            memory_context=memory_ctx,
            user_info=user_info
        )

        output_text = sanitize_output(exec_result.response)
        
        req_metrics.completion_tokens = exec_result.completion_tokens
        req_metrics.prompt_tokens = exec_result.prompt_tokens
        req_metrics.llm_provider = exec_result.provider
        req_metrics.llm_model = exec_result.model
        req_metrics.response_status = "200_OK"
        req_metrics.total_ms = (time.monotonic() - start_time) * 1000
        
        # Record metrics telemetry
        metrics_collector.record_request(req_metrics)

        # Save completed turn into server-side session memory
        memory_manager.add_turn(
            session_id=session_id,
            user_message=user_message,
            assistant_response=output_text,
            company_id=company_id,
            user_id=user_id,
            tokens_used=exec_result.prompt_tokens
        )

        return output_text
    except Exception as e:
        req_metrics.response_status = "500_INTERNAL_ERROR"
        req_metrics.total_ms = (time.monotonic() - start_time) * 1000
        metrics_collector.record_request(req_metrics)
        logger.error("AI Agent Runtime execution error for intent=%s: %s", intent_result.intent.value, str(e), exc_info=True)
        return "AI assistant is temporarily unavailable. Please try again."
