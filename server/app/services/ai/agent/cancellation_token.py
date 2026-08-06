"""
Cancellation Token Module — Thread-safe cancellation primitive for aborting agent execution.
"""

import time
import threading
from typing import Optional

class WorkflowCancelledException(Exception):
    """Exception raised when execution is aborted via CancellationToken."""
    pass


class CancellationToken:
    """
    Thread-safe cancellation token primitive for monitoring execution cancellation or deadlines.
    """
    def __init__(self, deadline_seconds: Optional[float] = None):
        self._event = threading.Event()
        self._reason: str = "Execution cancelled."
        self._created_at = time.time()
        self._deadline_at: Optional[float] = (
            self._created_at + deadline_seconds if deadline_seconds is not None else None
        )

    def cancel(self, reason: str = "Execution cancelled by request.") -> None:
        """Triggers cancellation signal with an optional reason."""
        self._reason = reason
        self._event.set()

    def is_cancelled(self) -> bool:
        """Returns True if explicitly cancelled or if deadline has elapsed."""
        if self._event.is_set():
            return True
        if self._deadline_at is not None and time.time() >= self._deadline_at:
            self._reason = "Execution timed out (deadline exceeded)."
            self._event.set()
            return True
        return False

    def throw_if_cancelled(self) -> None:
        """Raises WorkflowCancelledException if cancellation has been signaled."""
        if self.is_cancelled():
            raise WorkflowCancelledException(self._reason)

    @property
    def reason(self) -> str:
        return self._reason
