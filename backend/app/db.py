from functools import lru_cache

from .config import get_settings
from .mock_db import get_mock_database

settings = get_settings()

_db = get_mock_database()


def get_devices_table():
    return _db.Table(settings.devices_table)


def get_procedures_table():
    return _db.Table(settings.procedures_table)


def get_users_table():
    return _db.Table(settings.users_table)
