"""
Configuration Manager Module — Interface-first, thread-safe configuration management with version tracking.
"""

import time
import logging
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from threading import Lock
from typing import Dict, Any, Optional

logger = logging.getLogger(__name__)

@dataclass(frozen=True)
class ConfigSnapshot:
    """
    Immutable snapshot of AI backend runtime configuration.
    """
    version: int
    timestamp: float
    sections: Dict[str, Dict[str, Any]]

    def to_dict(self) -> dict:
        return {
            "version": self.version,
            "timestamp": self.timestamp,
            "sections": self.sections,
        }


class ConfigurationStore(ABC):
    """
    Abstract interface for configuration storage.
    Supports future Redis, Consul, Vault, AWS Parameter Store adapters.
    """
    @abstractmethod
    def get_config(self) -> ConfigSnapshot:
        pass

    @abstractmethod
    def update_key(self, section: str, key: str, value: Any) -> ConfigSnapshot:
        pass

    @abstractmethod
    def hot_reload(self) -> ConfigSnapshot:
        pass


class InMemoryConfigurationStore(ConfigurationStore):
    """
    Thread-safe in-memory implementation of ConfigurationStore.
    """
    def __init__(self):
        self._lock = Lock()
        self._version = 1
        self._sections: Dict[str, Dict[str, Any]] = {
            "ai": {"default_temperature": 0.2, "max_tokens": 1024},
            "security": {"prompt_guard_enabled": True, "max_input_chars": 500},
            "memory": {"ttl_minutes": 30, "max_history_turns": 10},
            "providers": {"primary": "groq", "fallback_model": "llama-3.1-8b-instant"},
            "operations": {"log_level": "INFO", "enable_audit": True},
        }

    def get_config(self) -> ConfigSnapshot:
        with self._lock:
            # Return deep copy in immutable snapshot
            sections_copy = {s: dict(v) for s, v in self._sections.items()}
            return ConfigSnapshot(
                version=self._version,
                timestamp=time.time(),
                sections=sections_copy
            )

    def update_key(self, section: str, key: str, value: Any) -> ConfigSnapshot:
        with self._lock:
            if section not in self._sections:
                self._sections[section] = {}
            self._sections[section][key] = value
            self._version += 1
            logger.info("Configuration key updated section=%s key=%s version=%d", section, key, self._version)
            sections_copy = {s: dict(v) for s, v in self._sections.items()}
            return ConfigSnapshot(version=self._version, timestamp=time.time(), sections=sections_copy)

    def hot_reload(self) -> ConfigSnapshot:
        with self._lock:
            self._version += 1
            logger.info("Configuration hot-reloaded version=%d", self._version)
            sections_copy = {s: dict(v) for s, v in self._sections.items()}
            return ConfigSnapshot(version=self._version, timestamp=time.time(), sections=sections_copy)


class ConfigurationManager:
    """
    Facade for managing system configuration using a ConfigurationStore backend.
    """
    def __init__(self, store: Optional[ConfigurationStore] = None):
        self.store = store or InMemoryConfigurationStore()

    def get_setting(self, section: str, key: str, default: Any = None) -> Any:
        snapshot = self.store.get_config()
        return snapshot.sections.get(section, {}).get(key, default)

    def set_setting(self, section: str, key: str, value: Any) -> ConfigSnapshot:
        return self.store.update_key(section, key, value)

    def get_snapshot(self) -> ConfigSnapshot:
        return self.store.get_config()

    def reload(self) -> ConfigSnapshot:
        return self.store.hot_reload()
