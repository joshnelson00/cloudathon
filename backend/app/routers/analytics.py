from __future__ import annotations

from datetime import datetime, timezone, timedelta
import time
from typing import Any

import boto3
from fastapi import APIRouter
from pydantic import BaseModel

from ..config import get_settings
from ..db import get_devices_table

router = APIRouter()
settings = get_settings()


class AnalyticsQueryRequest(BaseModel):
    query: str


class AnalyticsQueryResponse(BaseModel):
    answer: str
    data: dict[str, Any]
    mode: str
    intent: str
    generated_sql: str | None = None


def _scan_all_devices() -> list[dict[str, Any]]:
    table = get_devices_table()
    response = table.scan()
    items = list(response.get("Items", []))

    while "LastEvaluatedKey" in response:
        response = table.scan(ExclusiveStartKey=response["LastEvaluatedKey"])
        items.extend(response.get("Items", []))

    return items


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
    q = query.lower()
    if "laptop" in q and "fail" in q and "week" in q:
        return "laptops_failed_this_week"
    if "processed" in q and "today" in q:
        return "processed_today"
    if "laptop" in q and "desktop" in q:
        return "laptops_vs_desktops"
    if "in progress" in q or "still in progress" in q:
        return "in_progress"
    if "fail" in q and "wipe" in q:
        return "failed_wipes"
    return "total_devices"


def _compute_backend(intent: str, devices: list[dict[str, Any]]) -> tuple[str, dict[str, Any]]:
    now = datetime.now(timezone.utc)
    start_week = _start_of_week_utc(now)
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

    if intent == "failed_wipes":
        failed = [d for d in devices if d.get("wipe_result") is False]
        return (
            f"{len(failed)} devices currently show failed wipe results.",
            {"count": len(failed)},
        )

    count = len(devices)
    return (f"There are {count} devices in the system.", {"count": count})


def _intent_to_athena_sql(intent: str, database: str, table: str) -> str | None:
    if not database or not table:
        return None

    if intent == "laptops_failed_this_week":
        return (
            f"SELECT COUNT(*) AS c FROM {database}.{table} "
            "WHERE lower(device_type) LIKE '%laptop%' AND wipe_result = false "
            "AND from_iso8601_timestamp(intake_timestamp) >= date_trunc('week', current_timestamp)"
        )

    if intent == "processed_today":
        return (
            f"SELECT COUNT(*) AS c FROM {database}.{table} "
            "WHERE date(from_iso8601_timestamp(intake_timestamp)) = current_date"
        )

    if intent == "laptops_vs_desktops":
        return (
            f"SELECT "
            "SUM(CASE WHEN lower(device_type) LIKE '%laptop%' THEN 1 ELSE 0 END) AS laptops, "
            "SUM(CASE WHEN lower(device_type) LIKE '%desktop%' THEN 1 ELSE 0 END) AS desktops "
            f"FROM {database}.{table}"
        )

    if intent == "in_progress":
        return (
            f"SELECT COUNT(*) AS c FROM {database}.{table} "
            "WHERE lower(status) IN ('intake','in_progress','verified')"
        )

    if intent == "failed_wipes":
        return f"SELECT COUNT(*) AS c FROM {database}.{table} WHERE wipe_result = false"

    return f"SELECT COUNT(*) AS c FROM {database}.{table}"


def _query_athena(sql: str) -> dict[str, Any]:
    client = boto3.client("athena", region_name=settings.aws_region)
    start = client.start_query_execution(
        QueryString=sql,
        WorkGroup=settings.athena_workgroup,
        ResultConfiguration={"OutputLocation": settings.athena_output_s3},
    )
    qid = start["QueryExecutionId"]

    for _ in range(40):
        status = client.get_query_execution(QueryExecutionId=qid)["QueryExecution"]["Status"]["State"]
        if status in {"SUCCEEDED", "FAILED", "CANCELLED"}:
            break
        time.sleep(0.5)
    else:
        return {"ok": False, "error": "Athena query timed out"}

    if status != "SUCCEEDED":
        return {"ok": False, "error": f"Athena query {status.lower()}"}

    rows = client.get_query_results(QueryExecutionId=qid).get("ResultSet", {}).get("Rows", [])
    if len(rows) < 2:
        return {"ok": False, "error": "Athena returned no data"}

    header = [c.get("VarCharValue", "") for c in rows[0].get("Data", [])]
    values = [c.get("VarCharValue", "") for c in rows[1].get("Data", [])]
    parsed: dict[str, Any] = {}
    for k, v in zip(header, values):
        if v.isdigit():
            parsed[k] = int(v)
        else:
            parsed[k] = v

    return {"ok": True, "data": parsed}


@router.post("/analytics/query", response_model=AnalyticsQueryResponse)
def analytics_query(body: AnalyticsQueryRequest):
    query = body.query.strip()
    intent = _intent_from_query(query)

    if settings.athena_enabled and settings.analytics_mode == "athena":
        sql = _intent_to_athena_sql(intent, settings.athena_database, settings.athena_table)
        if sql and settings.athena_workgroup and settings.athena_output_s3:
            result = _query_athena(sql)
            if result.get("ok"):
                data = result["data"]
                if "laptops" in data and "desktops" in data:
                    answer = f"Laptops: {data['laptops']}. Desktops: {data['desktops']}."
                else:
                    count = int(data.get("c", 0))
                    answer = f"Query result count: {count}."
                return AnalyticsQueryResponse(
                    answer=answer,
                    data=data,
                    mode="athena",
                    intent=intent,
                    generated_sql=sql,
                )

    devices = _scan_all_devices()
    answer, data = _compute_backend(intent, devices)
    return AnalyticsQueryResponse(
        answer=answer,
        data=data,
        mode="backend-filter",
        intent=intent,
        generated_sql=None,
    )
