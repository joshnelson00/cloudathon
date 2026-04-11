from typing import Optional
from pydantic import BaseModel


# ── User management ────────────────────────────────────────────────────────────

class UserCreateRequest(BaseModel):
    username: str
    password: str
    fname: str
    lname: str
    email: str
    role: list[str] = ["worker"]  # List of roles


class UserCreateResponse(BaseModel):
    user_id: str
    username: str
    fname: str
    lname: str
    email: str
    role: list[str]
    message: str


class UserDetail(BaseModel):
    user_id: str
    username: str
    fname: str
    lname: str
    email: str
    role: list[str]


# ── Device intake ──────────────────────────────────────────────────────────────

class DeviceIntakeRequest(BaseModel):
    chassis_serial: str
    device_type: str
    make_model: str


class DeviceIntakeResponse(BaseModel):
    device_id: str
    procedure_id: str
    status: str


# ── Step completion ────────────────────────────────────────────────────────────

class StepCompleteRequest(BaseModel):
    step_id: str
    confirmed: bool
    notes: Optional[str] = ""
    input_data: dict = {}


class StepCompleteResponse(BaseModel):
    device_id: str
    step_id: str
    status: str


# ── Device detail ──────────────────────────────────────────────────────────────

class ProcedureStep(BaseModel):
    id: str
    instruction: str
    requires_confirmation: bool


class Procedure(BaseModel):
    procedure_id: str
    device_type: str
    nist_method: str
    label: str
    steps: list[ProcedureStep]


class DeviceDetail(BaseModel):
    device_id: str
    chassis_serial: str
    device_type: str
    make_model: str
    intake_timestamp: str
    status: str
    procedure_id: str
    steps_completed: list = []
    wipe_result: Optional[bool] = None
    comp_doc: Optional[str] = None


# ── Complete device (trigger compliance document) ─────────────────────────────

class DeviceCompleteResponse(BaseModel):
    device_id: str
    status: str
    comp_doc: Optional[str] = None


# ── Dashboard ──────────────────────────────────────────────────────────────────

class DashboardResponse(BaseModel):
    total: int
    intake: int
    in_progress: int
    verified: int
    documented: int
    completed: int = 0
    by_type: dict[str, int]


# ── Compliance record ──────────────────────────────────────────────────────────

class ComplianceResponse(BaseModel):
    device_id: str
    comp_doc: str
    generated_at: Optional[str] = None
