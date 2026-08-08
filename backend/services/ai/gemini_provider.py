import httpx
import time
import logging
from typing import List, Dict, Any, Tuple, Optional
from services.ai.base import AIProvider
from core.config import settings

logger = logging.getLogger(__name__)

class GeminiAPIError(Exception):
    def __init__(self, message: str, status_code: int = 500, retry_after: Optional[int] = None):
        super().__init__(message)
        self.status_code = status_code
        self.retry_after = retry_after

class GeminiProvider(AIProvider):
    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or settings.GEMINI_API_KEY
        self.base_url = "https://generativelanguage.googleapis.com/v1beta"
        self._default_model = settings.AI_PRIMARY_MODEL or "gemini-3.5-flash"

    @property
    def provider_name(self) -> str:
        return "gemini"

    def _mask_key(self) -> str:
        if not self.api_key:
            return "<MISSING_KEY>"
        return self.api_key[:4] + "..." + self.api_key[-4:] if len(self.api_key) > 8 else "***"

    async def list_models(self) -> List[Dict[str, Any]]:
        if not self.api_key:
            logger.warning("Gemini API key is not configured.")
            return []

        url = f"{self.base_url}/models?key={self.api_key}"
        async with httpx.AsyncClient(timeout=10.0) as client:
            try:
                res = await client.get(url)
                if res.status_code != 200:
                    logger.error(f"Gemini list_models failed with status {res.status_code}: {res.text}")
                    return []
                data = res.json()
                raw_models = data.get("models", [])
                text_models = []
                for m in raw_models:
                    # Filter for models supporting generateContent
                    name = m.get("name", "").replace("models/", "")
                    methods = m.get("supportedGenerationMethods", [])
                    if "generateContent" in methods:
                        text_models.append({
                            "name": name,
                            "display_name": m.get("displayName", name),
                            "description": m.get("description", ""),
                            "supported_methods": methods
                        })
                return text_models
            except Exception as e:
                logger.error(f"Error fetching Gemini models: {e}")
                return []

    async def generate(
        self,
        prompt: str,
        system_instruction: Optional[str] = None,
        model: Optional[str] = None,
        temperature: float = 0.7
    ) -> Tuple[str, str, float]:
        if not self.api_key:
            raise GeminiAPIError("GEMINI_API_KEY is not configured", status_code=401)

        target_model = model or self._default_model
        # Strip models/ prefix if present
        clean_model = target_model.replace("models/", "")

        url = f"{self.base_url}/models/{clean_model}:generateContent?key={self.api_key}"
        
        contents = []
        if system_instruction:
            contents.append({"role": "user", "parts": [{"text": f"System Instruction: {system_instruction}"}]})
            contents.append({"role": "model", "parts": [{"text": "Understood. I will strictly follow these instructions."}]})
        contents.append({"role": "user", "parts": [{"text": prompt}]})

        body = {
            "contents": contents,
            "generationConfig": {
                "temperature": temperature
            }
        }

        start_time = time.time()
        async with httpx.AsyncClient(timeout=settings.AI_REQUEST_TIMEOUT) as client:
            try:
                res = await client.post(url, json=body)
                latency_ms = round((time.time() - start_time) * 1000, 2)

                if res.status_code == 200:
                    data = res.json()
                    candidates = data.get("candidates", [])
                    if not candidates:
                        raise GeminiAPIError("No response candidates returned by Gemini", status_code=500)
                    parts = candidates[0].get("content", {}).get("parts", [])
                    text = "".join([p.get("text", "") for p in parts])
                    return text, clean_model, latency_ms

                elif res.status_code == 404:
                    raise GeminiAPIError(f"Model '{clean_model}' not found (404)", status_code=404)

                elif res.status_code == 429:
                    retry_after_hdr = res.headers.get("Retry-After")
                    retry_after = int(retry_after_hdr) if retry_after_hdr and retry_after_hdr.isdigit() else 5
                    raise GeminiAPIError(f"Rate limit exceeded (429) for model '{clean_model}'", status_code=429, retry_after=retry_after)

                elif res.status_code in (401, 403):
                    raise GeminiAPIError("Invalid or unauthorized Gemini API key", status_code=res.status_code)

                else:
                    raise GeminiAPIError(f"Gemini API error ({res.status_code}): {res.text[:200]}", status_code=res.status_code)

            except httpx.TimeoutException:
                latency_ms = round((time.time() - start_time) * 1000, 2)
                raise GeminiAPIError(f"Request timeout after {settings.AI_REQUEST_TIMEOUT}s", status_code=408)

            except httpx.RequestError as e:
                latency_ms = round((time.time() - start_time) * 1000, 2)
                raise GeminiAPIError(f"Gemini connection error: {e}", status_code=503)

    async def health_check(self) -> Dict[str, Any]:
        if not self.api_key:
            return {
                "provider": "gemini",
                "status": "unavailable",
                "api_key_configured": False,
                "masked_key": "<NOT_SET>",
                "error": "API key missing"
            }

        start = time.time()
        try:
            # Test a lightweight call using default or flash-lite model
            test_text, model_used, latency = await self.generate("Ping", model="gemini-3.5-flash-lite", temperature=0.0)
            return {
                "provider": "gemini",
                "status": "healthy",
                "api_key_configured": True,
                "masked_key": self._mask_key(),
                "test_model": model_used,
                "latency_ms": latency
            }
        except GeminiAPIError as e:
            return {
                "provider": "gemini",
                "status": "degraded" if e.status_code in (429, 408) else "unavailable",
                "api_key_configured": True,
                "masked_key": self._mask_key(),
                "last_error": str(e),
                "status_code": e.status_code
            }
        except Exception as e:
            return {
                "provider": "gemini",
                "status": "unavailable",
                "api_key_configured": True,
                "masked_key": self._mask_key(),
                "last_error": str(e)
            }
