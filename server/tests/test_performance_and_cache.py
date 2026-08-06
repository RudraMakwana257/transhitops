import time
import pytest
from app.services.ai.performance.tool_cache import (
    CachePolicy,
    generate_cache_key,
    InMemoryToolCache,
    CacheEntry
)
from app.services.ai.performance.metrics_collector import (
    AIMetricsCollector,
    RequestMetrics,
    PerformanceReport
)
from app.services.ai.tools.registry import (
    execute_tool,
    invalidate_tool,
    invalidate_company_tools,
    clear_cache
)


def test_cache_policy_ttl_resolution():
    policy = CachePolicy()
    assert policy.get_ttl_for_tool("vehicle.summary") == 60
    assert policy.get_ttl_for_tool("analytics.dashboard") == 120
    assert policy.get_ttl_for_tool("maintenance.open") == 30
    assert policy.get_ttl_for_tool("unknown.tool", category="driver") == 60
    assert policy.get_ttl_for_tool("unknown.tool", category="unknown") == 60


def test_deterministic_cache_key_generation():
    key1 = generate_cache_key("vehicle.summary", company_id="comp_123", arg_b="test", arg_a=1)
    key2 = generate_cache_key("vehicle.summary", company_id="comp_123", arg_a=1, arg_b="test")
    key_other_company = generate_cache_key("vehicle.summary", company_id="comp_999", arg_a=1, arg_b="test")

    assert key1 == key2  # Deterministic sorting
    assert key1 != key_other_company  # Tenant isolation


def test_in_memory_tool_cache_operations():
    cache = InMemoryToolCache()
    cache.set("key_1", "value_1", ttl_seconds=60, tool_name="tool_a", company_id="comp_a")
    
    assert cache.get("key_1") == "value_1"

    # Test tool invalidation
    cache.invalidate_tool("tool_a", company_id="comp_a")
    assert cache.get("key_1") is None


def test_company_invalidation():
    cache = InMemoryToolCache()
    cache.set("k1", "v1", ttl_seconds=60, tool_name="tool_a", company_id="comp_x")
    cache.set("k2", "v2", ttl_seconds=60, tool_name="tool_b", company_id="comp_x")
    cache.set("k3", "v3", ttl_seconds=60, tool_name="tool_a", company_id="comp_y")

    cache.invalidate_company_tools("comp_x")
    assert cache.get("k1") is None
    assert cache.get("k2") is None
    assert cache.get("k3") == "v3"


def test_execute_tool_caching_and_hit_tracking(app, seed_data):
    with app.app_context():
        company_a = seed_data["company_a_id"]
        clear_cache()

        # First execution -> Cache MISS
        res1 = execute_tool("vehicle.summary", company_id=company_a)
        assert res1.success is True
        assert res1.metadata.get("cache_hit") is False

        # Second execution -> Cache HIT
        res2 = execute_tool("vehicle.summary", company_id=company_a)
        assert res2.success is True
        assert res2.metadata.get("cache_hit") is True
        assert res2.data == res1.data

        # Invalidate cache for company_a
        invalidate_company_tools(company_a)

        # Third execution after invalidation -> Cache MISS
        res3 = execute_tool("vehicle.summary", company_id=company_a)
        assert res3.success is True
        assert res3.metadata.get("cache_hit") is False


def test_ai_metrics_collector_and_performance_report():
    collector = AIMetricsCollector()
    req1 = RequestMetrics(request_id="req_1", intent="VEHICLE", cache_hit=True, tool_ms=1.5, prompt_ms=0.5, groq_ms=250.0, total_ms=255.0)
    req2 = RequestMetrics(request_id="req_2", intent="DRIVER", cache_miss=True, tool_ms=3.0, prompt_ms=0.5, groq_ms=300.0, total_ms=305.0)

    collector.record_request(req1)
    collector.record_request(req2)

    report = collector.generate_performance_report()
    assert report.total_requests == 2
    assert report.cache_hits == 1
    assert report.cache_misses == 1
    assert report.cache_hit_rate == 50.0
    assert report.average_llm_latency_ms == 275.0
    assert report.average_total_request_latency_ms == 280.0
