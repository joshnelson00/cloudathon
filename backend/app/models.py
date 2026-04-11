from typing import Optional
from pydantic import BaseModel


# ── Device intake ──────────────────────────────────────────────────────────────

class DeviceIntakeRequest(BaseModel):
    chassis_serial: str
    device_type: str   # laptop_hdd | laptop_ssd | tablet | drive_external | drive_external_ssd | no_storage
    chassis_make_model: str


class DeviceIntakeResponse(BaseModel):
    device_id: str
    procedure_id: str
    status: str


# ── Step completion ────────────────────────────────────────────────────────────

class StepCompleteRequest(BaseModel):
    step_id: str
    confirmed: bool
    notes: Optional[str] = ""


class StepCompleteResponse(BaseModel):
    device_id: str
    step_id: str
    status: str


# ── Device detail ──────────────────────────────────────────────────────────────

class StepLog(BaseModel):
    step_id: str
    confirmed: bool
    notes: str
    timestamp: str


class DeviceDetail(BaseModel):
    device_id: str
    chassis_serial: str
    device_type: str
    chassis_make_model: str
    intake_timestamp: str
    worker_id: str
    status: str
    procedure_id: str
    steps_completed: list[StepLog]
    compliance_doc_url: Optional[str] = None
    notes: Optional[str] = ""


# ── Complete device (trigger PDF) ─────────────────────────────────────────────

class DeviceCompleteResponse(BaseModel):
    device_id: str
    status: str
    compliance_doc_url: Optional[str] = None


# ── Dashboard ──────────────────────────────────────────────────────────────────

class DashboardResponse(BaseModel):
    total: int
    intake: int
    in_progress: int
    verified: int
    documented: int
    by_type: dict[str, int]


# ── Compliance record ──────────────────────────────────────────────────────────

class ComplianceResponse(BaseModel):
    device_id: str
    compliance_doc_url: str
    generated_at: Optional[str] = None
