import pytest
from app.services.ai.intent_classifier import classify_intent, Intent, IntentResult, CONFIDENCE_THRESHOLD

def test_intent_classifier_vehicle():
    res = classify_intent("Which vehicles are available right now?")
    assert res.intent == Intent.VEHICLE
    assert res.confidence >= CONFIDENCE_THRESHOLD
    assert any("vehicle" in kw for kw in res.matched_keywords)

def test_intent_classifier_driver():
    res = classify_intent("Show me all drivers with expiring licenses")
    assert res.intent == Intent.DRIVER
    assert res.confidence >= CONFIDENCE_THRESHOLD
    assert any("driver" in kw or "expir" in kw for kw in res.matched_keywords)

def test_intent_classifier_trip():
    res = classify_intent("What active trips are currently dispatched?")
    assert res.intent == Intent.TRIP
    assert res.confidence >= CONFIDENCE_THRESHOLD
    assert any("trip" in kw or "dispatch" in kw for kw in res.matched_keywords)

def test_intent_classifier_maintenance():
    res = classify_intent("How many open maintenance jobs are in the workshop?")
    assert res.intent == Intent.MAINTENANCE
    assert res.confidence >= CONFIDENCE_THRESHOLD
    assert any("maintenance" in kw or "workshop" in kw for kw in res.matched_keywords)

def test_intent_classifier_analytics():
    res = classify_intent("What is the total fuel expense and monthly cost summary?")
    assert res.intent == Intent.ANALYTICS
    assert res.confidence >= CONFIDENCE_THRESHOLD

def test_intent_classifier_fallback_empty():
    res = classify_intent("")
    assert res.intent == Intent.GENERAL
    assert res.confidence == 0.0
    assert "Empty user message" in res.reason

def test_intent_classifier_fallback_unknown():
    res = classify_intent("Hello, how is the weather today?")
    assert res.intent == Intent.GENERAL
    assert res.confidence < CONFIDENCE_THRESHOLD

def test_intent_classifier_history_boost():
    history = [{"role": "user", "content": "Tell me about vehicles."}]
    res = classify_intent("Show details", history=history)
    assert res.intent == Intent.VEHICLE

def test_intent_classifier_result_structure():
    res = classify_intent("Show trucks")
    d = res.to_dict()
    assert "intent" in d
    assert "confidence" in d
    assert "matched_keywords" in d
    assert "reason" in d
    assert isinstance(d["confidence"], float)
