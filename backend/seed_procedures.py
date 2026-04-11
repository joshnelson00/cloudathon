"""
Seed the DynamoDB procedures table from the authoritative JSON source.

Source: backend/data/hackathon-dev-procedures.json
        (also used as the mock-DB file when USE_MOCK_DB=true)

Run this once after terraform apply, or any time the procedures JSON changes.

Usage:
    cd backend
    python seed_procedures.py
"""
import json
import os
import sys

sys.path.insert(0, os.path.dirname(__file__))

import boto3
from app.config import get_settings

settings = get_settings()

DATA_FILE = os.path.join(os.path.dirname(__file__), "data", "hackathon-dev-procedures.json")


def seed():
    with open(DATA_FILE) as f:
        data = json.load(f)

    table = boto3.resource("dynamodb", region_name=settings.aws_region).Table(
        settings.dynamodb_procedures_table
    )

    for procedure_id, proc in data.items():
        table.put_item(Item=proc)
        print(f"  Seeded: {procedure_id} ({len(proc.get('steps', []))} steps)")

    print(f"\nDone — {len(data)} procedures seeded into '{settings.dynamodb_procedures_table}'")


if __name__ == "__main__":
    print(f"Seeding procedures into '{settings.dynamodb_procedures_table}' ({settings.aws_region})...\n")
    seed()