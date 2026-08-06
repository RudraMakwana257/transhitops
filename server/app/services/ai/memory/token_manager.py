"""
TokenManager — Pure functional token estimation, budgeting, trimming, and threshold evaluation.
"""

from typing import List, Dict, Any, Tuple

class TokenManager:
    """
    Dedicated TokenManager for prompt budgeting, history trimming, and threshold checks.
    PromptBuilder and AIService delegate token calculations to this class.
    """

    @staticmethod
    def estimate_tokens(text: str) -> int:
        """Approximate token calculation (~4 characters per token)."""
        if not text:
            return 0
        return max(1, len(text) // 4)

    @staticmethod
    def estimate_messages_tokens(messages: List[Dict[str, Any]]) -> int:
        """Estimates total tokens across a list of message dicts."""
        total = 0
        for msg in messages:
            content = str(msg.get("content", ""))
            total += TokenManager.estimate_tokens(content) + 4  # 4 tokens overhead per message
        return total

    @staticmethod
    def remaining_budget(used_tokens: int, max_budget: int = 1000) -> int:
        """Returns remaining token budget."""
        return max(0, max_budget - used_tokens)

    @staticmethod
    def should_trim(history: List[Dict[str, Any]], budget: int) -> bool:
        """Checks if history token count exceeds token budget limit."""
        tokens = TokenManager.estimate_messages_tokens(history)
        return tokens > budget

    @staticmethod
    def should_summarize(history: List[Dict[str, Any]], threshold: int = 600) -> bool:
        """Checks if history token count exceeds summarization threshold."""
        tokens = TokenManager.estimate_messages_tokens(history)
        return tokens >= threshold

    @staticmethod
    def trim_history(
        history: List[Dict[str, Any]],
        budget: int
    ) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]]]:
        """
        Trims older messages until history fits within the specified token budget.
        Returns: (kept_messages, trimmed_excess_messages)
        """
        if not history:
            return [], []

        kept: List[Dict[str, Any]] = []
        accumulated_tokens = 0

        # Iterate in reverse (newest first) to prioritize recent turns
        for msg in reversed(history):
            msg_tokens = TokenManager.estimate_tokens(str(msg.get("content", ""))) + 4
            if accumulated_tokens + msg_tokens <= budget or not kept:
                kept.insert(0, msg)
                accumulated_tokens += msg_tokens
            else:
                break

        excess_count = len(history) - len(kept)
        excess = history[:excess_count] if excess_count > 0 else []

        return kept, excess

    @staticmethod
    def budget_status(
        system_tokens: int,
        history_tokens: int,
        max_budget: int = 1000
    ) -> Dict[str, Any]:
        """Returns structured budget status metrics."""
        total_used = system_tokens + history_tokens
        remaining = TokenManager.remaining_budget(total_used, max_budget)
        utilization_pct = round((total_used / max_budget * 100), 1) if max_budget > 0 else 0.0

        return {
            "max_budget": max_budget,
            "system_tokens": system_tokens,
            "history_tokens": history_tokens,
            "total_used": total_used,
            "remaining_budget": remaining,
            "utilization_pct": utilization_pct,
            "is_over_budget": total_used > max_budget
        }
