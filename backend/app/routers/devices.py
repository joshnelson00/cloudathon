import uuid
from datetime import datetime, timezone

from boto3.dynamodb.conditions import Attr
from fastapi import APIRouter, Depends, HTTPException

from ..auth import get_current_user
from ..db import get_devices_table, get_procedures_table
from ..models import (
    DeviceCompleteResponse,
    DeviceDetail,
    DeviceIntakeRequest,
    DeviceIntakeResponse,
    StepCompleteRequest,
    StepCompleteResponse,
    StepLog,
)

router = APIRouter()

DEVICE_TYPE_TO_PROCEDURE = {
    "laptop_hdd":          "hdd_purge_v1",
    "laptop_ssd":          "ssd_secure_erase_v1",
    "desktop_hdd":         "hdd_purge_v1",
    "desktop_ssd":         "ssd_secure_erase_v1",
    "tablet":              "tablet_factory_reset_v1",
    "drive_external":      "hdd_purge_v1",
    "drive_external_hdd":  "hdd_purge_v1",
    "drive_external_ssd":  "ssd_secure_erase_v1",
    "no_storage":          "no_storage_clear_v1",
}


@router.post("/devices", response_model=DeviceIntakeResponse)
def intake_device(
    body: DeviceIntakeRequest,
    user: dict = Depends(get_current_user),
):
    procedure_id = DEVICE_TYPE_TO_PROCEDURE.get(body.device_type)
    if not procedure_id:
        raise HTTPException(
            status_code=400,
            detail=f"Unknown device type '{body.device_type}'. "
                   f"Valid types: {list(DEVICE_TYPE_TO_PROCEDURE.keys())}",
        )

    device_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()

    item = {
        "device_id":         device_id,
        "chassis_serial":    body.chassis_serial,
        "device_type":       body.device_type,
        "chassis_make_model": body.chassis_make_model,
        "intake_timestamp":  now,
        "worker_id":         user["username"],
        "status":            "intake",
        "procedure_id":      procedure_id,
        "steps_completed":   [],
        "compliance_doc_url": None,
        "notes":             "",
    }

    get_devices_table().put_item(Item=item)

    return DeviceIntakeResponse(
        device_id=device_id,
        procedure_id=procedure_id,
        status="intake",
    )


@router.get("/devices")
def list_devices(user: dict = Depends(get_current_user)):
    result = get_devices_table().scan()
    items = result.get("Items", [])
    # Sort newest first
    items.sort(key=lambda x: x.get("intake_timestamp", ""), reverse=True)
    return {"devices": items}


@router.get("/devices/{device_id}", response_model=DeviceDetail)
def get_device(device_id: str, user: dict = Depends(get_current_user)):
    result = get_devices_table().get_item(Key={"device_id": device_id})
    item = result.get("Item")
    if not item:
        raise HTTPException(status_code=404, detail="Device not found")

    steps = [StepLog(**s) for s in item.get("steps_completed", [])]

    return DeviceDetail(
        device_id=item["device_id"],
        chassis_serial=item["chassis_serial"],
        device_type=item["device_type"],
        chassis_make_model=item["chassis_make_model"],
        intake_timestamp=item["intake_timestamp"],
        worker_id=item["worker_id"],
        status=item["status"],
        procedure_id=item["procedure_id"],
        steps_completed=steps,
        compliance_doc_url=item.get("compliance_doc_url"),
        notes=item.get("notes", ""),
    )


@router.patch("/devices/{device_id}/step", response_model=StepCompleteResponse)
def complete_step(
    device_id: str,
    body: StepCompleteRequest,
    user: dict = Depends(get_current_user),
):
    table = get_devices_table()
    result = table.get_item(Key={"device_id": device_id})
    item = result.get("Item")
    if not item:
        raise HTTPException(status_code=404, detail="Device not found")

    now = datetime.now(timezone.utc).isoformat()
    step_log = {
        "step_id":   body.step_id,
        "confirmed": body.confirmed,
        "notes":     body.notes or "",
        "timestamp": now,
    }

    steps = list(item.get("steps_completed", []))
    # Replace existing entry for this step_id if present
    steps = [s for s in steps if s["step_id"] != body.step_id]
    steps.append(step_log)

    table.update_item(
        Key={"device_id": device_id},
        UpdateExpression="SET steps_completed = :s, #st = :status",
        ExpressionAttributeNames={"#st": "status"},
        ExpressionAttributeValues={
            ":s":      steps,
            ":status": "in_progress",
        },
    )

    return StepCompleteResponse(
        device_id=device_id,
        step_id=body.step_id,
        status="in_progress",
    )


@router.get("/procedures/{procedure_id}")
def get_procedure(procedure_id: str, user: dict = Depends(get_current_user)):
    result = get_procedures_table().get_item(Key={"procedure_id": procedure_id})
    item = result.get("Item")
    if not item:
        raise HTTPException(status_code=404, detail="Procedure not found")
    return item


@router.post("/devices/{device_id}/complete", response_model=DeviceCompleteResponse)
def complete_device(
    device_id: str,
    user: dict = Depends(get_current_user),
):
    table = get_devices_table()
    result = table.get_item(Key={"device_id": device_id})
    item = result.get("Item")
    if not item:
        raise HTTPException(status_code=404, detail="Device not found")

    # Generate the compliance PDF inline (no Lambda yet — works for demo)
    from ..pdf import generate_compliance_pdf
    pdf_url = generate_compliance_pdf(item)

    table.update_item(
        Key={"device_id": device_id},
        UpdateExpression="SET #st = :status, compliance_doc_url = :url",
        ExpressionAttributeNames={"#st": "status"},
        ExpressionAttributeValues={
            ":status": "documented",
            ":url":    pdf_url,
        },
    )

    return DeviceCompleteResponse(
        device_id=device_id,
        status="documented",
        compliance_doc_url=pdf_url,
    )
