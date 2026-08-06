"""
Checkpoint Manager Module — State persistence interface and InMemoryCheckpointManager.
"""

import json
import logging
from abc import ABC, abstractmethod
from threading import Lock
from typing import Dict, Optional, Any
from app.services.ai.agent.workflow_state import WorkflowState

logger = logging.getLogger(__name__)

class CheckpointManager(ABC):
    """
    Abstract Interface for managing WorkflowState checkpoints.
    Allows future Redis, PostgreSQL, or Distributed Cache persistence adapters.
    """
    @abstractmethod
    def create_checkpoint(self, checkpoint_id: str, state: WorkflowState) -> None:
        pass

    @abstractmethod
    def restore_checkpoint(self, checkpoint_id: str) -> Optional[WorkflowState]:
        pass

    @abstractmethod
    def delete_checkpoint(self, checkpoint_id: str) -> None:
        pass

    @abstractmethod
    def serialize(self, state: WorkflowState) -> str:
        pass

    @abstractmethod
    def deserialize(self, payload: str) -> WorkflowState:
        pass


class InMemoryCheckpointManager(CheckpointManager):
    """
    Thread-safe in-memory implementation of CheckpointManager interface.
    """
    def __init__(self):
        self._store: Dict[str, str] = {}
        self._lock = Lock()

    def create_checkpoint(self, checkpoint_id: str, state: WorkflowState) -> None:
        serialized = self.serialize(state)
        with self._lock:
            self._store[checkpoint_id] = serialized
        logger.info("Created workflow checkpoint id=%s workflow_id=%s", checkpoint_id, state.workflow_id)

    def restore_checkpoint(self, checkpoint_id: str) -> Optional[WorkflowState]:
        with self._lock:
            payload = self._store.get(checkpoint_id)
        if not payload:
            return None
        return self.deserialize(payload)

    def delete_checkpoint(self, checkpoint_id: str) -> None:
        with self._lock:
            self._store.pop(checkpoint_id, None)

    def serialize(self, state: WorkflowState) -> str:
        return json.dumps(state.to_dict(), default=str)

    def deserialize(self, payload: str) -> WorkflowState:
        data = json.loads(payload)
        return WorkflowState.from_dict(data)
