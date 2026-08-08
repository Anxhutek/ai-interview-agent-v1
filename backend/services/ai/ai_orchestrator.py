import asyncio
import time
import logging
from typing import Tuple, Dict, Any, Optional, List

from services.ai.base import AIProvider
from services.ai.gemini_provider import GeminiProvider, GeminiAPIError
from services.ai.groq_provider import GroqProvider, GroqAPIError
from services.ai.model_registry import ModelRegistry, PREFERRED_MODEL_ORDER
from core.config import settings

logger = logging.getLogger(__name__)

class AIOrchestrator:
    def __init__(
        self,
        gemini_provider: GeminiProvider,
        groq_provider: GroqProvider,
        model_registry: ModelRegistry
    ):
        self.gemini_provider = gemini_provider
        self.groq_provider = groq_provider
        self.registry = model_registry

    async def generate_with_fallback(
        self,
        prompt: str,
        system_instruction: Optional[str] = None,
        operation: str = "evaluation",
        temperature: float = 0.7
    ) -> Tuple[str, str, str, float]:
        """
        Executes text generation using priority Gemini models -> fallback Gemini models -> Groq fallback.
        Returns: Tuple[generated_text, provider_name, model_used, latency_ms]
        """
        # Ensure registry initialized
        await self.registry.discover_models()

        # Build sequence of Gemini models to attempt
        gemini_candidate_models = list(PREFERRED_MODEL_ORDER)
        # Add any other discovered Gemini models
        for item in self.registry.get_available_models():
            if item["provider"] == "gemini" and item["model"] not in gemini_candidate_models:
                gemini_candidate_models.append(item["model"])

        gemini_errors = []

        for model in gemini_candidate_models:
            best_model = self.registry.get_best_model("gemini")
            if not best_model:
                logger.info("No Gemini model available (all in cooldown or unavailable).")
                break

            target_model = model if model in gemini_candidate_models else best_model

            # Attempt model call with retries for 5xx/timeout
            attempts = 0
            max_attempts = settings.AI_MAX_RETRIES + 1

            while attempts < max_attempts:
                attempts += 1
                try:
                    text, used_model, latency = await self.gemini_provider.generate(
                        prompt=prompt,
                        system_instruction=system_instruction,
                        model=target_model,
                        temperature=temperature
                    )
                    self.registry.mark_model_success(used_model, latency)
                    logger.info(
                        f"Structured AI Log: {{"
                        f"\"provider\": \"gemini\", \"model\": \"{used_model}\", "
                        f"\"operation\": \"{operation}\", \"latency_ms\": {latency}, \"status\": \"success\"}}"
                    )
                    return text, "gemini", used_model, latency

                except GeminiAPIError as e:
                    if e.status_code == 404:
                        self.registry.mark_model_unavailable(target_model, cooldown_seconds=0, error_reason="404 Model Not Found")
                        gemini_errors.append(f"{target_model} (404)")
                        break  # Do not retry 404 on same model

                    elif e.status_code == 429:
                        cooldown = max(30, e.retry_after or 30)
                        self.registry.mark_model_unavailable(target_model, cooldown_seconds=cooldown, error_reason="429 Rate Limit Exceeded")
                        gemini_errors.append(f"{target_model} (429)")
                        break  # Fall back to next model on 429

                    elif e.status_code in (401, 403):
                        logger.error(f"Gemini authentication failed (401/403): {e}")
                        self.registry.mark_model_unavailable(target_model, cooldown_seconds=3600, error_reason="401 Auth Error")
                        gemini_errors.append(f"{target_model} (Auth Error)")
                        break  # Do not retry auth errors

                    else:
                        # 5xx / timeout
                        if attempts < max_attempts:
                            backoff = 1.0 * attempts
                            logger.warning(f"Gemini model '{target_model}' attempt {attempts} failed ({e}). Retrying in {backoff}s...")
                            await asyncio.sleep(backoff)
                        else:
                            self.registry.mark_model_unavailable(target_model, cooldown_seconds=60, error_reason=str(e))
                            gemini_errors.append(f"{target_model} ({e})")

        # All Gemini attempts failed -> Fallback to Groq if enabled and configured
        if settings.AI_ENABLE_GROQ and self.groq_provider.is_configured():
            groq_model = self.registry.get_best_model("groq") or "llama-3.3-70b-versatile"
            logger.info(f"Gemini providers unavailable ({', '.join(gemini_errors)}). Falling back to Groq model '{groq_model}'...")

            attempts = 0
            max_attempts = settings.AI_MAX_RETRIES + 1
            while attempts < max_attempts:
                attempts += 1
                try:
                    text, used_model, latency = await self.groq_provider.generate(
                        prompt=prompt,
                        system_instruction=system_instruction,
                        model=groq_model,
                        temperature=temperature
                    )
                    self.registry.mark_model_success(used_model, latency)
                    logger.info(
                        f"Structured AI Log: {{"
                        f"\"provider\": \"groq\", \"model\": \"{used_model}\", "
                        f"\"operation\": \"{operation}\", \"latency_ms\": {latency}, \"status\": \"success\"}}"
                    )
                    return text, "groq", used_model, latency
                except GroqAPIError as e:
                    if attempts < max_attempts:
                        await asyncio.sleep(1.0 * attempts)
                    else:
                        self.registry.mark_model_unavailable(groq_model, cooldown_seconds=60, error_reason=str(e))
                        logger.error(f"Groq fallback failed: {e}")

        # All providers exhausted
        raise Exception(f"AI evaluation service temporarily unavailable. Gemini errors: [{', '.join(gemini_errors)}]")

    async def get_system_health(self) -> Dict[str, Any]:
        gemini_health = await self.gemini_provider.health_check()
        groq_health = await self.groq_provider.health_check()
        models = await self.registry.discover_models()

        return {
            "providers": {
                "gemini": gemini_health,
                "groq": groq_health
            },
            "models": models
        }
