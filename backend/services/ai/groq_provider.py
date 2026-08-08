import httpx
import time
import logging
from typing import List, Dict, Any, Tuple, Optional
from services.ai.base import AIProvider
from core.config import settings

logger = logging.getLogger(__name__)

class GroqAPIError(Exception):
    def __init__(self, message: str, status_code: int = 500, retry_after: Optional[int] = None):
        super().__init__(message)
        self.status_code = status_code
        self.retry_after = retry_after

class GroqProvider(AIProvider):
    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or settings.GROQ_API_KEY
        self.base_url = "https://api.groq.com/openai/v1"
        self._default_model = "llama-3.3-70b-versatile"

    @property
    def provider_name(self) -> str:
        return "groq"

    def is_configured(self) -> bool:
        return bool(self.api_key and self.api_key.strip())

    def _mask_key(self) -> str:
        if not self.api_key:
            return "<MISSING_KEY>"
        return self.api_key[:4] + "..." + self.api_key[-4:] if len(self.api_key) > 8 else "***"

    async def list_models(self) -> List[Dict[str, Any]]:
        if not self.is_configured():
            return []

        url = f"{self.base_url}/models"
        headers = {"Authorization": f"Bearer {self.api_key}"}
        async with httpx.AsyncClient(timeout=10.0) as client:
            try:
                res = await client.get(url, headers=headers)
                if res.status_code != 200:
                    logger.error(f"Groq list_models failed ({res.status_code}): {res.text}")
                    return []
                data = res.json()
                raw = data.get("data", [])
                return [{"name": m.get("id"), "owned_by": m.get("owned_by", "groq")} for m in raw]
            except Exception as e:
                logger.error(f"Error fetching Groq models: {e}")
                return []

    async def generate(
        self,
        prompt: str,
        system_instruction: Optional[str] = None,
        model: Optional[str] = None,
        temperature: float = 0.7
    ) -> Tuple[str, str, float]:
        if not self.is_configured():
            raise GroqAPIError("GROQ_API_KEY is not configured", status_code=401)

        target_model = model or self._default_model
        url = f"{self.base_url}/chat/completions"
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }

        messages = []
        if system_instruction:
            messages.append({"role": "system", "content": system_instruction})
        messages.append({"role": "user", "content": prompt})

        body = {
            "model": target_model,
            "messages": messages,
            "temperature": temperature
        }

        start_time = time.time()
        async with httpx.AsyncClient(timeout=settings.AI_REQUEST_TIMEOUT) as client:
            try:
                res = await client.post(url, headers=headers, json=body)
                latency_ms = round((time.time() - start_time) * 1000, 2)

                if res.status_code == 200:
                    data = res.json()
                    choices = data.get("choices", [])
                    if not choices:
                        raise GroqAPIError("No choices returned from Groq API", status_code=500)
                    text = choices[0].get("message", {}).get("content", "")
                    return text, target_model, latency_ms

                elif res.status_code == 404:
                    raise GroqAPIError(f"Groq model '{target_model}' not found (404)", status_code=404)

                elif res.status_code == 429:
                    retry_after_hdr = res.headers.get("Retry-After")
                    retry_after = int(retry_after_hdr) if retry_after_hdr and retry_after_hdr.isdigit() else 5
                    raise GroqAPIError(f"Groq Rate limit exceeded (429)", status_code=429, retry_after=retry_after)

                elif res.status_code in (401, 403):
                    raise GroqAPIError("Invalid or unauthorized Groq API key", status_code=res.status_code)

                else:
                    raise GroqAPIError(f"Groq API error ({res.status_code}): {res.text[:200]}", status_code=res.status_code)

            except httpx.TimeoutException:
                latency_ms = round((time.time() - start_time) * 1000, 2)
                raise GroqAPIError(f"Groq Request timeout after {settings.AI_REQUEST_TIMEOUT}s", status_code=408)

            except httpx.RequestError as e:
                latency_ms = round((time.time() - start_time) * 1000, 2)
                raise GroqAPIError(f"Groq Connection error: {e}", status_code=503)

    async def health_check(self) -> Dict[str, Any]:
        if not self.is_configured():
            return {
                "provider": "groq",
                "status": "disabled",
                "api_key_configured": False,
                "masked_key": "<NOT_SET>",
                "note": "GROQ_API_KEY not set"
            }

        try:
            test_text, model_used, latency = await self.generate("Ping", model="llama-3.3-70b-versatile", temperature=0.0)
            return {
                "provider": "groq",
                "status": "healthy",
                "api_key_configured": True,
                "masked_key": self._mask_key(),
                "test_model": model_used,
                "latency_ms": latency
            }
        except GroqAPIError as e:
            return {
                "provider": "groq",
                "status": "degraded" if e.status_code in (429, 408) else "unavailable",
                "api_key_configured": True,
                "masked_key": self._mask_key(),
                "last_error": str(e),
                "status_code": e.status_code
            }
        except Exception as e:
            return {
                "provider": "groq",
                "status": "unavailable",
                "api_key_configured": True,
                "masked_key": self._mask_key(),
                "last_error": str(e)
            }
