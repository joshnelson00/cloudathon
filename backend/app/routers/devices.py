import json
import os
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException

from ..auth import get_optional_user, require_admin
from ..db import get_devices_table, get_procedures_table
from ..models import (
    DeviceCompleteResponse,
    DeviceDetail,
    DeviceIntakeRequest,
    DeviceIntakeResponse,
    ProcedureCreateRequest,
    ProcedureCreateResponse,
    StepCompleteRequest,
    StepCompleteResponse,
)

router = APIRouter()

DEVICE_TYPE_TO_PROCEDURE = {
    "laptop_hdd":          "hdd_purge_v1",
    "laptop_ssd":          "sata_ssd_secure_erase_v1",
    "laptop_ssd_sata":     "sata_ssd_secure_erase_v1",
    "laptop_ssd_nvme":     "nvme_ssd_format_v1",
    "desktop_hdd":         "hdd_purge_v1",
    "desktop_ssd":         "sata_ssd_secure_erase_v1",
    "tablet":              "tablet_factory_reset_v1",
    "drive_external":      "external_hdd_purge_v1",
    "drive_external_hdd":  "external_hdd_purge_v1",
    "drive_external_ssd":  "external_ssd_purge_v1",
    "no_storage":          "no_storage_clear_v1",
}


def _resolve_procedure_id(device_type: str) -> str | None:
    """Return procedure_id for a device type — checks hardcoded map first, then DB."""
    pid = DEVICE_TYPE_TO_PROCEDURE.get(device_type)
    if pid:
        return pid
    result = get_procedures_table().scan()
    for item in result.get("Items", []):
        if item.get("device_type") == device_type:
            return item["procedure_id"]
    return None


@router.post("/devices", response_model=DeviceIntakeResponse)
def intake_device(body: DeviceIntakeRequest):
    procedure_id = _resolve_procedure_id(body.device_type)
    if not procedure_id:
        raise HTTPException(
            status_code=400,
            detail=f"Unknown device type '{body.device_type}'. "
                   f"Valid types: {list(DEVICE_TYPE_TO_PROCEDURE.keys())}",
        )

    device_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()

    item = {
        "device_id":        device_id,
        "chassis_serial":   body.chassis_serial,
        "device_type":      body.device_type,
        "make_model":       body.make_model,
        "os":               body.os or "",
        "intake_timestamp": now,
        "status":           "intake",
        "procedure_id":     procedure_id,
        "steps_completed":  [],
        "comp_doc":         None,
        "wipe_result":      None,
    }

    get_devices_table().put_item(Item=item)

    return DeviceIntakeResponse(
        device_id=device_id,
        procedure_id=procedure_id,
        status="intake",
    )


@router.get("/devices")
def list_devices():
    result = get_devices_table().scan()
    items = result.get("Items", [])
    items.sort(key=lambda x: x.get("intake_timestamp", ""), reverse=True)
    return {"devices": items}


@router.get("/devices/search")
def search_devices(
    q: str = "",
    device_type: str = "",
    status: str = "",
    serial: str = "",
    make_model: str = "",
):
    """
    Search devices by keyword or specific filters.

    Filters:
    - q: keyword search across all fields (case-insensitive)
    - device_type: filter by exact device type (e.g., "laptop_ssd")
    - status: filter by exact status (e.g., "intake", "in_progress")
    - serial: partial match on chassis serial
    - make_model: partial match on make/model
    """
    result = get_devices_table().scan()
    items = result.get("Items", [])

    # Keyword search across all fields
    if q.strip():
        q_lower = q.lower()
        items = [
            item for item in items
            if (q_lower in item.get("device_type", "").lower() or
                q_lower in item.get("chassis_serial", "").lower() or
                q_lower in item.get("make_model", "").lower() or
                q_lower in item.get("status", "").lower())
        ]

    # Filter by device type (exact match)
    if device_type.strip():
        items = [
            item for item in items
            if item.get("device_type", "").lower() == device_type.lower()
        ]

    # Filter by status (exact match)
    if status.strip():
        items = [
            item for item in items
            if item.get("status", "").lower() == status.lower()
        ]

    # Filter by serial (partial match)
    if serial.strip():
        serial_lower = serial.lower()
        items = [
            item for item in items
            if serial_lower in item.get("chassis_serial", "").lower()
        ]

    # Filter by make/model (partial match)
    if make_model.strip():
        make_model_lower = make_model.lower()
        items = [
            item for item in items
            if make_model_lower in item.get("make_model", "").lower()
        ]

    items.sort(key=lambda x: x.get("intake_timestamp", ""), reverse=True)
    return {"devices": items}


