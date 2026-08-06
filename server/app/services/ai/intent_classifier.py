import re
from dataclasses import dataclass, field
from enum import Enum
from typing import Optional, List, Dict, Tuple

class Intent(str, Enum):
    VEHICLE = "VEHICLE"
    DRIVER = "DRIVER"
    TRIP = "TRIP"
    MAINTENANCE = "MAINTENANCE"
    ANALYTICS = "ANALYTICS"
    GENERAL = "GENERAL"

@dataclass
class IntentResult:
    intent: Intent
    confidence: float
    matched_keywords: List[str] = field(default_factory=list)
    reason: str = ""

    def to_dict(self) -> dict:
        return {
            "intent": self.intent.value,
            "confidence": self.confidence,
            "matched_keywords": self.matched_keywords,
            "reason": self.reason,
        }

# Priority 1: Exact keyword matches (case-insensitive substring/word match)
EXACT_KEYWORDS: Dict[Intent, List[str]] = {
    Intent.VEHICLE: [
        "vehicle", "vehicles", "truck", "trucks", "van", "vans", "bus", "buses",
        "fleet", "available vehicle", "available vehicles", "in shop", "on trip vehicle",
        "capacity", "odometer", "registration", "reg number", "vehicle health", "utilization"
    ],
    Intent.DRIVER: [
        "driver", "drivers", "license", "licence", "expir", "suspended",
        "safety score", "available driver", "available drivers", "on duty", "assigned driver"
    ],
    Intent.TRIP: [
        "trip", "trips", "dispatch", "dispatched", "route", "routes", "cargo",
        "destination", "source", "completed trip", "completed trips", "draft trip",
        "active trip", "active trips", "journey", "delivery"
    ],
    Intent.MAINTENANCE: [
        "maintenance", "repair", "repairs", "service", "workshop", "open job",
        "open jobs", "scheduled maintenance", "overdue", "technician", "maintenance cost"
    ],
    Intent.ANALYTICS: [
        "cost", "costs", "expense", "expenses", "fuel cost", "spending",
        "total cost", "monthly", "weekly", "trend", "average", "roi", "efficiency", "report"
    ]
}

# Priority 2: Regex patterns for intent detection
REGEX_PATTERNS: Dict[Intent, List[str]] = {
    Intent.VEHICLE: [
        r'\b(which|how many|show|list)\b.*\b(vehicle|vehicles|truck|trucks|van|vans)\b',
        r'\b(vehicle|truck|van)\b.*\b(available|busy|shop|health|odometer)\b',
    ],
    Intent.DRIVER: [
        r'\b(which|how many|show|list)\b.*\b(driver|drivers|license|licence)\b',
        r'\b(license|licence)\b.*\b(expir|expire|valid|invalid)\b',
    ],
    Intent.TRIP: [
        r'\b(which|how many|show|list)\b.*\b(trip|trips|route|routes|dispatch)\b',
        r'\b(active|delayed|completed|draft)\b.*\b(trip|trips)\b',
    ],
    Intent.MAINTENANCE: [
        r'\b(maintenance|repair|service|job|workshop)\b',
        r'\b(in shop|under repair)\b',
    ],
    Intent.ANALYTICS: [
        r'\b(utilization|cost|expense|fuel|spending|analytics|trend|summary)\b',
        r'\bhow much\b.*\b(cost|spent|fuel|money)\b',
    ],
}

CONFIDENCE_THRESHOLD = 0.40

def classify_intent(message: str, history: Optional[List[dict]] = None) -> IntentResult:
    """
    Deterministic intent classification pipeline:
    1. Exact Keyword Matching
    2. Regex Pattern Matching
    3. Rule-based scoring (combining keywords + regex + context history)
    4. Fallback to GENERAL if confidence < threshold
    """
    if not message or not message.strip():
        return IntentResult(
            intent=Intent.GENERAL,
            confidence=0.0,
            matched_keywords=[],
            reason="Empty user message, fallback to GENERAL context."
        )

    clean_msg = message.lower().strip()

    # Step 1 & 2: Evaluate keyword and regex matches per intent
    scores: Dict[Intent, float] = {intent: 0.0 for intent in Intent}
    matches: Dict[Intent, List[str]] = {intent: [] for intent in Intent}

    for intent, keywords in EXACT_KEYWORDS.items():
        for kw in keywords:
            if kw in clean_msg:
                scores[intent] += 1.0
                matches[intent].append(kw)

    for intent, patterns in REGEX_PATTERNS.items():
        for pat in patterns:
            if re.search(pat, clean_msg):
                scores[intent] += 1.5
                matches[intent].append(f"regex:{pat}")

    # History context boost (continuity check)
    if history and len(history) > 0:
        last_msg = history[-1].get("content", "").lower() if isinstance(history[-1], dict) else ""
        for intent, keywords in EXACT_KEYWORDS.items():
            for kw in keywords:
                if kw in last_msg:
                    scores[intent] += 0.3

    best_intent = max(scores, key=lambda k: scores[k])
    best_score = scores[best_intent]
    total_score = sum(scores.values())

    if best_score == 0.0 or total_score == 0.0:
        return IntentResult(
            intent=Intent.GENERAL,
            confidence=0.0,
            matched_keywords=[],
            reason="No intent keywords or regex matched. Defaulting to GENERAL."
        )

    # Calculate normalized confidence (capped at 0.98)
    confidence = min(0.98, round(best_score / (total_score + 0.5), 2))

    if confidence < CONFIDENCE_THRESHOLD:
        return IntentResult(
            intent=Intent.GENERAL,
            confidence=confidence,
            matched_keywords=matches[best_intent],
            reason=f"Confidence {confidence:.2f} below threshold {CONFIDENCE_THRESHOLD}. Fallback to GENERAL."
        )

    return IntentResult(
        intent=best_intent,
        confidence=confidence,
        matched_keywords=matches[best_intent],
        reason=f"Matched {len(matches[best_intent])} pattern(s) for {best_intent.value}."
    )
