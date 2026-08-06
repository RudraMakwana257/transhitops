"""
Task Graph Module — Pure Directed Acyclic Graph (DAG) for workflow node dependencies and topological sorting.
"""

from collections import defaultdict, deque
from dataclasses import dataclass, field
from typing import Dict, List, Set, Optional, Any

class CyclicGraphException(Exception):
    """Exception raised when a task graph contains a cycle."""
    pass


@dataclass
class TaskNode:
    """
    Individual node in a workflow TaskGraph.
    """
    node_id: str
    node_type: str                   # 'tool', 'plan', 'prompt', 'llm', 'validate', 'merge'
    tool_name: Optional[str] = None
    parameters: Dict[str, Any] = field(default_factory=dict)
    dependencies: List[str] = field(default_factory=list)
    status: str = "PENDING"          # 'PENDING', 'RUNNING', 'COMPLETED', 'FAILED', 'SKIPPED'
    result: Optional[Any] = None

    def to_dict(self) -> dict:
        return {
            "node_id": self.node_id,
            "node_type": self.node_type,
            "tool_name": self.tool_name,
            "parameters": self.parameters,
            "dependencies": self.dependencies,
            "status": self.status,
        }


class TaskGraph:
    """
    Pure Directed Acyclic Graph (DAG) manager.
    Supports node dependency registration, cycle detection, topological sorting, and executable node resolution.
    """
    def __init__(self):
        self._nodes: Dict[str, TaskNode] = {}
        self._adjacency: Dict[str, Set[str]] = defaultdict(set)
        self._in_degree: Dict[str, int] = defaultdict(int)

    def add_node(self, node: TaskNode) -> None:
        """Adds a TaskNode to the graph."""
        self._nodes[node.node_id] = node
        if node.node_id not in self._in_degree:
            self._in_degree[node.node_id] = 0

        for dep in node.dependencies:
            if dep not in self._adjacency[dep]:
                self._adjacency[dep].add(node.node_id)
                self._in_degree[node.node_id] += 1

    def get_node(self, node_id: str) -> Optional[TaskNode]:
        """Gets a node by ID."""
        return self._nodes.get(node_id)

    def detect_cycle(self) -> bool:
        """
        Detects if the graph contains a cycle using Kahn's algorithm.
        Returns True if a cycle exists, False if valid DAG.
        """
        in_degree_copy = dict(self._in_degree)
        for node_id in self._nodes:
            if node_id not in in_degree_copy:
                in_degree_copy[node_id] = 0

        queue = deque([n for n, deg in in_degree_copy.items() if deg == 0])
        visited_count = 0

        while queue:
            node_id = queue.popleft()
            visited_count += 1
            for neighbor in self._adjacency[node_id]:
                in_degree_copy[neighbor] -= 1
                if in_degree_copy[neighbor] == 0:
                    queue.append(neighbor)

        return visited_count != len(self._nodes)

    def topological_sort(self) -> List[TaskNode]:
        """
        Returns nodes in topologically sorted execution order.
        Raises CyclicGraphException if a cycle is detected.
        """
        if self.detect_cycle():
            raise CyclicGraphException("TaskGraph contains a cyclic dependency.")

        in_degree_copy = dict(self._in_degree)
        for node_id in self._nodes:
            if node_id not in in_degree_copy:
                in_degree_copy[node_id] = 0

        queue = deque([n for n, deg in in_degree_copy.items() if deg == 0])
        sorted_nodes = []

        while queue:
            node_id = queue.popleft()
            sorted_nodes.append(self._nodes[node_id])
            for neighbor in self._adjacency[node_id]:
                in_degree_copy[neighbor] -= 1
                if in_degree_copy[neighbor] == 0:
                    queue.append(neighbor)

        return sorted_nodes

    def get_executable_nodes(self) -> List[TaskNode]:
        """
        Returns all nodes currently PENDING whose dependencies are all COMPLETED.
        """
        executable = []
        for node in self._nodes.values():
            if node.status != "PENDING":
                continue
            
            deps_completed = all(
                self._nodes[dep].status == "COMPLETED"
                for dep in node.dependencies
                if dep in self._nodes
            )
            if deps_completed:
                executable.append(node)

        return executable

    def is_complete(self) -> bool:
        """Returns True if all nodes are in COMPLETED, FAILED, or SKIPPED status."""
        return all(n.status in ("COMPLETED", "FAILED", "SKIPPED") for n in self._nodes.values())

    def to_dict(self) -> dict:
        return {
            node_id: node.to_dict() for node_id, node in self._nodes.items()
        }
