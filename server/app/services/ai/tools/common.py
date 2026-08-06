import logging
import time
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional, Callable

logger = logging.getLogger(__name__)

@dataclass
class ToolResult:
    """
    Standardized result object returned by all business tools.
    Decoupled from HTTP, Flask, PromptBuilder, and LLM providers.
    """
    success: bool
    data: Any = None
    metadata: Dict[str, Any] = field(default_factory=dict)
    warnings: List[str] = field(default_factory=list)
    error: Optional[str] = None

    def to_dict(self) -> dict:
        return {
            "success": self.success,
            "data": self.data,
            "metadata": self.metadata,
            "warnings": self.warnings,
            "error": self.error,
        }


def safe_tool_execution(tool_name: str, fn: Callable, *args, **kwargs) -> ToolResult:
    """
    Safely executes a tool callable, catching database or unexpected exceptions
    and wrapping them into a predictable ToolResult object.
    """
    start_time = time.monotonic()
    try:
        res = fn(*args, **kwargs)
        elapsed_ms = round((time.monotonic() - start_time) * 1000, 3)

        if isinstance(res, ToolResult):
            res.metadata["execution_time_ms"] = elapsed_ms
            res.metadata["tool_name"] = tool_name
            return res

        return ToolResult(
            success=True,
            data=res,
            metadata={"execution_time_ms": elapsed_ms, "tool_name": tool_name},
            warnings=[],
            error=None
        )
    except Exception as e:
        elapsed_ms = round((time.monotonic() - start_time) * 1000, 3)
        logger.error("Tool execution failed for %s: %s", tool_name, str(e), exc_info=True)
        return ToolResult(
            success=False,
            data=None,
            metadata={"execution_time_ms": elapsed_ms, "tool_name": tool_name},
            warnings=[],
            error=f"Tool error: {str(e)}"
        )
