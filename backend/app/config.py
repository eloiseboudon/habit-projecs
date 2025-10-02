from functools import lru_cache
from pathlib import Path
from pydantic import BaseSettings, Field
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / ".env")


class Settings(BaseSettings):
    database_url: str = Field(..., env="DATABASE_URL")
    app_name: str = "Habit Projects Backend"
    timezone: str = "Europe/Paris"

    class Config:
        env_file = str(BASE_DIR / ".env")
        env_file_encoding = "utf-8"
        case_sensitive = False


@lru_cache()
def get_settings() -> Settings:
    return Settings()