@router.get("/devices/{device_id}", response_model=DeviceDetail)
def get_device(device_id: str):
    result = get_devices_table().get_item(Key={"device_id": device_id})
    item = result.get("Item")
    if not item:
        raise HTTPException(status_code=404, detail="Device not found")

    return DeviceDetail(
        device_id=item["device_id"],
        chassis_serial=item["chassis_serial"],
        device_type=item["device_type"],
        make_model=item["make_model"],
        intake_timestamp=item["intake_timestamp"],
        status=item["status"],
        procedure_id=item["procedure_id"],
        steps_completed=item.get("steps_completed", []),
        wipe_result=item.get("wipe_result"),
        comp_doc=item.get("comp_doc"),
    )


@router.patch("/devices/{device_id}/step", response_model=StepCompleteResponse)
def complete_step(
    device_id: str,
    body: StepCompleteRequest,
):
    table = get_devices_table()
    result = table.get_item(Key={"device_id": device_id})
    item = result.get("Item")
    if not item:
        raise HTTPException(status_code=404, detail="Device not found")

    now = datetime.now(timezone.utc).isoformat()
    step_log = {
        "step_id":    body.step_id,
        "confirmed":  body.confirmed,
        "notes":      body.notes or "",
        "input_data": body.input_data,
        "timestamp":  now,
    }

    steps = list(item.get("steps_completed", []))
    steps = [s for s in steps if s["step_id"] != body.step_id]
    steps.append(step_log)

    # Promote known certificate fields to top-level device record
    CERT_FIELDS = {
        "drive_serial", "drive_manufacturer", "drive_model",
        "drive_capacity_gb", "wipe_tool_name", "wipe_tool_version",
        "verification_method",
    }
    extra_attrs = {k: v for k, v in body.input_data.items() if k in CERT_FIELDS}

    update_expr = "SET steps_completed = :s, #st = :status"
    attr_names  = {"#st": "status"}
    attr_values = {":s": steps, ":status": "in_progress"}

    for field, value in extra_attrs.items():
        placeholder = f":{field}"
        update_expr += f", {field} = {placeholder}"
        attr_values[placeholder] = value

    # wipe_result is a boolean — store separately
    if "wipe_result" in body.input_data:
        update_expr += ", wipe_result = :wr"
        attr_values[":wr"] = body.input_data["wipe_result"] == "pass"

    table.update_item(
        Key={"device_id": device_id},
        UpdateExpression=update_expr,
        ExpressionAttributeNames=attr_names,
        ExpressionAttributeValues=attr_values,
    )

    return StepCompleteResponse(
        device_id=device_id,
        step_id=body.step_id,
        status="in_progress",
    )


@router.get("/procedures")
def list_procedures():
    result = get_procedures_table().scan()
    items = result.get("Items", [])
    items.sort(key=lambda x: x.get("label", ""))
    return {"procedures": items}


@router.post("/procedures", response_model=ProcedureCreateResponse)
def create_procedure(
    body: ProcedureCreateRequest,
):
    # Derive a procedure_id from the device_type slug
    base_id = body.device_type.strip().lower().replace(" ", "_") + "_custom_v1"
    procedure_id = base_id

    # If that ID already exists bump to _v2, _v3, …
    existing = get_procedures_table().scan().get("Items", [])
    taken = {item["procedure_id"] for item in existing}
    if procedure_id in taken:
        n = 2
        while f"{body.device_type}_custom_v{n}" in taken:
            n += 1
        procedure_id = f"{body.device_type}_custom_v{n}"

    # Also reject if this device_type already has a procedure
    for item in existing:
        if item.get("device_type") == body.device_type:
            raise HTTPException(
                status_code=400,
                detail=f"A procedure for device type '{body.device_type}' already exists "
                       f"(procedure_id: {item['procedure_id']}). Delete it first or use a different device type key.",
            )

    prefix = body.device_type[:6].replace("_", "")
    steps = [
        {
            "id": f"{prefix}_{i + 1}",
            "instruction": step.instruction,
            "requires_confirmation": step.requires_confirmation,
            "input_fields": None,
        }
        for i, step in enumerate(body.steps)
    ]

    item = {
        "procedure_id":  procedure_id,
        "device_type":   body.device_type,
        "nist_method":   body.nist_method,
        "nist_technique": body.nist_technique,
        "label":         body.label,
        "steps":         steps,
    }

    get_procedures_table().put_item(Item=item)

    return ProcedureCreateResponse(
        procedure_id=procedure_id,
        device_type=body.device_type,
        label=body.label,
        message=f"Procedure '{body.label}' created for device type '{body.device_type}'.",
    )


