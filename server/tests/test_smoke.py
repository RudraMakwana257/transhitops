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
