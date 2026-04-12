from __future__ import annotations

from datetime import datetime, timezone, timedelta
import re
from typing import Any

from fastapi import APIRouter
from pydantic import BaseModel

from ..db import get_devices_table

router = APIRouter()


class AnalyticsQueryRequest(BaseModel):
    query: str


class AnalyticsQueryResponse(BaseModel):
    answer: str
    data: dict[str, Any]
    intent: str


def _scan_all_devices() -> list[dict[str, Any]]:
    table = get_devices_table()
    response = table.scan()
    return list(response.get("Items", []))


def _parse_dt(value: str | None) -> datetime | None:
    if not value:
        return None
    try:
        return datetime.fromisoformat(value.replace("Z", "+00:00"))
    except Exception:
        return None


def _start_of_week_utc(now: datetime) -> datetime:
    return now - timedelta(days=now.weekday(), hours=now.hour, minutes=now.minute, seconds=now.second, microseconds=now.microsecond)


def _intent_from_query(query: str) -> str:
    q = re.sub(r"\s+", " ", query.lower()).strip()
    if not q:
        return "total_devices"

    def has_any(*terms: str) -> bool:
        return any(term in q for term in terms)

    if has_any("documented without certificate", "documented without cert", "missing certificate"):
        return "documented_without_certificate"
    if has_any("completion rate", "completion %", "percent completed"):
        return "completion_rate"
    if has_any("wipe pass rate", "pass rate") and has_any("wipe", "verification"):
        return "wipe_pass_rate"
    if has_any("status breakdown", "by status", "statuses"):
        return "status_breakdown"
    if has_any("type breakdown", "by type", "device types", "breakdown by device type"):
        return "device_type_breakdown"
    if has_any("top models", "top model", "most common model", "make model"):
        return "top_make_models"
    if has_any("stale in progress", "older than") and has_any("in progress", "in_progress"):
        return "stale_in_progress"
    if "laptop" in q and "fail" in q and "week" in q:
        return "laptops_failed_this_week"
    if has_any("processed", "completed", "documented") and "week" in q:
        return "processed_this_week"
    if "processed" in q and "today" in q:
        return "processed_today"
    if "laptop" in q and "desktop" in q:
        return "laptops_vs_desktops"
    if "in progress" in q or "still in progress" in q:
        return "in_progress"
    if "fail" in q and "wipe" in q:
        return "failed_wipes"
    if has_any("how many laptops", "count laptops"):
        return "count_laptops"
    if has_any("how many desktops", "count desktops"):
        return "count_desktops"
    if has_any("how many tablets", "count tablets"):
        return "count_tablets"
    if has_any("how many external", "count external drives", "count external"):
        return "count_external_drives"
    return "total_devices"


