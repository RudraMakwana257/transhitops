"""
Model Registry Module — Registers model metadata and integrates with CapabilityRegistry.
"""

import logging
from dataclasses import dataclass
from typing import Dict, List, Optional
from app.services.ai.providers.capability_registry import ModelCapability, CapabilityRegistry

logger = logging.getLogger(__name__)

@dataclass
class ModelMetadata:
    """
    Metadata representation of an LLM model available in the ecosystem.
    """
    model_id: str
    provider_name: str
    tier: str
    context_window: int
    capabilities: ModelCapability

    def to_dict(self) -> dict:
        return {
            "model_id": self.model_id,
            "provider_name": self.provider_name,
            "tier": self.tier,
            "context_window": self.context_window,
            "capabilities": self.capabilities.to_dict(),
        }


class ModelRegistry:
    """
    Central catalog of registered models and their capabilities.
    """
    def __init__(self, capability_registry: Optional[CapabilityRegistry] = None):
        self.capability_registry = capability_registry or CapabilityRegistry()
        self._models: Dict[str, ModelMetadata] = {}

        # Default model registrations
        self._seed_default_models()

    def _seed_default_models(self) -> None:
        # 1. Llama 3.3 70B (Balanced)
        cap_70b = ModelCapability(
            model_id="llama-3.3-70b-versatile",
            provider_name="groq",
            display_name="Llama 3.3 70B Versatile",
            context_window=128000,
            max_output_tokens=4096,
            supports_tools=True,
            supports_streaming=True,
            input_cost_per_1k=0.00059,
            output_cost_per_1k=0.00079,
            latency_score=1.2,
            quality_score=4.6,
            is_local=False
        )
        self.register_model(
            ModelMetadata(
                model_id="llama-3.3-70b-versatile",
                provider_name="groq",
                tier="balanced",
                context_window=128000,
                capabilities=cap_70b
            )
        )

        # 2. Llama 3.1 8B (Fast)
        cap_8b = ModelCapability(
            model_id="llama-3.1-8b-instant",
            provider_name="groq",
            display_name="Llama 3.1 8B Instant",
            context_window=128000,
            max_output_tokens=2048,
            supports_tools=True,
            supports_streaming=True,
            input_cost_per_1k=0.00005,
            output_cost_per_1k=0.00008,
            latency_score=0.4,
            quality_score=3.8,
            is_local=False
        )
        self.register_model(
            ModelMetadata(
                model_id="llama-3.1-8b-instant",
                provider_name="groq",
                tier="fast",
                context_window=128000,
                capabilities=cap_8b
            )
        )

    def register_model(self, model_meta: ModelMetadata) -> None:
        """Registers a model metadata entry and syncs with capability registry."""
        self._models[model_meta.model_id] = model_meta
        self.capability_registry.register(model_meta.capabilities)

    def get_model(self, model_id: str) -> Optional[ModelMetadata]:
        """Gets metadata for a specific model ID."""
        return self._models.get(model_id)

    def get_models_by_tier(self, tier: str) -> List[ModelMetadata]:
        """Lists models matching a performance tier ('fast', 'balanced', 'high_reasoning')."""
        return [m for m in self._models.values() if m.tier == tier]

    def list_all_models(self) -> List[str]:
        """Lists all registered model IDs."""
        return list(self._models.keys())
