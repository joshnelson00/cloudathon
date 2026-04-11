import boto3
from functools import lru_cache

from .config import get_settings

settings = get_settings()


@lru_cache
def _get_db_backend():
    """Get database backend - either real DynamoDB or mock."""
    if settings.use_mock_db:
        from .mock_db import get_mock_database
        return get_mock_database()
    else:
        return boto3.resource("dynamodb", region_name=settings.aws_region)


def _s3():
    """Get S3 client (lazy initialization - only create when needed)."""
    return boto3.client("s3", region_name=settings.aws_region)


def get_devices_table():
    db = _get_db_backend()
    return db.Table(settings.dynamodb_devices_table)


def get_procedures_table():
    db = _get_db_backend()
    return db.Table(settings.dynamodb_procedures_table)


def get_users_table():
    db = _get_db_backend()
    return db.Table(settings.dynamodb_users_table)


def get_s3():
    return _s3()
