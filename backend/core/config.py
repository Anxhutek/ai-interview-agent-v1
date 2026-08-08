from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import List

class Settings(BaseSettings):
    APP_NAME: str = 'AI Interview Agent'
    VERSION: str = '0.1.0'
    DEBUG: bool = True
    DATABASE_URL: str = 'sqlite+aiosqlite:///./interview_agent.db'
    BREETH_API_KEY: str = 'ck_live_5AA5_ZKx2Sbm18lY3RH9VS-Z034XoWhaT6pTdIcWbB0'
    BREETH_BASE_URL: str = 'https://api.thebreeth.com'
    CORS_ORIGINS: List[str] = ['http://localhost:3000', 'http://localhost:5173', 'http://localhost:8080', '*']
    JWT_SECRET: str = 'super-secret-jwt-key-change-in-prod-2026'
    JWT_ALGORITHM: str = 'HS256'
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days
    UPLOAD_DIR: str = 'backend/uploads'

    model_config = SettingsConfigDict(env_file='.env', env_file_encoding='utf-8', extra='ignore')

settings = Settings()
