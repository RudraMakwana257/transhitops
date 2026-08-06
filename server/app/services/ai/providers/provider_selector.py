"""
Provider Selector Module — Deterministic capability-based model selector.
"""

import logging
from typing import Optional
from app.services.ai.providers.model_registry import ModelRegistry, ModelMetadata

logger = logging.getLogger(__name__)

class ProviderSelector:
    """
    Selects the optimal model ID and provider based on task intent and capability requirements.
    """
    def __init__(self, model_registry: Optional[ModelRegistry] = None):
        self.model_registry = model_registry or ModelRegistry()

    def select_model_for_intent(self, intent_str: str) -> ModelMetadata:
        """
        Deterministically maps intent to performance tier and selects the best healthy model.
        Fast intents (VEHICLE, DRIVER) -> 'fast' tier (8B instant).
        Complex intents (ANALYTICS, TRIP, GENERAL) -> 'balanced' tier (70B versatile).
        """
        clean_intent = (intent_str or "GENERAL").strip().upper()

        if clean_intent in ("VEHICLE", "DRIVER"):
            target_tier = "fast"
        else:
            target_tier = "balanced"

        models = self.model_registry.get_models_by_tier(target_tier)
        if models:
            selected = models[0]
            logger.info("provider_selector intent=%s tier=%s -> model=%s", clean_intent, target_tier, selected.model_id)
            return selected

        # Fallback to default versatile model if tier not found
        default_model = self.model_registry.get_model("llama-3.3-70b-versatile")
        if not default_model:
            all_models = self.model_registry.list_all_models()
            default_model = self.model_registry.get_model(all_models[0])
            
        return default_model
