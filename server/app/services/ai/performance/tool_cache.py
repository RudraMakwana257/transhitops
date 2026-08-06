"""
Tool Result Cache Module — Provides CachePolicy, CacheStore interface, InMemoryToolCache,
deterministic key generation, and granular cache management helper functions.
"""

import json
import time
import hashlib
import logging
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from threading import Lock
from typing import Any, Dict, List, Optional

logger = logging.getLogger(__name__)

# =====================================================================
# CACHE POLICY
# =====================================================================

@dataclass
class CachePolicy:
    """
    Configurable cache TTL policy per tool name or category.
    Prevents hardcoded TTL values across the system.
    """
    default_ttl_seconds: int = 60
    category_ttls: Dict[str, int] = field(default_factory=lambda: {
        "vehicle": 60,
        "driver": 60,
        "trip": 45,
        "maintenance": 30,
        "analytics": 120,
    })
    tool_ttls: Dict[str, int] = field(default_factory=lambda: {
        "vehicle.summary": 60,
        "driver.summary": 60,
        "trip.summary": 45,
        "maintenance.open": 30,
        "analytics.dashboard": 120,
    })

    def get_ttl_for_tool(self, tool_name: str, category: str = "") -> int:
        """Resolves TTL for a tool by tool name, then category, then default."""
        if tool_name in self.tool_ttls:
            return self.tool_ttls[tool_name]
        if category in self.category_ttls:
            return self.category_ttls[category]
        return self.default_ttl_seconds


# =====================================================================
# DETERMINISTIC CACHE KEY GENERATOR
# =====================================================================

def generate_cache_key(tool_name: str, company_id: Optional[str] = None, **kwargs) -> str:
    """
    Generates a deterministic, tenant-isolated cache key.
    Includes sorted normalized arguments to prevent cross-tenant collisions.
    Format: tool_cache:{company_id}:{tool_name}:{args_hash}
    """
    comp_id = str(company_id or kwargs.get("company_id", "global"))
    clean_kwargs = {k: v for k, v in kwargs.items() if k != "company_id"}
    
    # Sort and normalize kwargs
    normalized_kwargs = {}
    for k, v in sorted(clean_kwargs.items()):
        if isinstance(v, (dict, list)):
            normalized_kwargs[k] = str(v)
        else:
            normalized_kwargs[k] = v

    kwargs_json = json.dumps(normalized_kwargs, sort_keys=True, default=str)
    args_hash = hashlib.sha256(kwargs_json.encode("utf-8")).hexdigest()[:12]

    return f"tool_cache:{comp_id}:{tool_name}:{args_hash}"


# =====================================================================
# CACHE STORE INTERFACE & IN-MEMORY IMPLEMENTATION
# =====================================================================

@dataclass
class CacheEntry:
    value: Any
    expires_at: float
    tool_name: str
    company_id: str


class CacheStore(ABC):
    """
    Abstract Cache Store Interface.
    Designed for seamless future adaptation to Redis, Memcached, or Distributed Caches.
    """
    @abstractmethod
    def get(self, key: str) -> Optional[Any]:
        pass

    @abstractmethod
    def set(self, key: str, value: Any, ttl_seconds: int = 60, tool_name: str = "", company_id: str = "") -> None:
        pass

    @abstractmethod
    def invalidate_key(self, key: str) -> None:
        pass

    @abstractmethod
    def invalidate_tool(self, tool_name: str, company_id: Optional[str] = None) -> None:
        pass

    @abstractmethod
    def invalidate_company_tools(self, company_id: str) -> None:
        pass

    @abstractmethod
    def clear(self) -> None:
        pass

    @abstractmethod
    def clear_expired(self) -> int:
        pass


class InMemoryToolCache(CacheStore):
    """
    Thread-safe in-memory cache implementation supporting TTL, company isolation, and invalidation.
    """
    def __init__(self, policy: Optional[CachePolicy] = None):
        self.policy = policy or CachePolicy()
        self._store: Dict[str, CacheEntry] = {}
        self._lock = Lock()

    def get(self, key: str) -> Optional[Any]:
        with self._lock:
            entry = self._store.get(key)
            if not entry:
                return None
            
            if time.time() > entry.expires_at:
                del self._store[key]
                return None

            return entry.value

    def set(
        self,
        key: str,
        value: Any,
        ttl_seconds: Optional[int] = None,
        tool_name: str = "",
        company_id: str = ""
    ) -> None:
        ttl = ttl_seconds if ttl_seconds is not None else self.policy.default_ttl_seconds
        expires_at = time.time() + ttl

        with self._lock:
            self._store[key] = CacheEntry(
                value=value,
                expires_at=expires_at,
                tool_name=tool_name,
                company_id=str(company_id)
            )

    def invalidate_key(self, key: str) -> None:
        with self._lock:
            self._store.pop(key, None)

    def invalidate_tool(self, tool_name: str, company_id: Optional[str] = None) -> None:
        comp_id_str = str(company_id) if company_id else None
        with self._lock:
            to_delete = [
                k for k, entry in self._store.items()
                if entry.tool_name == tool_name and (comp_id_str is None or entry.company_id == comp_id_str)
            ]
            for k in to_delete:
                del self._store[k]

    def invalidate_company_tools(self, company_id: str) -> None:
        comp_id_str = str(company_id)
        with self._lock:
            to_delete = [
                k for k, entry in self._store.items()
                if entry.company_id == comp_id_str
            ]
            for k in to_delete:
                del self._store[k]

    def clear(self) -> None:
        with self._lock:
            self._store.clear()

    def clear_expired(self) -> int:
        now = time.time()
        with self._lock:
            expired_keys = [k for k, entry in self._store.items() if now > entry.expires_at]
            for k in expired_keys:
                del self._store[k]
            return len(expired_keys)
