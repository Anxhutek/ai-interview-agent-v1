import time
import logging
from typing import List, Dict, Any, Optional
from services.ai.gemini_provider import GeminiProvider
from services.ai.groq_provider import GroqProvider
from core.config import settings

logger = logging.getLogger(__name__)

PREFERRED_MODEL_ORDER = [
    "gemini-3.5-flash",
    "gemini-3.5-flash-lite",
    "gemini-3.1-flash-lite",
    "gemini-flash-latest",
    "gemini-flash-lite-latest",
    "gemma-4-31b-it",
    "gemma-4-26b-a4b-it"
]

GROQ_DEFAULT_MODELS = [
    "llama-3.3-70b-versatile",
    "llama-3.1-8b-instant",
    "mixtral-8x7b-32768"
]

class ModelRegistry:
    def __init__(self, gemini_provider: GeminiProvider, groq_provider: GroqProvider):
        self.gemini_provider = gemini_provider
        self.groq_provider = groq_provider
        self._models: Dict[str, Dict[str, Any]] = {}
        self._last_refresh: float = 0.0

    def _init_default_cache(self):
        # Populate initial tracking entries for preferred models
        now = time.time()
        for m in PREFERRED_MODEL_ORDER:
            if m not in self._models:
                self._models[m] = {
                    "model": m,
                    "provider": "gemini",
                    "status": "unknown",  # 'available', 'cooldown', 'unavailable', 'unknown'
                    "latency_ms": 0.0,
                    "last_success": None,
                    "last_error": None,
                    "cooldown_until": 0.0
                }
        for m in GROQ_DEFAULT_MODELS:
            if m not in self._models:
                self._models[m] = {
                    "model": m,
                    "provider": "groq",
                    "status": "available" if self.groq_provider.is_configured() else "unavailable",
                    "latency_ms": 0.0,
                    "last_success": None,
                    "last_error": None,
                    "cooldown_until": 0.0
                }

    async def discover_models(self) -> List[Dict[str, Any]]:
        self._init_default_cache()
        # Query Gemini API models
        gemini_discovered = await self.gemini_provider.list_models()
        now = time.time()

        for g_model in gemini_discovered:
            name = g_model["name"]
            if name not in self._models:
                self._models[name] = {
                    "model": name,
                    "provider": "gemini",
                    "status": "available",
                    "latency_ms": 0.0,
                    "last_success": None,
                    "last_error": None,
                    "cooldown_until": 0.0
                }
            else:
                if self._models[name]["status"] == "unknown":
                    self._models[name]["status"] = "available"

        # Query Groq models if configured
        if self.groq_provider.is_configured():
            groq_discovered = await self.groq_provider.list_models()
            for q_model in groq_discovered:
                name = q_model["name"]
                if name not in self._models:
                    self._models[name] = {
                        "model": name,
                        "provider": "groq",
                        "status": "available",
                        "latency_ms": 0.0,
                        "last_success": None,
                        "last_error": None,
                        "cooldown_until": 0.0
                    }

        self._last_refresh = now
        return list(self._models.values())

    async def refresh_models(self) -> List[Dict[str, Any]]:
        return await self.discover_models()

    def get_available_models(self) -> List[Dict[str, Any]]:
        self._init_default_cache()
        now = time.time()
        available = []
        for name, info in self._models.items():
            if info["cooldown_until"] > 0 and now >= info["cooldown_until"]:
                info["status"] = "available"
                info["cooldown_until"] = 0.0

            if info["status"] in ("available", "unknown"):
                available.append(info)
        return available

    def get_best_model(self, provider: str = "gemini") -> Optional[str]:
        self.get_available_models()  # update cooldowns
        now = time.time()

        if provider == "gemini":
            # Check according to PREFERRED_MODEL_ORDER priority
            for p_model in PREFERRED_MODEL_ORDER:
                info = self._models.get(p_model)
                if info and info["status"] != "unavailable":
                    if info["cooldown_until"] == 0.0 or now >= info["cooldown_until"]:
                        return p_model
            # Fallback to any available Gemini model
            for name, info in self._models.items():
                if info["provider"] == "gemini" and info["status"] != "unavailable":
                    if info["cooldown_until"] == 0.0 or now >= info["cooldown_until"]:
                        return name
            return None

        elif provider == "groq":
            for g_model in GROQ_DEFAULT_MODELS:
                info = self._models.get(g_model)
                if info and info["status"] != "unavailable":
                    if info["cooldown_until"] == 0.0 or now >= info["cooldown_until"]:
                        return g_model
            for name, info in self._models.items():
                if info["provider"] == "groq" and info["status"] != "unavailable":
                    if info["cooldown_until"] == 0.0 or now >= info["cooldown_until"]:
                        return name
            return None

        return None

    def mark_model_success(self, model_name: str, latency_ms: float):
        if model_name not in self._models:
            self._models[model_name] = {
                "model": model_name,
                "provider": "gemini" if "gemini" in model_name or "gemma" in model_name else "groq",
                "status": "available",
                "latency_ms": latency_ms,
                "last_success": time.time(),
                "last_error": None,
                "cooldown_until": 0.0
            }
        else:
            self._models[model_name]["status"] = "available"
            self._models[model_name]["latency_ms"] = latency_ms
            self._models[model_name]["last_success"] = time.time()
            self._models[model_name]["cooldown_until"] = 0.0

    def mark_model_unavailable(self, model_name: str, cooldown_seconds: float = 60.0, error_reason: Optional[str] = None):
        now = time.time()
        if model_name not in self._models:
            self._models[model_name] = {
                "model": model_name,
                "provider": "gemini" if "gemini" in model_name or "gemma" in model_name else "groq",
                "status": "unavailable" if cooldown_seconds == 0 else "cooldown",
                "latency_ms": 0.0,
                "last_success": None,
                "last_error": error_reason,
                "cooldown_until": now + cooldown_seconds if cooldown_seconds > 0 else 0.0
            }
        else:
            self._models[model_name]["status"] = "unavailable" if cooldown_seconds == 0 else "cooldown"
            self._models[model_name]["last_error"] = error_reason
            self._models[model_name]["cooldown_until"] = now + cooldown_seconds if cooldown_seconds > 0 else 0.0

        logger.warning(f"Model '{model_name}' marked {self._models[model_name]['status']} for {cooldown_seconds}s. Reason: {error_reason}")
