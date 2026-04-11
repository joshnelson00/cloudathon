#!/usr/bin/env python3
"""
Seed the mock database with initial data for demo.

This script creates JSON files in the data/ directory with sample procedures
and empty devices list. The data mimics the DynamoDB schema.

Usage:
    cd backend
    python seed_mock_db.py
"""

import json
from pathlib import Path

# Create data directory
data_dir = Path("data")
data_dir.mkdir(exist_ok=True)

# ─────────────────────────────────────────────────────────────────────────────
# Sanitization Procedures (from NIST SP 800-88r2)
# ─────────────────────────────────────────────────────────────────────────────

PROCEDURES = {
    "hdd_purge_v1": {
        "procedure_id": "hdd_purge_v1",
        "device_type": "laptop_hdd",
        "nist_method": "Purge",
        "nist_technique": "Overwrite",
        "label": "HDD — Single-Pass Overwrite (NIST Purge)",
        "steps": [
            {
                "id": "hdd_1",
                "instruction": "Power on the device and confirm the HDD is detected by the system.",
                "requires_confirmation": True,
                "input_fields": None,
            },
            {
                "id": "hdd_2",
                "instruction": "Physically locate the drive label and record the drive details below. These fields are required for the NIST compliance certificate.",
                "requires_confirmation": True,
                "input_fields": [
                    {"name": "drive_serial", "label": "Drive Serial Number", "type": "text", "required": True},
                    {"name": "drive_manufacturer", "label": "Drive Manufacturer", "type": "text", "required": True},
                    {"name": "drive_model", "label": "Drive Model", "type": "text", "required": True},
                    {"name": "drive_capacity_gb", "label": "Drive Capacity (GB)", "type": "number", "required": True},
                ],
            },
            {
                "id": "hdd_3",
                "instruction": "Boot the device from a USB sanitization tool (e.g., DBAN, Eraser, or equivalent).",
                "requires_confirmation": True,
                "input_fields": None,
            },
            {
                "id": "hdd_4",
                "instruction": "In the tool, select the target drive and confirm the serial number matches step 2.",
                "requires_confirmation": True,
                "input_fields": None,
            },
            {
                "id": "hdd_5",
                "instruction": "Record the sanitization tool name and version before starting the wipe.",
                "requires_confirmation": True,
                "input_fields": [
                    {"name": "wipe_tool_name", "label": "Tool Name (e.g., DBAN)", "type": "text", "required": True},
                    {"name": "wipe_tool_version", "label": "Tool Version (e.g., 2.3.0)", "type": "text", "required": True},
                ],
            },
            {
                "id": "hdd_6",
                "instruction": "Run a single-pass overwrite on the drive. Do NOT interrupt the process. Per NIST SP 800-88r2 §3.1.1, a single overwrite pass is sufficient.",
                "requires_confirmation": True,
                "input_fields": None,
            },
            {
                "id": "hdd_7",
                "instruction": "Confirm the tool reports successful completion with no errors or bad sectors. Record the result.",
                "requires_confirmation": True,
                "input_fields": [
                    {"name": "wipe_result", "label": "Wipe Result", "type": "select", "options": ["pass", "fail"], "required": True},
                ],
            },
            {
                "id": "hdd_8",
                "instruction": "Reboot the device and confirm the drive is blank (no OS, no files visible).",
                "requires_confirmation": True,
                "input_fields": None,
            },
            {
                "id": "hdd_9",
                "instruction": "Affix a 'Data Destroyed' label to the device with today's date.",
                "requires_confirmation": True,
                "input_fields": None,
            },
        ],
    },
    "sata_ssd_secure_erase_v1": {
        "procedure_id": "sata_ssd_secure_erase_v1",
        "device_type": "laptop_ssd_sata",
        "nist_method": "Purge",
        "nist_technique": "Block Erase (ATA Secure Erase)",
        "label": "SATA SSD — ATA Secure Erase (NIST Purge)",
        "steps": [
            {"id": "ssd_1", "instruction": "Power on the device and confirm the SATA SSD is detected in BIOS/UEFI.", "requires_confirmation": True, "input_fields": None},
            {"id": "ssd_2", "instruction": "Record the drive details below for the compliance certificate.", "requires_confirmation": True, "input_fields": [
                {"name": "drive_serial", "label": "Drive Serial Number", "type": "text", "required": True},
                {"name": "drive_manufacturer", "label": "Drive Manufacturer", "type": "text", "required": True},
                {"name": "drive_model", "label": "Drive Model", "type": "text", "required": True},
                {"name": "drive_capacity_gb", "label": "Drive Capacity (GB)", "type": "number", "required": True},
            ]},
            {"id": "ssd_3", "instruction": "Boot from USB with ATA Secure Erase support (e.g., hdparm).", "requires_confirmation": True, "input_fields": None},
            {"id": "ssd_4", "instruction": "Unfreeze the drive if needed (suspend/resume).", "requires_confirmation": True, "input_fields": None},
            {"id": "ssd_5", "instruction": "Record the sanitization tool info.", "requires_confirmation": True, "input_fields": [
                {"name": "wipe_tool_name", "label": "Tool Name", "type": "text", "required": True},
                {"name": "wipe_tool_version", "label": "Tool Version", "type": "text", "required": True},
            ]},
            {"id": "ssd_6", "instruction": "Issue the ATA Secure Erase command.", "requires_confirmation": True, "input_fields": None},
            {"id": "ssd_7", "instruction": "Confirm completion and record result.", "requires_confirmation": True, "input_fields": [
                {"name": "wipe_result", "label": "Erase Result", "type": "select", "options": ["pass", "fail"], "required": True},
            ]},
            {"id": "ssd_8", "instruction": "Reboot and verify drive is blank.", "requires_confirmation": True, "input_fields": None},
            {"id": "ssd_9", "instruction": "Affix 'Data Destroyed' label with date.", "requires_confirmation": True, "input_fields": None},
        ],
    },
    "nvme_ssd_format_v1": {
        "procedure_id": "nvme_ssd_format_v1",
        "device_type": "laptop_ssd_nvme",
        "nist_method": "Purge",
        "nist_technique": "Block Erase (NVMe Format)",
        "label": "NVMe SSD — NVMe Format Secure Erase (NIST Purge)",
        "steps": [
            {"id": "nvme_1", "instruction": "Power on and confirm NVMe drive is detected in BIOS.", "requires_confirmation": True, "input_fields": None},
            {"id": "nvme_2", "instruction": "Record M.2 drive details.", "requires_confirmation": True, "input_fields": [
                {"name": "drive_serial", "label": "Drive Serial Number", "type": "text", "required": True},
                {"name": "drive_manufacturer", "label": "Drive Manufacturer", "type": "text", "required": True},
                {"name": "drive_model", "label": "Drive Model", "type": "text", "required": True},
                {"name": "drive_capacity_gb", "label": "Drive Capacity (GB)", "type": "number", "required": True},
            ]},
            {"id": "nvme_3", "instruction": "Boot from Linux USB with nvme-cli installed.", "requires_confirmation": True, "input_fields": None},
            {"id": "nvme_4", "instruction": "Identify the NVMe device path (e.g., /dev/nvme0).", "requires_confirmation": True, "input_fields": None},
            {"id": "nvme_5", "instruction": "Record sanitization tool info.", "requires_confirmation": True, "input_fields": [
                {"name": "wipe_tool_name", "label": "Tool Name", "type": "text", "required": True},
                {"name": "wipe_tool_version", "label": "Tool Version", "type": "text", "required": True},
            ]},
            {"id": "nvme_6", "instruction": "Run: nvme format /dev/nvme0 --ses=1", "requires_confirmation": True, "input_fields": None},
            {"id": "nvme_7", "instruction": "Confirm success. Record result.", "requires_confirmation": True, "input_fields": [
                {"name": "wipe_result", "label": "Format Result", "type": "select", "options": ["pass", "fail"], "required": True},
            ]},
            {"id": "nvme_8", "instruction": "Reboot and verify drive is blank.", "requires_confirmation": True, "input_fields": None},
            {"id": "nvme_9", "instruction": "Affix 'Data Destroyed' label with date.", "requires_confirmation": True, "input_fields": None},
        ],
    },
    "tablet_factory_reset_v1": {
        "procedure_id": "tablet_factory_reset_v1",
        "device_type": "tablet",
        "nist_method": "Purge",
        "nist_technique": "Factory Reset (manufacturer-provided sanitize command)",
        "label": "Tablet / Mobile — Factory Reset (NIST Purge)",
        "steps": [
            {"id": "tab_1", "instruction": "Power on and record device details from Settings > About.", "requires_confirmation": True, "input_fields": [
                {"name": "drive_serial", "label": "Device Serial Number", "type": "text", "required": True},
                {"name": "drive_manufacturer", "label": "Manufacturer", "type": "text", "required": True},
                {"name": "drive_model", "label": "Model", "type": "text", "required": True},
                {"name": "drive_capacity_gb", "label": "Storage Capacity (GB)", "type": "number", "required": True},
            ]},
            {"id": "tab_2", "instruction": "Remove linked accounts (iOS: Sign Out, Android: Remove Google Account).", "requires_confirmation": True, "input_fields": None},
            {"id": "tab_3", "instruction": "Navigate to factory reset (iOS: Erase All Content, Android: Factory Data Reset).", "requires_confirmation": True, "input_fields": None},
            {"id": "tab_4", "instruction": "Confirm and wait for reset to complete.", "requires_confirmation": True, "input_fields": None},
            {"id": "tab_5", "instruction": "Confirm reboot to setup screen. Record result.", "requires_confirmation": True, "input_fields": [
                {"name": "wipe_result", "label": "Reset Result", "type": "select", "options": ["pass", "fail"], "required": True},
            ]},
            {"id": "tab_6", "instruction": "Affix 'Data Destroyed' label with date.", "requires_confirmation": True, "input_fields": None},
        ],
    },
    "external_hdd_purge_v1": {
        "procedure_id": "external_hdd_purge_v1",
        "device_type": "drive_external_hdd",
        "nist_method": "Purge",
        "nist_technique": "Overwrite",
        "label": "External HDD — Single-Pass Overwrite (NIST Purge)",
        "steps": [
            {"id": "exthdd_1", "instruction": "Connect external HDD and confirm detection.", "requires_confirmation": True, "input_fields": None},
            {"id": "exthdd_2", "instruction": "Record drive details.", "requires_confirmation": True, "input_fields": [
                {"name": "drive_serial", "label": "Drive Serial Number", "type": "text", "required": True},
                {"name": "drive_manufacturer", "label": "Manufacturer", "type": "text", "required": True},
                {"name": "drive_model", "label": "Model", "type": "text", "required": True},
                {"name": "drive_capacity_gb", "label": "Capacity (GB)", "type": "number", "required": True},
            ]},
            {"id": "exthdd_3", "instruction": "Record overwrite tool info.", "requires_confirmation": True, "input_fields": [
                {"name": "wipe_tool_name", "label": "Tool Name", "type": "text", "required": True},
                {"name": "wipe_tool_version", "label": "Tool Version", "type": "text", "required": True},
            ]},
            {"id": "exthdd_4", "instruction": "Run single-pass overwrite.", "requires_confirmation": True, "input_fields": None},
            {"id": "exthdd_5", "instruction": "Confirm completion. Record result.", "requires_confirmation": True, "input_fields": [
                {"name": "wipe_result", "label": "Wipe Result", "type": "select", "options": ["pass", "fail"], "required": True},
            ]},
            {"id": "exthdd_6", "instruction": "Affix 'Data Destroyed' label with date.", "requires_confirmation": True, "input_fields": None},
        ],
    },
    "external_ssd_purge_v1": {
        "procedure_id": "external_ssd_purge_v1",
        "device_type": "drive_external_ssd",
        "nist_method": "Purge",
        "nist_technique": "Block Erase (ATA Secure Erase or manufacturer tool)",
        "label": "External SSD — Secure Erase (NIST Purge)",
        "steps": [
            {"id": "extssd_1", "instruction": "Connect external SSD and confirm detection.", "requires_confirmation": True, "input_fields": None},
            {"id": "extssd_2", "instruction": "Record drive details.", "requires_confirmation": True, "input_fields": [
                {"name": "drive_serial", "label": "Drive Serial Number", "type": "text", "required": True},
                {"name": "drive_manufacturer", "label": "Manufacturer", "type": "text", "required": True},
                {"name": "drive_model", "label": "Model", "type": "text", "required": True},
                {"name": "drive_capacity_gb", "label": "Capacity (GB)", "type": "number", "required": True},
            ]},
            {"id": "extssd_3", "instruction": "Use manufacturer tool or hdparm for secure erase.", "requires_confirmation": True, "input_fields": [
                {"name": "wipe_tool_name", "label": "Tool Name", "type": "text", "required": True},
                {"name": "wipe_tool_version", "label": "Tool Version", "type": "text", "required": True},
            ]},
            {"id": "extssd_4", "instruction": "Run secure erase or overwrite.", "requires_confirmation": True, "input_fields": None},
            {"id": "extssd_5", "instruction": "Confirm completion. Record result.", "requires_confirmation": True, "input_fields": [
                {"name": "wipe_result", "label": "Erase Result", "type": "select", "options": ["pass", "fail"], "required": True},
            ]},
            {"id": "extssd_6", "instruction": "Affix 'Data Destroyed' label with date.", "requires_confirmation": True, "input_fields": None},
        ],
    },
    "no_storage_clear_v1": {
        "procedure_id": "no_storage_clear_v1",
        "device_type": "no_storage",
        "nist_method": "Clear",
        "nist_technique": "Power cycle verification (no storage present)",
        "label": "No Usable Storage — Clear (Power Cycle Verification)",
        "steps": [
            {"id": "nos_1", "instruction": "Inspect device and confirm no internal storage present.", "requires_confirmation": True, "input_fields": None},
            {"id": "nos_2", "instruction": "Record device details for documentation.", "requires_confirmation": True, "input_fields": [
                {"name": "drive_serial", "label": "Chassis Serial Number", "type": "text", "required": True},
                {"name": "drive_manufacturer", "label": "Manufacturer", "type": "text", "required": True},
                {"name": "drive_model", "label": "Model", "type": "text", "required": True},
                {"name": "drive_capacity_gb", "label": "Storage Capacity (GB — enter 0)", "type": "number", "required": True},
            ]},
            {"id": "nos_3", "instruction": "Power cycle and confirm no boot/storage detected.", "requires_confirmation": True, "input_fields": None},
            {"id": "nos_4", "instruction": "Document reason storage is absent.", "requires_confirmation": True, "input_fields": [
                {"name": "wipe_result", "label": "Storage Status", "type": "select", "options": ["drive_removed", "drive_failed", "thin_client", "other"], "required": True},
            ]},
            {"id": "nos_5", "instruction": "Affix 'No Storage — Cleared' label with date.", "requires_confirmation": True, "input_fields": None},
        ],
    },
}

# Table name prefixes to seed (covers both legacy and current config defaults)
TABLE_PREFIXES = ["cityserve", "hackathon-dev"]

for prefix in TABLE_PREFIXES:
    # Write procedures to file
    procedures_file = data_dir / f"{prefix}-procedures.json"
    with open(procedures_file, "w") as f:
        json.dump(PROCEDURES, f, indent=2)
    print(f"✓ Created {procedures_file} with {len(PROCEDURES)} procedures")

    # Create devices file (preserve existing data)
    devices_file = data_dir / f"{prefix}-devices.json"
    if not devices_file.exists():
        with open(devices_file, "w") as f:
            json.dump({}, f, indent=2)
        print(f"✓ Created {devices_file} (empty)")
    else:
        print(f"✓ {devices_file} already exists (preserved)")

    # Create users file (preserve existing data)
    users_file = data_dir / f"{prefix}-users.json"
    if not users_file.exists():
        with open(users_file, "w") as f:
            json.dump({}, f, indent=2)
        print(f"✓ Created {users_file} (empty)")
    else:
        print(f"✓ {users_file} already exists (preserved)")

print("\n✅ Mock database seeded successfully!")