def _compute(intent: str, devices: list[dict[str, Any]]) -> tuple[str, dict[str, Any]]:
    now = datetime.now(timezone.utc)
    start_week = _start_of_week_utc(now)
    stale_cutoff = now - timedelta(days=7)
    today = now.date()

    if intent == "laptops_failed_this_week":
        count = 0
        for d in devices:
            dtype = str(d.get("device_type", "")).lower()
            wipe_result = d.get("wipe_result")
            ts = _parse_dt(d.get("intake_timestamp"))
            if "laptop" in dtype and wipe_result is False and ts and ts >= start_week:
                count += 1
        return (
            f"{count} laptops failed wipe verification this week.",
            {"count": count, "time_window": "this_week", "device_group": "laptop", "wipe_result": False},
        )

    if intent == "processed_today":
        count = 0
        for d in devices:
            completed_at = _parse_dt(d.get("completed_at"))
            intake_at = _parse_dt(d.get("intake_timestamp"))
            is_done = str(d.get("status", "")).lower() in {"documented", "completed"}
            is_processed_today = (completed_at and completed_at.date() == today) or (
                is_done and intake_at and intake_at.date() == today
            )
            if is_processed_today:
                count += 1
        return (
            f"{count} devices were processed today.",
            {"count": count, "time_window": "today"},
        )

    if intent == "processed_this_week":
        count = 0
        for d in devices:
            completed_at = _parse_dt(d.get("completed_at"))
            intake_at = _parse_dt(d.get("intake_timestamp"))
            is_done = str(d.get("status", "")).lower() in {"documented", "completed"}
            is_processed_this_week = (completed_at and completed_at >= start_week) or (
                is_done and intake_at and intake_at >= start_week
            )
            if is_processed_this_week:
                count += 1
        return (
            f"{count} devices were processed this week.",
            {"count": count, "time_window": "this_week"},
        )

    if intent == "laptops_vs_desktops":
        laptops = 0
        desktops = 0
        for d in devices:
            dtype = str(d.get("device_type", "")).lower()
            if "laptop" in dtype:
                laptops += 1
            if "desktop" in dtype:
                desktops += 1
        return (
            f"Laptops: {laptops}. Desktops: {desktops}.",
            {"laptops": laptops, "desktops": desktops},
        )

    if intent == "in_progress":
        statuses = {"intake", "in_progress", "verified"}
        count = sum(1 for d in devices if str(d.get("status", "")).lower() in statuses)
        return (
            f"{count} devices are still in progress.",
            {"count": count, "statuses": sorted(statuses)},
        )

    if intent == "stale_in_progress":
        statuses = {"intake", "in_progress", "verified"}
        count = 0
        for d in devices:
            status = str(d.get("status", "")).lower()
            intake_at = _parse_dt(d.get("intake_timestamp"))
            if status in statuses and intake_at and intake_at < stale_cutoff:
                count += 1
        return (
            f"{count} in-progress devices are older than 7 days.",
            {"count": count, "older_than_days": 7, "statuses": sorted(statuses)},
        )

    if intent == "failed_wipes":
        failed = [d for d in devices if d.get("wipe_result") is False]
        return (
            f"{len(failed)} devices currently show failed wipe results.",
            {"count": len(failed)},
        )

    if intent == "completion_rate":
        total = len(devices)
        documented = sum(1 for d in devices if str(d.get("status", "")).lower() in {"documented", "completed"})
        rate = round((documented / total) * 100, 1) if total else 0.0
        return (
            f"Completion rate is {rate}% ({documented}/{total} devices).",
            {"completion_rate_pct": rate, "documented": documented, "total": total},
        )

    if intent == "wipe_pass_rate":
        wipe_pass = sum(1 for d in devices if d.get("wipe_result") is True)
        wipe_fail = sum(1 for d in devices if d.get("wipe_result") is False)
        total_wipe = wipe_pass + wipe_fail
        rate = round((wipe_pass / total_wipe) * 100, 1) if total_wipe else None
        rate_text = f"{rate}%" if rate is not None else "N/A"
        return (
            f"Wipe pass rate is {rate_text} ({wipe_pass} pass / {wipe_fail} fail).",
            {"wipe_pass_rate_pct": rate, "wipe_pass": wipe_pass, "wipe_fail": wipe_fail},
        )

    if intent == "device_type_breakdown":
        by_type: dict[str, int] = {}
        for d in devices:
            dtype = str(d.get("device_type", "unknown"))
            by_type[dtype] = by_type.get(dtype, 0) + 1
        return (
            "Device type breakdown generated.",
            {"by_type": dict(sorted(by_type.items(), key=lambda kv: kv[0]))},
        )

    if intent == "status_breakdown":
        by_status: dict[str, int] = {}
        for d in devices:
            status = str(d.get("status", "unknown")).lower() or "unknown"
            by_status[status] = by_status.get(status, 0) + 1
        return (
            "Status breakdown generated.",
            {"by_status": dict(sorted(by_status.items(), key=lambda kv: kv[0]))},
        )

    if intent == "top_make_models":
        by_model: dict[str, int] = {}
        for d in devices:
            model = str(d.get("make_model", "unknown")).strip() or "unknown"
            by_model[model] = by_model.get(model, 0) + 1
        top_models = sorted(by_model.items(), key=lambda kv: kv[1], reverse=True)[:5]
        return (
            "Top make/model values generated.",
            {"top_make_models": [{"make_model": k, "count": v} for k, v in top_models]},
        )

    if intent == "documented_without_certificate":
        count = sum(
            1
            for d in devices
            if str(d.get("status", "")).lower() in {"documented", "completed"} and not d.get("comp_doc")
        )
        return (
            f"{count} documented devices are missing certificate links.",
            {"count": count},
        )

    if intent == "count_laptops":
        count = sum(1 for d in devices if "laptop" in str(d.get("device_type", "")).lower())
        return (f"There are {count} laptops in the system.", {"count": count, "device_group": "laptop"})

    if intent == "count_desktops":
        count = sum(1 for d in devices if "desktop" in str(d.get("device_type", "")).lower())
        return (f"There are {count} desktops in the system.", {"count": count, "device_group": "desktop"})

    if intent == "count_tablets":
        count = sum(1 for d in devices if "tablet" in str(d.get("device_type", "")).lower())
        return (f"There are {count} tablets in the system.", {"count": count, "device_group": "tablet"})

    if intent == "count_external_drives":
        count = sum(1 for d in devices if "drive_external" in str(d.get("device_type", "")).lower())
        return (f"There are {count} external drives in the system.", {"count": count, "device_group": "external_drive"})

    count = len(devices)
    return (f"There are {count} devices in the system.", {"count": count})


@router.post("/analytics/query", response_model=AnalyticsQueryResponse)
def analytics_query(body: AnalyticsQueryRequest):
    query = body.query.strip()
    intent = _intent_from_query(query)

    devices = _scan_all_devices()
    answer, data = _compute(intent, devices)
    return AnalyticsQueryResponse(
        answer=answer,
        data=data,
        intent=intent,
    )
