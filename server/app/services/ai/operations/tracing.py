"""
Distributed Tracing Module — W3C traceparent compatible distributed tracing and OpenTelemetry ready spans.
"""

import time
import uuid
import logging
from abc import ABC, abstractmethod
from contextlib import contextmanager
from dataclasses import dataclass, field
from threading import Lock
from typing import Dict, List, Optional, Any

logger = logging.getLogger(__name__)

@dataclass
class Span:
    """
    Representation of an individual execution span.
    """
    span_id: str
    trace_id: str
    name: str
    parent_span_id: Optional[str] = None
    start_time: float = field(default_factory=time.time)
    end_time: Optional[float] = None
    attributes: Dict[str, Any] = field(default_factory=dict)
    status: str = "OK"              # 'OK', 'ERROR'

    @property
    def duration_ms(self) -> float:
        if self.end_time is None:
            return 0.0
        return (self.end_time - self.start_time) * 1000

    def to_dict(self) -> dict:
        return {
            "span_id": self.span_id,
            "trace_id": self.trace_id,
            "name": self.name,
            "parent_span_id": self.parent_span_id,
            "start_time": self.start_time,
            "end_time": self.end_time,
            "duration_ms": round(self.duration_ms, 3),
            "attributes": self.attributes,
            "status": self.status,
        }


@dataclass
class TraceContext:
    """
    W3C traceparent context holder (`00-trace_id-parent_span_id-01`).
    """
    trace_id: str
    parent_span_id: Optional[str] = None
    trace_flags: str = "01"

    def to_w3c_header(self, current_span_id: str) -> str:
        return f"00-{self.trace_id}-{current_span_id}-{self.trace_flags}"

    @classmethod
    def from_w3c_header(cls, header: str) -> 'TraceContext':
        try:
            parts = header.split("-")
            if len(parts) >= 4:
                return cls(trace_id=parts[1], parent_span_id=parts[2], trace_flags=parts[3])
        except Exception:
            pass
        return cls(trace_id=uuid.uuid4().hex)


class TracerBackend(ABC):
    """
    Abstract interface for Tracer backends.
    Supports future OpenTelemetry, Jaeger, or Datadog exporters.
    """
    @abstractmethod
    def record_span(self, span: Span) -> None:
        pass

    @abstractmethod
    def get_spans(self, trace_id: Optional[str] = None) -> List[Span]:
        pass


class InMemoryTracerBackend(TracerBackend):
    """
    Thread-safe in-memory TracerBackend.
    """
    def __init__(self):
        self._spans: List[Span] = []
        self._lock = Lock()

    def record_span(self, span: Span) -> None:
        with self._lock:
            self._spans.append(span)

    def get_spans(self, trace_id: Optional[str] = None) -> List[Span]:
        with self._lock:
            if trace_id:
                return [s for s in self._spans if s.trace_id == trace_id]
            return list(self._spans)


class Tracer:
    """
    Distributed Tracer producing hierarchical OpenTelemetry-compatible spans.
    """
    def __init__(self, backend: Optional[TracerBackend] = None):
        self.backend = backend or InMemoryTracerBackend()

    @contextmanager
    def start_span(
        self,
        name: str,
        context: Optional[TraceContext] = None,
        attributes: Optional[dict] = None
    ):
        ctx = context or TraceContext(trace_id=uuid.uuid4().hex)
        span_id = uuid.uuid4().hex[:16]
        
        span = Span(
            span_id=span_id,
            trace_id=ctx.trace_id,
            name=name,
            parent_span_id=ctx.parent_span_id,
            start_time=time.time(),
            attributes=attributes or {}
        )
        try:
            yield span
            span.status = "OK"
        except Exception as e:
            span.status = "ERROR"
            span.attributes["error.message"] = str(e)
            raise e
        finally:
            span.end_time = time.time()
            self.backend.record_span(span)
