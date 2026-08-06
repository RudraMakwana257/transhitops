"""
Observability Module — Prometheus-ready metrics collector supporting Counters, Histograms, and Gauges.
"""

import logging
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from threading import Lock
from typing import Dict, List, Any, Optional

logger = logging.getLogger(__name__)

class MetricsBackend(ABC):
    """
    Abstract interface for Metrics backends.
    Supports future Prometheus, StatsD, or Datadog exporters.
    """
    @abstractmethod
    def increment(self, name: str, value: float = 1.0, labels: Optional[Dict[str, str]] = None) -> None:
        pass

    @abstractmethod
    def observe(self, name: str, value: float, labels: Optional[Dict[str, str]] = None) -> None:
        pass

    @abstractmethod
    def set_gauge(self, name: str, value: float, labels: Optional[Dict[str, str]] = None) -> None:
        pass

    @abstractmethod
    def export(self) -> Dict[str, Any]:
        pass


class InMemoryMetricsBackend(MetricsBackend):
    """
    Thread-safe in-memory MetricsBackend.
    """
    def __init__(self):
        self._counters: Dict[str, float] = {}
        self._gauges: Dict[str, float] = {}
        self._histograms: Dict[str, List[float]] = {}
        self._lock = Lock()

    def increment(self, name: str, value: float = 1.0, labels: Optional[Dict[str, str]] = None) -> None:
        key = self._format_key(name, labels)
        with self._lock:
            self._counters[key] = self._counters.get(key, 0.0) + value

    def observe(self, name: str, value: float, labels: Optional[Dict[str, str]] = None) -> None:
        key = self._format_key(name, labels)
        with self._lock:
            if key not in self._histograms:
                self._histograms[key] = []
            self._histograms[key].append(value)

    def set_gauge(self, name: str, value: float, labels: Optional[Dict[str, str]] = None) -> None:
        key = self._format_key(name, labels)
        with self._lock:
            self._gauges[key] = value

    def _format_key(self, name: str, labels: Optional[Dict[str, str]] = None) -> str:
        if not labels:
            return name
        label_str = ",".join(f'{k}="{v}"' for k, v in sorted(labels.items()))
        return f"{name}{{{label_str}}}"

    def export(self) -> Dict[str, Any]:
        with self._lock:
            hist_summary = {}
            for k, vals in self._histograms.items():
                if vals:
                    hist_summary[k] = {
                        "count": len(vals),
                        "sum": sum(vals),
                        "avg": round(sum(vals) / len(vals), 3),
                        "max": max(vals),
                        "min": min(vals),
                    }
            return {
                "counters": dict(self._counters),
                "gauges": dict(self._gauges),
                "histograms": hist_summary,
            }


class MetricsCollector:
    """
    High-level facade tracking AI system metrics.
    """
    def __init__(self, backend: Optional[MetricsBackend] = None):
        self.backend = backend or InMemoryMetricsBackend()

    def record_request(self, status: str = "200_OK", intent: str = "GENERAL") -> None:
        self.backend.increment("ai_requests_total", 1.0, {"status": status, "intent": intent})

    def record_tool_call(self, tool_name: str, latency_ms: float, success: bool = True) -> None:
        self.backend.increment("tool_calls_total", 1.0, {"tool": tool_name, "status": "success" if success else "failed"})
        self.backend.observe("tool_latency_ms", latency_ms, {"tool": tool_name})

    def record_provider_request(self, provider: str, model: str, latency_ms: float) -> None:
        self.backend.increment("provider_requests_total", 1.0, {"provider": provider, "model": model})
        self.backend.observe("provider_latency_ms", latency_ms, {"provider": provider, "model": model})

    def record_cache_event(self, hit: bool) -> None:
        if hit:
            self.backend.increment("cache_hits_total", 1.0)
        else:
            self.backend.increment("cache_misses_total", 1.0)

    def record_tokens(self, prompt_tokens: int, completion_tokens: int, model: str) -> None:
        self.backend.increment("prompt_tokens_total", float(prompt_tokens), {"model": model})
        self.backend.increment("completion_tokens_total", float(completion_tokens), {"model": model})

    def record_quota_denied(self, company_id: str) -> None:
        self.backend.increment("quota_denied_total", 1.0, {"company_id": company_id})

    def record_workflow_failure(self, intent: str) -> None:
        self.backend.increment("workflow_failures_total", 1.0, {"intent": intent})

    def export_metrics(self) -> Dict[str, Any]:
        return self.backend.export()
