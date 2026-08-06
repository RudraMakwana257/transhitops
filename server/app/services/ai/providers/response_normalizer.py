"""
Response Normalizer Module — Parses vendor-specific LLM completion payloads into standardized LLMResponse DTOs.
"""

import logging
from typing import Any, Dict
from app.services.ai.providers.base_provider import LLMResponse

logger = logging.getLogger(__name__)

class ResponseNormalizer:
    """
    Normalizes provider-specific API response payloads into a unified LLMResponse schema.
    Encapsulates vendor parsing logic away from business services.
    """

    @staticmethod
    def normalize_groq_response(
        raw_response: Any,
        model_name: str,
        latency_ms: float,
        estimated_cost_usd: float = 0.0
    ) -> LLMResponse:
        """Parses a raw Groq API chat completion object."""
        try:
            choice = raw_response.choices[0]
            message = choice.message
            content = str(message.content or "")
            finish_reason = getattr(choice, "finish_reason", "stop") or "stop"

            prompt_tokens = 0
            completion_tokens = 0
            total_tokens = 0

            if hasattr(raw_response, "usage") and raw_response.usage:
                prompt_tokens = getattr(raw_response.usage, "prompt_tokens", 0) or 0
                completion_tokens = getattr(raw_response.usage, "completion_tokens", 0) or 0
                total_tokens = getattr(raw_response.usage, "total_tokens", 0) or (prompt_tokens + completion_tokens)

            tool_calls = []
            if hasattr(message, "tool_calls") and message.tool_calls:
                for tc in message.tool_calls:
                    tool_calls.append({
                        "id": getattr(tc, "id", ""),
                        "name": getattr(getattr(tc, "function", None), "name", ""),
                        "arguments": getattr(getattr(tc, "function", None), "arguments", ""),
                    })

            return LLMResponse(
                content=content,
                provider_name="groq",
                model_name=model_name,
                prompt_tokens=prompt_tokens,
                completion_tokens=completion_tokens,
                total_tokens=total_tokens,
                estimated_cost_usd=estimated_cost_usd,
                latency_ms=round(latency_ms, 3),
                finish_reason=finish_reason,
                tool_calls=tool_calls,
                raw_response=raw_response
            )
        except Exception as e:
            logger.error("Error normalizing Groq response: %s", str(e), exc_info=True)
            return LLMResponse(
                content=str(getattr(raw_response, 'content', '')),
                provider_name="groq",
                model_name=model_name,
                prompt_tokens=0,
                completion_tokens=0,
                total_tokens=0,
                estimated_cost_usd=estimated_cost_usd,
                latency_ms=round(latency_ms, 3),
                finish_reason="error",
                raw_response=raw_response
            )
