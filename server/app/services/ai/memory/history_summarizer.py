"""
History Summarizer Module — Defines Summarizer interface and RuleBasedSummarizer implementation.
"""

import re
import logging
from abc import ABC, abstractmethod
from typing import List, Dict, Any, Optional

logger = logging.getLogger(__name__)

class Summarizer(ABC):
    """
    Abstract interface for conversation summarization implementations.
    Decoupled from LLMs, provider implementations, or storage layers.
    """

    @abstractmethod
    def summarize(
        self,
        messages: List[Dict[str, Any]],
        existing_summary: Optional[str] = None
    ) -> str:
        """Summarize older messages into a compact fact representation."""
        pass


class RuleBasedSummarizer(Summarizer):
    """
    Fast, deterministic, zero-cost RuleBasedSummarizer.
    Extracts key business entities (vehicle names, reg numbers), user choices,
    and facts without calling an LLM.
    """

    def summarize(
        self,
        messages: List[Dict[str, Any]],
        existing_summary: Optional[str] = None
    ) -> str:
        if not messages:
            return existing_summary or ""

        facts: List[str] = []
        if existing_summary:
            facts.append(existing_summary)

        # Entity regex patterns
        vehicle_pattern = r'\b[A-Z]{2}-\d{2}-[A-Z]{1,2}-\d{4}\b|\bTruck-\d+\b|\bVan-\d+\b'
        trip_pattern = r'\bTRP-[A-Z0-9]+\b'

        for msg in messages:
            role = str(msg.get("role", "")).capitalize()
            content = str(msg.get("content", ""))

            # Extract entity references
            vehicles_found = re.findall(vehicle_pattern, content, flags=re.IGNORECASE)
            trips_found = re.findall(trip_pattern, content, flags=re.IGNORECASE)

            entities = list(set(vehicles_found + trips_found))
            entity_str = f" [Entities: {', '.join(entities)}]" if entities else ""

            # Extract key statement (first 80 chars)
            short_content = content[:80] + ("..." if len(content) > 80 else "")
            facts.append(f"{role} discussed: {short_content}{entity_str}")

        summary = "RUNNING SUMMARY:\n" + "\n".join(f"- {f}" for f in facts)
        return summary
