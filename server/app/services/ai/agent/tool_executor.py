"""
Tool Executor Module — Safe wrapper around central ToolRegistry for agent workflows.
"""

import time
import logging
from dataclasses import dataclass, field
from typing import Dict, Any, Optional

from app.services.ai.tools.common import ToolResult
from app.services.ai.tools.registry import execute_tool
from app.services.ai.agent.agent_context import AgentContext

logger = logging.getLogger(__name__)

@dataclass
class ToolExecutionResult:
    """
    Standardized execution result wrapper returned by ToolExecutor.
    """
    tool_name: str
    success: bool
    data: Dict[str, Any] = field(default_factory=dict)
    error: Optional[str] = None
    warnings: list = field(default_factory=list)
    latency_ms: float = 0.0
    cache_hit: bool = False

    def to_dict(self) -> dict:
        return {
            "tool_name": self.tool_name,
            "success": self.success,
            "data": self.data,
            "error": self.error,
            "warnings": self.warnings,
            "latency_ms": round(self.latency_ms, 3),
            "cache_hit": self.cache_hit,
        }


class ToolExecutor:
    """
    Tool Executor encapsulating tool invocation via central ToolRegistry.
    """

    @staticmethod
    def execute(tool_name: str, ctx: AgentContext, use_cache: bool = True, **kwargs) -> ToolExecutionResult:
        """
        Executes a registered tool safely via ToolRegistry.
        Injects company_id from AgentContext if omitted.
        """
        start = time.monotonic()
        
        # Merge context parameters
        exec_kwargs = dict(kwargs)
        if "company_id" not in exec_kwargs and ctx.company_id:
            exec_kwargs["company_id"] = ctx.company_id

        try:
            raw_res: ToolResult = execute_tool(tool_name, use_cache=use_cache, **exec_kwargs)
            elapsed_ms = (time.monotonic() - start) * 1000

            cache_hit = bool(raw_res.metadata.get("cache_hit", False))

            return ToolExecutionResult(
                tool_name=tool_name,
                success=raw_res.success,
                data=raw_res.data if isinstance(raw_res.data, dict) else {"result": raw_res.data},
                error=raw_res.error,
                warnings=raw_res.warnings,
                latency_ms=elapsed_ms,
                cache_hit=cache_hit
            )
        except Exception as e:
            elapsed_ms = (time.monotonic() - start) * 1000
            logger.error("ToolExecutor caught exception for tool=%s: %s", tool_name, str(e), exc_info=True)
            return ToolExecutionResult(
                tool_name=tool_name,
                success=False,
                data={},
                error=str(e),
                latency_ms=elapsed_ms,
                cache_hit=False
            )
