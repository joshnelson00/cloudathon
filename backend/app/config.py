from functools import lru_cache
from typing import Any

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    environment: str = "local"
    port: int = 8000
    allowed_origins: str = "*"
    service_endpoints_json: dict[str, str] = Field(default_factory=dict)

    # Database configuration
    use_mock_db: bool = False  # Switch to real DynamoDB
    aws_region: str = "us-west-1"
    dynamodb_devices_table: str = "hackathon-dev-devices"
    dynamodb_procedures_table: str = "hackathon-dev-procedures"
    dynamodb_users_table: str = "hackathon-dev-users"
    s3_compliance_bucket: str = ""
    lambda_compliance_function_name: str = ""

    # Analytics configuration
    analytics_mode: str = "backend"  # backend | athena
    athena_enabled: bool = False
    athena_database: str = ""
    athena_table: str = ""
    athena_workgroup: str = ""
    athena_output_s3: str = ""

    jwt_secret_key: str = Field(default=..., description="JWT signing secret — must be set via JWT_SECRET_KEY env var")
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
