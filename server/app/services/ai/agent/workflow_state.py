"""
Workflow State Module — Defines WorkflowStatus enum, StepResult DTO, and serializable WorkflowState.
"""

import time
from enum import Enum
from dataclasses import dataclass, field
from typing import List, Dict, Any, Optional

class WorkflowStatus(str, Enum):
    CREATED = "CREATED"
    PLANNING = "PLANNING"
    EXECUTING = "EXECUTING"
    WAITING_TOOL = "WAITING_TOOL"
    WAITING_PROVIDER = "WAITING_PROVIDER"
    VALIDATING = "VALIDATING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"
    CANCELLED = "CANCELLED"


@dataclass(frozen=True)
class StepResult:
    """
    Immutable representation of an individual step execution result.
    """
    step_id: str
    step_type: str                  # e.g., 'tool', 'plan', 'prompt', 'llm'
    status: str                     # 'SUCCESS', 'FAILED', 'SKIPPED'
    input_data: Dict[str, Any] = field(default_factory=dict)
    output_data: Dict[str, Any] = field(default_factory=dict)
    error_message: Optional[str] = None
    latency_ms: float = 0.0

    def to_dict(self) -> dict:
        return {
            "step_id": self.step_id,
            "step_type": self.step_type,
            "status": self.status,
            "input_data": self.input_data,
            "output_data": self.output_data,
            "error_message": self.error_message,
            "latency_ms": round(self.latency_ms, 3),
        }


@dataclass(frozen=True)
class WorkflowState:
    """
    Immutable workflow state model representing snapshot of a workflow execution.
    """
    workflow_id: str
    session_id: str
    intent: str
    execution_plan: Dict[str, Any] = field(default_factory=dict)
    current_step: str = ""
    completed_steps: List[StepResult] = field(default_factory=list)
    pending_steps: List[str] = field(default_factory=list)
    tool_results: Dict[str, Any] = field(default_factory=dict)
    reasoning_trace: List[str] = field(default_factory=list)
    validation_results: Dict[str, Any] = field(default_factory=dict)
    warnings: List[str] = field(default_factory=list)
    errors: List[str] = field(default_factory=list)
    iterations: int = 0
    created_at: float = field(default_factory=time.time)
    updated_at: float = field(default_factory=time.time)
    execution_time_ms: float = 0.0
    status: WorkflowStatus = WorkflowStatus.CREATED

    def copy_with(self, **kwargs) -> 'WorkflowState':
        """Creates a new WorkflowState instance with specified fields updated."""
        data = {
            "workflow_id": self.workflow_id,
            "session_id": self.session_id,
            "intent": self.intent,
            "execution_plan": self.execution_plan,
            "current_step": self.current_step,
            "completed_steps": self.completed_steps,
            "pending_steps": self.pending_steps,
            "tool_results": self.tool_results,
            "reasoning_trace": self.reasoning_trace,
            "validation_results": self.validation_results,
            "warnings": self.warnings,
            "errors": self.errors,
            "iterations": self.iterations,
            "created_at": self.created_at,
            "updated_at": time.time(),
            "execution_time_ms": self.execution_time_ms,
            "status": self.status,
        }
        data.update(kwargs)
        return WorkflowState(**data)

    def to_dict(self) -> dict:
        return {
            "workflow_id": self.workflow_id,
            "session_id": self.session_id,
            "intent": self.intent,
            "execution_plan": self.execution_plan,
            "current_step": self.current_step,
            "completed_steps": [s.to_dict() for s in self.completed_steps],
            "pending_steps": self.pending_steps,
            "tool_results": self.tool_results,
            "reasoning_trace": self.reasoning_trace,
            "validation_results": self.validation_results,
            "warnings": self.warnings,
            "errors": self.errors,
            "iterations": self.iterations,
            "created_at": self.created_at,
            "updated_at": self.updated_at,
            "execution_time_ms": round(self.execution_time_ms, 3),
            "status": self.status.value,
        }

    @classmethod
    def from_dict(cls, data: dict) -> 'WorkflowState':
        """Reconstructs a WorkflowState instance from a dictionary."""
        status_val = WorkflowStatus(data.get("status", WorkflowStatus.CREATED.value))
        completed = [
            StepResult(**s) if isinstance(s, dict) else s
            for s in data.get("completed_steps", [])
        ]
        return cls(
            workflow_id=data["workflow_id"],
            session_id=data["session_id"],
            intent=data["intent"],
            execution_plan=data.get("execution_plan", {}),
            current_step=data.get("current_step", ""),
            completed_steps=completed,
            pending_steps=data.get("pending_steps", []),
            tool_results=data.get("tool_results", {}),
            reasoning_trace=data.get("reasoning_trace", []),
            validation_results=data.get("validation_results", {}),
            warnings=data.get("warnings", []),
            errors=data.get("errors", []),
            iterations=data.get("iterations", 0),
            created_at=data.get("created_at", time.time()),
            updated_at=data.get("updated_at", time.time()),
            execution_time_ms=data.get("execution_time_ms", 0.0),
            status=status_val
        )
