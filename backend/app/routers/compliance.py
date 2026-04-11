import os
from datetime import datetime, timezone
from urllib.parse import urlparse

from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import FileResponse
from fastapi.responses import RedirectResponse

from ..db import get_s3
from ..db import get_devices_table
from ..models import ComplianceResponse, DashboardResponse
from ..config import get_settings

settings = get_settings()
router = APIRouter()


def _canonical_download_path(device_id: str) -> str:
    return f"/api/compliance/{device_id}/download"


def _default_s3_key(device_id: str) -> str:
    return f"compliance-docs/{device_id}.pdf"


def _extract_s3_key(comp_doc: str | None, device_id: str) -> str:
    if not comp_doc:
        return _default_s3_key(device_id)

    if comp_doc.startswith("s3://"):
        without_scheme = comp_doc[5:]
        key = without_scheme.split("/", 1)[1] if "/" in without_scheme else ""
        return key or _default_s3_key(device_id)

    if comp_doc.startswith("http://") or comp_doc.startswith("https://"):
        parsed = urlparse(comp_doc)
        path = parsed.path.lstrip("/")
        if not path:
            return _default_s3_key(device_id)

        # Path-style URL: https://s3.amazonaws.com/<bucket>/<key>
        if parsed.netloc.startswith("s3.") or parsed.netloc == "s3.amazonaws.com":
            bucket = settings.s3_compliance_bucket
            if bucket and path.startswith(f"{bucket}/"):
                return path[len(bucket) + 1 :]

        # Virtual-host style URL: https://<bucket>.s3.amazonaws.com/<key>
        return path

    if comp_doc.startswith("/api/compliance/"):
        return _default_s3_key(device_id)

    if comp_doc.endswith(".pdf") and "/" in comp_doc:
        return comp_doc.lstrip("/")

    return _default_s3_key(device_id)


def _s3_object_exists(bucket: str, key: str) -> bool:
    try:
        get_s3().head_object(Bucket=bucket, Key=key)
        return True
    except Exception:
        return False


@router.get("/compliance/{device_id}", response_model=ComplianceResponse)
def get_compliance(device_id: str):
    result = get_devices_table().get_item(Key={"device_id": device_id})
    item = result.get("Item")
    if not item:
        raise HTTPException(status_code=404, detail="Device not found")

    comp_doc = item.get("comp_doc")
    if settings.s3_compliance_bucket:
        bucket = settings.s3_compliance_bucket
        s3_key = _extract_s3_key(comp_doc, device_id)
        fallback_key = _default_s3_key(device_id)
        has_s3_object = _s3_object_exists(bucket, s3_key) or _s3_object_exists(bucket, fallback_key)
        if not has_s3_object:
            raise HTTPException(
                status_code=404,
                detail="Compliance document not yet generated. Complete all steps first.",
            )
        comp_doc = _canonical_download_path(device_id)
    elif not comp_doc:
        raise HTTPException(
            status_code=404,
            detail="Compliance document not yet generated. Complete all steps first.",
        )

    return ComplianceResponse(
        device_id=device_id,
        comp_doc=comp_doc,
        generated_at=item.get("completed_at") or item.get("intake_timestamp"),
    )


@router.get("/compliance/{device_id}/download")
def download_compliance_pdf(device_id: str):
    """Serve PDF using local file fallback or a fresh S3 presigned URL."""
    item = get_devices_table().get_item(Key={"device_id": device_id}).get("Item")
    if not item:
        raise HTTPException(status_code=404, detail="Device not found")

    if settings.s3_compliance_bucket:
        bucket = settings.s3_compliance_bucket
        stored_doc = item.get("comp_doc")
        primary_key = _extract_s3_key(stored_doc, device_id)
        fallback_key = _default_s3_key(device_id)
        for key in [primary_key, fallback_key]:
            if key and _s3_object_exists(bucket, key):
                url = get_s3().generate_presigned_url(
                    "get_object",
                    Params={"Bucket": bucket, "Key": key},
                    ExpiresIn=86400,
                )
                return RedirectResponse(url=url, status_code=307)

        raise HTTPException(status_code=404, detail="PDF not found. Generate the certificate first.")

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
        completed=counts["documented"],
        by_type=by_type,
    )


@router.get("/audit")
def audit_log(limit: int = Query(default=50, le=200)):
    """
    Returns a chronological activity log of all step completions across every device.
    Each entry shows who did what, on which device, and when.
    Supports Operational Excellence — full audit trail for compliance reviews.
    """
    result = get_devices_table().scan()
    items = result.get("Items", [])

    events = []
    for device in items:
        for step in device.get("steps_completed", []):
            events.append({
                "timestamp":      step.get("timestamp", ""),
                "device_id":      device.get("device_id", ""),
                "chassis_serial": device.get("chassis_serial", ""),
                "device_type":    device.get("device_type", ""),
                "step_id":        step.get("step_id", ""),
                "confirmed":      step.get("confirmed", False),
                "notes":          step.get("notes", ""),
            })

    events.sort(key=lambda x: x["timestamp"], reverse=True)
    return {"total": len(events), "events": events[:limit]}


@router.get("/stats")
def stats():
    """
    Returns operational statistics across all devices.
    Feeds performance and reliability metrics for the dashboard.
    """
    result = get_devices_table().scan()
    items = result.get("Items", [])

    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")

    processed_today = 0
    total_steps = 0
    wipe_pass = 0
    wipe_fail = 0
    device_type_counts: dict[str, int] = {}

    for item in items:
        # Devices completed today
        completed_at = item.get("completed_at", "")
        if completed_at and completed_at.startswith(today):
            processed_today += 1

        # Step counts
        steps = item.get("steps_completed", [])
        total_steps += len(steps)

        # Wipe pass/fail
        wipe_result = item.get("wipe_result")
        if wipe_result is True:
            wipe_pass += 1
        elif wipe_result is False:
            wipe_fail += 1

        # Device type breakdown
        dtype = item.get("device_type", "unknown")
        device_type_counts[dtype] = device_type_counts.get(dtype, 0) + 1

    total = len(items)
    documented = sum(1 for i in items if i.get("status") == "documented")
    completion_rate = round((documented / total * 100), 1) if total > 0 else 0
    wipe_total = wipe_pass + wipe_fail
    pass_rate = round((wipe_pass / wipe_total * 100), 1) if wipe_total > 0 else None

    return {
        "total_devices":      total,
        "processed_today":    processed_today,
        "completion_rate_pct": completion_rate,
        "wipe_pass_rate_pct": pass_rate,
        "wipe_pass":          wipe_pass,
        "wipe_fail":          wipe_fail,
        "total_steps_logged": total_steps,
        "by_device_type":     device_type_counts,
    }
