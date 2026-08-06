"""
AIMetricsCollector — Stage-by-stage pipeline latency, token usage, cache hit/miss, and PerformanceReport generator.
"""

import time
import logging
from contextlib import contextmanager
from dataclasses import dataclass, field
from typing import Dict, Any, List, Optional

logger = logging.getLogger(__name__)

@dataclass
class PerformanceReport:
    """
    Summarized Performance Report over recorded AI metrics.
    """
    total_requests: int = 0
    cache_hits: int = 0
    cache_misses: int = 0
    cache_hit_rate: float = 0.0
    average_tool_latency_ms: float = 0.0
    average_prompt_latency_ms: float = 0.0
    average_llm_latency_ms: float = 0.0
    average_total_request_latency_ms: float = 0.0

    def to_dict(self) -> dict:
        return {
            "total_requests": self.total_requests,
            "cache_hits": self.cache_hits,
            "cache_misses": self.cache_misses,
            "cache_hit_rate": self.cache_hit_rate,
            "average_tool_latency_ms": self.average_tool_latency_ms,
            "average_prompt_latency_ms": self.average_prompt_latency_ms,
            "average_llm_latency_ms": self.average_llm_latency_ms,
            "average_total_request_latency_ms": self.average_total_request_latency_ms,
        }


@dataclass
class RequestMetrics:
    """
    Granular stage-by-stage metric entry for a single AI request.
    """
    request_id: str
    session_id: str = ""
    intent: str = "GENERAL"
    tool_name: str = ""
    cache_hit: bool = False
    cache_miss: bool = False
    db_query_count: int = 0
    prompt_tokens: int = 0
    completion_tokens: int = 0
    llm_provider: str = "Groq"
    llm_model: str = "llama-3.3-70b-versatile"
    response_status: str = "200_OK"
    
    # Latencies (ms)
    intent_ms: float = 0.0
    tool_ms: float = 0.0
    prompt_ms: float = 0.0
    groq_ms: float = 0.0
    total_ms: float = 0.0

    def to_dict(self) -> dict:
        return {
            "request_id": self.request_id,
            "session_id": self.session_id,
            "intent": self.intent,
            "tool_name": self.tool_name,
            "cache_hit": self.cache_hit,
            "cache_miss": self.cache_miss,
            "db_query_count": self.db_query_count,
            "prompt_tokens": self.prompt_tokens,
            "completion_tokens": self.completion_tokens,
            "llm_provider": self.llm_provider,
            "llm_model": self.llm_model,
            "response_status": self.response_status,
            "intent_ms": round(self.intent_ms, 3),
            "tool_ms": round(self.tool_ms, 3),
            "prompt_ms": round(self.prompt_ms, 3),
            "groq_ms": round(self.groq_ms, 3),
            "total_ms": round(self.total_ms, 3),
        }


class AIMetricsCollector:
    """
    Telemetry and performance metrics collector for the AI execution pipeline.
    """
    def __init__(self):
        self._history: List[RequestMetrics] = []

    @contextmanager
    def time_stage(self, metrics_obj: RequestMetrics, stage_name: str):
        """Context manager timer for measuring stage duration."""
        start = time.monotonic()
        try:
            yield
        finally:
            elapsed_ms = (time.monotonic() - start) * 1000
            if stage_name == "intent":
                metrics_obj.intent_ms = elapsed_ms
            elif stage_name == "tool":
                metrics_obj.tool_ms = elapsed_ms
            elif stage_name == "prompt":
                metrics_obj.prompt_ms = elapsed_ms
            elif stage_name == "groq":
                metrics_obj.groq_ms = elapsed_ms
            elif stage_name == "total":
                metrics_obj.total_ms = elapsed_ms

    def record_request(self, metrics: RequestMetrics) -> None:
        """Stores a request metrics record in collector history."""
        self._history.append(metrics)
        logger.info(
            "ai_metrics_recorded req_id=%s session_id=%s intent=%s cache_hit=%s db_queries=%d prompt_tokens=%d groq_ms=%.2f total_ms=%.2f status=%s",
            metrics.request_id,
            metrics.session_id,
            metrics.intent,
            metrics.cache_hit,
            metrics.db_query_count,
            metrics.prompt_tokens,
            metrics.groq_ms,
            metrics.total_ms,
            metrics.response_status
        )

    def generate_performance_report(self) -> PerformanceReport:
        """Generates a summary PerformanceReport over all collected requests."""
        if not self._history:
            return PerformanceReport()

        total_reqs = len(self._history)
        hits = sum(1 for m in self._history if m.cache_hit)
        misses = sum(1 for m in self._history if m.cache_miss)
        hit_rate = round((hits / total_reqs * 100), 1) if total_reqs > 0 else 0.0

        avg_tool = sum(m.tool_ms for m in self._history) / total_reqs
        avg_prompt = sum(m.prompt_ms for m in self._history) / total_reqs
        avg_llm = sum(m.groq_ms for m in self._history) / total_reqs
        avg_total = sum(m.total_ms for m in self._history) / total_reqs

        return PerformanceReport(
            total_requests=total_reqs,
            cache_hits=hits,
            cache_misses=misses,
            cache_hit_rate=hit_rate,
            average_tool_latency_ms=round(avg_tool, 3),
            average_prompt_latency_ms=round(avg_prompt, 3),
            average_llm_latency_ms=round(avg_llm, 3),
            average_total_request_latency_ms=round(avg_total, 3)
        )
