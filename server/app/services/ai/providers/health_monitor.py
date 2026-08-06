"""
Health Monitor Module — Circuit Breaker pattern tracking provider health and availability.
"""

import time
import logging
from enum import Enum
from threading import Lock
from typing import Dict, Any, Optional

logger = logging.getLogger(__name__)

class CircuitState(str, Enum):
    CLOSED = "CLOSED"         # Normal operation: provider is healthy
    OPEN = "OPEN"             # Failure state: provider is tripped (skip)
    HALF_OPEN = "HALF_OPEN"   # Recovery testing: canary request allowed


class CircuitBreaker:
    """
    Thread-safe Circuit Breaker for a single LLM provider.
    Transitions: CLOSED -> (failures >= limit) -> OPEN -> (timeout elapsed) -> HALF_OPEN -> (success) -> CLOSED.
    """
    def __init__(self, failure_threshold: int = 3, reset_timeout_seconds: float = 30.0):
        self.failure_threshold = failure_threshold
        self.reset_timeout_seconds = reset_timeout_seconds
        
        self.state: CircuitState = CircuitState.CLOSED
        self.failure_count: int = 0
        self.last_failure_time: float = 0.0
        self.last_success_time: float = 0.0
        self._lock = Lock()

    def is_allowed(self) -> bool:
        """Determines if a request is permitted to proceed to the provider."""
        with self._lock:
            now = time.time()
            
            if self.state == CircuitState.CLOSED:
                return True

            if self.state == CircuitState.OPEN:
                if now - self.last_failure_time >= self.reset_timeout_seconds:
                    logger.info("Circuit breaker transitioning to HALF_OPEN to test recovery.")
                    self.state = CircuitState.HALF_OPEN
                    return True
                return False

            if self.state == CircuitState.HALF_OPEN:
                return True

            return True

    def record_success(self) -> None:
        """Records a successful API call, resetting circuit to CLOSED."""
        with self._lock:
            self.failure_count = 0
            self.last_success_time = time.time()
            if self.state != CircuitState.CLOSED:
                logger.info("Circuit breaker reset to CLOSED after successful canary call.")
                self.state = CircuitState.CLOSED

    def record_failure(self) -> None:
        """Records an API failure, tripping circuit to OPEN if threshold exceeded."""
        with self._lock:
            self.failure_count += 1
            self.last_failure_time = time.time()

            if self.state == CircuitState.CLOSED and self.failure_count >= self.failure_threshold:
                logger.warning(
                    "Circuit breaker TRIPPED to OPEN after %d consecutive failures.",
                    self.failure_count
                )
                self.state = CircuitState.OPEN

            elif self.state == CircuitState.HALF_OPEN:
                logger.warning("Canary call failed in HALF_OPEN state. Returning to OPEN.")
                self.state = CircuitState.OPEN


class HealthMonitor:
    """
    Central HealthMonitor tracking circuit breakers across all LLM providers.
    """
    def __init__(self, failure_threshold: int = 3, reset_timeout_seconds: float = 30.0):
        self.failure_threshold = failure_threshold
        self.reset_timeout_seconds = reset_timeout_seconds
        self._breakers: Dict[str, CircuitBreaker] = {}
        self._lock = Lock()

    def _get_breaker(self, provider_name: str) -> CircuitBreaker:
        with self._lock:
            if provider_name not in self._breakers:
                self._breakers[provider_name] = CircuitBreaker(
                    failure_threshold=self.failure_threshold,
                    reset_timeout_seconds=self.reset_timeout_seconds
                )
            return self._breakers[provider_name]

    def is_healthy(self, provider_name: str) -> bool:
        """Returns True if provider circuit permits execution."""
        breaker = self._get_breaker(provider_name)
        return breaker.is_allowed()

    def record_success(self, provider_name: str) -> None:
        """Records success for provider."""
        breaker = self._get_breaker(provider_name)
        breaker.record_success()

    def record_failure(self, provider_name: str) -> None:
        """Records failure for provider."""
        breaker = self._get_breaker(provider_name)
        breaker.record_failure()

    def get_state(self, provider_name: str) -> str:
        """Returns string state ('CLOSED', 'OPEN', 'HALF_OPEN')."""
        breaker = self._get_breaker(provider_name)
        return breaker.state.value
