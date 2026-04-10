from functools import lru_cache
from typing import Any

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    environment: str = "local"
    port: int = 8000
    allowed_origins: str = "*"
    service_endpoints_json: dict[str, str] = Field(default_factory=dict)

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    @field_validator("service_endpoints_json", mode="before")
    @classmethod
    def parse_json(cls, value: Any) -> dict[str, str]:
        if isinstance(value, dict):
            return value
        if not value:
            return {}
        # pydantic settings handles JSON string parsing in most cases.
        return value


@lru_cache
def get_settings() -> Settings:
    return Settings()
