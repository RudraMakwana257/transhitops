"""
Execution Policy Module — Defines runtime configuration guardrails and resource limits.
"""

from dataclasses import dataclass, field
from typing import Dict, Any, Optional

@dataclass(frozen=True)
class ExecutionPolicy:
    """
    Immutable configuration object specifying operational bounds for an agent workflow run.
    """
    max_iterations: int = 5
    max_tools: int = 10
    max_execution_seconds: float = 30.0
    max_parallel_tasks: int = 1
    tool_timeout_seconds: float = 5.0
    reasoning_budget: int = 5
    max_retries: int = 2
    enable_parallel_tools: bool = False
    enable_retry: bool = True
    enable_streaming: bool = False
    metadata: Dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> dict:
        return {
            "max_iterations": self.max_iterations,
            "max_tools": self.max_tools,
            "max_execution_seconds": self.max_execution_seconds,
            "max_parallel_tasks": self.max_parallel_tasks,
            "tool_timeout_seconds": self.tool_timeout_seconds,
            "reasoning_budget": self.reasoning_budget,
            "max_retries": self.max_retries,
            "enable_parallel_tools": self.enable_parallel_tools,
            "enable_retry": self.enable_retry,
            "enable_streaming": self.enable_streaming,
            "metadata": self.metadata,
        }
