"""
Capability Registry Module — Defines ModelCapability and CapabilityRegistry.
"""

import logging
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Any

logger = logging.getLogger(__name__)

@dataclass
class ModelCapability:
    """
    Metadata representation of model capabilities and operational traits.
    Drives deterministic model routing.
    """
    model_id: str
    provider_name: str
    display_name: str
    context_window: int = 128000
    max_output_tokens: int = 4096
    supports_tools: bool = True
    supports_streaming: bool = True
    supports_vision: bool = False
    supports_json: bool = True
    supports_structured_output: bool = True
    latency_score: float = 1.0     # 0.1 = ultra fast, 5.0 = heavy
    quality_score: float = 4.5     # 1.0 = basic, 5.0 = state-of-the-art
    input_cost_per_1k: float = 0.00059
    output_cost_per_1k: float = 0.00079
    is_local: bool = False

    def to_dict(self) -> dict:
        return {
            "model_id": self.model_id,
            "provider_name": self.provider_name,
            "display_name": self.display_name,
            "context_window": self.context_window,
            "max_output_tokens": self.max_output_tokens,
            "supports_tools": self.supports_tools,
            "supports_streaming": self.supports_streaming,
            "supports_vision": self.supports_vision,
            "supports_json": self.supports_json,
            "supports_structured_output": self.supports_structured_output,
            "latency_score": self.latency_score,
            "quality_score": self.quality_score,
            "input_cost_per_1k": self.input_cost_per_1k,
            "output_cost_per_1k": self.output_cost_per_1k,
            "is_local": self.is_local,
        }


class CapabilityRegistry:
    """
    Central, non-magical CapabilityRegistry for querying model features.
    """
    def __init__(self):
        self._capabilities: Dict[str, ModelCapability] = {}

    def register(self, capability: ModelCapability) -> None:
        """Registers a model's capabilities."""
        self._capabilities[capability.model_id] = capability

    def get(self, model_id: str) -> Optional[ModelCapability]:
        """Gets capability definition for a specific model ID."""
        return self._capabilities.get(model_id)

    def list(self) -> List[ModelCapability]:
        """Lists all registered model capabilities."""
        return list(self._capabilities.values())

    def filter_by_capabilities(
        self,
        requires_tools: bool = False,
        requires_vision: bool = False,
        requires_streaming: bool = False,
        max_latency_score: Optional[float] = None
    ) -> List[ModelCapability]:
        """Filters registered models matching specified criteria."""
        filtered = []
        for cap in self._capabilities.values():
            if requires_tools and not cap.supports_tools:
                continue
            if requires_vision and not cap.supports_vision:
                continue
            if requires_streaming and not cap.supports_streaming:
                continue
            if max_latency_score is not None and cap.latency_score > max_latency_score:
                continue
            filtered.append(cap)
        return filtered
