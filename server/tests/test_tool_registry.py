import pytest
from app.services.ai.tools.common import ToolResult, safe_tool_execution
from app.services.ai.tools.registry import (
    TOOL_REGISTRY,
    ToolDefinition,
    tool_exists,
    get_tool_metadata,
    list_tools,
    validate_tool,
    execute_tool
)

def test_tool_result_structure():
    res = ToolResult(success=True, data={"total": 5}, metadata={"count": 5}, warnings=["warn"], error=None)
    d = res.to_dict()
    assert d["success"] is True
    assert d["data"] == {"total": 5}
    assert d["metadata"] == {"count": 5}
    assert d["warnings"] == ["warn"]
    assert d["error"] is None


def test_tool_registry_inspection():
    assert tool_exists("vehicle.summary") is True
    assert tool_exists("unregistered.tool") is False

    meta = get_tool_metadata("vehicle.summary")
    assert meta is not None
    assert meta["name"] == "vehicle.summary"
    assert meta["category"] == "vehicle"
    assert "input_schema" in meta
    assert "output_schema" in meta

    all_tools = list_tools()
    assert "vehicle.summary" in all_tools
    assert "driver.summary" in all_tools

    vehicle_tools = list_tools(category="vehicle")
    assert "vehicle.summary" in vehicle_tools
    assert "driver.summary" not in vehicle_tools


def test_validate_tool_parameters():
    is_valid, warnings = validate_tool("vehicle.summary", company_id="test-company-id")
    assert is_valid is True
    assert warnings == []

    is_valid, warnings = validate_tool("vehicle.summary")  # Missing company_id
    assert is_valid is False
    assert len(warnings) == 1
    assert "Missing required parameter" in warnings[0]

    is_valid, warnings = validate_tool("nonexistent.tool")
    assert is_valid is False
    assert "not registered" in warnings[0]


def test_execute_unregistered_tool():
    res = execute_tool("unknown.tool", company_id="test")
    assert res.success is False
    assert "not registered" in res.error


def test_execute_tool_validation_failure():
    res = execute_tool("vehicle.summary")  # missing company_id
    assert res.success is False
    assert "Validation failed" in res.error
    assert len(res.warnings) > 0


def test_execute_tool_success_with_db(app, seed_data):
    with app.app_context():
        company_a = seed_data["company_a_id"]
        res = execute_tool("vehicle.summary", company_id=company_a)
        assert res.success is True
        assert isinstance(res.data, dict)
        assert "total" in res.data
        assert "available" in res.data
        assert "execution_time_ms" in res.metadata


def test_safe_tool_execution_exception_handling():
    def failing_func():
        raise ValueError("Simulated DB connection error")

    res = safe_tool_execution("failing_test_tool", failing_func)
    assert res.success is False
    assert res.data is None
    assert "Simulated DB connection error" in res.error
    assert "execution_time_ms" in res.metadata
