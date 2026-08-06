"""
Reasoning Loop Module — Iterative execution loop processing TaskGraph nodes under policy limits.
"""

import time
import logging
from typing import List, Dict, Any, Optional

from app.services.ai.agent.agent_context import AgentContext
from app.services.ai.agent.workflow_state import WorkflowState, StepResult, WorkflowStatus
from app.services.ai.agent.task_graph import TaskGraph, TaskNode
from app.services.ai.agent.tool_executor import ToolExecutor, ToolExecutionResult
from app.services.ai.agent.cancellation_token import CancellationToken, WorkflowCancelledException

logger = logging.getLogger(__name__)

class ReasoningLoop:
    """
    Reasoning Loop engine executing DAG nodes iteratively under ExecutionPolicy constraints.
    """

    @staticmethod
    def run_loop(
        graph: TaskGraph,
        ctx: AgentContext,
        initial_state: WorkflowState,
        cancellation_token: Optional[CancellationToken] = None
    ) -> WorkflowState:
        """
        Executes executable nodes in the TaskGraph iteratively until completion or policy limit reached.
        """
        current_state = initial_state.copy_with(status=WorkflowStatus.EXECUTING)
        tool_results = dict(current_state.tool_results)
        completed_steps = list(current_state.completed_steps)
        reasoning_trace = list(current_state.reasoning_trace)
        warnings = list(current_state.warnings)

        iterations = 0
        total_tool_calls = 0
        policy = ctx.execution_policy

        while not graph.is_complete():
            iterations += 1
            if cancellation_token:
                cancellation_token.throw_if_cancelled()

            # Enforce max iteration limit
            if iterations > policy.max_iterations:
                msg = f"Reasoning loop exceeded max_iterations limit of {policy.max_iterations}."
                logger.warning(msg)
                warnings.append(msg)
                reasoning_trace.append(f"Iteration limit reached at loop={iterations}")
                break

            executable_nodes = graph.get_executable_nodes()
            if not executable_nodes:
                if not graph.is_complete():
                    warnings.append("No executable nodes remaining despite incomplete graph.")
                break

            for node in executable_nodes:
                if cancellation_token:
                    cancellation_token.throw_if_cancelled()

                # Enforce max tool call limit
                if node.node_type == "tool" and total_tool_calls >= policy.max_tools:
                    msg = f"Reasoning loop exceeded max_tools limit of {policy.max_tools}."
                    logger.warning(msg)
                    warnings.append(msg)
                    node.status = "SKIPPED"
                    continue

                start_node_time = time.monotonic()
                current_state = current_state.copy_with(current_step=node.node_id)
                node.status = "RUNNING"
                reasoning_trace.append(f"Executing node '{node.node_id}' ({node.node_type})")

                if node.node_type == "tool" and node.tool_name:
                    total_tool_calls += 1
                    tool_res: ToolExecutionResult = ToolExecutor.execute(
                        tool_name=node.tool_name,
                        ctx=ctx,
                        **node.parameters
                    )
                    elapsed_ms = (time.monotonic() - start_node_time) * 1000

                    if tool_res.success:
                        node.status = "COMPLETED"
                        node.result = tool_res.data
                        tool_results[node.tool_name] = tool_res.data
                        reasoning_trace.append(f"Tool '{node.tool_name}' completed successfully in {elapsed_ms:.1f}ms.")
                    else:
                        node.status = "FAILED"
                        node.result = {"error": tool_res.error}
                        tool_results[node.tool_name] = {"success": False, "error": tool_res.error}
                        reasoning_trace.append(f"Tool '{node.tool_name}' failed: {tool_res.error}")

                    completed_steps.append(
                        StepResult(
                            step_id=node.node_id,
                            step_type="tool",
                            status=node.status,
                            input_data=node.parameters,
                            output_data=tool_res.data,
                            error_message=tool_res.error,
                            latency_ms=elapsed_ms
                        )
                    )

                elif node.node_type == "merge":
                    elapsed_ms = (time.monotonic() - start_node_time) * 1000
                    node.status = "COMPLETED"
                    merged_data = {
                        dep: tool_results.get(graph.get_node(dep).tool_name, {})
                        for dep in node.dependencies
                        if graph.get_node(dep) and graph.get_node(dep).tool_name
                    }
                    node.result = merged_data
                    tool_results["merged_summary"] = merged_data
                    reasoning_trace.append(f"Merged results from dependencies: {node.dependencies}")

                    completed_steps.append(
                        StepResult(
                            step_id=node.node_id,
                            step_type="merge",
                            status="COMPLETED",
                            input_data={"dependencies": node.dependencies},
                            output_data=merged_data,
                            latency_ms=elapsed_ms
                        )
                    )

                else:
                    node.status = "COMPLETED"

        return current_state.copy_with(
            tool_results=tool_results,
            completed_steps=completed_steps,
            reasoning_trace=reasoning_trace,
            warnings=warnings,
            iterations=iterations,
            status=WorkflowStatus.COMPLETED if graph.is_complete() else WorkflowStatus.VALIDATING
        )
