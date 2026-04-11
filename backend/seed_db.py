#!/usr/bin/env python3
"""
Seed DynamoDB tables with initial data.
Run once to populate procedures and users tables.

Usage:
    cd backend
    source .venv/Scripts/activate  # or .venv\Scripts\Activate.ps1 on Windows PowerShell
    python seed_db.py
"""

import json
import sys
from pathlib import Path

# Add app directory to path
sys.path.insert(0, str(Path(__file__).parent))

from app.db import get_procedures_table, get_users_table, get_devices_table
from app.config import get_settings

settings = get_settings()

def seed_procedures():
    """Load procedures from JSON and insert into DynamoDB."""
    data_dir = Path(__file__).parent / "data"
    procedures_file = data_dir / "cityserve-procedures.json"

    if not procedures_file.exists():
        print(f"❌ Procedures file not found: {procedures_file}")
        return False

    with open(procedures_file) as f:
        procedures = json.load(f)

    table = get_procedures_table()

    print(f"\n📋 Seeding {len(procedures)} procedures to '{settings.dynamodb_procedures_table}'...")

    for proc_id, proc_data in procedures.items():
        try:
            table.put_item(Item=proc_data)
            print(f"  ✅ {proc_id}")
        except Exception as e:
            print(f"  ❌ {proc_id}: {e}")
            return False

    print(f"✓ Procedures seeded successfully!\n")
    return True


def seed_devices():
    """Load devices from JSON and insert into DynamoDB."""
    data_dir = Path(__file__).parent / "data"
    devices_file = data_dir / "cityserve-devices.json"

    if not devices_file.exists():
        print(f"⚠️  Devices file not found: {devices_file} (skipping devices seed)")
        return True

    with open(devices_file) as f:
        devices_data = json.load(f)

    table = get_devices_table()

    if not devices_data:
        print("⚠️  No devices to seed (devices.json is empty)\n")
        return True

    print(f"📱 Seeding {len(devices_data)} devices to '{settings.dynamodb_devices_table}'...")

    for device_id, device in devices_data.items():
        try:
            table.put_item(Item=device)
            status = device.get("status", "unknown")
            serial = device.get("chassis_serial", "unknown")
            print(f"  ✅ {serial} ({status})")
        except Exception as e:
            print(f"  ❌ {device.get('chassis_serial', 'unknown')}: {e}")
            return False

    print(f"✓ Devices seeded successfully!\n")
    return True


def seed_users():
    """Load users from JSON and insert into DynamoDB."""
    data_dir = Path(__file__).parent / "data"
    users_file = data_dir / "cityserve-users.json"

    if not users_file.exists():
        print(f"⚠️  Users file not found: {users_file} (skipping users seed)")
        return True

    with open(users_file) as f:
        users_data = json.load(f)

    table = get_users_table()
    users = users_data.get("users", [])

    if not users:
        print("⚠️  No users to seed (users.json is empty or has no 'users' key)\n")
        return True

    print(f"👥 Seeding {len(users)} users to '{settings.dynamodb_users_table}'...")

    for user in users:
        try:
            table.put_item(Item=user)
            print(f"  ✅ {user.get('username', user.get('user_id', 'unknown'))}")
        except Exception as e:
            print(f"  ❌ {user.get('username', 'unknown')}: {e}")
            return False

    print(f"✓ Users seeded successfully!\n")
    return True


def main():
    """Run all seeds."""
    print(f"\n🔧 DynamoDB Seeding Tool")
    print(f"Environment: {settings.environment}")
    print(f"Region: {settings.aws_region}")
    print(f"Using mock DB: {settings.use_mock_db}")

    if settings.use_mock_db:
        print("\n⚠️  WARNING: use_mock_db is True!")
        print("   This script will seed JSON files, not real DynamoDB.")
        print("   Set use_mock_db=False in .env to use real AWS DynamoDB.")

    print("\n" + "="*50)

    if not seed_procedures():
        sys.exit(1)

    if not seed_devices():
        sys.exit(1)

    if not seed_users():
        sys.exit(1)

    print("="*50)
    print("\n✨ All seeding complete!")
    print("You can now start the backend and access the data.\n")


if __name__ == "__main__":
    main()
