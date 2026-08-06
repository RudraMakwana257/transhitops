"""
Workflow Engine Module — Event-driven state machine coordinator managing events, hooks, checkpoints, and execution.
"""

import time
import logging
from typing import Optional

from app.services.ai.agent.agent_context import AgentContext
from app.services.ai.agent.workflow_state import WorkflowState, WorkflowStatus
from app.services.ai.agent.event_bus import EventBus
from app.services.ai.agent.execution_hooks import CompositeExecutionHook, BaseExecutionHook
from app.services.ai.agent.checkpoint_manager import CheckpointManager, InMemoryCheckpointManager
from app.services.ai.agent.cancellation_token import CancellationToken
from app.services.ai.agent.execution_engine import ExecutionEngine, AgentExecutionResult
from app.services.ai.agent import workflow_events as ev

logger = logging.getLogger(__name__)

class WorkflowEngine:
    """
    WorkflowEngine coordinating EventBus, ExecutionHooks, CheckpointManager, and ExecutionEngine.
    """
    def __init__(
        self,
        execution_engine: Optional[ExecutionEngine] = None,
        event_bus: Optional[EventBus] = None,
        checkpoint_manager: Optional[CheckpointManager] = None
    ):
        self.execution_engine = execution_engine or ExecutionEngine()
        self.event_bus = event_bus or EventBus()
        self.checkpoint_manager = checkpoint_manager or InMemoryCheckpointManager()
        self.hooks = CompositeExecutionHook()

    def add_hook(self, hook: BaseExecutionHook) -> None:
        """Registers a lifecycle hook."""
        self.hooks.add_hook(hook)

    def run_workflow(
        self,
        ctx: AgentContext,
        cancellation_token: Optional[CancellationToken] = None
    ) -> AgentExecutionResult:
        """
        Runs a complete agent workflow:
        Emits events -> Invokes hooks -> Captures Checkpoints -> Executes Engine -> Returns Result.
        """
        start_time = time.monotonic()
        state = WorkflowState(
            workflow_id=ctx.workflow_id,
            session_id=ctx.session_id,
            intent=ctx.intent,
            status=WorkflowStatus.CREATED
        )

        # 1. Lifecycle: Workflow Started
        self.hooks.before_workflow(ctx, state)
        self.event_bus.publish(ev.WorkflowStarted(
            workflow_id=ctx.workflow_id,
            session_id=ctx.session_id,
            intent=ctx.intent
        ))

        # Capture Initial Checkpoint
        self.checkpoint_manager.create_checkpoint(f"start_{ctx.workflow_id}", state)

        try:
            # 2. Execute via ExecutionEngine
            state = state.copy_with(status=WorkflowStatus.PLANNING)
            self.event_bus.publish(ev.PlannerStarted(
                workflow_id=ctx.workflow_id,
                session_id=ctx.session_id,
                intent=ctx.intent
            ))

            exec_result: AgentExecutionResult = self.execution_engine.execute(
                ctx=ctx,
                initial_state=state,
                cancellation_token=cancellation_token
            )

            # 3. Lifecycle: Workflow Completed
            elapsed_ms = (time.monotonic() - start_time) * 1000
            final_state = state.copy_with(
                status=WorkflowStatus.COMPLETED,
                execution_time_ms=elapsed_ms,
                warnings=exec_result.warnings,
                errors=exec_result.errors
            )

            # Capture Completion Checkpoint
            self.checkpoint_manager.create_checkpoint(f"end_{ctx.workflow_id}", final_state)

            self.hooks.after_workflow(ctx, final_state)
            self.event_bus.publish(ev.WorkflowCompleted(
                workflow_id=ctx.workflow_id,
                session_id=ctx.session_id,
                execution_time_ms=elapsed_ms,
                response_length=len(exec_result.response)
            ))

            return exec_result

        except Exception as e:
            elapsed_ms = (time.monotonic() - start_time) * 1000
            failed_state = state.copy_with(
                status=WorkflowStatus.FAILED,
                execution_time_ms=elapsed_ms,
                errors=[str(e)]
            )
            self.checkpoint_manager.create_checkpoint(f"fail_{ctx.workflow_id}", failed_state)
            self.hooks.on_error(ctx, failed_state, e)
            self.event_bus.publish(ev.WorkflowFailed(
                workflow_id=ctx.workflow_id,
                session_id=ctx.session_id,
                error_message=str(e)
            ))
            raise e
