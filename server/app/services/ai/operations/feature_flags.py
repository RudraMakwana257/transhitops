"""
Feature Flags Module — Interface-first, thread-safe feature flag manager for hot-reloading.
"""

import logging
from abc import ABC, abstractmethod
from threading import Lock
from typing import Dict, Set, Optional

logger = logging.getLogger(__name__)

class FeatureStore(ABC):
    """
    Abstract Interface for Feature Flag persistence.
    Supports future Redis, LaunchDarkly, or Unleash backends.
    """
    @abstractmethod
    def set_flag(self, flag_name: str, enabled: bool) -> None:
        pass

    @abstractmethod
    def get_flag(self, flag_name: str, default: bool = True) -> bool:
        pass


class InMemoryFeatureStore(FeatureStore):
    """
    Thread-safe in-memory FeatureStore.
    """
    def __init__(self):
        self._flags: Dict[str, bool] = {}
        self._lock = Lock()

    def set_flag(self, flag_name: str, enabled: bool) -> None:
        with self._lock:
            self._flags[flag_name] = enabled
            logger.info("Feature flag set flag=%s enabled=%s", flag_name, enabled)

    def get_flag(self, flag_name: str, default: bool = True) -> bool:
        with self._lock:
            return self._flags.get(flag_name, default)


class FeatureFlagManager:
    """
    Manager for runtime feature flags, model toggles, tool toggles, and cache controls.
    """
    def __init__(self, store: Optional[FeatureStore] = None):
        self.store = store or InMemoryFeatureStore()

    # Models
    def enable_model(self, model_id: str) -> None:
        self.store.set_flag(f"model:{model_id}", True)

    def disable_model(self, model_id: str) -> None:
        self.store.set_flag(f"model:{model_id}", False)

    def is_model_enabled(self, model_id: str) -> bool:
        return self.store.get_flag(f"model:{model_id}", default=True)

    # Tools
    def enable_tool(self, tool_name: str) -> None:
        self.store.set_flag(f"tool:{tool_name}", True)

    def disable_tool(self, tool_name: str) -> None:
        self.store.set_flag(f"tool:{tool_name}", False)

    def is_tool_enabled(self, tool_name: str) -> bool:
        return self.store.get_flag(f"tool:{tool_name}", default=True)

    # Providers
    def enable_provider(self, provider_name: str) -> None:
        self.store.set_flag(f"provider:{provider_name}", True)

    def disable_provider(self, provider_name: str) -> None:
        self.store.set_flag(f"provider:{provider_name}", False)

    def is_provider_enabled(self, provider_name: str) -> bool:
        return self.store.get_flag(f"provider:{provider_name}", default=True)

    # Features
    def enable_reasoning(self) -> None:
        self.store.set_flag("feature:reasoning", True)

    def disable_reasoning(self) -> None:
        self.store.set_flag("feature:reasoning", False)

    def is_reasoning_enabled(self) -> bool:
        return self.store.get_flag("feature:reasoning", default=True)

    def enable_cache(self) -> None:
        self.store.set_flag("feature:cache", True)

    def disable_cache(self) -> None:
        self.store.set_flag("feature:cache", False)

    def is_cache_enabled(self) -> bool:
        return self.store.get_flag("feature:cache", default=True)
