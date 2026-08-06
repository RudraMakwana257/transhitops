import time
import pytest
from app.services.ai.memory.token_manager import TokenManager
from app.services.ai.memory.history_summarizer import RuleBasedSummarizer
from app.services.ai.memory.memory_manager import (
    MemoryManager,
    InMemoryStore,
    MemoryPolicy,
    SessionMetadata,
    RuntimeMetrics,
    SessionData,
    MemoryContext
)


def test_token_manager_estimation():
    assert TokenManager.estimate_tokens("") == 0
    assert TokenManager.estimate_tokens("Hello World!") >= 1
    
    msgs = [{"role": "user", "content": "How many vehicles are available?"}]
    assert TokenManager.estimate_messages_tokens(msgs) > 5


def test_token_manager_budgeting():
    assert TokenManager.remaining_budget(400, max_budget=1000) == 600
    assert TokenManager.remaining_budget(1200, max_budget=1000) == 0

    status = TokenManager.budget_status(system_tokens=200, history_tokens=300, max_budget=1000)
    assert status["total_used"] == 500
    assert status["remaining_budget"] == 500
    assert status["utilization_pct"] == 50.0
    assert status["is_over_budget"] is False


def test_token_manager_trimming():
    msgs = [{"role": "user", "content": f"Message {i} " * 10} for i in range(10)]
    
    kept, excess = TokenManager.trim_history(msgs, budget=30)
    assert len(kept) < len(msgs)
    assert len(kept) + len(excess) == len(msgs)
    assert kept[-1]["content"] == msgs[-1]["content"]  # Preserves latest message


def test_rule_based_summarizer():
    summarizer = RuleBasedSummarizer()
    msgs = [
        {"role": "user", "content": "Check status of Truck-05 and MH-01-AB-1234"},
        {"role": "assistant", "content": "Truck-05 is Available."}
    ]
    summary = summarizer.summarize(msgs)
    assert "RUNNING SUMMARY" in summary
    assert "Truck-05" in summary
    assert "MH-01-AB-1234" in summary


def test_in_memory_store_ttl():
    store = InMemoryStore(ttl_minutes=1)
    meta = SessionMetadata(session_id="test_ttl_session")
    session = SessionData(metadata=meta, runtime_metrics=RuntimeMetrics())
    
    store.save_session("test_ttl_session", session)
    assert store.get_session("test_ttl_session") is not None

    # Simulate TTL expiration
    session.runtime_metrics.last_activity = time.time() - 100
    assert store.get_session("test_ttl_session") is None


def test_memory_manager_session_lifecycle():
    policy = MemoryPolicy(max_recent_turns=2, summary_threshold=100)
    mgr = MemoryManager(policy=policy)
    
    # 1. Get or create session
    ctx = mgr.get_memory_context("session_101", company_id="comp_a", user_id="user_1")
    assert ctx.metadata.session_id == "session_101"
    assert ctx.recent_messages == []
    assert ctx.running_summary is None

    # 2. Add turns
    mgr.add_turn("session_101", "Show vehicles", "5 vehicles available", company_id="comp_a", user_id="user_1")
    ctx2 = mgr.get_memory_context("session_101", company_id="comp_a", user_id="user_1")
    assert len(ctx2.recent_messages) == 2
    assert ctx2.runtime_metrics.total_messages == 2

    # 3. Add more turns to trigger summarization
    for i in range(5):
        mgr.add_turn("session_101", f"Query {i} " * 10, f"Response {i} " * 10, company_id="comp_a", user_id="user_1")

    ctx3 = mgr.get_memory_context("session_101", company_id="comp_a", user_id="user_1")
    assert ctx3.running_summary is not None
    assert "RUNNING SUMMARY" in ctx3.running_summary
    assert len(ctx3.recent_messages) <= policy.max_recent_turns * 2

    # 4. Clear session
    mgr.clear_session("session_101")
    ctx4 = mgr.get_memory_context("session_101", company_id="comp_a", user_id="user_1")
    assert ctx4.recent_messages == []
    assert ctx4.running_summary is None
