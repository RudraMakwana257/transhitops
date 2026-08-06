import pytest
from app.services.ai.prompt_builder import (
    build_identity_layer,
    build_security_layer,
    build_business_rules_layer,
    build_tenant_context_layer,
    build_dynamic_context_layer,
    format_history_layer,
    validate_prompt,
    estimate_prompt_tokens,
    build_system_prompt,
    IDENTITY_TEMPLATE,
    SECURITY_TEMPLATE,
    BUSINESS_RULES_TEMPLATE
)


def test_build_identity_layer():
    res = build_identity_layer()
    assert res == IDENTITY_TEMPLATE
    assert "fleet operations assistant" in res


def test_build_security_layer():
    res = build_security_layer()
    assert res == SECURITY_TEMPLATE
    assert "SECURITY RULES" in res
    assert "passwords" in res


def test_build_business_rules_layer():
    res = build_business_rules_layer()
    assert res == BUSINESS_RULES_TEMPLATE
    assert "₹X,XXX" in res


def test_build_tenant_context_layer_custom():
    res = build_tenant_context_layer(
        today="01 August 2026",
        user_name="John Doe",
        role="fleet_manager",
        company_name="Apex Logistics"
    )
    assert "01 August 2026" in res
    assert "John Doe" in res
    assert "fleet_manager" in res
    assert "Apex Logistics" in res


def test_build_tenant_context_layer_defaults():
    res = build_tenant_context_layer(today="01 August 2026")
    assert "01 August 2026" in res
    assert "Fleet User" in res
    assert "fleet_manager" in res


def test_dynamic_context_vehicle_only_omits_others():
    ctx = {
        "vehicles": {"total": 10, "available": 5, "on_trip": 3, "in_shop": 2, "utilization_pct": 30.0},
        "drivers": {"total": 0, "available": 0, "suspended": 0, "licenses_expiring_soon": 0, "licenses_expired": 0},
        "trips": {"active": 0, "draft": 0, "completed_this_month": 0},
        "maintenance": {"open_jobs": 0},
        "fetched_flags": {
            "vehicles": True,
            "drivers": False,
            "trips": False,
            "maintenance": False
        }
    }
    text, used, omitted = build_dynamic_context_layer(ctx)
    assert "VEHICLE STATUS" in text
    assert "DRIVER STATUS" not in text
    assert "TRIP STATUS" not in text
    assert "MAINTENANCE STATUS" not in text

    assert used == ["vehicles"]
    assert set(omitted) == {"drivers", "trips", "maintenance"}


def test_dynamic_context_driver_only():
    ctx = {
        "drivers": {"total": 8, "available": 6, "suspended": 2, "licenses_expiring_soon": 1, "licenses_expired": 0},
        "fetched_flags": {"vehicles": False, "drivers": True, "trips": False, "maintenance": False}
    }
    text, used, omitted = build_dynamic_context_layer(ctx)
    assert "DRIVER STATUS" in text
    assert "VEHICLE STATUS" not in text
    assert used == ["drivers"]


def test_dynamic_context_full_fallback():
    ctx = {
        "vehicles": {"total": 10, "available": 5, "on_trip": 3, "in_shop": 2, "utilization_pct": 30.0},
        "drivers": {"total": 8, "available": 6, "suspended": 2, "licenses_expiring_soon": 1, "licenses_expired": 0},
        "trips": {"active": 2, "draft": 1, "completed_this_month": 12},
        "maintenance": {"open_jobs": 3},
        "fetched_flags": {"vehicles": True, "drivers": True, "trips": True, "maintenance": True}
    }
    text, used, omitted = build_dynamic_context_layer(ctx)
    assert "VEHICLE STATUS" in text
    assert "DRIVER STATUS" in text
    assert "TRIP STATUS" in text
    assert "MAINTENANCE STATUS" in text
    assert set(used) == {"vehicles", "drivers", "trips", "maintenance"}
    assert omitted == []


def test_dynamic_context_backward_compatibility_no_flags():
    ctx = {
        "vehicles": {"total": 10, "available": 5, "on_trip": 3, "in_shop": 2, "utilization_pct": 30.0},
        "drivers": {"total": 0, "available": 0, "suspended": 0, "licenses_expiring_soon": 0, "licenses_expired": 0},
    }
    text, used, omitted = build_dynamic_context_layer(ctx)
    assert "VEHICLE STATUS" in text
    assert "DRIVER STATUS" not in text
    assert used == ["vehicles"]


def test_dynamic_context_rag_and_tool_extensibility():
    ctx = {"fetched_flags": {}}
    rag = ["Vehicle #12 underwent oil change on 10 July."]
    tools = [{"name": "get_weather", "output": "Clear 25C"}]
    text, used, omitted = build_dynamic_context_layer(ctx, rag_chunks=rag, tool_outputs=tools)
    
    assert "RETRIEVED KNOWLEDGE" in text
    assert "TOOL OUTPUTS" in text
    assert "rag_documents" in used
    assert "tool_outputs" in used


def test_format_history_layer_cleaning_and_deduplication():
    raw_history = [
        {"role": "user", "content": "  Show vehicles  "},
        {"role": "user", "content": "  Show vehicles  "},  # Duplicate
        {"role": "assistant", "content": "Here are vehicles."},
        {"role": "user", "content": ""},  # Empty
        {"role": "invalid_role", "content": "test"},  # Invalid
        {"role": "user", "content": "What about drivers?"}
    ]
    cleaned = format_history_layer(raw_history, max_length=10)
    assert len(cleaned) == 3
    assert cleaned[0] == {"role": "user", "content": "Show vehicles"}
    assert cleaned[1] == {"role": "assistant", "content": "Here are vehicles."}
    assert cleaned[2] == {"role": "user", "content": "What about drivers?"}


def test_format_history_layer_max_length():
    raw_history = [{"role": "user", "content": f"msg {i}"} for i in range(15)]
    cleaned = format_history_layer(raw_history, max_length=5)
    assert len(cleaned) == 5
    assert cleaned[-1]["content"] == "msg 14"


def test_validate_prompt():
    prompt = f"{IDENTITY_TEMPLATE}\n\n{SECURITY_TEMPLATE}\n\nFLEET DATA:\n- Test"
    warnings = validate_prompt(prompt, sections_used=["vehicles"])
    assert warnings == []


def test_validate_prompt_warnings():
    prompt = "Simple prompt without identity or security"
    warnings = validate_prompt(prompt, sections_used=[])
    assert len(warnings) >= 3
    assert any("Identity" in w for w in warnings)
    assert any("Security" in w for w in warnings)
    assert any("no active sections" in w for w in warnings)


def test_build_system_prompt_metadata_structure():
    ctx = {
        "today": "01 August 2026",
        "vehicles": {"total": 10, "available": 5, "on_trip": 3, "in_shop": 2, "utilization_pct": 30.0},
        "fetched_flags": {"vehicles": True, "drivers": False, "trips": False, "maintenance": False}
    }
    user_info = {"user_name": "Alice", "role": "dispatcher", "company_name": "FleetCorp"}

    meta = build_system_prompt(ctx, user_info=user_info)

    assert "prompt" in meta
    assert isinstance(meta["prompt"], str)
    assert meta["sections_used"] == ["vehicles"]
    assert set(meta["sections_omitted"]) == {"drivers", "trips", "maintenance"}
    assert isinstance(meta["estimated_tokens"], int)
    assert meta["estimated_tokens"] > 0
    assert isinstance(meta["render_time_ms"], float)
    assert meta["context_sections_count"] == 1
    assert meta["warnings"] == []
