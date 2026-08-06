"""
Agent Runtime Module — Public entry facade for the Autonomous AI Agent Runtime ecosystem.
"""

import logging
from typing import Dict, Any, Optional

from app.services.ai.agent.agent_context import AgentContext
from app.services.ai.agent.execution_policy import ExecutionPolicy
from app.services.ai.agent.cancellation_token import CancellationToken
from app.services.ai.agent.workflow_engine import WorkflowEngine
from app.services.ai.agent.execution_engine import AgentExecutionResult

logger = logging.getLogger(__name__)

class AgentRuntime:
    """
    Public Facade for the Agent Runtime.
    Provides a clean, unified execution interface.
    """
    _workflow_engine: Optional[WorkflowEngine] = None

    @classmethod
    def _get_engine(cls) -> WorkflowEngine:
        if cls._workflow_engine is None:
            cls._workflow_engine = WorkflowEngine()
        return cls._workflow_engine

    @classmethod
    def execute(
        cls,
        message: str,
        session_id: str,
        company_id: str,
        user_id: str,
        intent: str = "GENERAL",
        memory_context: Optional[Any] = None,
        user_info: Optional[Dict[str, Any]] = None,
        execution_policy: Optional[ExecutionPolicy] = None,
        cancellation_token: Optional[CancellationToken] = None
    ) -> AgentExecutionResult:
        """
        Executes an autonomous agent workflow for a user request.
        """
        ctx = AgentContext.create(
            session_id=session_id,
            company_id=company_id,
            user_id=user_id,
            user_message=message,
            intent=intent,
            memory_context=memory_context,
            user_info=user_info or {},
            execution_policy=execution_policy
        )

        engine = cls._get_engine()
        return engine.run_workflow(ctx=ctx, cancellation_token=cancellation_token)
