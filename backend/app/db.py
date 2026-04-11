import boto3
from functools import lru_cache

from .config import get_settings

settings = get_settings()


@lru_cache
def _dynamodb():
    return boto3.resource("dynamodb", region_name=settings.aws_region)


@lru_cache
def _s3():
    return boto3.client("s3", region_name=settings.aws_region)


def get_devices_table():
    return _dynamodb().Table(settings.dynamodb_devices_table)


def get_procedures_table():
    return _dynamodb().Table(settings.dynamodb_procedures_table)


def get_s3():
    return _s3()
