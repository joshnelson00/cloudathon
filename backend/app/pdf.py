"""
Generates a NIST SP 800-88 Rev. 2 Certificate of Sanitization and uploads
it to S3. Returns the S3 pre-signed URL (or a local download path when S3
is not configured).

Required certificate fields per NIST SP 800-88r2 §4.6:
  - Media manufacturer, model, serial, type, capacity
  - Sanitization method and technique
  - Software/tool name and version
  - Verification method
  - Technician name, title, date, location, contact, signature
"""
import io
import json
import logging
import os
from datetime import datetime, timezone
from decimal import Decimal

from reportlab.lib.pagesizes import LETTER
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable
)

from .config import get_settings
from .db import get_s3

settings = get_settings()

# ── Label maps ────────────────────────────────────────────────────────────────

DEVICE_TYPE_LABELS = {
    "laptop_hdd":         "Laptop — Internal HDD (Spinning Disk)",
    "laptop_ssd":         "Laptop — Internal SSD (Flash Storage)",
    "laptop_ssd_sata":    "Laptop — Internal SATA SSD",
    "laptop_ssd_nvme":    "Laptop — Internal NVMe SSD (M.2)",
    "desktop_hdd":        "Desktop — Internal HDD (Spinning Disk)",
    "desktop_ssd":        "Desktop — Internal SSD (Flash Storage)",
    "tablet":             "Tablet / Mobile Device — Integrated Flash Storage",
    "drive_external":     "External Storage Drive",
    "drive_external_hdd": "External HDD (Spinning Disk)",
    "drive_external_ssd": "External SSD (Flash Storage)",
    "no_storage":         "Device — No Usable Storage",
}

MEDIA_SOURCE_LABELS = {
    "laptop_hdd":         "Internal",
    "laptop_ssd":         "Internal",
    "laptop_ssd_sata":    "Internal",
    "laptop_ssd_nvme":    "Internal",
    "desktop_hdd":        "Internal",
    "desktop_ssd":        "Internal",
    "tablet":             "Integrated",
    "drive_external":     "External / Removable",
    "drive_external_hdd": "External / Removable",
    "drive_external_ssd": "External / Removable",
    "no_storage":         "N/A",
}

# ── Helpers ───────────────────────────────────────────────────────────────────

DARK  = colors.HexColor("#0f172a")
BLUE  = colors.HexColor("#1e40af")
LIGHT = colors.HexColor("#f1f5f9")
MID   = colors.HexColor("#e2e8f0")
WHITE = colors.white


