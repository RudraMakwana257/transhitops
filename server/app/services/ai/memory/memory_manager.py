"""
MemoryManager — Core session memory coordinator.
Decoupled from specific storage backends and LLM providers using MemoryStore and Summarizer interfaces.
"""

import time
import logging
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from datetime import datetime, timezone
from threading import Lock
from typing import Dict, List, Any, Optional, Tuple

from app.services.ai.memory.token_manager import TokenManager
from app.services.ai.memory.history_summarizer import Summarizer, RuleBasedSummarizer

logger = logging.getLogger(__name__)

# =====================================================================
# DATA MODELS & SCHEMAS
# =====================================================================

@dataclass
class SessionMetadata:
    """Immutable identity metadata for a conversation session."""
    session_id: str
    user_id: Optional[str] = None
    company_id: Optional[str] = None
    created_at: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


@dataclass
class RuntimeMetrics:
    """Mutable runtime performance counters for a conversation session."""
    total_tokens: int = 0
    total_messages: int = 0
    summary_version: int = 0
    last_activity: float = field(default_factory=time.time)


@dataclass
class MemoryPolicy:
    """Configuration policy governing conversation memory boundaries."""
    max_recent_turns: int = 5         # Recent N turns kept verbatim
    max_tokens: int = 1000            # Total history token budget
    summary_threshold: int = 600      # Token count triggering summarization
    ttl_minutes: int = 30             # Inactivity TTL for session expiration


@dataclass
class MemoryContext:
    """Structured context object returned to AIService / PromptBuilder."""
    running_summary: Optional[str]
    recent_messages: List[Dict[str, Any]]
    metadata: SessionMetadata
    runtime_metrics: RuntimeMetrics
    remaining_budget: int
    needs_summary: bool

    def to_dict(self) -> dict:
        return {
            "running_summary": self.running_summary,
            "recent_messages": self.recent_messages,
            "session_id": self.metadata.session_id,
            "company_id": self.metadata.company_id,
            "user_id": self.metadata.user_id,
            "total_tokens": self.runtime_metrics.total_tokens,
            "total_messages": self.runtime_metrics.total_messages,
            "remaining_budget": self.remaining_budget,
            "needs_summary": self.needs_summary,
        }


@dataclass
class SessionData:
    """Internal session state object stored in MemoryStore."""
    metadata: SessionMetadata
    runtime_metrics: RuntimeMetrics
    running_summary: Optional[str] = None
    messages: List[Dict[str, Any]] = field(default_factory=list)


# =====================================================================
# STORAGE INTERFACE & IN-MEMORY IMPLEMENTATION
# =====================================================================

class MemoryStore(ABC):
    """
    Abstract Storage Interface for Conversation Memory.
    Designed for seamless future adaptation to Redis, PostgreSQL, or Distributed Caches.
    """
    @abstractmethod
    def get_session(self, session_id: str) -> Optional[SessionData]:
        pass

    @abstractmethod
    def save_session(self, session_id: str, session: SessionData) -> None:
        pass

    @abstractmethod
    def delete_session(self, session_id: str) -> None:
        pass


class InMemoryStore(MemoryStore):
    """
    Thread-safe, in-memory implementation of MemoryStore with TTL eviction.
    """
    def __init__(self, ttl_minutes: int = 30):
        self._store: Dict[str, SessionData] = {}
        self._lock = Lock()
        self._ttl_seconds = ttl_minutes * 60

    def get_session(self, session_id: str) -> Optional[SessionData]:
        with self._lock:
            session = self._store.get(session_id)
            if not session:
                return None
            
            # Check TTL
            if time.time() - session.runtime_metrics.last_activity > self._ttl_seconds:
                del self._store[session_id]
                return None
                
            return session

    def save_session(self, session_id: str, session: SessionData) -> None:
        with self._lock:
            session.runtime_metrics.last_activity = time.time()
            self._store[session_id] = session

    def delete_session(self, session_id: str) -> None:
        with self._lock:
            self._store.pop(session_id, None)


# =====================================================================
# MEMORY MANAGER COORDINATOR
# =====================================================================

