"""
Provider Registry Module — Central map of registered provider instances.
"""

import logging
from typing import Dict, List, Optional
from app.services.ai.providers.base_provider import BaseLLMProvider
from app.services.ai.providers.groq_provider import GroqProvider

logger = logging.getLogger(__name__)

class ProviderRegistry:
    """
    Central, non-magical ProviderRegistry mapping provider names to singleton provider instances.
    """
    def __init__(self):
        self._providers: Dict[str, BaseLLMProvider] = {}
        # Seed default providers
        self.register_provider("groq", GroqProvider())

    def register_provider(self, name: str, provider: BaseLLMProvider) -> None:
        """Registers a provider instance."""
        self._providers[name.lower()] = provider

    def get_provider(self, name: str) -> Optional[BaseLLMProvider]:
        """Gets provider instance by name."""
        return self._providers.get(name.lower())

    def list_providers(self) -> List[str]:
        """Lists registered provider names."""
        return list(self._providers.keys())
