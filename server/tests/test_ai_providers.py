import time
import pytest
from unittest.mock import MagicMock

from app.services.ai.providers.base_provider import BaseLLMProvider, LLMResponse
from app.services.ai.providers.capability_registry import CapabilityRegistry, ModelCapability
from app.services.ai.providers.model_registry import ModelRegistry, ModelMetadata
from app.services.ai.providers.response_normalizer import ResponseNormalizer
from app.services.ai.providers.health_monitor import HealthMonitor, CircuitState, CircuitBreaker
from app.services.ai.providers.cost_tracker import CostTracker
from app.services.ai.providers.provider_selector import ProviderSelector
from app.services.ai.providers.provider_registry import ProviderRegistry
from app.services.ai.providers.provider_router import ProviderRouter
from app.services.ai.providers.fallback_manager import FallbackManager
from app.services.ai.providers.groq_provider import GroqProvider


class DummyMockProvider(BaseLLMProvider):
    def __init__(self, should_fail: bool = False):
        self.should_fail = should_fail

    def chat(self, system_prompt: str, messages: list, model_name: str, **kwargs) -> LLMResponse:
        if self.should_fail:
            raise RuntimeError("Simulated Mock Provider API Error")
        return LLMResponse(
            content="Mock response content",
            provider_name="mock",
            model_name=model_name,
            prompt_tokens=100,
            completion_tokens=20,
            total_tokens=120,
            estimated_cost_usd=0.0001,
            latency_ms=45.0
        )

    def stream_chat(self, system_prompt: str, messages: list, model_name: str, **kwargs):
        yield "Mock stream token"

    def health_check(self) -> bool:
        return not self.should_fail

    def estimate_cost(self, prompt_tokens: int, completion_tokens: int, model_name: str) -> float:
        return 0.0001


def test_llm_response_structure():
    res = LLMResponse(
        content="Test content",
        provider_name="test_p",
        model_name="test_m",
        prompt_tokens=50,
        completion_tokens=10,
        total_tokens=60,
        estimated_cost_usd=0.00005,
        latency_ms=12.5
    )
    d = res.to_dict()
    assert d["content"] == "Test content"
    assert d["provider_name"] == "test_p"
    assert d["total_tokens"] == 60


def test_capability_registry():
    cap_reg = CapabilityRegistry()
    cap = ModelCapability(model_id="m1", provider_name="p1", display_name="M1", latency_score=0.5)
    cap_reg.register(cap)

    assert cap_reg.get("m1") == cap
    assert len(cap_reg.list()) == 1

    fast_models = cap_reg.filter_by_capabilities(max_latency_score=1.0)
    assert len(fast_models) == 1
    assert fast_models[0].model_id == "m1"


def test_model_registry():
    mod_reg = ModelRegistry()
    assert mod_reg.get_model("llama-3.3-70b-versatile") is not None
    assert mod_reg.get_model("llama-3.1-8b-instant") is not None

    fast_tier = mod_reg.get_models_by_tier("fast")
    assert len(fast_tier) >= 1
    assert fast_tier[0].model_id == "llama-3.1-8b-instant"


def test_response_normalizer():
    raw_mock = MagicMock()
    raw_mock.choices = [MagicMock()]
    raw_mock.choices[0].message.content = "Normalized Groq text"
    raw_mock.choices[0].finish_reason = "stop"
    raw_mock.usage.prompt_tokens = 40
    raw_mock.usage.completion_tokens = 10
    raw_mock.usage.total_tokens = 50

    norm = ResponseNormalizer.normalize_groq_response(
        raw_response=raw_mock,
        model_name="llama-3.3-70b-versatile",
        latency_ms=50.0,
        estimated_cost_usd=0.0001
    )
    assert norm.content == "Normalized Groq text"
    assert norm.prompt_tokens == 40
    assert norm.completion_tokens == 10
    assert norm.provider_name == "groq"


