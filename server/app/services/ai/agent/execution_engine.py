"""
Execution Engine Module — Core orchestrator coordinating Planner, ReasoningLoop, PromptBuilder, and ProviderRouter.
"""

import time
import logging
from dataclasses import dataclass, field
from typing import List, Dict, Any, Optional

from app.services.ai.agent.agent_context import AgentContext
from app.services.ai.agent.workflow_state import WorkflowState, WorkflowStatus
from app.services.ai.agent.planner import Planner, ExecutionPlan
from app.services.ai.agent.reasoning_loop import ReasoningLoop
from app.services.ai.agent.response_validator import ResponseValidator, ValidationResult
from app.services.ai.agent.cancellation_token import CancellationToken
from app.services.ai.prompt_builder import (
    build_system_prompt as pb_build_system_prompt,
    format_history_layer as pb_format_history_layer
)
from app.services.ai.providers.fallback_manager import FallbackManager
from app.services.ai.memory.token_manager import TokenManager

logger = logging.getLogger(__name__)

@dataclass
class AgentExecutionResult:
    """
    Final standardized execution result object returned by ExecutionEngine.
    """
    response: str
    tool_calls: List[Dict[str, Any]] = field(default_factory=list)
    iterations: int = 1
    reasoning_trace: List[str] = field(default_factory=list)
    execution_time_ms: float = 0.0
    prompt_tokens: int = 0
    completion_tokens: int = 0
    estimated_cost: float = 0.0
    provider: str = "groq"
    model: str = "llama-3.3-70b-versatile"
    warnings: List[str] = field(default_factory=list)
    errors: List[str] = field(default_factory=list)

    def to_dict(self) -> dict:
        return {
            "response": self.response,
            "tool_calls": self.tool_calls,
            "iterations": self.iterations,
            "reasoning_trace": self.reasoning_trace,
            "execution_time_ms": round(self.execution_time_ms, 3),
            "prompt_tokens": self.prompt_tokens,
            "completion_tokens": self.completion_tokens,
            "estimated_cost": round(self.estimated_cost, 6),
            "provider": self.provider,
            "model": self.model,
            "warnings": self.warnings,
            "errors": self.errors,
        }


class ExecutionEngine:
    """
    ExecutionEngine orchestrating planning, tools, prompts, LLM execution, and validation.
    """
    def __init__(self, fallback_manager: Optional[FallbackManager] = None):
        self.fallback_manager = fallback_manager or FallbackManager()

    def execute(
        self,
        ctx: AgentContext,
        initial_state: WorkflowState,
        cancellation_token: Optional[CancellationToken] = None
    ) -> AgentExecutionResult:
        start_time = time.monotonic()

        # 1. Planning Stage
        plan: ExecutionPlan = Planner.create_plan(ctx)
        state = initial_state.copy_with(
            execution_plan=plan.to_dict(),
            status=WorkflowStatus.PLANNING
        )

        # 2. Reasoning Loop Stage (Executes tools and merges results)
        state = ReasoningLoop.run_loop(
            graph=plan.task_graph,
            ctx=ctx,
            initial_state=state,
            cancellation_token=cancellation_token
        )

        # 3. Tool Result Validation Stage
        tool_val: ValidationResult = ResponseValidator.validate_tool_results(state, ctx)
        warnings = list(state.warnings) + tool_val.warnings

        # 4. Prompt Assembly Stage (Uses Layered PromptBuilder)
        rag_chunks = [ctx.memory_context.running_summary] if ctx.memory_context and ctx.memory_context.running_summary else None
        prompt_meta = pb_build_system_prompt(
            ctx=state.tool_results,
            user_info=ctx.user_info,
            rag_chunks=rag_chunks
        )
        system_prompt = prompt_meta["prompt"]

        # Format history turns
        history_msgs = []
        if ctx.memory_context and ctx.memory_context.recent_messages:
            cleaned_hist = pb_format_history_layer(ctx.memory_context.recent_messages, max_length=10)
            for m in cleaned_hist:
                history_msgs.append({"role": m["role"], "content": m["content"]})

        history_msgs.append({"role": "user", "content": ctx.user_message})

        # 5. LLM Provider Execution Stage via FallbackManager
        llm_response = self.fallback_manager.execute_chat(
            system_prompt=system_prompt,
            messages=history_msgs[:-1],
            intent_str=ctx.intent,
            company_id=ctx.company_id,
            user_id=ctx.user_id,
            session_id=ctx.session_id,
            temperature=0.2,
            max_tokens=1024
        )

        # 6. Response Validation Stage
        resp_val: ValidationResult = ResponseValidator.validate_llm_response(llm_response.content, state)
        warnings.extend(resp_val.warnings)

        elapsed_ms = (time.monotonic() - start_time) * 1000

        # Construct tool call list
        tool_calls_summary = [
            {"step_id": step.step_id, "tool": step.input_data.get("tool_name", step.step_type), "status": step.status}
            for step in state.completed_steps if step.step_type == "tool"
        ]

        return AgentExecutionResult(
            response=llm_response.content,
            tool_calls=tool_calls_summary,
            iterations=state.iterations,
            reasoning_trace=state.reasoning_trace,
            execution_time_ms=elapsed_ms,
            prompt_tokens=llm_response.prompt_tokens,
            completion_tokens=llm_response.completion_tokens,
            estimated_cost=llm_response.estimated_cost_usd,
            provider=llm_response.provider_name,
            model=llm_response.model_name,
            warnings=warnings,
            errors=state.errors
        )
