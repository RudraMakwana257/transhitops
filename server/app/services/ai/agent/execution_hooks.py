"""
Execution Hooks Module — Lifecycle interception hook protocols and CompositeExecutionHook manager.
"""

import logging
from typing import Protocol, List, Any, Optional
from app.services.ai.agent.agent_context import AgentContext
from app.services.ai.agent.workflow_state import WorkflowState

logger = logging.getLogger(__name__)

class ExecutionHook(Protocol):
    """
    Protocol defining lifecycle hooks for intercepting workflow execution.
    """
    def before_workflow(self, ctx: AgentContext, state: WorkflowState) -> None: ...
    def after_workflow(self, ctx: AgentContext, state: WorkflowState) -> None: ...
    def before_tool(self, ctx: AgentContext, tool_name: str, kwargs: dict) -> None: ...
    def after_tool(self, ctx: AgentContext, tool_name: str, result: Any) -> None: ...
    def before_prompt(self, ctx: AgentContext, state: WorkflowState) -> None: ...
    def after_prompt(self, ctx: AgentContext, prompt_text: str) -> None: ...
    def before_provider(self, ctx: AgentContext, provider_name: str, model_name: str) -> None: ...
    def after_provider(self, ctx: AgentContext, response: Any) -> None: ...
    def before_validation(self, ctx: AgentContext, state: WorkflowState) -> None: ...
    def after_validation(self, ctx: AgentContext, is_valid: bool) -> None: ...
    def on_error(self, ctx: AgentContext, state: WorkflowState, error: Exception) -> None: ...


class BaseExecutionHook:
    """
    Default Base class with no-op hook implementations.
    Inherit from this class to override specific hooks.
    """
    def before_workflow(self, ctx: AgentContext, state: WorkflowState) -> None: pass
    def after_workflow(self, ctx: AgentContext, state: WorkflowState) -> None: pass
    def before_tool(self, ctx: AgentContext, tool_name: str, kwargs: dict) -> None: pass
    def after_tool(self, ctx: AgentContext, tool_name: str, result: Any) -> None: pass
    def before_prompt(self, ctx: AgentContext, state: WorkflowState) -> None: pass
    def after_prompt(self, ctx: AgentContext, prompt_text: str) -> None: pass
    def before_provider(self, ctx: AgentContext, provider_name: str, model_name: str) -> None: pass
    def after_provider(self, ctx: AgentContext, response: Any) -> None: pass
    def before_validation(self, ctx: AgentContext, state: WorkflowState) -> None: pass
    def after_validation(self, ctx: AgentContext, is_valid: bool) -> None: pass
    def on_error(self, ctx: AgentContext, state: WorkflowState, error: Exception) -> None: pass


class CompositeExecutionHook:
    """
    Composite hook dispatcher broadcasting events to multiple registered hooks sequentially.
    Isolates exceptions thrown by individual hooks.
    """
    def __init__(self, hooks: Optional[List[BaseExecutionHook]] = None):
        self._hooks: List[BaseExecutionHook] = hooks or []

    def add_hook(self, hook: BaseExecutionHook) -> None:
        self._hooks.append(hook)

    def _safe_dispatch(self, method_name: str, *args, **kwargs) -> None:
        for hook in self._hooks:
            method = getattr(hook, method_name, None)
            if callable(method):
                try:
                    method(*args, **kwargs)
                except Exception as e:
                    logger.error("ExecutionHook %s.%s failed: %s", type(hook).__name__, method_name, str(e), exc_info=True)

    def before_workflow(self, ctx: AgentContext, state: WorkflowState) -> None:
        self._safe_dispatch("before_workflow", ctx, state)

    def after_workflow(self, ctx: AgentContext, state: WorkflowState) -> None:
        self._safe_dispatch("after_workflow", ctx, state)

    def before_tool(self, ctx: AgentContext, tool_name: str, kwargs: dict) -> None:
        self._safe_dispatch("before_tool", ctx, tool_name, kwargs)

    def after_tool(self, ctx: AgentContext, tool_name: str, result: Any) -> None:
        self._safe_dispatch("after_tool", ctx, tool_name, result)

    def before_prompt(self, ctx: AgentContext, state: WorkflowState) -> None:
        self._safe_dispatch("before_prompt", ctx, state)

    def after_prompt(self, ctx: AgentContext, prompt_text: str) -> None:
        self._safe_dispatch("after_prompt", ctx, prompt_text)

    def before_provider(self, ctx: AgentContext, provider_name: str, model_name: str) -> None:
        self._safe_dispatch("before_provider", ctx, provider_name, model_name)

    def after_provider(self, ctx: AgentContext, response: Any) -> None:
        self._safe_dispatch("after_provider", ctx, response)

    def before_validation(self, ctx: AgentContext, state: WorkflowState) -> None:
        self._safe_dispatch("before_validation", ctx, state)

    def after_validation(self, ctx: AgentContext, is_valid: bool) -> None:
        self._safe_dispatch("after_validation", ctx, is_valid)

    def on_error(self, ctx: AgentContext, state: WorkflowState, error: Exception) -> None:
        self._safe_dispatch("on_error", ctx, state, error)
