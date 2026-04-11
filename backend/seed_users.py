"""
Seed mock users into DynamoDB for testing.

Usage:
    cd backend
    python seed_users.py [--generate-only]

    Use --generate-only to generate credentials file without AWS access.
    Requires AWS credentials and deployed DynamoDB table to seed the database.
"""
import sys
import os
import uuid
import argparse

sys.path.insert(0, os.path.dirname(__file__))

import boto3
from passlib.context import CryptContext
from app.config import get_settings

settings = get_settings()
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

MOCK_USERS = [
    {
        "fname": "Alice",
        "lname": "Johnson",
        "email": "alice@cityserve.local",
        "username": "alice_johnson",
        "password": "Alice@2024!",
        "role": ["worker"],
    },
    {
        "fname": "Bob",
        "lname": "Smith",
        "email": "bob@cityserve.local",
        "username": "bob_smith",
        "password": "Bob@2024!",
        "role": ["worker"],
    },
    {
        "fname": "Carol",
        "lname": "Davis",
        "email": "carol@cityserve.local",
        "username": "carol_davis",
        "password": "Carol@2024!",
        "role": ["worker"],
    },
    {
        "fname": "David",
        "lname": "Wilson",
        "email": "david@cityserve.local",
        "username": "david_wilson",
        "password": "David@2024!",
        "role": ["worker"],
    },
    {
        "fname": "Emma",
        "lname": "Brown",
        "email": "emma@cityserve.local",
        "username": "emma_brown",
        "password": "Emma@2024!",
        "role": ["admin", "worker"],
    },
]


def seed_users():
    dynamodb = boto3.resource("dynamodb", region_name=settings.aws_region)
    table = dynamodb.Table(settings.dynamodb_users_table)

    print(f"Seeding mock users into '{settings.dynamodb_users_table}' ({settings.aws_region})...\n")

    creds_lines = [
        "CityServe Device Destruction - Test User Credentials",
        "=" * 60,
        "",
        "Use these credentials to log in to the system.",
        "DO NOT share or use in production.",
        "",
        "=" * 60,
        "",
    ]

    for user in MOCK_USERS:
        user_id = str(uuid.uuid4())
        hashed_password = pwd_context.hash(user["password"])

        item = {
            "user_id": user_id,
            "username": user["username"],
            "fname": user["fname"],
            "lname": user["lname"],
            "email": user["email"],
            "password": hashed_password,
            "role": user["role"],
        }

        table.put_item(Item=item)
        print(f"✓ Seeded: {user['fname']} {user['lname']} ({user['username']})")

        # Add to credentials file
        creds_lines.append(f"Name:     {user['fname']} {user['lname']}")
        creds_lines.append(f"Username: {user['username']}")
        creds_lines.append(f"Password: {user['password']}")
        creds_lines.append(f"Email:    {user['email']}")
        creds_lines.append(f"Roles:    {', '.join(user['role'])}")
        creds_lines.append("")

    print(f"\n✓ Done — {len(MOCK_USERS)} users seeded into '{settings.dynamodb_users_table}'")

    # Write credentials file
    creds_file = "MOCK_USER_CREDENTIALS.txt"
    creds_lines.extend([
        "=" * 60,
        "",
        "Notes:",
        "- Use 'username' and 'password' to log in",
        "- Users with 'admin' role can manage other users",
        "- All passwords are test credentials only",
        "- Change passwords in production",
    ])

    with open(creds_file, "w") as f:
        f.write("\n".join(creds_lines))

    print(f"✓ Credentials saved to '{creds_file}'")
    print(f"\nShare this file with test users. Remember to:")
    print("  1. Keep credentials confidential")
    print("  2. Change passwords before production use")
    print("  3. Delete this file after distribution")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Seed mock users into DynamoDB for testing."
    )
    parser.add_argument(
        "--generate-only",
        action="store_true",
        help="Generate credentials file only, without seeding to DynamoDB",
    )
    args = parser.parse_args()

    if args.generate_only:
        print("Generating credentials file only (no DynamoDB access required)...\n")

        creds_lines = [
            "CityServe Device Destruction - Test User Credentials",
            "=" * 60,
            "",
            "Use these credentials to log in to the system.",
            "DO NOT share or use in production.",
            "",
            "=" * 60,
            "",
        ]

        for user in MOCK_USERS:
            creds_lines.append(f"Name:     {user['fname']} {user['lname']}")
            creds_lines.append(f"Username: {user['username']}")
            creds_lines.append(f"Password: {user['password']}")
            creds_lines.append(f"Email:    {user['email']}")
            creds_lines.append(f"Roles:    {', '.join(user['role'])}")
            creds_lines.append("")

        creds_lines.extend([
            "=" * 60,
            "",
            "Notes:",
            "- Use 'username' and 'password' to log in",
            "- Users with 'admin' role can manage other users",
            "- All passwords are test credentials only",
            "- Change passwords in production",
        ])

        creds_file = "MOCK_USER_CREDENTIALS.txt"
        with open(creds_file, "w") as f:
            f.write("\n".join(creds_lines))

        print(f"✓ Credentials saved to '{creds_file}'")
    else:
        print(f"Seeding mock users into '{settings.dynamodb_users_table}' ({settings.aws_region})...\n")
        seed_users()