def test_circuit_breaker_and_health_monitor():
    hm = HealthMonitor(failure_threshold=2, reset_timeout_seconds=0.1)
    assert hm.is_healthy("groq") is True
    assert hm.get_state("groq") == "CLOSED"

    # Trip breaker
    hm.record_failure("groq")
    hm.record_failure("groq")
    assert hm.get_state("groq") == "OPEN"
    assert hm.is_healthy("groq") is False

    # Wait for timeout to hit HALF_OPEN
    time.sleep(0.15)
    assert hm.is_healthy("groq") is True  # Half open allows canary call
    assert hm.get_state("groq") == "HALF_OPEN"

    # Record success resets to CLOSED
    hm.record_success("groq")
    assert hm.get_state("groq") == "CLOSED"


def test_cost_tracker():
    tracker = CostTracker()
    tracker.record("comp_a", "user_1", "sess_1", "groq", "llama-3.3-70b-versatile", 100, 20, 0.0001)
    tracker.record("comp_a", "user_1", "sess_1", "groq", "llama-3.3-70b-versatile", 200, 30, 0.0002)
    tracker.record("comp_b", "user_2", "sess_2", "groq", "llama-3.1-8b-instant", 50, 10, 0.00001)

    sum_a = tracker.summary("comp_a")
    assert sum_a["total_requests"] == 2
    assert sum_a["total_tokens"] == 350
    assert sum_a["total_cost_usd"] == 0.0003

    sum_all = tracker.summary()
    assert sum_all["total_requests"] == 3


def test_provider_selector():
    selector = ProviderSelector()
    
    # Fast intent -> 8b instant
    model_v = selector.select_model_for_intent("VEHICLE")
    assert model_v.model_id == "llama-3.1-8b-instant"

    # Complex intent -> 70b versatile
    model_g = selector.select_model_for_intent("GENERAL")
    assert model_g.model_id == "llama-3.3-70b-versatile"


def test_provider_router_and_execution():
    p_reg = ProviderRegistry()
    dummy = DummyMockProvider(should_fail=False)
    p_reg.register_provider("groq", dummy)

    router = ProviderRouter(provider_registry=p_reg)
    res = router.execute_chat(
        system_prompt="Test system",
        messages=[{"role": "user", "content": "Hello"}],
        intent_str="VEHICLE",
        company_id="comp_a"
    )
    assert res.content == "Mock response content"
    assert res.provider_name == "mock"


def test_fallback_manager_failover():
    p_reg = ProviderRegistry()
    
    # Provider that fails on first model but succeeds on fallback
    class DualBehaviorProvider(BaseLLMProvider):
        def chat(self, system_prompt: str, messages: list, model_name: str, **kwargs) -> LLMResponse:
            if model_name == "llama-3.3-70b-versatile":
                raise RuntimeError("Primary 70B model API timeout")
            return LLMResponse(
                content="Fallback 8B response",
                provider_name="groq",
                model_name=model_name,
                prompt_tokens=50,
                completion_tokens=10,
                total_tokens=60,
                estimated_cost_usd=0.00001,
                latency_ms=15.0
            )

        def stream_chat(self, *args, **kwargs): yield ""
        def health_check(self) -> bool: return True
        def estimate_cost(self, *args) -> float: return 0.0

    p_reg.register_provider("groq", DualBehaviorProvider())
    router = ProviderRouter(provider_registry=p_reg)
    fm = FallbackManager(provider_router=router)

    res = fm.execute_chat(
        system_prompt="Test system",
        messages=[{"role": "user", "content": "Test"}],
        intent_str="GENERAL"  # Primary maps to 70B (fails) -> Fallback maps to 8B (succeeds)
    )
    assert res.content == "Fallback 8B response"
    assert res.model_name == "llama-3.1-8b-instant"


def test_fallback_manager_total_failure_graceful_response():
    p_reg = ProviderRegistry()
    dummy_failing = DummyMockProvider(should_fail=True)
    p_reg.register_provider("groq", dummy_failing)

    router = ProviderRouter(provider_registry=p_reg)
    fm = FallbackManager(provider_router=router)

    res = fm.execute_chat(
        system_prompt="Test system",
        messages=[{"role": "user", "content": "Test"}],
        intent_str="GENERAL"
    )
    assert "temporarily unavailable" in res.content
    assert res.finish_reason == "fallback"
