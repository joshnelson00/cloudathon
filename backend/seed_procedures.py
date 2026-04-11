"""
Run this once after terraform apply to seed the procedures table.

Usage:
    cd backend
    python seed_procedures.py
"""
import sys
import os

sys.path.insert(0, os.path.dirname(__file__))

import boto3
from app.config import get_settings

settings = get_settings()

PROCEDURES = [
    {
        "procedure_id": "hdd_purge_v1",
        "device_type":  "laptop_hdd",
        "nist_method":  "purge",
        "label":        "HDD — 3-Pass Overwrite (NIST Purge)",
        "steps": [
            {"id": "hdd_1", "instruction": "Verify device powers on and storage drive is detected by the OS", "requires_confirmation": True},
            {"id": "hdd_2", "instruction": "Boot device from USB sanitization media (DBAN or equivalent)", "requires_confirmation": True},
            {"id": "hdd_3", "instruction": "Select the target drive — confirm serial number matches intake record", "requires_confirmation": True},
            {"id": "hdd_4", "instruction": "Run 3-pass DoD overwrite — do NOT interrupt the process", "requires_confirmation": True},
            {"id": "hdd_5", "instruction": "Verify wipe completion — tool reports 100% success with no bad sectors", "requires_confirmation": True},
            {"id": "hdd_6", "instruction": "Reboot device and confirm drive is blank (no OS, no files)", "requires_confirmation": True},
            {"id": "hdd_7", "instruction": "Affix 'Data Destroyed' label to device with today's date", "requires_confirmation": True},
        ],
    },
    {
        "procedure_id": "ssd_secure_erase_v1",
        "device_type":  "laptop_ssd",
        "nist_method":  "purge",
        "label":        "SSD — ATA Secure Erase (NIST Purge)",
        "steps": [
            {"id": "ssd_1", "instruction": "Verify device powers on and SSD is detected (check BIOS if needed)", "requires_confirmation": True},
            {"id": "ssd_2", "instruction": "Boot device from USB with hdparm or manufacturer secure-erase tool", "requires_confirmation": True},
            {"id": "ssd_3", "instruction": "Confirm drive is NOT frozen — if frozen, sleep/wake the device and retry", "requires_confirmation": True},
            {"id": "ssd_4", "instruction": "Issue ATA Secure Erase command to the drive", "requires_confirmation": True},
            {"id": "ssd_5", "instruction": "Wait for command to complete — do NOT power off during erase", "requires_confirmation": True},
            {"id": "ssd_6", "instruction": "Verify erase completed successfully — tool reports success", "requires_confirmation": True},
            {"id": "ssd_7", "instruction": "Reboot and confirm drive is blank (no OS, no files)", "requires_confirmation": True},
            {"id": "ssd_8", "instruction": "Affix 'Data Destroyed' label to device with today's date", "requires_confirmation": True},
        ],
    },
    {
        "procedure_id": "tablet_factory_reset_v1",
        "device_type":  "tablet",
        "nist_method":  "purge",
        "label":        "Tablet / Mobile — Factory Reset (NIST Purge)",
        "steps": [
            {"id": "tab_1", "instruction": "Power on device and navigate to Settings → General → Reset", "requires_confirmation": True},
            {"id": "tab_2", "instruction": "Select 'Erase All Content and Settings' (iOS) or 'Factory Reset' (Android)", "requires_confirmation": True},
            {"id": "tab_3", "instruction": "Confirm the reset when prompted — enter passcode if required", "requires_confirmation": True},
            {"id": "tab_4", "instruction": "Wait for reset to complete and device to reboot to setup screen", "requires_confirmation": True},
            {"id": "tab_5", "instruction": "Verify device shows initial setup screen with no personal data visible", "requires_confirmation": True},
            {"id": "tab_6", "instruction": "Affix 'Data Destroyed' label to device with today's date", "requires_confirmation": True},
        ],
    },
    {
        "procedure_id": "no_storage_clear_v1",
        "device_type":  "no_storage",
        "nist_method":  "clear",
        "label":        "No Usable Storage — Clear (Power Cycle Verification)",
        "steps": [
            {"id": "nos_1", "instruction": "Inspect device — confirm no internal storage drive is present", "requires_confirmation": True},
            {"id": "nos_2", "instruction": "Power cycle device and confirm it fails to boot (no OS present)", "requires_confirmation": True},
            {"id": "nos_3", "instruction": "Document reason device has no storage (stripped, failed drive, thin client, etc.)", "requires_confirmation": True},
            {"id": "nos_4", "instruction": "Affix 'No Storage — Cleared' label to device with today's date", "requires_confirmation": True},
        ],
    },
]


def seed():
    table = boto3.resource("dynamodb", region_name=settings.aws_region).Table(
        settings.dynamodb_procedures_table
    )
    for proc in PROCEDURES:
        table.put_item(Item=proc)
        print(f"  Seeded: {proc['procedure_id']} ({len(proc['steps'])} steps)")
    print(f"\nDone — {len(PROCEDURES)} procedures seeded into '{settings.dynamodb_procedures_table}'")


if __name__ == "__main__":
    print(f"Seeding procedures into '{settings.dynamodb_procedures_table}' ({settings.aws_region})...\n")
    seed()
