"""
Agent Context Module — Immutable execution context container.
"""

import uuid
from dataclasses import dataclass, field
from typing import Dict, Any, Optional
from app.services.ai.agent.execution_policy import ExecutionPolicy

@dataclass(frozen=True)
class AgentContext:
    """
    Immutable context container carrying request metadata, tenant claims, session memory,
    security policy, and execution parameters through the agent pipeline.
    """
    request_id: str
    workflow_id: str
    session_id: str
    user_id: str
    company_id: str
    intent: str = "GENERAL"
    user_message: str = ""
    memory_context: Optional[Any] = None
    security_context: Dict[str, Any] = field(default_factory=dict)
    provider_preferences: Dict[str, Any] = field(default_factory=dict)
    user_info: Dict[str, Any] = field(default_factory=dict)
    execution_policy: ExecutionPolicy = field(default_factory=ExecutionPolicy)
    metadata: Dict[str, Any] = field(default_factory=dict)

    @classmethod
    def create(
        cls,
        session_id: str,
        company_id: str,
        user_id: str,
        user_message: str = "",
        intent: str = "GENERAL",
        memory_context: Optional[Any] = None,
        user_info: Optional[dict] = None,
        execution_policy: Optional[ExecutionPolicy] = None,
        request_id: Optional[str] = None,
        workflow_id: Optional[str] = None,
        **kwargs
    ) -> 'AgentContext':
        """Factory helper constructing an AgentContext with auto-generated IDs if omitted."""
        req_id = request_id or f"req_{uuid.uuid4().hex[:12]}"
        wf_id = workflow_id or f"wf_{uuid.uuid4().hex[:12]}"
        policy = execution_policy or ExecutionPolicy()
        u_info = user_info or {}

        return cls(
            request_id=req_id,
            workflow_id=wf_id,
            session_id=str(session_id),
            user_id=str(user_id),
            company_id=str(company_id),
            intent=intent,
            user_message=user_message,
            memory_context=memory_context,
            user_info=u_info,
            execution_policy=policy,
            metadata=kwargs
        )

    def to_dict(self) -> dict:
        return {
            "request_id": self.request_id,
            "workflow_id": self.workflow_id,
            "session_id": self.session_id,
            "user_id": self.user_id,
            "company_id": self.company_id,
            "intent": self.intent,
            "user_message": self.user_message,
            "security_context": self.security_context,
            "provider_preferences": self.provider_preferences,
            "user_info": self.user_info,
            "execution_policy": self.execution_policy.to_dict(),
            "metadata": self.metadata,
        }