def _table(data, col_widths, header_bg=DARK):
    t = Table(data, colWidths=col_widths)
    t.setStyle(TableStyle([
        ("BACKGROUND",    (0, 0), (-1, 0), header_bg),
        ("TEXTCOLOR",     (0, 0), (-1, 0), WHITE),
        ("FONTNAME",      (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE",      (0, 0), (-1, 0), 9),
        ("ROWBACKGROUNDS",(0, 1), (-1, -1), [WHITE, LIGHT]),
        ("FONTNAME",      (0, 1), (0, -1), "Helvetica-Bold"),
        ("FONTSIZE",      (0, 1), (-1, -1), 9),
        ("GRID",          (0, 0), (-1, -1), 0.4, MID),
        ("TOPPADDING",    (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ("LEFTPADDING",   (0, 0), (-1, -1), 8),
    ]))
    return t


def _kv(rows, col_widths=(2.2 * inch, 4.3 * inch)):
    """Two-column key/value table (no header row)."""
    t = Table(rows, colWidths=col_widths)
    t.setStyle(TableStyle([
        ("FONTNAME",      (0, 0), (0, -1), "Helvetica-Bold"),
        ("FONTSIZE",      (0, 0), (-1, -1), 9),
        ("ROWBACKGROUNDS",(0, 0), (-1, -1), [WHITE, LIGHT]),
        ("GRID",          (0, 0), (-1, -1), 0.4, MID),
        ("TOPPADDING",    (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ("LEFTPADDING",   (0, 0), (-1, -1), 8),
    ]))
    return t


def _fmt_ts(ts: str) -> str:
    if not ts:
        return "—"
    try:
        dt = datetime.fromisoformat(ts.replace("Z", "+00:00"))
        return dt.strftime("%B %d, %Y at %H:%M UTC")
    except Exception:
        return ts[:19].replace("T", " ") + " UTC"


# ── PDF builder ───────────────────────────────────────────────────────────────

def _build_pdf_bytes(device: dict) -> bytes:
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=LETTER,
        rightMargin=0.9 * inch,
        leftMargin=0.9 * inch,
        topMargin=0.9 * inch,
        bottomMargin=0.9 * inch,
    )

    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        "DocTitle", parent=styles["Heading1"],
        fontSize=20, spaceAfter=2, textColor=DARK,
    )
    subtitle_style = ParagraphStyle(
        "Subtitle", parent=styles["Normal"],
        fontSize=10, textColor=colors.HexColor("#475569"), spaceAfter=2,
    )
    section_style = ParagraphStyle(
        "Section", parent=styles["Heading2"],
        fontSize=11, spaceBefore=14, spaceAfter=4,
        textColor=BLUE, fontName="Helvetica-Bold",
    )
    body_style   = styles["Normal"]
    small_style  = ParagraphStyle("Small", parent=styles["Normal"], fontSize=8,
                                   textColor=colors.HexColor("#64748b"))

    generated_at = datetime.now(timezone.utc).strftime("%B %d, %Y at %H:%M UTC")
    device_type  = device.get("device_type", "")

    OS_LABELS = {
        "windows":     "Windows",
        "linux":       "Linux",
        "macos_apple": "macOS — Apple Silicon",
        "macos_intel": "macOS — Intel",
    }
    os_str = OS_LABELS.get(device.get("os", ""), device.get("os", "") or "—")

    story = []

    # ── Header ────────────────────────────────────────────────────────────────
    story.append(Paragraph("CityServe Arizona", title_style))
    story.append(Paragraph(
        "Certificate of Data Sanitization  |  NIST SP 800-88 Rev. 2",
        subtitle_style,
    ))
    story.append(Paragraph(f"Generated: {generated_at}", small_style))
    story.append(Spacer(1, 0.1 * inch))
    story.append(HRFlowable(width="100%", thickness=2, color=BLUE, spaceAfter=10))

    # ── Section 1: Device Information ────────────────────────────────────────
    story.append(Paragraph("1 · Device Information", section_style))
    story.append(_kv([
        ["Tracking ID",    device.get("device_id", "—")],
        ["Chassis Serial", device.get("chassis_serial", "—")],
        ["Make / Model",   device.get("make_model", "—")],
        ["Device Type",    DEVICE_TYPE_LABELS.get(device_type, device_type or "—")],
        ["Intake Date",    _fmt_ts(device.get("intake_timestamp", ""))],
    ]))

    # ── Section 2: Media Information ─────────────────────────────────────────
    story.append(Paragraph("2 · Media Information", section_style))
    cap = device.get("drive_capacity_gb")
    cap_str = f"{cap} GB" if cap else "—"
    story.append(_kv([
        ["Manufacturer",       device.get("drive_manufacturer", "—")],
        ["Model",              device.get("drive_model", "—")],
        ["Serial Number",      device.get("drive_serial", "—")],
        ["Capacity",           cap_str],
        ["Media Source",       MEDIA_SOURCE_LABELS.get(device_type, "—")],
        ["Media Type",         DEVICE_TYPE_LABELS.get(device_type, device_type or "—")],
    ]))

    # ── Section 3: Sanitization Details ──────────────────────────────────────
    story.append(Paragraph("3 · Sanitization Details", section_style))
    wipe_result_raw = device.get("wipe_result")
    if wipe_result_raw is True:
        wipe_str = "PASS"
    elif wipe_result_raw is False:
        wipe_str = "FAIL"
    else:
        wipe_str = "—"

    tool_name    = device.get("wipe_tool_name", "—")
    tool_version = device.get("wipe_tool_version", "")
    tool_str     = f"{tool_name} {tool_version}".strip() if tool_version else tool_name

    story.append(_kv([
        ["NIST Method",         device.get("nist_method", "—")],
        ["NIST Technique",      device.get("nist_technique", "—")],
        ["Procedure",           device.get("procedure_label", device.get("procedure_id", "—"))],
        ["Sanitization Tool",   tool_str],
        ["Verification Method", device.get("verification_method", "—")],
        ["Result",              wipe_str],
    ]))

    # ── Section 4: Technician Information ────────────────────────────────────
    story.append(Paragraph("4 · Technician Information", section_style))
    story.append(_kv([
        ["Name",             device.get("tech_name", "—")],
        ["Title / Role",     device.get("tech_role", "—")],
        ["Contact (Email)",  device.get("tech_email", "—")],
        ["Date",             _fmt_ts(device.get("completed_at", ""))],
        ["Location",         "Phoenix, AZ — CityServe Arizona"],
    ]))

    # Signature block
    story.append(Spacer(1, 0.25 * inch))
    sig_data = [
        ["Technician Signature", "Verified By (Supervisor)"],
        [" \n\n" + "_" * 38, " \n\n" + "_" * 38],
        [device.get("tech_name", ""), ""],
    ]
    sig_table = Table(sig_data, colWidths=[3.1 * inch, 3.1 * inch])
    sig_table.setStyle(TableStyle([
        ("FONTNAME",      (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE",      (0, 0), (-1, -1), 9),
        ("TOPPADDING",    (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ("LEFTPADDING",   (0, 0), (-1, -1), 0),
        ("TEXTCOLOR",     (0, 0), (-1, 0), colors.HexColor("#475569")),
    ]))
    story.append(sig_table)

    # ── Section 5: Steps Completed ───────────────────────────────────────────
    steps = device.get("steps_completed", [])
    story.append(Paragraph("5 · Sanitization Steps Completed", section_style))

    if steps:
        step_data = [["#", "Step ID", "Result", "Timestamp"]]
        for i, step in enumerate(steps, 1):
            step_data.append([
                str(i),
                step.get("step_id", ""),
                "Confirmed" if step.get("confirmed") else "Skipped",
                step.get("timestamp", "")[:19].replace("T", " ") + " UTC",
            ])
        story.append(_table(
            step_data,
            col_widths=[0.3 * inch, 2.0 * inch, 1.0 * inch, 3.2 * inch],
        ))
    else:
        story.append(Paragraph("No steps recorded.", body_style))

    # ── Footer / Certification Statement ─────────────────────────────────────
    story.append(Spacer(1, 0.25 * inch))
    story.append(HRFlowable(width="100%", thickness=1, color=MID))
    story.append(Spacer(1, 0.1 * inch))
    story.append(Paragraph(
        "This document certifies that the device identified above was sanitized in accordance with "
        "<b>NIST SP 800-88 Rev. 2 — Guidelines for Media Sanitization</b>. All procedural steps "
        "were completed, timestamped, and recorded by the CityServe device management system. "
        "Retain this certificate for a minimum of three (3) years for audit and compliance purposes.",
        body_style,
    ))
    story.append(Spacer(1, 0.06 * inch))
    story.append(Paragraph(
        f"Document ID: {device.get('device_id', 'N/A')}  |  Issued: {generated_at}  |  "
        "Standard: NIST SP 800-88 Rev. 2  |  Organization: CityServe Arizona",
        small_style,
    ))

    doc.build(story)
    return buffer.getvalue()


# ── Lambda invocation ────────────────────────────────────────────────────────

logger = logging.getLogger(__name__)


def _decimal_default(obj):
    if isinstance(obj, Decimal):
        return int(obj) if obj == int(obj) else float(obj)
    return str(obj)


def _generate_via_lambda(device: dict) -> str:
    """Invoke the compliance Lambda and return the S3 pre-signed URL."""
    import boto3

    client = boto3.client("lambda", region_name=settings.aws_region)
    response = client.invoke(
        FunctionName=settings.lambda_compliance_function_name,
        InvocationType="RequestResponse",
        Payload=json.dumps(device, default=_decimal_default),
    )
    payload = json.loads(response["Payload"].read())

    if response.get("FunctionError"):
        raise RuntimeError(f"Lambda error: {payload}")

    body = payload if isinstance(payload.get("body"), dict) else {
        **payload,
        "body": json.loads(payload["body"]) if isinstance(payload.get("body"), str) else payload,
    }
    return body["body"]["pdf_url"]


# ── Public entry point ────────────────────────────────────────────────────────

def generate_compliance_pdf(device: dict) -> str:
    """
    Builds the PDF and uploads to S3 if a bucket is configured.
    When running in AWS with a Lambda configured, delegates PDF generation
    to the Lambda function. Falls back to local generation on error.
    Returns the S3 pre-signed URL, or the local download path if no bucket is set.
    """
    device_id = str(device.get("device_id", "")).strip()
    if not device_id:
        raise ValueError("device_id is required to generate a compliance PDF")

    # Delegate to Lambda if configured (AWS environment)
    if settings.lambda_compliance_function_name:
        try:
            _generate_via_lambda(device)
            return f"/api/compliance/{device_id}/download"
        except Exception:
            logger.exception(
                "Lambda compliance PDF generation failed — falling back to local"
            )

    # Local / fallback path
    pdf_bytes = _build_pdf_bytes(device)
    if not pdf_bytes:
        raise RuntimeError("PDF generation produced empty content")
    s3_key    = f"compliance-docs/{device_id}.pdf"

    bucket = settings.s3_compliance_bucket
    if not bucket:
        local_path = f"/tmp/{device_id}.pdf"
        with open(local_path, "wb") as f:
            f.write(pdf_bytes)
        return f"/api/compliance/{device_id}/download"

    s3 = get_s3()
    s3.put_object(
        Bucket=bucket,
        Key=s3_key,
        Body=pdf_bytes,
        ContentType="application/pdf",
    )
    return f"/api/compliance/{device_id}/download"