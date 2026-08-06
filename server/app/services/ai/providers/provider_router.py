"""
Provider Router Module — Orchestrates model selection, execution, metrics tracking, and cost accounting.
"""

import logging
from typing import List, Dict, Any, Optional
from app.services.ai.providers.base_provider import LLMResponse
from app.services.ai.providers.provider_registry import ProviderRegistry
from app.services.ai.providers.provider_selector import ProviderSelector
from app.services.ai.providers.health_monitor import HealthMonitor
from app.services.ai.providers.cost_tracker import CostTracker

logger = logging.getLogger(__name__)

class ProviderRouter:
    """
    Orchestrates provider execution:
    Intent -> ProviderSelector -> HealthCheck -> Provider Execution -> CostTracker -> Normalized LLMResponse.
    """
    def __init__(
        self,
        provider_registry: Optional[ProviderRegistry] = None,
        provider_selector: Optional[ProviderSelector] = None,
        health_monitor: Optional[HealthMonitor] = None,
        cost_tracker: Optional[CostTracker] = None
    ):
        self.provider_registry = provider_registry or ProviderRegistry()
        self.provider_selector = provider_selector or ProviderSelector()
        self.health_monitor = health_monitor or HealthMonitor()
        self.cost_tracker = cost_tracker or CostTracker()

    def execute_chat(
        self,
        system_prompt: str,
        messages: List[Dict[str, str]],
        intent_str: str = "GENERAL",
        company_id: Optional[str] = None,
        user_id: Optional[str] = None,
        session_id: Optional[str] = None,
        override_model_id: Optional[str] = None,
        temperature: float = 0.2,
        max_tokens: int = 1024
    ) -> LLMResponse:
        """
        Executes a chat completion via the optimal, healthy provider.
        """
        if override_model_id:
            model_meta = self.provider_selector.model_registry.get_model(override_model_id)
        else:
            model_meta = self.provider_selector.select_model_for_intent(intent_str)

        if not model_meta:
            raise RuntimeError(f"No registered model found for ID/intent '{override_model_id or intent_str}'.")

        provider_name = model_meta.provider_name
        model_id = model_meta.model_id

        # 1. Health check / Circuit Breaker
        if not self.health_monitor.is_healthy(provider_name):
            raise RuntimeError(f"Provider '{provider_name}' is currently marked unhealthy (Circuit Breaker OPEN).")

        provider = self.provider_registry.get_provider(provider_name)
        if not provider:
            raise RuntimeError(f"Provider '{provider_name}' is not registered in ProviderRegistry.")

        try:
            # 2. Execute chat
            response = provider.chat(
                system_prompt=system_prompt,
                messages=messages,
                model_name=model_id,
                temperature=temperature,
                max_tokens=max_tokens
            )

            # 3. Record success in HealthMonitor and CostTracker
            self.health_monitor.record_success(provider_name)
            self.cost_tracker.record(
                company_id=str(company_id or "global"),
                user_id=str(user_id or "anonymous"),
                session_id=str(session_id or "default"),
                provider_name=provider_name,
                model_name=model_id,
                prompt_tokens=response.prompt_tokens,
                completion_tokens=response.completion_tokens,
                cost_usd=response.estimated_cost_usd
            )

            return response
        except Exception as e:
            self.health_monitor.record_failure(provider_name)
            logger.error("ProviderRouter execution failed for provider=%s model=%s: %s", provider_name, model_id, str(e))
            raise e
