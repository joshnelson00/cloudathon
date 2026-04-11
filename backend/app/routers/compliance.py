import os

from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse

from ..db import get_devices_table
from ..models import ComplianceResponse, DashboardResponse
from ..config import get_settings

settings = get_settings()
router = APIRouter()


@router.get("/compliance/{device_id}", response_model=ComplianceResponse)
def get_compliance(device_id: str):
    result = get_devices_table().get_item(Key={"device_id": device_id})
    item = result.get("Item")
    if not item:
        raise HTTPException(status_code=404, detail="Device not found")

    comp_doc = item.get("comp_doc")
    if not comp_doc:
        raise HTTPException(
            status_code=404,
            detail="Compliance document not yet generated. Complete all steps first.",
        )

    return ComplianceResponse(
        device_id=device_id,
        comp_doc=comp_doc,
        generated_at=item.get("intake_timestamp"),
    )


@router.get("/compliance/{device_id}/download")
def download_compliance_pdf(device_id: str):
    """Serve the PDF from local /tmp storage (used when S3 bucket is not configured)."""
    path = f"/tmp/{device_id}.pdf"
    if not os.path.exists(path):
        raise HTTPException(status_code=404, detail="PDF not found. Generate the certificate first.")
    return FileResponse(
        path,
        media_type="application/pdf",
        filename=f"compliance-{device_id}.pdf",
    )


@router.get("/dashboard", response_model=DashboardResponse)
def dashboard():
    result = get_devices_table().scan()
    items = result.get("Items", [])

    counts = {"intake": 0, "in_progress": 0, "verified": 0, "documented": 0}
    by_type: dict[str, int] = {}

    for item in items:
        status = item.get("status", "intake")
        if status in counts:
            counts[status] += 1

        dtype = item.get("device_type", "unknown")
        by_type[dtype] = by_type.get(dtype, 0) + 1

    return DashboardResponse(
        total=len(items),
        intake=counts["intake"],
        in_progress=counts["in_progress"],
        verified=counts["verified"],
        documented=counts["documented"],
        by_type=by_type,
    )
