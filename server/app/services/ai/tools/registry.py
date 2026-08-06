import logging
from dataclasses import dataclass, field
from typing import Callable, Dict, Any, List, Optional, Tuple

from app.services.ai.tools.common import ToolResult, safe_tool_execution
from app.services.ai.tools.vehicle_tools import get_vehicle_summary, get_available_vehicles
from app.services.ai.tools.driver_tools import get_driver_summary
from app.services.ai.tools.trip_tools import get_trip_summary
from app.services.ai.tools.maintenance_tools import get_open_maintenance
from app.services.ai.tools.analytics_tools import get_dashboard_metrics
from app.services.ai.performance.tool_cache import (
    InMemoryToolCache,
    generate_cache_key,
    CachePolicy
)

logger = logging.getLogger(__name__)

# Global Tool Result Cache Store
tool_cache = InMemoryToolCache(policy=CachePolicy())

@dataclass
class ToolDefinition:
    """
    Extensible metadata wrapper for a business tool.
    Designed for zero-rewrite compatibility with future Google ADK, MCP, or OpenAI adapters.
    """
    name: str
    description: str
    category: str
    version: str
    function: Callable
    input_schema: Dict[str, Any] = field(default_factory=dict)
    output_schema: Dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> dict:
        return {
            "name": self.name,
            "description": self.description,
            "category": self.category,
            "version": self.version,
            "input_schema": self.input_schema,
            "output_schema": self.output_schema,
        }


# =====================================================================
# CENTRAL TOOL REGISTRY (EXPLICIT MAPPING)
# =====================================================================

TOOL_REGISTRY: Dict[str, ToolDefinition] = {
    "vehicle.summary": ToolDefinition(
        name="vehicle.summary",
        description="Returns vehicle status counts and fleet utilization percentage.",
        category="vehicle",
        version="1.0.0",
        function=get_vehicle_summary,
        input_schema={"type": "object", "properties": {"company_id": {"type": "string"}}, "required": ["company_id"]},
        output_schema={"type": "object", "properties": {"total": {"type": "integer"}, "available": {"type": "integer"}}}
    ),
    "vehicle.available": ToolDefinition(
        name="vehicle.available",
        description="Returns list of vehicles currently available for dispatch.",
        category="vehicle",
        version="1.0.0",
        function=get_available_vehicles,
        input_schema={"type": "object", "properties": {"company_id": {"type": "string"}}, "required": ["company_id"]},
        output_schema={"type": "array", "items": {"type": "object"}}
    ),
    "driver.summary": ToolDefinition(
        name="driver.summary",
        description="Returns driver status counts and license expiration alerts.",
        category="driver",
        version="1.0.0",
        function=get_driver_summary,
        input_schema={"type": "object", "properties": {"company_id": {"type": "string"}}, "required": ["company_id"]},
        output_schema={"type": "object", "properties": {"total": {"type": "integer"}, "available": {"type": "integer"}}}
    ),
    "trip.summary": ToolDefinition(
        name="trip.summary",
        description="Returns active, draft, and completed monthly trip counts.",
        category="trip",
        version="1.0.0",
        function=get_trip_summary,
        input_schema={"type": "object", "properties": {"company_id": {"type": "string"}}, "required": ["company_id"]},
        output_schema={"type": "object", "properties": {"active": {"type": "integer"}}}
    ),
    "maintenance.open": ToolDefinition(
        name="maintenance.open",
        description="Returns count of open or in-progress repair jobs.",
        category="maintenance",
        version="1.0.0",
        function=get_open_maintenance,
        input_schema={"type": "object", "properties": {"company_id": {"type": "string"}}, "required": ["company_id"]},
        output_schema={"type": "object", "properties": {"open_jobs": {"type": "integer"}}}
    ),
    "analytics.dashboard": ToolDefinition(
        name="analytics.dashboard",
        description="Aggregates high-level metrics across vehicles, trips, and maintenance.",
        category="analytics",
        version="1.0.0",
        function=get_dashboard_metrics,
        input_schema={"type": "object", "properties": {"company_id": {"type": "string"}}, "required": ["company_id"]},
        output_schema={"type": "object"}
    ),
}


