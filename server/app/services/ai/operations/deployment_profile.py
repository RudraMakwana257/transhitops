"""
Deployment Profile Module — Graceful shutdown, signal handlers, and Kubernetes lifecycle hooks.
"""

import time
import signal
import logging
from threading import Lock
from typing import List, Callable, Optional

logger = logging.getLogger(__name__)

CleanupTask = Callable[[], None]

class DeploymentProfile:
    """
    Deployment Profile managing process lifecycle, SIGTERM/SIGINT signal handling,
    graceful workflow draining, metrics flushing, and provider cleanup.
    """
    def __init__(self, grace_period_seconds: float = 30.0):
        self.grace_period_seconds = grace_period_seconds
        self._is_shutting_down = False
        self._active_workflows_count = 0
        self._cleanup_tasks: List[CleanupTask] = []
        self._lock = Lock()

    def register_signal_handlers(self) -> None:
        """Registers OS signal handlers for graceful SIGTERM and SIGINT termination."""
        try:
            signal.signal(signal.SIGTERM, self._handle_signal)
            signal.signal(signal.SIGINT, self._handle_signal)
            logger.info("Registered SIGTERM and SIGINT graceful shutdown handlers.")
        except (ValueError, OSError) as e:
            logger.warning("Could not register signal handlers (not main thread or OS restricted): %s", str(e))

    def register_cleanup_task(self, task: CleanupTask) -> None:
        """Registers a cleanup callback task to execute upon process shutdown."""
        with self._lock:
            self._cleanup_tasks.append(task)

    def increment_active_workflows(self) -> None:
        with self._lock:
            self._active_workflows_count += 1

    def decrement_active_workflows(self) -> None:
        with self._lock:
            if self._active_workflows_count > 0:
                self._active_workflows_count -= 1

    @property
    def is_shutting_down(self) -> bool:
        with self._lock:
            return self._is_shutting_down

    def _handle_signal(self, signum: int, frame) -> None:
        logger.warning("Received termination signal %d. Triggering graceful shutdown sequence...", signum)
        self.shutdown()

    def shutdown(self) -> None:
        """Executes graceful shutdown sequence: drains active workflows and runs cleanup tasks."""
        with self._lock:
            if self._is_shutting_down:
                return
            self._is_shutting_down = True

        start = time.monotonic()
        logger.info("Graceful shutdown sequence started (grace_period=%.1fs)...", self.grace_period_seconds)

        # 1. Drain active workflows
        while self._active_workflows_count > 0:
            elapsed = time.monotonic() - start
            if elapsed >= self.grace_period_seconds:
                logger.warning("Grace period exceeded. Forcing shutdown with %d active workflows remaining.", self._active_workflows_count)
                break
            logger.info("Waiting for %d active workflows to drain... (elapsed=%.1fs)", self._active_workflows_count, elapsed)
            time.sleep(0.5)

        # 2. Run registered cleanup tasks
        with self._lock:
            tasks = list(self._cleanup_tasks)

        for task in tasks:
            try:
                task()
            except Exception as e:
                logger.error("Error executing shutdown cleanup task %s: %s", getattr(task, '__name__', str(task)), str(e))

        logger.info("Graceful shutdown sequence completed successfully.")
