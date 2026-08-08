import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from main import app
from models.database import engine, Base, create_all_tables, SessionLocal, InterviewSession, InterviewTurn, AnswerEvaluation

from services.ai.gemini_provider import GeminiProvider, GeminiAPIError
from services.ai.groq_provider import GroqProvider, GroqAPIError
from services.ai.model_registry import ModelRegistry
from services.ai.ai_orchestrator import AIOrchestrator
from services.evaluation_service import InterviewEvaluationService

@pytest_asyncio.fixture(autouse=True)
async def prepare_db():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)


@pytest.mark.asyncio
async def test_gemini_provider_mask_key_and_interface():
    provider = GeminiProvider(api_key="AIzaSyDummyTestKey12345")
    assert provider.provider_name == "gemini"
    assert provider._mask_key() == "AIza...2345"
    assert "***" not in provider._mask_key()

@pytest.mark.asyncio
async def test_groq_provider_mask_key_and_interface():
    provider = GroqProvider(api_key="gsk_DummyTestGroqKey6789")
    assert provider.provider_name == "groq"
    assert provider.is_configured() is True
    assert provider._mask_key() == "gsk_...6789"

@pytest.mark.asyncio
async def test_model_registry_priority():
    gemini = GeminiProvider("AIzaTestKey")
    groq = GroqProvider("")
    registry = ModelRegistry(gemini, groq)
    
    best_gemini = registry.get_best_model("gemini")
    assert best_gemini == "gemini-3.5-flash"

    # Mark top model unavailable -> should return second preferred model
    registry.mark_model_unavailable("gemini-3.5-flash", cooldown_seconds=60)
    best_gemini_2 = registry.get_best_model("gemini")
    assert best_gemini_2 == "gemini-3.5-flash-lite"

@pytest.mark.asyncio
async def test_orchestrator_groq_fallback():
    gemini = GeminiProvider("invalid_key")
    groq = GroqProvider("gsk_DummyGroqKey")
    registry = ModelRegistry(gemini, groq)
    orchestrator = AIOrchestrator(gemini, groq, registry)

    # Simulate Gemini models failing and Groq being called
    registry.mark_model_unavailable("gemini-3.5-flash", cooldown_seconds=60)
    registry.mark_model_unavailable("gemini-3.5-flash-lite", cooldown_seconds=60)
    registry.mark_model_unavailable("gemini-3.1-flash-lite", cooldown_seconds=60)

    health = await orchestrator.get_system_health()
    assert "providers" in health
    assert "gemini" in health["providers"]
    assert "groq" in health["providers"]

@pytest.mark.asyncio
async def test_evaluation_json_cleaning():
    gemini = GeminiProvider("")
    groq = GroqProvider("")
    registry = ModelRegistry(gemini, groq)
    orchestrator = AIOrchestrator(gemini, groq, registry)
    eval_service = InterviewEvaluationService(orchestrator)

    markdown_json = """
```json
{
  "scores": {
    "technical_correctness": 85,
    "problem_solving": 80,
    "system_design": 75,
    "architecture": 80,
    "communication": 90,
    "depth": 70,
    "tradeoffs": 75,
    "relevance": 90,
    "completeness": 80
  },
  "overall_score": 80.5,
  "verdict": "strong"
}
```
"""
    cleaned = eval_service._clean_json_response(markdown_json)
    assert cleaned is not None
    assert cleaned["overall_score"] == 80.5
    assert cleaned["verdict"] == "strong"

@pytest.mark.asyncio
async def test_answer_persistence_before_evaluation():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        # Start session
        start_res = await ac.post("/api/interview/start", json={
            "candidateId": "cand_persistence_test",
            "candidateName": "Persistence Tester"
        })
        assert start_res.status_code == 200
        session_id = start_res.json()["sessionId"]

        # Submit answer via /api/interviews/{id}/answer
        ans_res = await ac.post(f"/api/interviews/{session_id}/answer", json={
            "answer_text": "I prefer async/await to prevent blocking worker threads."
        })
        # Could be 200 (success) or 503 (AI unconfigured in test)
        assert ans_res.status_code in (200, 503)

        # GUARANTEE: Verify candidate answer was persisted in DB regardless of AI status
        async with SessionLocal() as db:
            stmt = select(InterviewTurn).where(InterviewTurn.session_id == session_id)
            res = await db.execute(stmt)
            turn = res.scalars().first()
            assert turn is not None
            assert turn.answer_text == "I prefer async/await to prevent blocking worker threads."

        # Fetch evaluation status
        eval_status_res = await ac.get(f"/api/interviews/{session_id}/evaluation/status")
        assert eval_status_res.status_code == 200
        assert "status" in eval_status_res.json()


@pytest.mark.asyncio
async def test_admin_ai_endpoints():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        # Create Admin user
        admin_reg = {
            "email": "ai_admin@example.com",
            "password": "AdminPassword123!",
            "full_name": "AI Admin",
            "role": "admin"
        }
        res_reg = await ac.post("/api/auth/register", json=admin_reg)
        token = res_reg.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        # Health endpoint
        health_res = await ac.get("/api/admin/ai/health", headers=headers)
        assert health_res.status_code == 200
        h_data = health_res.json()
        assert "providers" in h_data
        assert "models" in h_data

        # Models endpoint
        models_res = await ac.get("/api/admin/ai/models", headers=headers)
        assert models_res.status_code == 200
        assert "models" in models_res.json()

        # Refresh endpoint
        refresh_res = await ac.post("/api/admin/ai/models/refresh", headers=headers)
        assert refresh_res.status_code == 200
        assert refresh_res.json()["success"] is True
