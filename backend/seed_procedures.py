"""
Run this once after terraform apply to seed the procedures table.

Source: NIST SP 800-88r2 - Guidelines for Media Sanitization (September 2025)
  - Section 3.1: Sanitization Methods (Clear, Purge, Destroy)
  - Section 4.6: Documentation / Certificate of Sanitization
  - Note: Multi-pass overwrite (DoD 5220.22-M) was removed from NISPOM in 2006.
    NIST 800-88r2 confirms a single overwrite pass is sufficient for HDDs.

Steps marked with "input_fields" require the worker to enter data.
The frontend renders these as form inputs instead of a simple checkbox.
That data is stored in the step's input_data field and pulled into the PDF certificate.

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
    # -------------------------------------------------------------------------
    # HDD — Purge (single-pass overwrite)
    # NIST 800-88r2 §3.1.2: Purge sanitization method
    # Note: Multi-pass overwrite not required per current NIST guidance.
    # -------------------------------------------------------------------------
    {
        "procedure_id": "hdd_purge_v1",
        "device_type":  "laptop_hdd",
        "nist_method":  "Purge",
        "nist_technique": "Overwrite",
        "label":        "HDD — Single-Pass Overwrite (NIST Purge)",
        "steps": [
            {
                "id": "hdd_1",
                "instruction": "Power on the device and confirm the HDD is detected by the system.",
                "requires_confirmation": True,
                "input_fields": None,
            },
            {
                "id": "hdd_2",
                "instruction": "Physically locate the drive label and record the drive details below. "
                               "These fields are required for the NIST compliance certificate.",
                "requires_confirmation": True,
                "input_fields": [
                    {"name": "drive_serial",       "label": "Drive Serial Number",    "type": "text",   "required": True},
                    {"name": "drive_manufacturer", "label": "Drive Manufacturer",     "type": "text",   "required": True},
                    {"name": "drive_model",        "label": "Drive Model",            "type": "text",   "required": True},
                    {"name": "drive_capacity_gb",  "label": "Drive Capacity (GB)",    "type": "number", "required": True},
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
                    {"name": "wipe_tool_name",    "label": "Tool Name (e.g., DBAN)",    "type": "text", "required": True},
                    {"name": "wipe_tool_version", "label": "Tool Version (e.g., 2.3.0)","type": "text", "required": True},
                ],
            },
            {
                "id": "hdd_6",
                "instruction": "Run a single-pass overwrite on the drive. Do NOT interrupt the process. "
                               "Per NIST SP 800-88r2 §3.1.1, a single overwrite pass is sufficient.",
                "requires_confirmation": True,
                "input_fields": None,
                "wipe_api_sim": True,
            },
            {
                "id": "hdd_7",
                "instruction": "Confirm the tool reports successful completion with no errors or bad sectors. "
                               "Record the result.",
                "requires_confirmation": True,
                "input_fields": [
                    {"name": "wipe_result", "label": "Wipe Result", "type": "select",
                     "options": ["pass", "fail"], "required": True},
                    {"name": "verification_method", "label": "Verification Method (e.g., Tool completion log, Visual inspection)",
                     "type": "text", "required": True},
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

    # -------------------------------------------------------------------------
    # SATA SSD — Purge (ATA Secure Erase)
    # NIST 800-88r2 §3.1.2: Purge via dedicated sanitize command
    # Use for SATA SSDs only. NVMe SSDs require a different procedure.
    # -------------------------------------------------------------------------
    {
        "procedure_id": "sata_ssd_secure_erase_v1",
        "device_type":  "laptop_ssd_sata",
        "nist_method":  "Purge",
        "nist_technique": "Block Erase (ATA Secure Erase)",
        "label":        "SATA SSD — ATA Secure Erase (NIST Purge)",
        "steps": [
            {
                "id": "ssd_1",
                "instruction": "Power on the device and confirm the SATA SSD is detected in BIOS/UEFI.",
                "requires_confirmation": True,
                "input_fields": None,
            },
            {
                "id": "ssd_2",
                "instruction": "Physically locate the drive label and record the drive details below. "
                               "These fields are required for the NIST compliance certificate.",
                "requires_confirmation": True,
                "input_fields": [
                    {"name": "drive_serial",       "label": "Drive Serial Number",  "type": "text",   "required": True},
                    {"name": "drive_manufacturer", "label": "Drive Manufacturer",   "type": "text",   "required": True},
                    {"name": "drive_model",        "label": "Drive Model",          "type": "text",   "required": True},
                    {"name": "drive_capacity_gb",  "label": "Drive Capacity (GB)",  "type": "number", "required": True},
                ],
            },
            {
                "id": "ssd_3",
                "instruction": "Boot the device from a USB tool that supports ATA Secure Erase (e.g., hdparm, "
                               "Samsung Magician, or manufacturer-provided tool).",
                "requires_confirmation": True,
                "input_fields": None,
            },
            {
                "id": "ssd_4",
                "instruction": "Check if the drive is in a FROZEN state. If frozen, suspend and resume "
                               "the system (sleep/wake) to unfreeze it, then retry.",
                "requires_confirmation": True,
                "input_fields": None,
            },
            {
                "id": "ssd_5",
                "instruction": "Record the sanitization tool name and version before issuing the erase command.",
                "requires_confirmation": True,
                "input_fields": [
                    {"name": "wipe_tool_name",    "label": "Tool Name (e.g., hdparm)",  "type": "text", "required": True},
                    {"name": "wipe_tool_version", "label": "Tool Version",              "type": "text", "required": True},
                ],
            },
            {
                "id": "ssd_6",
                "instruction": "Issue the ATA Secure Erase command to the drive. Do NOT power off during the erase.",
                "requires_confirmation": True,
                "input_fields": None,
                "wipe_api_sim": True,
            },
            {
                "id": "ssd_7",
                "instruction": "Confirm the command completed successfully. Record the result.",
                "requires_confirmation": True,
                "input_fields": [
                    {"name": "wipe_result", "label": "Erase Result", "type": "select",
                     "options": ["pass", "fail"], "required": True},
                    {"name": "verification_method", "label": "Verification Method (e.g., Tool completion log, Visual inspection)",
                     "type": "text", "required": True},
                ],
            },
            {
                "id": "ssd_8",
                "instruction": "Reboot and confirm the drive is blank (no OS, no files visible).",
                "requires_confirmation": True,
                "input_fields": None,
            },
            {
                "id": "ssd_9",
                "instruction": "Affix a 'Data Destroyed' label to the device with today's date.",
                "requires_confirmation": True,
                "input_fields": None,
            },
        ],
    },

    # -------------------------------------------------------------------------
    # NVMe SSD — Purge (NVMe Format with Secure Erase)
    # NIST 800-88r2 §3.1.2: Purge via dedicated sanitize command
    # ATA Secure Erase does NOT work on NVMe. Use nvme-cli format command.
    # -------------------------------------------------------------------------
    {
        "procedure_id": "nvme_ssd_format_v1",
        "device_type":  "laptop_ssd_nvme",
        "nist_method":  "Purge",
        "nist_technique": "Block Erase (NVMe Format)",
        "label":        "NVMe SSD — NVMe Format Secure Erase (NIST Purge)",
        "steps": [
            {
                "id": "nvme_1",
                "instruction": "Power on the device and confirm the NVMe drive is detected in BIOS/UEFI. "
                               "NVMe drives typically appear as 'M.2 NVMe' in BIOS storage settings.",
                "requires_confirmation": True,
                "input_fields": None,
            },
            {
                "id": "nvme_2",
                "instruction": "Physically locate the M.2 drive label and record the drive details below. "
                               "These fields are required for the NIST compliance certificate.",
                "requires_confirmation": True,
                "input_fields": [
                    {"name": "drive_serial",       "label": "Drive Serial Number",  "type": "text",   "required": True},
                    {"name": "drive_manufacturer", "label": "Drive Manufacturer",   "type": "text",   "required": True},
                    {"name": "drive_model",        "label": "Drive Model",          "type": "text",   "required": True},
                    {"name": "drive_capacity_gb",  "label": "Drive Capacity (GB)",  "type": "number", "required": True},
                ],
            },
            {
                "id": "nvme_3",
                "instruction": "Boot from a Linux USB (e.g., Ubuntu Live, Kali) that includes nvme-cli. "
                               "NOTE: ATA Secure Erase does not work on NVMe drives.",
                "requires_confirmation": True,
                "input_fields": None,
            },
            {
                "id": "nvme_4",
                "instruction": "Identify the NVMe device path (e.g., /dev/nvme0) using: nvme list",
                "requires_confirmation": True,
                "input_fields": None,
            },
            {
                "id": "nvme_5",
                "instruction": "Record the sanitization tool before issuing the format command.",
                "requires_confirmation": True,
                "input_fields": [
                    {"name": "wipe_tool_name",    "label": "Tool Name (e.g., nvme-cli)", "type": "text", "required": True},
                    {"name": "wipe_tool_version", "label": "Tool Version",               "type": "text", "required": True},
                ],
            },
            {
                "id": "nvme_6",
                "instruction": "Run the secure format command: nvme format /dev/nvme0 --ses=1 "
                               "(--ses=1 applies User Data Erase). Do NOT power off during the operation.",
                "requires_confirmation": True,
                "input_fields": None,
                "wipe_api_sim": True,
            },
            {
                "id": "nvme_7",
                "instruction": "Confirm the format command returned success (exit code 0). Record the result.",
                "requires_confirmation": True,
                "input_fields": [
                    {"name": "wipe_result", "label": "Format Result", "type": "select",
                     "options": ["pass", "fail"], "required": True},
                    {"name": "verification_method", "label": "Verification Method (e.g., Tool completion log, Visual inspection)",
                     "type": "text", "required": True},
                ],
            },
            {
                "id": "nvme_8",
                "instruction": "Reboot and confirm the drive is blank (no OS, no files visible).",
                "requires_confirmation": True,
                "input_fields": None,
            },
            {
                "id": "nvme_9",
                "instruction": "Affix a 'Data Destroyed' label to the device with today's date.",
                "requires_confirmation": True,
                "input_fields": None,
            },
        ],
    },

    # -------------------------------------------------------------------------
    # Tablet / Mobile — Purge (Factory Reset)
    # NIST 800-88r2 §3.1.1/3.1.2: Clear/Purge via manufacturer reset
    # -------------------------------------------------------------------------
    {
        "procedure_id": "tablet_factory_reset_v1",
        "device_type":  "tablet",
        "nist_method":  "Purge",
        "nist_technique": "Factory Reset (manufacturer-provided sanitize command)",
        "label":        "Tablet / Mobile — Factory Reset (NIST Purge)",
        "steps": [
            {
                "id": "tab_1",
                "instruction": "Power on the device and record the device details below. "
                               "For tablets, the serial number is typically in Settings → About or on the back label.",
                "requires_confirmation": True,
                "input_fields": [
                    {"name": "drive_serial",       "label": "Device Serial Number",  "type": "text",   "required": True},
                    {"name": "drive_manufacturer", "label": "Manufacturer (e.g., Apple, Samsung)", "type": "text", "required": True},
                    {"name": "drive_model",        "label": "Model (e.g., iPad 9th Gen)", "type": "text", "required": True},
                    {"name": "drive_capacity_gb",  "label": "Storage Capacity (GB)", "type": "number", "required": True},
                ],
            },
            {
                "id": "tab_2",
                "instruction": "Remove any linked accounts before resetting: "
                               "iOS — Settings → [Your Name] → Sign Out. "
                               "Android — Settings → Accounts → Remove Google Account. "
                               "Skipping this step may leave Activation Lock enabled.",
                "requires_confirmation": True,
                "input_fields": None,
            },
            {
                "id": "tab_3",
                "instruction": "Navigate to the factory reset option: "
                               "iOS — Settings → General → Transfer or Reset → Erase All Content and Settings. "
                               "Android — Settings → General Management → Reset → Factory Data Reset.",
                "requires_confirmation": True,
                "input_fields": None,
            },
            {
                "id": "tab_4",
                "instruction": "Confirm the reset when prompted. Enter the device passcode if required. "
                               "Wait for the reset to complete — do not power off during this process.",
                "requires_confirmation": True,
                "input_fields": None,
                "wipe_api_sim": True,
            },
            {
                "id": "tab_5",
                "instruction": "Confirm the device reboots to the initial setup screen with no personal data visible. "
                               "Record the result.",
                "requires_confirmation": True,
                "input_fields": [
                    {"name": "wipe_result", "label": "Reset Result", "type": "select",
                     "options": ["pass", "fail"], "required": True},
                    {"name": "verification_method", "label": "Verification Method (e.g., Visual inspection, Setup screen confirmed)",
                     "type": "text", "required": True},
                ],
            },
            {
                "id": "tab_6",
                "instruction": "Affix a 'Data Destroyed' label to the device with today's date.",
                "requires_confirmation": True,
                "input_fields": None,
            },
        ],
    },

    # -------------------------------------------------------------------------
    # External HDD — Purge (single-pass overwrite)
    # Same method as internal HDD. Listed separately for tracking purposes.
    # -------------------------------------------------------------------------
    {
        "procedure_id": "external_hdd_purge_v1",
        "device_type":  "drive_external_hdd",
        "nist_method":  "Purge",
        "nist_technique": "Overwrite",
        "label":        "External HDD — Single-Pass Overwrite (NIST Purge)",
        "steps": [
            {
                "id": "exthdd_1",
                "instruction": "Connect the external HDD to a workstation and confirm it is detected by the OS.",
                "requires_confirmation": True,
                "input_fields": None,
            },
            {
                "id": "exthdd_2",
                "instruction": "Locate the drive label and record drive details below.",
                "requires_confirmation": True,
                "input_fields": [
                    {"name": "drive_serial",       "label": "Drive Serial Number", "type": "text",   "required": True},
                    {"name": "drive_manufacturer", "label": "Manufacturer",        "type": "text",   "required": True},
                    {"name": "drive_model",        "label": "Model",               "type": "text",   "required": True},
                    {"name": "drive_capacity_gb",  "label": "Capacity (GB)",       "type": "number", "required": True},
                ],
            },
            {
                "id": "exthdd_3",
                "instruction": "Record the overwrite tool to be used.",
                "requires_confirmation": True,
                "input_fields": [
                    {"name": "wipe_tool_name",    "label": "Tool Name",    "type": "text", "required": True},
                    {"name": "wipe_tool_version", "label": "Tool Version", "type": "text", "required": True},
                ],
            },
            {
                "id": "exthdd_4",
                "instruction": "Run a single-pass overwrite on the drive. Do NOT disconnect during the process.",
                "requires_confirmation": True,
                "input_fields": None,
                "wipe_api_sim": True,
            },
            {
                "id": "exthdd_5",
                "instruction": "Confirm the tool reports successful completion. Record the result.",
                "requires_confirmation": True,
                "input_fields": [
                    {"name": "wipe_result", "label": "Wipe Result", "type": "select",
                     "options": ["pass", "fail"], "required": True},
                    {"name": "verification_method", "label": "Verification Method (e.g., Tool completion log, Visual inspection)",
                     "type": "text", "required": True},
                ],
            },
            {
                "id": "exthdd_6",
                "instruction": "Affix a 'Data Destroyed' label to the drive with today's date.",
                "requires_confirmation": True,
                "input_fields": None,
            },
        ],
    },

    # -------------------------------------------------------------------------
    # External SSD — Purge (ATA Secure Erase or manufacturer tool)
    # -------------------------------------------------------------------------
    {
        "procedure_id": "external_ssd_purge_v1",
        "device_type":  "drive_external_ssd",
        "nist_method":  "Purge",
        "nist_technique": "Block Erase (ATA Secure Erase or manufacturer tool)",
        "label":        "External SSD — Secure Erase (NIST Purge)",
        "steps": [
            {
                "id": "extssd_1",
                "instruction": "Connect the external SSD to a workstation and confirm it is detected by the OS.",
                "requires_confirmation": True,
                "input_fields": None,
            },
            {
                "id": "extssd_2",
                "instruction": "Locate the drive label and record drive details below.",
                "requires_confirmation": True,
                "input_fields": [
                    {"name": "drive_serial",       "label": "Drive Serial Number", "type": "text",   "required": True},
                    {"name": "drive_manufacturer", "label": "Manufacturer",        "type": "text",   "required": True},
                    {"name": "drive_model",        "label": "Model",               "type": "text",   "required": True},
                    {"name": "drive_capacity_gb",  "label": "Capacity (GB)",       "type": "number", "required": True},
                ],
            },
            {
                "id": "extssd_3",
                "instruction": "Use the manufacturer's secure erase tool or hdparm. "
                               "Note: ATA Secure Erase may not work over USB enclosures — "
                               "if unavailable, use a single-pass overwrite instead.",
                "requires_confirmation": True,
                "input_fields": [
                    {"name": "wipe_tool_name",    "label": "Tool Name",    "type": "text", "required": True},
                    {"name": "wipe_tool_version", "label": "Tool Version", "type": "text", "required": True},
                ],
            },
            {
                "id": "extssd_4",
                "instruction": "Run the secure erase or overwrite. Do NOT disconnect during the process.",
                "requires_confirmation": True,
                "input_fields": None,
                "wipe_api_sim": True,
            },
            {
                "id": "extssd_5",
                "instruction": "Confirm successful completion. Record the result.",
                "requires_confirmation": True,
                "input_fields": [
                    {"name": "wipe_result", "label": "Erase Result", "type": "select",
                     "options": ["pass", "fail"], "required": True},
                    {"name": "verification_method", "label": "Verification Method (e.g., Tool completion log, Visual inspection)",
                     "type": "text", "required": True},
                ],
            },
            {
                "id": "extssd_6",
                "instruction": "Affix a 'Data Destroyed' label to the drive with today's date.",
                "requires_confirmation": True,
                "input_fields": None,
            },
        ],
    },

    # -------------------------------------------------------------------------
    # No Usable Storage — Clear (documentation only)
    # NIST 800-88r2 §3.1.1: Clear method for inoperable/stripped media
    # -------------------------------------------------------------------------
    {
        "procedure_id": "no_storage_clear_v1",
        "device_type":  "no_storage",
        "nist_method":  "Clear",
        "nist_technique": "Power cycle verification (no storage present)",
        "label":        "No Usable Storage — Clear (Power Cycle Verification)",
        "steps": [
            {
                "id": "nos_1",
                "instruction": "Physically inspect the device and confirm no internal storage drive is present "
                               "(drive bay is empty or drive has been removed).",
                "requires_confirmation": True,
                "input_fields": None,
            },
            {
                "id": "nos_2",
                "instruction": "Record the device details for documentation purposes.",
                "requires_confirmation": True,
                "input_fields": [
                    {"name": "drive_serial",       "label": "Chassis Serial Number", "type": "text", "required": True},
                    {"name": "drive_manufacturer", "label": "Manufacturer",          "type": "text", "required": True},
                    {"name": "drive_model",        "label": "Model",                 "type": "text", "required": True},
                    {"name": "drive_capacity_gb",  "label": "Storage Capacity (GB — enter 0)", "type": "number", "required": True},
                ],
            },
            {
                "id": "nos_3",
                "instruction": "Power cycle the device and confirm it fails to boot (no OS present, no storage detected).",
                "requires_confirmation": True,
                "input_fields": None,
            },
            {
                "id": "nos_4",
                "instruction": "Document the reason storage is absent.",
                "requires_confirmation": True,
                "input_fields": [
                    {"name": "wipe_result", "label": "Storage Status", "type": "select",
                     "options": ["drive_removed", "drive_failed", "thin_client", "other"], "required": True},
                ],
            },
            {
                "id": "nos_5",
                "instruction": "Affix a 'No Storage — Cleared' label to the device with today's date.",
                "requires_confirmation": True,
                "input_fields": None,
            },
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