import time
import pytest
from unittest.mock import MagicMock

from app.services.ai.agent.execution_policy import ExecutionPolicy
from app.services.ai.agent.agent_context import AgentContext
from app.services.ai.agent.workflow_state import WorkflowState, WorkflowStatus, StepResult
from app.services.ai.agent.cancellation_token import CancellationToken, WorkflowCancelledException
from app.services.ai.agent.workflow_events import WorkflowStarted, WorkflowCompleted, ToolCompleted
from app.services.ai.agent.event_bus import EventBus
from app.services.ai.agent.execution_hooks import BaseExecutionHook, CompositeExecutionHook
from app.services.ai.agent.checkpoint_manager import InMemoryCheckpointManager
from app.services.ai.agent.task_graph import TaskGraph, TaskNode, CyclicGraphException
from app.services.ai.agent.execution_strategy import SequentialExecutionStrategy
from app.services.ai.agent.planner import Planner, ExecutionPlan
from app.services.ai.agent.tool_executor import ToolExecutor, ToolExecutionResult
from app.services.ai.agent.response_validator import ResponseValidator, ValidationResult
from app.services.ai.agent.reasoning_loop import ReasoningLoop
from app.services.ai.agent.execution_engine import ExecutionEngine, AgentExecutionResult
from app.services.ai.agent.workflow_engine import WorkflowEngine
from app.services.ai.agent.agent_runtime import AgentRuntime


def test_execution_policy():
    policy = ExecutionPolicy(max_iterations=3, max_tools=5)
    assert policy.max_iterations == 3
    assert policy.max_tools == 5
    d = policy.to_dict()
    assert d["max_iterations"] == 3


def test_agent_context_creation():
    ctx = AgentContext.create(
        session_id="sess_123",
        company_id="comp_456",
        user_id="user_789",
        user_message="Show available vehicles",
        intent="VEHICLE"
    )
    assert ctx.session_id == "sess_123"
    assert ctx.company_id == "comp_456"
    assert ctx.intent == "VEHICLE"
    assert ctx.request_id.startswith("req_")
    assert ctx.workflow_id.startswith("wf_")


def test_workflow_state_serialization():
    state = WorkflowState(
        workflow_id="wf_1",
        session_id="sess_1",
        intent="DRIVER",
        status=WorkflowStatus.EXECUTING
    )
    d = state.to_dict()
    assert d["workflow_id"] == "wf_1"
    assert d["status"] == "EXECUTING"

    reconstructed = WorkflowState.from_dict(d)
    assert reconstructed.workflow_id == "wf_1"
    assert reconstructed.status == WorkflowStatus.EXECUTING


def test_cancellation_token():
    token = CancellationToken()
    assert token.is_cancelled() is False

    token.cancel("User aborted request")
    assert token.is_cancelled() is True
    assert token.reason == "User aborted request"

    with pytest.raises(WorkflowCancelledException):
        token.throw_if_cancelled()


def test_cancellation_token_deadline():
    token = CancellationToken(deadline_seconds=0.05)
    time.sleep(0.06)
    assert token.is_cancelled() is True
    with pytest.raises(WorkflowCancelledException):
        token.throw_if_cancelled()


def test_event_bus_subscriber_isolation():
    bus = EventBus()
    received_events = []

    def healthy_handler(event):
        received_events.append(event)

    def failing_handler(event):
        raise RuntimeError("Subscriber handler failure!")

    bus.subscribe(WorkflowStarted, failing_handler)
    bus.subscribe(WorkflowStarted, healthy_handler)

    event = WorkflowStarted(workflow_id="wf_1", session_id="sess_1")
    # Publishing should not crash despite failing_handler throwing an error
    bus.publish(event)

    assert len(received_events) == 1
    assert received_events[0].workflow_id == "wf_1"


def test_execution_hooks_composite():
    class DummyHook(BaseExecutionHook):
        def __init__(self):
            self.called = False
        def before_workflow(self, ctx, state):
            self.called = True

    hook_inst = DummyHook()
    composite = CompositeExecutionHook([hook_inst])

    ctx = AgentContext.create(session_id="s", company_id="c", user_id="u")
    state = WorkflowState(workflow_id="w", session_id="s", intent="VEHICLE")

    composite.before_workflow(ctx, state)
    assert hook_inst.called is True


def test_checkpoint_manager():
    cp_mgr = InMemoryCheckpointManager()
    state = WorkflowState(workflow_id="wf_check", session_id="s1", intent="TRIP")

    cp_mgr.create_checkpoint("check_1", state)
    restored = cp_mgr.restore_checkpoint("check_1")

    assert restored is not None
    assert restored.workflow_id == "wf_check"
    assert restored.intent == "TRIP"

    cp_mgr.delete_checkpoint("check_1")
    assert cp_mgr.restore_checkpoint("check_1") is None


def test_task_graph_cycle_detection_and_sorting():
    graph = TaskGraph()
    n1 = TaskNode(node_id="n1", node_type="tool", tool_name="vehicle.summary")
    n2 = TaskNode(node_id="n2", node_type="tool", tool_name="driver.summary", dependencies=["n1"])
    graph.add_node(n1)
    graph.add_node(n2)

    assert graph.detect_cycle() is False

    sorted_nodes = graph.topological_sort()
    assert [n.node_id for n in sorted_nodes] == ["n1", "n2"]

    exec_nodes = graph.get_executable_nodes()
    assert len(exec_nodes) == 1
    assert exec_nodes[0].node_id == "n1"


def test_task_graph_cyclic_graph_rejection():
    graph = TaskGraph()
    n1 = TaskNode(node_id="n1", node_type="tool", dependencies=["n2"])
    n2 = TaskNode(node_id="n2", node_type="tool", dependencies=["n1"])
    graph.add_node(n1)
    graph.add_node(n2)

    assert graph.detect_cycle() is True
    with pytest.raises(CyclicGraphException):
        graph.topological_sort()


def test_planner_multi_domain():
    ctx = AgentContext.create(
        session_id="s", company_id="c", user_id="u",
        user_message="Show available vehicles and drivers with expiring licenses.",
        intent="VEHICLE"
    )
    plan = Planner.create_plan(ctx)
    assert plan.intent == "VEHICLE"
    assert len(plan.task_graph._nodes) == 3  # vehicles, drivers, merge


def test_response_validator():
    state = WorkflowState(workflow_id="w", session_id="s", intent="VEHICLE")
    ctx = AgentContext.create(session_id="s", company_id="c", user_id="u")

    # Valid string check
    res = ResponseValidator.validate_llm_response("Here are the vehicles.", state)
    assert res.is_valid is True

    # Empty string check
    res_empty = ResponseValidator.validate_llm_response("", state)
    assert res_empty.is_valid is False
    assert res_empty.should_retry is True


def test_agent_runtime_end_to_end(app, seed_data):
    with app.app_context():
        company_a = seed_data["company_a_id"]
        res = AgentRuntime.execute(
            message="Show fleet vehicle summary",
            session_id="sess_test_rt",
            company_id=company_a,
            user_id="user_test_rt",
            intent="VEHICLE"
        )
        assert isinstance(res, AgentExecutionResult)
        assert res.response != ""
        assert res.execution_time_ms > 0.0
