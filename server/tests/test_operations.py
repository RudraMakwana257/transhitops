import time
import pytest
from app.services.ai.operations.configuration_manager import ConfigurationManager, ConfigSnapshot
from app.services.ai.operations.feature_flags import FeatureFlagManager
from app.services.ai.operations.quota_manager import QuotaManager
from app.services.ai.operations.audit_logger import AuditLogger, AuditEvent
from app.services.ai.operations.tracing import Tracer, Span, TraceContext
from app.services.ai.operations.observability import MetricsCollector
from app.services.ai.operations.health_service import HealthService, HealthState
from app.services.ai.operations.deployment_profile import DeploymentProfile
from app.services.ai.operations.diagnostics import DiagnosticRunner, DiagnosticReport


# 1. Configuration Tests
def test_configuration_manager_defaults_and_updates():
    cm = ConfigurationManager()
    snap = cm.get_snapshot()
    assert snap.version >= 1
    assert cm.get_setting("ai", "default_temperature") == 0.2

    new_snap = cm.set_setting("ai", "default_temperature", 0.5)
    assert new_snap.version > snap.version
    assert cm.get_setting("ai", "default_temperature") == 0.5


def test_configuration_hot_reload():
    cm = ConfigurationManager()
    v1 = cm.get_snapshot().version
    v2 = cm.reload().version
    assert v2 > v1


# 2. Feature Flags Tests
def test_feature_flag_manager_toggles():
    ff = FeatureFlagManager()
    assert ff.is_model_enabled("llama-3.3-70b-versatile") is True

    ff.disable_model("llama-3.3-70b-versatile")
    assert ff.is_model_enabled("llama-3.3-70b-versatile") is False

    ff.enable_model("llama-3.3-70b-versatile")
    assert ff.is_model_enabled("llama-3.3-70b-versatile") is True


def test_feature_flag_tool_and_cache_toggles():
    ff = FeatureFlagManager()
    assert ff.is_tool_enabled("vehicle.summary") is True
    ff.disable_tool("vehicle.summary")
    assert ff.is_tool_enabled("vehicle.summary") is False

    assert ff.is_cache_enabled() is True
    ff.disable_cache()
    assert ff.is_cache_enabled() is False


# 3. Tenant Quota Manager Tests
def test_quota_manager_check_and_commit():
    qm = QuotaManager()
    assert qm.check_quota("company_test", estimated_tokens=100) is True

    usage = qm.commit("company_test", tokens_used=500, cost_usd=0.005, tool_calls=2)
    assert usage.tokens_used == 500
    assert usage.usd_spent == 0.005
    assert usage.requests_count == 1

    summary = qm.summary("company_test")
    assert summary["tokens_used"] == 500


def test_quota_manager_limit_exceeded():
    qm = QuotaManager()
    # High USD request exceeding default $100.0 limit
    assert qm.check_quota("company_test", estimated_cost_usd=150.0) is False


# 4. Audit Logger Tests
def test_audit_logger_hash_chaining():
    logger = AuditLogger()
    e1 = logger.record_event("PROMPT_BLOCKED", tenant_id="comp_1", user_id="user_1")
    e2 = logger.record_event("TOOL_EXECUTED", tenant_id="comp_1", user_id="user_1")

    events = logger.sink.get_events("comp_1")
    assert len(events) == 2
    assert events[0].event_hash != ""
    assert events[1].prev_hash == events[0].event_hash  # Tamper-evident hash chain


# 5. Distributed Tracing Tests
def test_w3c_trace_context_formatting():
    ctx = TraceContext(trace_id="1234567890abcdef1234567890abcdef", parent_span_id="1122334455667788")
    header = ctx.to_w3c_header("9988776655443322")
    assert header == "00-1234567890abcdef1234567890abcdef-9988776655443322-01"

    parsed = TraceContext.from_w3c_header(header)
    assert parsed.trace_id == "1234567890abcdef1234567890abcdef"


def test_tracer_span_creation():
    tracer = Tracer()
    with tracer.start_span("test_span", attributes={"env": "test"}) as span:
        time.sleep(0.01)
        span.attributes["result"] = "ok"

    spans = tracer.backend.get_spans(span.trace_id)
    assert len(spans) == 1
    assert spans[0].name == "test_span"
    assert spans[0].duration_ms > 0.0
    assert spans[0].status == "OK"


# 6. Observability Metrics Tests
def test_metrics_collector_export():
    metrics = MetricsCollector()
    metrics.record_request(status="200_OK", intent="VEHICLE")
    metrics.record_tool_call(tool_name="vehicle.summary", latency_ms=15.0, success=True)
    metrics.record_cache_event(hit=True)
    metrics.record_tokens(prompt_tokens=100, completion_tokens=20, model="llama-3.3-70b-versatile")

    exported = metrics.export_metrics()
    assert "ai_requests_total{intent=\"VEHICLE\",status=\"200_OK\"}" in exported["counters"]
    assert "cache_hits_total" in exported["counters"]
    assert "tool_latency_ms{tool=\"vehicle.summary\"}" in exported["histograms"]


# 7. Health Service Tests
def test_health_service_liveness_and_readiness(app):
    with app.app_context():
        hs = HealthService()
        liveness = hs.check_liveness()
        assert liveness.state == HealthState.HEALTHY

        readiness = hs.check_readiness()
        assert readiness["overall_state"] in ("HEALTHY", "DEGRADED")
        assert len(readiness["components"]) >= 2


# 8. Deployment Profile Tests
def test_deployment_profile_lifecycle():
    profile = DeploymentProfile(grace_period_seconds=1.0)
    assert profile.is_shutting_down is False

    cleaned_up = False
    def sample_cleanup():
        nonlocal cleaned_up
        cleaned_up = True

    profile.register_cleanup_task(sample_cleanup)
    profile.shutdown()

    assert profile.is_shutting_down is True
    assert cleaned_up is True


# 9. Diagnostics Runner Tests
def test_diagnostics_runner_pass(app):
    with app.app_context():
        report = DiagnosticRunner.run_diagnostics()
        assert isinstance(report, DiagnosticReport)
        assert report.overall_status in ("PASS", "WARN")
        assert "provider_registry" in report.component_details
        assert "tool_registry" in report.component_details