class MemoryManager:
    """
    Core Session Memory Coordinator.
    Manages session lifecycle, history trimming, running summaries, and token budgeting.
    Depends only on MemoryStore, Summarizer, and MemoryPolicy interfaces.
    """

    def __init__(
        self,
        store: Optional[MemoryStore] = None,
        summarizer: Optional[Summarizer] = None,
        policy: Optional[MemoryPolicy] = None
    ):
        self.policy = policy or MemoryPolicy()
        self.store = store or InMemoryStore(ttl_minutes=self.policy.ttl_minutes)
        self.summarizer = summarizer or RuleBasedSummarizer()

    def get_or_create_session(
        self,
        session_id: str,
        company_id: Optional[str] = None,
        user_id: Optional[str] = None
    ) -> SessionData:
        session = self.store.get_session(session_id)
        if not session:
            metadata = SessionMetadata(
                session_id=session_id,
                company_id=company_id,
                user_id=user_id
            )
            metrics = RuntimeMetrics()
            session = SessionData(metadata=metadata, runtime_metrics=metrics)
            self.store.save_session(session_id, session)
        return session

    def get_memory_context(
        self,
        session_id: str,
        company_id: Optional[str] = None,
        user_id: Optional[str] = None,
        system_tokens: int = 0
    ) -> MemoryContext:
        """
        Retrieves MemoryContext for prompt generation.
        Calculates remaining token budget, applies Recent Memory Window, and flags summary needs.
        """
        session = self.get_or_create_session(session_id, company_id, user_id)
        
        # Max recent messages = max_recent_turns * 2 (user + assistant)
        max_recent_msgs = self.policy.max_recent_turns * 2
        recent_msgs = session.messages[-max_recent_msgs:] if session.messages else []

        recent_tokens = TokenManager.estimate_messages_tokens(recent_msgs)
        summary_tokens = TokenManager.estimate_tokens(session.running_summary or "")
        history_tokens = recent_tokens + summary_tokens

        remaining_budget = TokenManager.remaining_budget(
            used_tokens=system_tokens + history_tokens,
            max_budget=self.policy.max_tokens
        )

        needs_summary = TokenManager.should_summarize(
            history=session.messages,
            threshold=self.policy.summary_threshold
        )

        return MemoryContext(
            running_summary=session.running_summary,
            recent_messages=recent_msgs,
            metadata=session.metadata,
            runtime_metrics=session.runtime_metrics,
            remaining_budget=remaining_budget,
            needs_summary=needs_summary
        )

    def add_turn(
        self,
        session_id: str,
        user_message: str,
        assistant_response: str,
        company_id: Optional[str] = None,
        user_id: Optional[str] = None,
        tokens_used: int = 0
    ) -> None:
        """
        Records a user <-> assistant turn, updates metrics, triggers history trimming/summarization if needed.
        """
        session = self.get_or_create_session(session_id, company_id, user_id)

        user_turn = {"role": "user", "content": user_message.strip()}
        assistant_turn = {"role": "assistant", "content": assistant_response.strip()}

        session.messages.append(user_turn)
        session.messages.append(assistant_turn)

        session.runtime_metrics.total_messages += 2
        
        turn_tokens = tokens_used or (
            TokenManager.estimate_tokens(user_message) + 
            TokenManager.estimate_tokens(assistant_response)
        )
        session.runtime_metrics.total_tokens += turn_tokens

        # Check if summarization is needed
        if TokenManager.should_summarize(session.messages, threshold=self.policy.summary_threshold):
            # Keep recent turns, summarize excess older messages
            max_recent_msgs = self.policy.max_recent_turns * 2
            if len(session.messages) > max_recent_msgs:
                older_messages = session.messages[:-max_recent_msgs]
                session.running_summary = self.summarizer.summarize(
                    messages=older_messages,
                    existing_summary=session.running_summary
                )
                session.runtime_metrics.summary_version += 1
                session.messages = session.messages[-max_recent_msgs:]
                logger.info(
                    "session_summarized session_id=%s summary_version=%d msgs_summarized=%d",
                    session_id,
                    session.runtime_metrics.summary_version,
                    len(older_messages)
                )

        self.store.save_session(session_id, session)

    def clear_session(self, session_id: str) -> None:
        """Clears a session from memory store."""
        self.store.delete_session(session_id)
