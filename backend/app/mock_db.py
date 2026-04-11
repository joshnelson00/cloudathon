"""
Mock Database Implementation

Provides a DynamoDB-like interface using JSON files for local development.
This allows the demo to run without AWS credentials or DynamoDB tables.

Data Structure:
- data/devices.json - Device records
- data/procedures.json - Sanitization procedures
"""

import json
import os
from pathlib import Path
from typing import Any, Optional
from datetime import datetime


class MockTable:
    """Mimics DynamoDB Table interface using JSON file storage."""

    def __init__(self, table_name: str, data_dir: str = "data"):
        self.table_name = table_name
        self.data_dir = Path(data_dir)
        self.data_dir.mkdir(exist_ok=True)
        self.file_path = self.data_dir / f"{table_name}.json"
        self._ensure_file_exists()

    def _ensure_file_exists(self):
        """Create empty JSON file if it doesn't exist."""
        if not self.file_path.exists():
            self._write_data({})

    def _read_data(self) -> dict:
        """Read all data from file."""
        try:
            with open(self.file_path, "r") as f:
                return json.load(f)
        except (json.JSONDecodeError, FileNotFoundError):
            return {}

    def _write_data(self, data: dict):
        """Write all data to file."""
        with open(self.file_path, "w") as f:
            json.dump(data, f, indent=2, default=str)

    def get_item(self, Key: dict) -> dict:
        """Get a single item by key."""
        data = self._read_data()
        hash_key = list(Key.keys())[0]
        hash_value = str(Key[hash_key])

        for item_id, item in data.items():
            if str(item.get(hash_key)) == hash_value:
                return {"Item": item}

        return {}

    def put_item(self, Item: dict):
        """Put an item (insert or update)."""
        data = self._read_data()
        # Use the first non-None ID field as the key
        key_field = "device_id" if "device_id" in Item else "procedure_id"
        item_id = str(Item[key_field])
        data[item_id] = Item
        self._write_data(data)

    def update_item(
        self,
        Key: dict,
        UpdateExpression: str,
        ExpressionAttributeNames: Optional[dict] = None,
        ExpressionAttributeValues: Optional[dict] = None,
    ) -> dict:
        """Update an item using expression syntax."""
        data = self._read_data()
        hash_key = list(Key.keys())[0]
        hash_value = str(Key[hash_key])

        # Find the item
        item_id = None
        for iid, item in data.items():
            if str(item.get(hash_key)) == hash_value:
                item_id = iid
                break

        if item_id is None:
            raise Exception(f"Item with {hash_key}={hash_value} not found")

        item = data[item_id]

        # Parse UpdateExpression (simple implementation for SET operations)
        # Format: "SET field1 = :val1, field2 = :val2"
        if UpdateExpression.startswith("SET "):
            expr_part = UpdateExpression[4:]
            updates = [u.strip() for u in expr_part.split(",")]

            for update in updates:
                if "=" not in update:
                    continue

                field_expr, value_ref = update.split("=", 1)
                field_expr = field_expr.strip()
                value_ref = value_ref.strip()

                # Handle field name substitution (#st -> status)
                if field_expr.startswith("#"):
                    attr_name = field_expr
                    if (
                        ExpressionAttributeNames
                        and attr_name in ExpressionAttributeNames
                    ):
                        field_name = ExpressionAttributeNames[attr_name]
                    else:
                        field_name = attr_name
                else:
                    field_name = field_expr

                # Get the value from ExpressionAttributeValues
                if ExpressionAttributeValues and value_ref in ExpressionAttributeValues:
                    value = ExpressionAttributeValues[value_ref]
                    item[field_name] = value

        data[item_id] = item
        self._write_data(data)
        return {}

    def scan(self) -> dict:
        """Scan all items in table."""
        data = self._read_data()
        items = list(data.values())
        return {"Items": items}

    def query(
        self,
        KeyConditionExpression: Optional[str] = None,
        ExpressionAttributeNames: Optional[dict] = None,
        ExpressionAttributeValues: Optional[dict] = None,
    ) -> dict:
        """Query items (simplified)."""
        data = self._read_data()
        items = list(data.values())
        return {"Items": items}

    def delete_item(self, Key: dict) -> dict:
        """Delete an item by key."""
        data = self._read_data()
        hash_key = list(Key.keys())[0]
        hash_value = str(Key[hash_key])

        item_id = None
        for iid, item in data.items():
            if str(item.get(hash_key)) == hash_value:
                item_id = iid
                break

        if item_id:
            del data[item_id]
            self._write_data(data)

        return {}


class MockDatabase:
    """Mock DynamoDB resource using JSON files."""

    def __init__(self, data_dir: str = "data"):
        self.data_dir = data_dir
        self.tables = {}

    def Table(self, table_name: str) -> MockTable:
        """Get a table (creates if doesn't exist)."""
        if table_name not in self.tables:
            self.tables[table_name] = MockTable(table_name, self.data_dir)
        return self.tables[table_name]


# Global instance
_mock_db = None


def get_mock_database(data_dir: str = "data") -> MockDatabase:
    """Get or create the mock database instance."""
    global _mock_db
    if _mock_db is None:
        _mock_db = MockDatabase(data_dir)
    return _mock_db
