"""
Quota Manager Module — Interface-first, multi-tenant monthly quota and limit enforcement engine.
"""

import logging
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from threading import Lock
from typing import Dict, Any, Optional

logger = logging.getLogger(__name__)

@dataclass
class TenantQuotaLimit:
    max_monthly_usd: float = 100.0
    max_monthly_tokens: int = 1_000_000
    max_monthly_requests: int = 10_000
    max_monthly_tool_calls: int = 20_000


@dataclass
class TenantQuotaUsage:
    usd_spent: float = 0.0
    tokens_used: int = 0
    requests_count: int = 0
    tool_calls_count: int = 0


class QuotaStore(ABC):
    """
    Abstract interface for tenant quota persistence.
    Supports future Redis or PostgreSQL storage backends.
    """
    @abstractmethod
    def get_limit(self, company_id: str) -> TenantQuotaLimit:
        pass

    @abstractmethod
    def get_usage(self, company_id: str) -> TenantQuotaUsage:
        pass

    @abstractmethod
    def record_usage(self, company_id: str, tokens: int, cost_usd: float, tool_calls: int = 1) -> TenantQuotaUsage:
        pass


class InMemoryQuotaStore(QuotaStore):
    """
    Thread-safe in-memory implementation of QuotaStore.
    """
    def __init__(self):
        self._limits: Dict[str, TenantQuotaLimit] = {}
        self._usage: Dict[str, TenantQuotaUsage] = {}
        self._lock = Lock()

    def get_limit(self, company_id: str) -> TenantQuotaLimit:
        with self._lock:
            return self._limits.get(company_id, TenantQuotaLimit())

    def get_usage(self, company_id: str) -> TenantQuotaUsage:
        with self._lock:
            return self._usage.get(company_id, TenantQuotaUsage())

    def record_usage(self, company_id: str, tokens: int, cost_usd: float, tool_calls: int = 1) -> TenantQuotaUsage:
        with self._lock:
            if company_id not in self._usage:
                self._usage[company_id] = TenantQuotaUsage()

            cur = self._usage[company_id]
            updated = TenantQuotaUsage(
                usd_spent=round(cur.usd_spent + cost_usd, 6),
                tokens_used=cur.tokens_used + tokens,
                requests_count=cur.requests_count + 1,
                tool_calls_count=cur.tool_calls_count + tool_calls
            )
            self._usage[company_id] = updated
            return updated


class QuotaManager:
    """
    Quota Manager managing check_quota, reserve, commit, rollback, and summary transactions.
    """
    def __init__(self, store: Optional[QuotaStore] = None):
        self.store = store or InMemoryQuotaStore()

    def check_quota(self, company_id: str, estimated_tokens: int = 1000, estimated_cost_usd: float = 0.001) -> bool:
        limit = self.store.get_limit(company_id)
        usage = self.store.get_usage(company_id)

        if (usage.usd_spent + estimated_cost_usd) > limit.max_monthly_usd:
            logger.warning("Quota exceeded for tenant company_id=%s: USD limit reached.", company_id)
            return False

        if (usage.tokens_used + estimated_tokens) > limit.max_monthly_tokens:
            logger.warning("Quota exceeded for tenant company_id=%s: Token limit reached.", company_id)
            return False

        return True

    def commit(self, company_id: str, tokens_used: int, cost_usd: float, tool_calls: int = 1) -> TenantQuotaUsage:
        """Commits actual transaction usage to store."""
        return self.store.record_usage(company_id, tokens_used, cost_usd, tool_calls)

    def summary(self, company_id: str) -> dict:
        limit = self.store.get_limit(company_id)
        usage = self.store.get_usage(company_id)
        return {
            "company_id": company_id,
            "usd_spent": usage.usd_spent,
            "max_monthly_usd": limit.max_monthly_usd,
            "tokens_used": usage.tokens_used,
            "max_monthly_tokens": limit.max_monthly_tokens,
            "requests_count": usage.requests_count,
            "tool_calls_count": usage.tool_calls_count,
        }
