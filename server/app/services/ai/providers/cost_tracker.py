"""
Cost Tracker Module — Multi-Tenant token and USD cost accounting engine.
"""

import logging
from dataclasses import dataclass, field
from threading import Lock
from typing import Dict, Any, List, Optional

logger = logging.getLogger(__name__)

@dataclass
class CostRecord:
    company_id: str
    user_id: str
    session_id: str
    provider_name: str
    model_name: str
    prompt_tokens: int
    completion_tokens: int
    total_tokens: int
    cost_usd: float


class CostTracker:
    """
    Multi-tenant token usage and USD cost accounting engine.
    Calculates and aggregates usage statistics per tenant, session, user, and model.
    """
    def __init__(self):
        self._records: List[CostRecord] = []
        self._lock = Lock()

    def record(
        self,
        company_id: str,
        user_id: str,
        session_id: str,
        provider_name: str,
        model_name: str,
        prompt_tokens: int,
        completion_tokens: int,
        cost_usd: float
    ) -> None:
        """Records a token usage transaction."""
        rec = CostRecord(
            company_id=str(company_id or "global"),
            user_id=str(user_id or "anonymous"),
            session_id=str(session_id or "default"),
            provider_name=provider_name,
            model_name=model_name,
            prompt_tokens=prompt_tokens,
            completion_tokens=completion_tokens,
            total_tokens=prompt_tokens + completion_tokens,
            cost_usd=round(cost_usd, 6)
        )
        with self._lock:
            self._records.append(rec)

    def summary(self, company_id: Optional[str] = None) -> Dict[str, Any]:
        """Summarizes token usage and costs, optionally filtered by company_id."""
        with self._lock:
            filtered = [r for r in self._records if company_id is None or r.company_id == str(company_id)]
            
            total_reqs = len(filtered)
            prompt_tokens = sum(r.prompt_tokens for r in filtered)
            completion_tokens = sum(r.completion_tokens for r in filtered)
            total_tokens = sum(r.total_tokens for r in filtered)
            total_cost = sum(r.cost_usd for r in filtered)

            return {
                "company_id": company_id or "all",
                "total_requests": total_reqs,
                "prompt_tokens": prompt_tokens,
                "completion_tokens": completion_tokens,
                "total_tokens": total_tokens,
                "total_cost_usd": round(total_cost, 6),
            }
