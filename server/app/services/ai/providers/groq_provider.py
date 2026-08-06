"""
Groq Provider Module — Singleton implementation of BaseLLMProvider for Groq API.
"""

import os
import time
import logging
from typing import List, Dict, Any, Iterator, Optional
import httpx

from app.services.ai.providers.base_provider import BaseLLMProvider, LLMResponse
from app.services.ai.providers.response_normalizer import ResponseNormalizer

logger = logging.getLogger(__name__)

try:
    from groq import Groq
    GROQ_AVAILABLE = True
except ImportError:
    GROQ_AVAILABLE = False
    Groq = None


class GroqProvider(BaseLLMProvider):
    """
    Singleton Groq API Provider.
    Reuses persistent Groq client instance and connection pool.
    """
    _instance: Optional['GroqProvider'] = None

    def __new__(cls, *args, **kwargs):
        if cls._instance is None:
            cls._instance = super(GroqProvider, cls).__new__(cls)
            cls._instance._client = None
            cls._instance._http_client = None
        return cls._instance

    def _get_client(self) -> Groq:
        if not GROQ_AVAILABLE:
            raise RuntimeError("Groq library not installed. Run: pip install groq")

        api_key = os.getenv('GROQ_API_KEY')
        if not api_key:
            raise ValueError("AI service not configured. Please set GROQ_API_KEY in environment variables.")

        if self._client is None:
            self._http_client = httpx.Client(timeout=10.0)
            self._client = Groq(
                api_key=api_key,
                http_client=self._http_client
            )
        return self._client

    def chat(
        self,
        system_prompt: str,
        messages: List[Dict[str, str]],
        model_name: str = "llama-3.3-70b-versatile",
        temperature: float = 0.2,
        max_tokens: int = 1024,
        timeout_seconds: float = 5.0
    ) -> LLMResponse:
        client = self._get_client()
        start_time = time.monotonic()

        formatted_messages = [{"role": "system", "content": system_prompt}]
        for msg in messages:
            formatted_messages.append({"role": msg["role"], "content": msg["content"]})

        try:
            raw_res = client.chat.completions.create(
                model=model_name,
                messages=formatted_messages,
                temperature=temperature,
                max_tokens=max_tokens
            )
            elapsed_ms = (time.monotonic() - start_time) * 1000
            
            prompt_tokens = getattr(getattr(raw_res, 'usage', None), 'prompt_tokens', 0) or 0
            completion_tokens = getattr(getattr(raw_res, 'usage', None), 'completion_tokens', 0) or 0
            cost = self.estimate_cost(prompt_tokens, completion_tokens, model_name)

            return ResponseNormalizer.normalize_groq_response(
                raw_response=raw_res,
                model_name=model_name,
                latency_ms=elapsed_ms,
                estimated_cost_usd=cost
            )
        except Exception as e:
            elapsed_ms = (time.monotonic() - start_time) * 1000
            logger.error("Groq chat execution failed: %s", str(e))
            raise e

    def stream_chat(
        self,
        system_prompt: str,
        messages: List[Dict[str, str]],
        model_name: str = "llama-3.3-70b-versatile",
        temperature: float = 0.2,
        max_tokens: int = 1024,
        timeout_seconds: float = 5.0
    ) -> Iterator[str]:
        client = self._get_client()
        formatted_messages = [{"role": "system", "content": system_prompt}]
        for msg in messages:
            formatted_messages.append({"role": msg["role"], "content": msg["content"]})

        stream = client.chat.completions.create(
            model=model_name,
            messages=formatted_messages,
            temperature=temperature,
            max_tokens=max_tokens,
            stream=True
        )

        for chunk in stream:
            if chunk.choices and chunk.choices[0].delta and chunk.choices[0].delta.content:
                yield chunk.choices[0].delta.content

    def health_check(self) -> bool:
        try:
            api_key = os.getenv('GROQ_API_KEY')
            return bool(GROQ_AVAILABLE and api_key)
        except Exception:
            return False

    def estimate_cost(self, prompt_tokens: int, completion_tokens: int, model_name: str) -> float:
        # Llama 3.3 70B rates on Groq
        input_rate = 0.00059 / 1000.0
        output_rate = 0.00079 / 1000.0
        if "8b" in model_name.lower():
            input_rate = 0.00005 / 1000.0
            output_rate = 0.00008 / 1000.0

        return (prompt_tokens * input_rate) + (completion_tokens * output_rate)
