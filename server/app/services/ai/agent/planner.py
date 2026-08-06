"""
Planner Module — Pure planner generating ExecutionPlan DAGs from intent and user context.
"""

import uuid
import logging
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Any

from app.services.ai.agent.agent_context import AgentContext
from app.services.ai.agent.task_graph import TaskGraph, TaskNode

logger = logging.getLogger(__name__)

@dataclass(frozen=True)
class ExecutionPlan:
    """
    Immutable Execution Plan object produced by Planner.
    """
    plan_id: str
    intent: str
    description: str
    task_graph: TaskGraph
    metadata: Dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> dict:
        return {
            "plan_id": self.plan_id,
            "intent": self.intent,
            "description": self.description,
            "task_graph": self.task_graph.to_dict(),
            "metadata": self.metadata,
        }


class Planner:
    """
    Pure Planner creating deterministic TaskGraph execution plans.
    Never executes tools, queries databases, or invokes LLM APIs.
    """

    @staticmethod
    def create_plan(ctx: AgentContext, available_tools: Optional[List[str]] = None) -> ExecutionPlan:
        """
        Constructs an ExecutionPlan DAG based on intent and prompt semantics.
        """
        plan_id = f"plan_{uuid.uuid4().hex[:12]}"
        intent = (ctx.intent or "GENERAL").upper()
        msg_lower = (ctx.user_message or "").lower()

        graph = TaskGraph()

        # Multi-domain detection check (e.g. "vehicles and drivers")
        is_multi_domain = ("vehicle" in msg_lower or "truck" in msg_lower or "fleet" in msg_lower) and \
                          ("driver" in msg_lower or "license" in msg_lower or "staff" in msg_lower)

        if is_multi_domain:
            # Step 1: Vehicle summary
            node_v = TaskNode(
                node_id="step_1_vehicles",
                node_type="tool",
                tool_name="vehicle.summary",
                parameters={"company_id": ctx.company_id}
            )
            graph.add_node(node_v)

            # Step 2: Driver summary
            node_d = TaskNode(
                node_id="step_2_drivers",
                node_type="tool",
                tool_name="driver.summary",
                parameters={"company_id": ctx.company_id}
            )
            graph.add_node(node_d)

            # Step 3: Merge results
            node_m = TaskNode(
                node_id="step_3_merge",
                node_type="merge",
                dependencies=["step_1_vehicles", "step_2_drivers"]
            )
            graph.add_node(node_m)
            desc = "Multi-domain plan: Fetch vehicle summary and driver summary, then merge results."

        else:
            # Single-domain plans mapping 1:1 to intent
            tool_name = f"{intent.lower()}.summary"
            if intent == "GENERAL":
                tool_name = "vehicle.summary"

            node_tool = TaskNode(
                node_id="step_1_tool",
                node_type="tool",
                tool_name=tool_name,
                parameters={"company_id": ctx.company_id}
            )
            graph.add_node(node_tool)
            desc = f"Single-domain plan: Execute tool '{tool_name}' for intent {intent}."

        # Validate DAG invariants
        if graph.detect_cycle():
            raise RuntimeError(f"Planner generated an invalid cyclic graph for plan_id={plan_id}")

        logger.info("Planner generated plan_id=%s intent=%s nodes=%d", plan_id, intent, len(graph._nodes))

        return ExecutionPlan(
            plan_id=plan_id,
            intent=intent,
            description=desc,
            task_graph=graph
        )
