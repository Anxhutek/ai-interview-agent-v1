import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from main import app
from models.database import create_all_tables

@pytest_asyncio.fixture(autouse=True)
async def prepare_db():
    await create_all_tables()

@pytest.mark.asyncio
async def test_health_check():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        response = await ac.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert "version" in data
    assert "uptime_seconds" in data
