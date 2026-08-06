"""
Base LLM Provider Interface and Unified LLMResponse Data Transfer Object.
"""

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import List, Dict, Any, Optional, Iterator

@dataclass
class LLMResponse:
    """
    Unified, provider-agnostic response object.
    Normalized from raw vendor payloads (Groq, OpenAI, Anthropic, Gemini, Ollama).
    """
    content: str
    provider_name: str
    model_name: str
    prompt_tokens: int
    completion_tokens: int
    total_tokens: int
    estimated_cost_usd: float
    latency_ms: float
    finish_reason: str = "stop"
    tool_calls: List[Dict[str, Any]] = field(default_factory=list)
    raw_response: Optional[Any] = None

    def to_dict(self) -> dict:
        return {
            "content": self.content,
            "provider_name": self.provider_name,
            "model_name": self.model_name,
            "prompt_tokens": self.prompt_tokens,
            "completion_tokens": self.completion_tokens,
            "total_tokens": self.total_tokens,
            "estimated_cost_usd": self.estimated_cost_usd,
            "latency_ms": self.latency_ms,
            "finish_reason": self.finish_reason,
            "tool_calls": self.tool_calls,
        }


class BaseLLMProvider(ABC):
    """
    Abstract Base Class for all LLM Provider implementations.
    Guarantees a uniform interface across Cloud and Local providers.
    """

    @abstractmethod
    def chat(
        self,
        system_prompt: str,
        messages: List[Dict[str, str]],
        model_name: str,
        temperature: float = 0.2,
        max_tokens: int = 1024,
        timeout_seconds: float = 5.0
    ) -> LLMResponse:
        """Executes a synchronous chat completion."""
        pass

    @abstractmethod
    def stream_chat(
        self,
        system_prompt: str,
        messages: List[Dict[str, str]],
        model_name: str,
        temperature: float = 0.2,
        max_tokens: int = 1024,
        timeout_seconds: float = 5.0
    ) -> Iterator[str]:
        """Streams completion tokens (for SSE endpoints)."""
        pass

    @abstractmethod
    def health_check(self) -> bool:
        """Verifies API key validity and provider endpoint responsiveness."""
        pass

    @abstractmethod
    def estimate_cost(self, prompt_tokens: int, completion_tokens: int, model_name: str) -> float:
        """Calculates estimated request cost in USD."""
        pass
