"""
Event Bus Module — Thread-safe, error-isolated event subscription and publishing engine.
"""

import logging
from threading import Lock
from typing import Callable, Dict, List, Type
from app.services.ai.agent.workflow_events import BaseWorkflowEvent

logger = logging.getLogger(__name__)

EventHandler = Callable[[BaseWorkflowEvent], None]

class EventBus:
    """
    Thread-safe EventBus providing isolated listener execution.
    Failing subscriber callbacks are logged without stopping event dispatch.
    """
    def __init__(self):
        self._listeners: Dict[Type[BaseWorkflowEvent], List[EventHandler]] = {}
        self._global_listeners: List[EventHandler] = []
        self._lock = Lock()

    def subscribe(self, event_type: Type[BaseWorkflowEvent], handler: EventHandler) -> None:
        """Subscribes a handler to a specific event class."""
        with self._lock:
            if event_type not in self._listeners:
                self._listeners[event_type] = []
            if handler not in self._listeners[event_type]:
                self._listeners[event_type].append(handler)

    def subscribe_all(self, handler: EventHandler) -> None:
        """Subscribes a handler to receive all emitted events."""
        with self._lock:
            if handler not in self._global_listeners:
                self._global_listeners.append(handler)

    def unsubscribe(self, event_type: Type[BaseWorkflowEvent], handler: EventHandler) -> None:
        """Unsubscribes a handler from an event class."""
        with self._lock:
            if event_type in self._listeners and handler in self._listeners[event_type]:
                self._listeners[event_type].remove(handler)

    def publish(self, event: BaseWorkflowEvent) -> None:
        """
        Publishes an event to all subscribed listeners.
        Catches and logs exceptions thrown by individual handlers for isolation.
        """
        event_cls = type(event)
        handlers_to_call = []

        with self._lock:
            handlers_to_call.extend(self._global_listeners)
            if event_cls in self._listeners:
                handlers_to_call.extend(self._listeners[event_cls])

        for handler in handlers_to_call:
            try:
                handler(event)
            except Exception as e:
                logger.error(
                    "EventBus subscriber handler %s failed for event %s: %s",
                    getattr(handler, '__name__', str(handler)),
                    event.event_type,
                    str(e),
                    exc_info=True
                )
