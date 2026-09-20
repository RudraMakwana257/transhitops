"""
Automated Production Smoke Test Suite for Phase 10 Beta Launch Validation.
Verifies all 9 phases of the AI Backend end-to-end.
"""

import pytest
from app.services.ai.agent.agent_runtime import AgentRuntime
from app.services.ai.operations.health_service import HealthService
from app.services.ai.operations.diagnostics import DiagnosticRunner
from app.services.ai.operations.feature_flags import FeatureFlagManager
from app.services.ai.operations.quota_manager import QuotaManager
from app.services.ai.providers.provider_registry import ProviderRegistry
from app.services.ai.tools.registry import list_tools


def test_smoke_health_probes(app):
    with app.app_context():
        hs = HealthService()
        live = hs.check_liveness()
        assert live.state.value == "HEALTHY"

        ready = hs.check_readiness()
        assert ready["overall_state"] in ("HEALTHY", "DEGRADED")


def test_smoke_diagnostics_report(app):
    with app.app_context():
        report = DiagnosticRunner.run_diagnostics()
        assert report.overall_status in ("PASS", "WARN")
        assert "provider_registry" in report.component_details
        assert "tool_registry" in report.component_details


def test_smoke_provider_registry():
    pr = ProviderRegistry()
    providers = pr.list_providers()
    assert "groq" in providers


def test_smoke_tool_registry():
    tools = list_tools()
    assert len(tools) >= 5
    assert "vehicle.summary" in tools


def test_smoke_feature_flags_and_quotas():
    ff = FeatureFlagManager()
    qm = QuotaManager()

    assert ff.is_reasoning_enabled() is True
    assert qm.check_quota("smoke_tenant") is True


def test_smoke_agent_runtime_execution(app, seed_data):
    with app.app_context():
        company_a = seed_data["company_a_id"]
        res = AgentRuntime.execute(
            message="Show available vehicles for dispatch",
            session_id="smoke_session_1",
            company_id=company_a,
            user_id="smoke_user_1",
            intent="VEHICLE"
        )
        assert res.response != ""
        assert res.execution_time_ms > 0.0


def test_ai_chat_service_unavailable_on_unset_key(client, company_a_token, monkeypatch):
    """Verify /api/ai/chat returns 503 AI_SERVICE_UNAVAILABLE when GROQ_API_KEY is unset (development/test mode only)."""
    monkeypatch.delenv("GROQ_API_KEY", raising=False)
    res = client.post(
        "/api/ai/chat",
        headers={"Authorization": f"Bearer {company_a_token}"},
        json={"message": "How many vehicles do we have?"}
    )
    assert res.status_code == 503
    payload = res.get_json()
    assert payload["error"] == "AI_SERVICE_UNAVAILABLE"
    assert "temporarily unavailable" in payload["message"].lower() or "not configured" in payload["message"].lower()


def test_groq_key_required_in_production(monkeypatch):
    """Confirm the app refuses to boot in production without GROQ_API_KEY."""
    monkeypatch.setenv("FLASK_ENV", "production")
    monkeypatch.setenv("SECRET_KEY", "a-real-looking-secret-1234567890")
    monkeypatch.setenv("JWT_SECRET_KEY", "another-real-looking-secret-0987654321")
    monkeypatch.setenv("DATABASE_URL", "postgresql://user:pass@localhost/db")
    monkeypatch.setenv("CORS_ORIGINS", "https://app.transitops.com")
    monkeypatch.setenv("SMTP_HOST", "smtp.sendgrid.net")
    monkeypatch.setenv("SMTP_USERNAME", "apikey")
    monkeypatch.setenv("SMTP_PASSWORD", "secret-password")
    monkeypatch.setenv("EMAIL_FROM", "noreply@transitops.com")
    monkeypatch.delenv("GROQ_API_KEY", raising=False)
    from app.middleware.env_validator import validate_environment
    import pytest as _pytest
    with _pytest.raises(RuntimeError, match="GROQ_API_KEY"):
        validate_environment()


def test_smtp_host_required_in_production(monkeypatch):
    """Confirm the app refuses to boot in production without SMTP_HOST."""
    monkeypatch.setenv("FLASK_ENV", "production")
    monkeypatch.setenv("SECRET_KEY", "a-real-looking-secret-1234567890")
    monkeypatch.setenv("JWT_SECRET_KEY", "another-real-looking-secret-0987654321")
    monkeypatch.setenv("DATABASE_URL", "postgresql://user:pass@localhost/db")
    monkeypatch.setenv("CORS_ORIGINS", "https://app.transitops.com")
    monkeypatch.setenv("GROQ_API_KEY", "gsk-mock-production-key")
    monkeypatch.setenv("SMTP_USERNAME", "apikey")
    monkeypatch.setenv("SMTP_PASSWORD", "secret-password")
    monkeypatch.setenv("EMAIL_FROM", "noreply@transitops.com")
    monkeypatch.delenv("SMTP_HOST", raising=False)
    from app.middleware.env_validator import validate_environment
    import pytest as _pytest
    with _pytest.raises(RuntimeError, match="SMTP_HOST"):
        validate_environment()


def test_opentelemetry_wiring(monkeypatch):
    """Confirm app boots with and without OPENTELEMETRY_EXPORTER_ENDPOINT."""
    from app import create_app
    monkeypatch.delenv("OPENTELEMETRY_EXPORTER_ENDPOINT", raising=False)
    app_without_otel = create_app()
    assert app_without_otel is not None

    monkeypatch.setenv("OPENTELEMETRY_EXPORTER_ENDPOINT", "http://localhost:4317")
    app_with_otel = create_app()
    assert app_with_otel is not None



