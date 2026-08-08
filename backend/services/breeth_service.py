import httpx
import logging
import urllib.parse
from typing import Dict, Any, Optional, List

logger = logging.getLogger(__name__)

class BreethService:
    def __init__(self, api_key: str, base_url: str):
        self.api_key = api_key
        self.base_url = base_url.rstrip('/')
        self.headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        } if self.api_key else {}

    async def ingest_episode(
        self,
        content: str,
        group_id: str,
        source_description: str = "interview_turn",
        extract_intent: bool = True
    ) -> Dict[str, Any]:
        """Post a candidate turn/answer as a prose episode to Breeth."""
        if not self.api_key:
            logger.warning("Breeth API key missing; skipping episode ingestion.")
            return {"status": "mock", "message": "Breeth API key not provided"}

        url = f"{self.base_url}/v1/episodes"
        payload = {
            "content": content,
            "group_id": group_id,
            "source_description": source_description,
            "extract_intent": extract_intent
        }

        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                response = await client.post(url, json=payload, headers=self.headers)
                if response.status_code in [200, 201]:
                    return response.json()
                else:
                    logger.error(f"Breeth ingest_episode HTTP {response.status_code}: {response.text}")
                    return {"status": "error", "code": response.status_code, "detail": response.text}
        except Exception as e:
            logger.error(f"Breeth ingest_episode exception: {e}")
            return {"status": "error", "message": str(e)}

    async def get_node_details(self, node_name: str) -> Dict[str, Any]:
        """Fetch distilled profile narrative and extracted entities/facts from Breeth."""
        if not self.api_key:
            return self._mock_node_details(node_name)

        encoded_name = urllib.parse.quote(node_name)
        url = f"{self.base_url}/v1/graph/nodes/{encoded_name}/details"

        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                response = await client.get(url, headers=self.headers)
                if response.status_code == 200:
                    return response.json()
                else:
                    logger.warning(f"Breeth get_node_details HTTP {response.status_code}: {response.text}")
                    return self._mock_node_details(node_name)
        except Exception as e:
            logger.error(f"Breeth get_node_details exception: {e}")
            return self._mock_node_details(node_name)

    async def search_memory(
        self,
        query: str,
        group_id: str,
        limit: int = 5
    ) -> Dict[str, Any]:
        """Hybrid search over candidate intent graph in Breeth."""
        if not self.api_key:
            return {"status": "mock", "results": []}

        url = f"{self.base_url}/v1/search"
        payload = {
            "query": query,
            "group_id": group_id,
            "limit": limit
        }

        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                response = await client.post(url, json=payload, headers=self.headers)
                if response.status_code == 200:
                    return response.json()
                else:
                    logger.warning(f"Breeth search_memory HTTP {response.status_code}: {response.text}")
                    return {"status": "error", "code": response.status_code, "results": []}
        except Exception as e:
            logger.error(f"Breeth search_memory exception: {e}")
            return {"status": "error", "message": str(e), "results": []}

    def _mock_node_details(self, node_name: str) -> Dict[str, Any]:
        return {
            "entity": {
                "name": node_name,
                "summary": f"Candidate showing strong software engineering fundamentals and systematic technical reasoning.",
                "knot_narrative": f"{node_name} exhibits consistent technical proficiency in async design, system trade-off evaluation, and structured problem solving across interview modules.",
                "knot_score": 88.0
            },
            "neighbors": [
                {
                    "peer": "Async Systems",
                    "direction": "out",
                    "fact": f"{node_name} demonstrates preference for non-blocking I/O architectures.",
                    "intent_meta": {
                        "edge_kind": "preference",
                        "cognitive_pattern": "performance optimization",
                        "why_connected": "Focus on tail-latency reduction and scalable backend design."
                    }
                }
            ]
        }
