"""
Execution Strategy Module — Strategy pattern interface for task node execution scheduling.
"""

from abc import ABC, abstractmethod
from typing import List, Callable, Any, Optional
from app.services.ai.agent.task_graph import TaskGraph, TaskNode
from app.services.ai.agent.agent_context import AgentContext
from app.services.ai.agent.cancellation_token import CancellationToken

class ExecutionStrategy(ABC):
    """
    Abstract Strategy interface for executing nodes in a TaskGraph.
    """
    @abstractmethod
    def execute_graph(
        self,
        graph: TaskGraph,
        ctx: AgentContext,
        node_executor_func: Callable[[TaskNode], Any],
        cancellation_token: Optional[CancellationToken] = None
    ) -> List[TaskNode]:
        pass


class SequentialExecutionStrategy(ExecutionStrategy):
    """
    Default execution strategy that processes task graph nodes sequentially in topological order.
    Monitors CancellationToken before each node execution.
    """
    def execute_graph(
        self,
        graph: TaskGraph,
        ctx: AgentContext,
        node_executor_func: Callable[[TaskNode], Any],
        cancellation_token: Optional[CancellationToken] = None
    ) -> List[TaskNode]:
        sorted_nodes = graph.topological_sort()
        executed_nodes = []

        for node in sorted_nodes:
            if cancellation_token:
                cancellation_token.throw_if_cancelled()

            if node.status == "SKIPPED":
                continue

            node.status = "RUNNING"
            try:
                result = node_executor_func(node)
                node.result = result
                node.status = "COMPLETED"
            except Exception as e:
                node.status = "FAILED"
                node.result = {"error": str(e)}
                raise e

            executed_nodes.append(node)

        return executed_nodes
