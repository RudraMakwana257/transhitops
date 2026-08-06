"""
Audit Logger Module — Immutable, structured audit logging with SHA-256 hash-chain support.
"""

import time
import json
import hashlib
import logging
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from threading import Lock
from typing import Dict, List, Any, Optional

logger = logging.getLogger(__name__)

@dataclass(frozen=True)
class AuditEvent:
    """
    Immutable structured audit log record.
    """
    timestamp: float
    tenant_id: str
    user_id: str
    session_id: str
    workflow_id: str
    request_id: str
    severity: str                   # 'INFO', 'WARN', 'CRITICAL'
    event_type: str                 # 'PROMPT_BLOCKED', 'TOOL_EXECUTED', 'QUOTA_EXCEEDED', etc.
    actor: str
    resource: str
    metadata: Dict[str, Any] = field(default_factory=dict)
    prev_hash: str = ""
    event_hash: str = ""

    def to_dict(self) -> dict:
        return {
            "timestamp": self.timestamp,
            "tenant_id": self.tenant_id,
            "user_id": self.user_id,
            "session_id": self.session_id,
            "workflow_id": self.workflow_id,
            "request_id": self.request_id,
            "severity": self.severity,
            "event_type": self.event_type,
            "actor": self.actor,
            "resource": self.resource,
            "metadata": self.metadata,
            "prev_hash": self.prev_hash,
            "event_hash": self.event_hash,
        }


class AuditSink(ABC):
    """
    Abstract AuditSink interface.
    Supports future SIEM (Splunk, Elastic, Datadog) or Immutable Database backends.
    """
    @abstractmethod
    def log(self, event: AuditEvent) -> None:
        pass

    @abstractmethod
    def get_events(self, tenant_id: Optional[str] = None) -> List[AuditEvent]:
        pass


class InMemoryAuditSink(AuditSink):
    """
    Thread-safe in-memory audit sink maintaining a cryptographic hash-chain.
    """
    def __init__(self):
        self._events: List[AuditEvent] = []
        self._last_hash = "GENESIS_HASH"
        self._lock = Lock()

    def log(self, event: AuditEvent) -> None:
        with self._lock:
            # Re-calculate hash with prev_hash for tamper-evident chain
            payload = json.dumps({
                "timestamp": event.timestamp,
                "tenant_id": event.tenant_id,
                "event_type": event.event_type,
                "prev_hash": self._last_hash
            }, sort_keys=True)
            new_hash = hashlib.sha256(payload.encode("utf-8")).hexdigest()[:16]

            chained_event = AuditEvent(
                timestamp=event.timestamp,
                tenant_id=event.tenant_id,
                user_id=event.user_id,
                session_id=event.session_id,
                workflow_id=event.workflow_id,
                request_id=event.request_id,
                severity=event.severity,
                event_type=event.event_type,
                actor=event.actor,
                resource=event.resource,
                metadata=event.metadata,
                prev_hash=self._last_hash,
                event_hash=new_hash
            )
            self._last_hash = new_hash
            self._events.append(chained_event)

            logger.info("AuditEvent recorded type=%s tenant=%s hash=%s", chained_event.event_type, chained_event.tenant_id, new_hash)

    def get_events(self, tenant_id: Optional[str] = None) -> List[AuditEvent]:
        with self._lock:
            if tenant_id:
                return [e for e in self._events if e.tenant_id == tenant_id]
            return list(self._events)


class AuditLogger:
    """
    Structured Audit Logger facade enforcing compliance schemas.
    """
    def __init__(self, sink: Optional[AuditSink] = None):
        self.sink = sink or InMemoryAuditSink()

    def record_event(
        self,
        event_type: str,
        tenant_id: str,
        user_id: str = "anonymous",
        session_id: str = "default",
        workflow_id: str = "default",
        request_id: str = "default",
        severity: str = "INFO",
        actor: str = "system",
        resource: str = "ai_backend",
        metadata: Optional[dict] = None
    ) -> AuditEvent:
        evt = AuditEvent(
            timestamp=time.time(),
            tenant_id=str(tenant_id),
            user_id=str(user_id),
            session_id=str(session_id),
            workflow_id=str(workflow_id),
            request_id=str(request_id),
            severity=severity,
            event_type=event_type,
            actor=actor,
            resource=resource,
            metadata=metadata or {}
        )
        self.sink.log(evt)
        return evt
