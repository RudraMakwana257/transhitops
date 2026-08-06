"""
Workflow Events Module — Strongly-typed event payload definitions for Agent Runtime.
"""

import time
from dataclasses import dataclass, field
from typing import Dict, Any, Optional

@dataclass(frozen=True)
class BaseWorkflowEvent:
    workflow_id: str
    session_id: str
    event_type: str
    timestamp: float = field(default_factory=time.time)
    metadata: Dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> dict:
        return {
            "workflow_id": self.workflow_id,
            "session_id": self.session_id,
            "event_type": self.event_type,
            "timestamp": self.timestamp,
            "metadata": self.metadata,
        }


@dataclass(frozen=True)
class WorkflowStarted(BaseWorkflowEvent):
    intent: str = "GENERAL"
    event_type: str = "WORKFLOW_STARTED"


@dataclass(frozen=True)
class WorkflowCompleted(BaseWorkflowEvent):
    execution_time_ms: float = 0.0
    response_length: int = 0
    event_type: str = "WORKFLOW_COMPLETED"


@dataclass(frozen=True)
class WorkflowFailed(BaseWorkflowEvent):
    error_message: str = ""
    event_type: str = "WORKFLOW_FAILED"


@dataclass(frozen=True)
class PlannerStarted(BaseWorkflowEvent):
    intent: str = "GENERAL"
    event_type: str = "PLANNER_STARTED"


@dataclass(frozen=True)
class PlannerCompleted(BaseWorkflowEvent):
    plan_summary: str = ""
    step_count: int = 0
    event_type: str = "PLANNER_COMPLETED"


@dataclass(frozen=True)
class ToolStarted(BaseWorkflowEvent):
    tool_name: str = ""
    parameters: Dict[str, Any] = field(default_factory=dict)
    event_type: str = "TOOL_STARTED"


@dataclass(frozen=True)
class ToolCompleted(BaseWorkflowEvent):
    tool_name: str = ""
    success: bool = True
    latency_ms: float = 0.0
    cache_hit: bool = False
    event_type: str = "TOOL_COMPLETED"


@dataclass(frozen=True)
class ProviderStarted(BaseWorkflowEvent):
    provider_name: str = ""
    model_name: str = ""
    event_type: str = "PROVIDER_STARTED"


@dataclass(frozen=True)
class ProviderCompleted(BaseWorkflowEvent):
    provider_name: str = ""
    model_name: str = ""
    latency_ms: float = 0.0
    tokens_used: int = 0
    event_type: str = "PROVIDER_COMPLETED"


@dataclass(frozen=True)
class ValidationFailed(BaseWorkflowEvent):
    reason: str = ""
    warnings: list = field(default_factory=list)
    event_type: str = "VALIDATION_FAILED"


@dataclass(frozen=True)
class CheckpointCreated(BaseWorkflowEvent):
    checkpoint_id: str = ""
    event_type: str = "CHECKPOINT_CREATED"
