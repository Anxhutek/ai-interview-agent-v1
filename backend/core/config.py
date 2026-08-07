from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import List

class Settings(BaseSettings):
    APP_NAME: str = 'AI Interview Agent'
    VERSION: str = '0.1.0'
    DEBUG: bool = True
    DATABASE_URL: str = 'sqlite+aiosqlite:///./interview_agent.db'
    GEMINI_API_KEY: str = ''
    BREETH_API_KEY: str = ''
    BREETH_BASE_URL: str = 'https://api.thebreeth.com'
    CORS_ORIGINS: List[str] = ['http://localhost:3000', 'http://localhost:5173', '*']

    model_config = SettingsConfigDict(env_file='.env', env_file_encoding='utf-8', extra='ignore')

settings = Settings()