@router.get("/procedures/{procedure_id}")
def get_procedure(procedure_id: str):
    result = get_procedures_table().get_item(Key={"procedure_id": procedure_id})
    item = result.get("Item")
    if not item:
        raise HTTPException(status_code=404, detail="Procedure not found")
    return item


def _get_full_user(username: str) -> dict:
    """Look up full user details from mock_users.json or fall back to username only."""
    path = os.path.join(os.path.dirname(__file__), "..", "..", "mock_users.json")
    try:
        with open(path) as f:
            data = json.load(f)
        for u in data.get("users", []):
            if u["username"] == username:
                return u
    except Exception:
        pass
    return {"username": username, "fname": username, "lname": "", "email": "", "role": "worker"}


@router.post("/devices/{device_id}/complete", response_model=DeviceCompleteResponse)
def complete_device(
    device_id: str,
    current_user: dict = Depends(get_optional_user),
):
    table = get_devices_table()
    result = table.get_item(Key={"device_id": device_id})
    item = result.get("Item")
    if not item:
        raise HTTPException(status_code=404, detail="Device not found")

    # Fetch procedure for NIST method/technique labels
    proc_result = get_procedures_table().get_item(Key={"procedure_id": item["procedure_id"]})
    procedure = proc_result.get("Item", {})

    # Get full technician details (current_user is None if no token provided)
    user_info = _get_full_user(current_user["username"]) if current_user else {}
    now = datetime.now(timezone.utc).isoformat()

    VERIFICATION_METHODS = {
        "hdd_purge_v1":            "Visual inspection + reboot verification (no OS detected)",
        "sata_ssd_secure_erase_v1": "Tool completion report + reboot verification",
        "nvme_ssd_format_v1":      "Tool completion report + reboot verification",
        "tablet_factory_reset_v1": "Boot to setup wizard confirmation",
        "external_hdd_purge_v1":   "Visual inspection + reboot verification (no OS detected)",
        "external_ssd_purge_v1":   "Tool completion report + reboot verification",
        "no_storage_clear_v1":     "Power cycle + visual inspection",
    }

    # Build enriched device dict for PDF (not persisted — just for generation)
    cert_item = {
        **item,
        "nist_method":          procedure.get("nist_method", ""),
        "nist_technique":       procedure.get("nist_technique", ""),
        "procedure_label":      procedure.get("label", item["procedure_id"]),
        "verification_method":  VERIFICATION_METHODS.get(item["procedure_id"], "Visual inspection"),
        "tech_name":            f"{user_info.get('fname', '')} {user_info.get('lname', '')}".strip(),
        "tech_role":            user_info.get("role", "worker").title(),
        "tech_email":           user_info.get("email", ""),
        "tech_username":        user_info.get("username", ""),
        "completed_at":         now,
    }

    from ..pdf import generate_compliance_pdf
    pdf_url = generate_compliance_pdf(cert_item)

    table.update_item(
        Key={"device_id": device_id},
        UpdateExpression="SET #st = :status, comp_doc = :url, completed_by = :who, completed_at = :when",
        ExpressionAttributeNames={"#st": "status"},
        ExpressionAttributeValues={
            ":status": "documented",
            ":url":    pdf_url,
            ":who":    cert_item["tech_name"] or (current_user or {}).get("username", "unknown"),
            ":when":   now,
        },
    )

    return DeviceCompleteResponse(
        device_id=device_id,
        status="documented",
        comp_doc=pdf_url,
    )
