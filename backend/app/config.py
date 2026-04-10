from functools import lru_cache
from typing import Any

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    environment: str = "local"
    port: int = 8000
    allowed_origins: str = "*"
    service_endpoints_json: dict[str, str] = Field(default_factory=dict)

    aws_region: str = "us-west-1"
    dynamodb_devices_table: str = "cityserve-devices"
    dynamodb_procedures_table: str = "cityserve-procedures"
    s3_compliance_bucket: str = ""

    jwt_secret_key: str = "hackathon-secret-key-change-in-prod"
    jwt_expire_minutes: int = 480

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    @field_validator("service_endpoints_json", mode="before")
    @classmethod
    def parse_json(cls, value: Any) -> dict[str, str]:
        if isinstance(value, dict):
            return value
        if not value:
            return {}
        return value


@lru_cache
def get_settings() -> Settings:
    return Settings()