# =====================================================================
# CACHE MANAGEMENT HELPER FUNCTIONS
# =====================================================================

def invalidate_tool(tool_name: str, company_id: Optional[str] = None) -> None:
    """Invalidates cache entries for a specific tool name."""
    tool_cache.invalidate_tool(tool_name, company_id)


def invalidate_key(key: str) -> None:
    """Invalidates a specific cache key."""
    tool_cache.invalidate_key(key)


def invalidate_company_tools(company_id: str) -> None:
    """Invalidates all cached tool entries for a specific company."""
    tool_cache.invalidate_company_tools(company_id)


def clear_cache() -> None:
    """Clears all entries in tool cache."""
    tool_cache.clear()


def clear_expired_cache() -> int:
    """Clears expired entries from cache and returns count."""
    return tool_cache.clear_expired()


# =====================================================================
# REGISTRY HELPER FUNCTIONS
# =====================================================================

def tool_exists(name: str) -> bool:
    """Checks if a tool is registered."""
    return name in TOOL_REGISTRY


def get_tool_metadata(name: str) -> Optional[Dict[str, Any]]:
    """Returns metadata dict for a registered tool, or None if not found."""
    tool_def = TOOL_REGISTRY.get(name)
    return tool_def.to_dict() if tool_def else None


def list_tools(category: Optional[str] = None) -> List[str]:
    """Lists tool names, optionally filtered by category."""
    if not category:
        return list(TOOL_REGISTRY.keys())
    return [name for name, defn in TOOL_REGISTRY.items() if defn.category == category]


def validate_tool(name: str, **kwargs) -> Tuple[bool, List[str]]:
    """
    Validates parameter inputs for a tool against its registered schema.
    Returns (is_valid, list_of_warning_messages).
    """
    warnings: List[str] = []
    if not tool_exists(name):
        return False, [f"Tool '{name}' is not registered in ToolRegistry."]

    tool_def = TOOL_REGISTRY[name]
    required_params = tool_def.input_schema.get("required", [])

    for param in required_params:
        if param not in kwargs or kwargs[param] is None:
            warnings.append(f"Missing required parameter '{param}' for tool '{name}'.")

    is_valid = len(warnings) == 0
    return is_valid, warnings


def execute_tool(name: str, use_cache: bool = True, **kwargs) -> ToolResult:
    """
    Central dispatcher executing a tool by name with parameter validation,
    deterministic tool caching (outside business tools), and safe exception handling.
    """
    if not tool_exists(name):
        return ToolResult(
            success=False,
            error=f"Tool '{name}' is not registered."
        )

    is_valid, warnings = validate_tool(name, **kwargs)
    if not is_valid:
        return ToolResult(
            success=False,
            warnings=warnings,
            error=f"Validation failed for tool '{name}': {'; '.join(warnings)}"
        )

    tool_def = TOOL_REGISTRY[name]
    company_id = kwargs.get("company_id")
    cache_key = generate_cache_key(name, **kwargs)

    # 1. Check Cache
    if use_cache:
        cached_val = tool_cache.get(cache_key)
        if cached_val is not None and isinstance(cached_val, ToolResult):
            cached_val.metadata["cache_hit"] = True
            cached_val.warnings.extend(warnings)
            return cached_val

    # 2. Cache Miss — Run Tool safely
    result = safe_tool_execution(name, tool_def.function, **kwargs)
    result.warnings.extend(warnings)
    result.metadata["cache_hit"] = False

    # 3. Store in Cache if execution succeeded
    if result.success and use_cache:
        ttl = tool_cache.policy.get_ttl_for_tool(name, tool_def.category)
        tool_cache.set(
            key=cache_key,
            value=result,
            ttl_seconds=ttl,
            tool_name=name,
            company_id=str(company_id or "")
        )

    return result
