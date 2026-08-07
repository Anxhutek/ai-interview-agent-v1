import httpx
import logging
from typing import Dict, Any

logger = logging.getLogger(__name__)

class BreethService:
    def __init__(self, api_key: str, base_url: str):
        self.api_key = api_key
        self.base_url = base_url.rstrip('/')
        self.headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        } if self.api_key else {}

    async def store_memory(self, session_id: str, content: str, metadata: Dict[str, Any] = None) -> dict:
        if not self.api_key:
            return {"status": "mock", "message": "Breeth API key not provided"}
            
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.base_url}/api/v1/memory",
                    json={
                        "session_id": session_id,
                        "content": content,
                        "metadata": metadata or {}
                    },
                    headers=self.headers
                )
                response.raise_for_status()
                return response.json()
        except Exception as e:
            logger.error(f"Breeth service store_memory failed: {e}")
            return {"status": "error", "message": str(e)}

    async def recall_memory(self, query: str, context: Dict[str, Any] = None) -> dict:
        if not self.api_key:
            return {"status": "mock", "data": []}
            
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.base_url}/api/v1/memory/search",
                    params={"query": query},
                    headers=self.headers
                )
                response.raise_for_status()
                return response.json()
        except Exception as e:
            logger.error(f"Breeth service recall_memory failed: {e}")
            return {"status": "error", "data": []}
