from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import List

import os

class Settings(BaseSettings):
    APP_NAME: str = 'AI Interview Agent'
    VERSION: str = '0.1.0'
    DEBUG: bool = True
    DATABASE_URL: str = os.getenv('DATABASE_URL', 'sqlite+aiosqlite:///./interview_agent.db')
    BREETH_API_KEY: str = os.getenv('BREETH_API_KEY', '')
    BREETH_BASE_URL: str = os.getenv('BREETH_BASE_URL', 'https://api.thebreeth.com')
    CORS_ORIGINS: List[str] = ['http://localhost:3000', 'http://localhost:5173', 'http://localhost:8080', '*']
    JWT_SECRET: str = os.getenv('JWT_SECRET', 'default-insecure-jwt-key')
    JWT_ALGORITHM: str = 'HS256'
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days
    UPLOAD_DIR: str = 'backend/uploads'

    # AI Evaluation Architecture Configs
    GEMINI_API_KEY: str = os.getenv('GEMINI_API_KEY', '')
    GROQ_API_KEY: str = os.getenv('GROQ_API_KEY', '')
    AI_PRIMARY_PROVIDER: str = 'gemini'
    AI_PRIMARY_MODEL: str = 'gemini-3.5-flash'
    AI_ENABLE_GROQ: bool = True
    AI_MAX_RETRIES: int = 2
    AI_REQUEST_TIMEOUT: float = 30.0
    AI_MODEL_CACHE_TTL: int = 3600

    # Admin 2FA Configs
    TOTP_ISSUER: str = 'AI-Interview-Agent'
    ENCRYPTION_KEY: str = os.getenv('ENCRYPTION_KEY', 'default-encryption-key-for-2fa')
    TOTP_RATE_LIMIT_ATTEMPTS: int = 5
    TOTP_RATE_LIMIT_LOCKOUT_SECONDS: int = 300

    model_config = SettingsConfigDict(env_file='.env', env_file_encoding='utf-8', extra='ignore')


settings = Settings()
