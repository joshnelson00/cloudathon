"""
Quick local test for the device type -> NIST procedure lookup.
No server, no DynamoDB, no auth required.

Usage:
    cd backend
    python test_procedure_lookup.py
    python test_procedure_lookup.py laptop_ssd_nvme
"""
import sys

# Device type -> procedure_id mapping (mirrors devices.py)
DEVICE_TYPE_TO_PROCEDURE = {
    "laptop_hdd":         "hdd_purge_v1",
    "laptop_ssd":         "sata_ssd_secure_erase_v1",
    "laptop_ssd_sata":    "sata_ssd_secure_erase_v1",
    "laptop_ssd_nvme":    "nvme_ssd_format_v1",
    "desktop_hdd":        "hdd_purge_v1",
    "desktop_ssd":        "sata_ssd_secure_erase_v1",
    "tablet":             "tablet_factory_reset_v1",
    "drive_external":     "external_hdd_purge_v1",
    "drive_external_hdd": "external_hdd_purge_v1",
    "drive_external_ssd": "external_ssd_purge_v1",
    "no_storage":         "no_storage_clear_v1",
}

# Pull procedures directly from the seed file
from seed_procedures import PROCEDURES

PROCEDURE_MAP = {p["procedure_id"]: p for p in PROCEDURES}


def lookup(device_type: str):
    procedure_id = DEVICE_TYPE_TO_PROCEDURE.get(device_type)
    if not procedure_id:
        print(f"\n  ERROR: Unknown device type '{device_type}'")
        print(f"  Valid types: {', '.join(DEVICE_TYPE_TO_PROCEDURE.keys())}")
        return

    procedure = PROCEDURE_MAP.get(procedure_id)
    if not procedure:
        print(f"\n  ERROR: Procedure '{procedure_id}' not found in seed data")
        return

    print(f"\n{'='*60}")
    print(f"  Device Type : {device_type}")
    print(f"  Procedure   : {procedure['label']}")
    print(f"  NIST Method : {procedure['nist_method']}")
    print(f"  Technique   : {procedure['nist_technique']}")
    print(f"{'='*60}\n")

    for i, step in enumerate(procedure["steps"], 1):
        print(f"  Step {i} [{step['id']}]")
        print(f"  {step['instruction']}")
        if step.get("input_fields"):
            print(f"  --> Worker must enter:")
            for field in step["input_fields"]:
                required = "(required)" if field.get("required") else "(optional)"
                if field.get("options"):
                    print(f"      [{field['name']}] {field['label']} -- options: {field['options']} {required}")
                else:
                    print(f"      [{field['name']}] {field['label']} ({field['type']}) {required}")
        print()


def interactive():
    print("\nAvailable device types:")
    for dtype in DEVICE_TYPE_TO_PROCEDURE:
        proc_id = DEVICE_TYPE_TO_PROCEDURE[dtype]
        proc = PROCEDURE_MAP.get(proc_id, {})
        print(f"  {dtype:<25} -> {proc.get('label', proc_id)}")

    print("\nEnter a device type (or 'q' to quit):")
    while True:
        try:
            user_input = input("  > ").strip().lower()
        except (EOFError, KeyboardInterrupt):
            print("\nDone.")
            break
        if user_input in ("q", "quit", "exit", ""):
            break
        lookup(user_input)


if __name__ == "__main__":
    if len(sys.argv) > 1:
        lookup(sys.argv[1])
    else:
        interactive()