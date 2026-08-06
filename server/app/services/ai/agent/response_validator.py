"""
Response Validator Module — Quality gate checking tool output integrity and hallucination indicators.
"""

import logging
from dataclasses import dataclass, field
from typing import List, Dict, Any, Optional

from app.services.ai.agent.workflow_state import WorkflowState
from app.services.ai.agent.agent_context import AgentContext

logger = logging.getLogger(__name__)

@dataclass(frozen=True)
class ValidationResult:
    """
    Result returned by ResponseValidator checking workflow state or LLM output.
    """
    is_valid: bool
    warnings: List[str] = field(default_factory=list)
    should_retry: bool = False
    reason: str = "Validation passed successfully."

    def to_dict(self) -> dict:
        return {
            "is_valid": self.is_valid,
            "warnings": self.warnings,
            "should_retry": self.should_retry,
            "reason": self.reason,
        }


class ResponseValidator:
    """
    Response Validator checking execution outputs and workflow state.
    Never raises exceptions.
    """

    @staticmethod
    def validate_tool_results(state: WorkflowState, ctx: AgentContext) -> ValidationResult:
        """
        Validates gathered tool outputs prior to LLM response generation.
        """
        warnings = []
        should_retry = False

        if not state.tool_results:
            warnings.append("No tool results were collected during execution.")
            return ValidationResult(
                is_valid=True,  # Still valid if simple query, but flagged with warning
                warnings=warnings,
                should_retry=False,
                reason="Tool results empty."
            )

        # Check for tool execution errors
        failed_tools = []
        for tool_name, result in state.tool_results.items():
            if isinstance(result, dict) and not result.get("success", True):
                failed_tools.append(tool_name)
                warnings.append(f"Tool '{tool_name}' failed during execution: {result.get('error')}")

        if failed_tools and len(failed_tools) == len(state.tool_results):
            # All tools failed -> Recommend retry if retries remaining
            should_retry = state.iterations < ctx.execution_policy.max_retries
            return ValidationResult(
                is_valid=False,
                warnings=warnings,
                should_retry=should_retry,
                reason=f"All executed tools failed ({', '.join(failed_tools)})."
            )

        return ValidationResult(
            is_valid=True,
            warnings=warnings,
            should_retry=False,
            reason="Tool outputs validated successfully."
        )

    @staticmethod
    def validate_llm_response(content: str, state: WorkflowState) -> ValidationResult:
        """
        Validates final LLM completion string.
        """
        warnings = []
        clean_text = (content or "").strip()

        if not clean_text:
            return ValidationResult(
                is_valid=False,
                warnings=["LLM response was empty."],
                should_retry=True,
                reason="Empty LLM response text."
            )

        # Basic hallucination check: if tool results exist, ensure response doesn't say "data unavailable" erroneously
        if state.tool_results and "data unavailable" in clean_text.lower():
            warnings.append("LLM returned 'data unavailable' despite successful tool data retrieval.")

        return ValidationResult(
            is_valid=True,
            warnings=warnings,
            should_retry=False,
            reason="LLM response string validated."
        )
