from abc import ABC, abstractmethod
from typing import List, Dict, Any, Tuple, Optional

class AIProvider(ABC):
    @property
    @abstractmethod
    def provider_name(self) -> str:
        """Returns the provider unique identifier (e.g. 'gemini', 'groq')."""
        pass

    @abstractmethod
    async def generate(
        self,
        prompt: str,
        system_instruction: Optional[str] = None,
        model: Optional[str] = None,
        temperature: float = 0.7
    ) -> Tuple[str, str, float]:
        """
        Generates text using the AI provider.
        Returns: Tuple[generated_text, model_used, latency_ms]
        """
        pass

    @abstractmethod
    async def health_check(self) -> Dict[str, Any]:
        """
        Performs a health check on the provider.
        Returns: dict with status ('healthy', 'degraded', 'unavailable'), latency_ms, last_error, etc.
        """
        pass

    @abstractmethod
    async def list_models(self) -> List[Dict[str, Any]]:
        """
        Queries available models from the provider.
        """
        pass
