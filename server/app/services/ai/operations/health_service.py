"""
Health Service Module — Pure service providing Liveness, Readiness, and Dependency health probes.
"""

import time
import logging
from enum import Enum
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Dict, List, Any, Optional

logger = logging.getLogger(__name__)

class HealthState(str, Enum):
    HEALTHY = "HEALTHY"
    DEGRADED = "DEGRADED"
    UNHEALTHY = "UNHEALTHY"


@dataclass
class ComponentHealth:
    name: str
    state: HealthState
    message: str = "Component operating normally."
    latency_ms: float = 0.0

    def to_dict(self) -> dict:
        return {
            "name": self.name,
            "state": self.state.value,
            "message": self.message,
            "latency_ms": round(self.latency_ms, 3),
        }


class HealthCheck(ABC):
    """
    Abstract interface for component health probes.
    """
    @abstractmethod
    def check_health(self) -> ComponentHealth:
        pass


class ProviderHealthCheck(HealthCheck):
    def check_health(self) -> ComponentHealth:
        start = time.monotonic()
        try:
            from app.services.ai.providers.provider_registry import ProviderRegistry
            reg = ProviderRegistry()
            providers = reg.list_providers()
            elapsed_ms = (time.monotonic() - start) * 1000
            if providers:
                return ComponentHealth(name="provider_registry", state=HealthState.HEALTHY, message=f"Active providers: {providers}", latency_ms=elapsed_ms)
            return ComponentHealth(name="provider_registry", state=HealthState.DEGRADED, message="No registered providers found.", latency_ms=elapsed_ms)
        except Exception as e:
            elapsed_ms = (time.monotonic() - start) * 1000
            return ComponentHealth(name="provider_registry", state=HealthState.UNHEALTHY, message=str(e), latency_ms=elapsed_ms)


class ToolHealthCheck(HealthCheck):
    def check_health(self) -> ComponentHealth:
        start = time.monotonic()
        try:
            from app.services.ai.tools.registry import list_tools
            tools = list_tools()
            elapsed_ms = (time.monotonic() - start) * 1000
            return ComponentHealth(name="tool_registry", state=HealthState.HEALTHY, message=f"Registered tools: {len(tools)}", latency_ms=elapsed_ms)
        except Exception as e:
            elapsed_ms = (time.monotonic() - start) * 1000
            return ComponentHealth(name="tool_registry", state=HealthState.UNHEALTHY, message=str(e), latency_ms=elapsed_ms)


class HealthService:
    """
    Unified HealthService conducting Liveness, Readiness, and Startup probes.
    """
    def __init__(self, checks: Optional[List[HealthCheck]] = None):
        self._checks: List[HealthCheck] = checks or [
            ProviderHealthCheck(),
            ToolHealthCheck()
        ]

    def check_liveness(self) -> ComponentHealth:
        """Liveness check: verifies process is alive."""
        return ComponentHealth(name="liveness", state=HealthState.HEALTHY, message="AI Backend process is active.")

    def check_readiness(self) -> Dict[str, Any]:
        """Readiness check: probes all registered component health checks."""
        components = [check.check_health() for check in self._checks]
        
        overall_state = HealthState.HEALTHY
        if any(c.state == HealthState.UNHEALTHY for c in components):
            overall_state = HealthState.UNHEALTHY
        elif any(c.state == HealthState.DEGRADED for c in components):
            overall_state = HealthState.DEGRADED

        return {
            "overall_state": overall_state.value,
            "timestamp": time.time(),
            "components": [c.to_dict() for c in components],
        }
