"""
Fallback Manager Module — Multi-step failover manager integrating ProviderRouter and HealthMonitor.
"""

import logging
from typing import List, Dict, Any, Optional
from app.services.ai.providers.base_provider import LLMResponse
from app.services.ai.providers.provider_router import ProviderRouter

logger = logging.getLogger(__name__)

class FallbackManager:
    """
    Orchestrates multi-model and multi-provider failover.
    Ensures end-users never receive unhandled vendor stack traces.
    """
    def __init__(self, provider_router: Optional[ProviderRouter] = None):
        self.provider_router = provider_router or ProviderRouter()

    def execute_chat(
        self,
        system_prompt: str,
        messages: List[Dict[str, str]],
        intent_str: str = "GENERAL",
        company_id: Optional[str] = None,
        user_id: Optional[str] = None,
        session_id: Optional[str] = None,
        temperature: float = 0.2,
        max_tokens: int = 1024
    ) -> LLMResponse:
        """
        Attempts execution via Primary Model.
        On failure, falls back to Fast Model.
        On total failure, returns a graceful fallback LLMResponse.
        """
        # 1. Primary Attempt (Model selected based on intent)
        try:
            return self.provider_router.execute_chat(
                system_prompt=system_prompt,
                messages=messages,
                intent_str=intent_str,
                company_id=company_id,
                user_id=user_id,
                session_id=session_id,
                temperature=temperature,
                max_tokens=max_tokens
            )
        except Exception as primary_error:
            logger.warning(
                "Primary model execution failed for intent=%s: %s. Attempting fallback model...",
                intent_str,
                str(primary_error)
            )

        # 2. Secondary Attempt (Fallback to fast model: llama-3.1-8b-instant)
        try:
            return self.provider_router.execute_chat(
                system_prompt=system_prompt,
                messages=messages,
                intent_str="VEHICLE",  # Force fast tier selection
                company_id=company_id,
                user_id=user_id,
                session_id=session_id,
                override_model_id="llama-3.1-8b-instant",
                temperature=temperature,
                max_tokens=max_tokens
            )
        except Exception as secondary_error:
            logger.error("Secondary fallback model execution failed: %s", str(secondary_error))

        # 3. Graceful Fallback DTO (Never crash user experience)
        return LLMResponse(
            content="AI assistant is temporarily unavailable. Please try again in a moment.",
            provider_name="fallback",
            model_name="graceful-fallback",
            prompt_tokens=0,
            completion_tokens=0,
            total_tokens=0,
            estimated_cost_usd=0.0,
            latency_ms=0.0,
            finish_reason="fallback"
        )
