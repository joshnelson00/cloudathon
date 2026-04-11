"""
Generates a NIST SP 800-88 compliance PDF for a device record and uploads
it to S3. Returns the S3 pre-signed URL (or a local path when S3 bucket
is not configured).
"""
import io
import os
from datetime import datetime, timezone

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


def _build_pdf_bytes(device: dict) -> bytes:
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=LETTER,
        rightMargin=inch,
        leftMargin=inch,
        topMargin=inch,
        bottomMargin=inch,
    )

    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        "Title", parent=styles["Heading1"], fontSize=18, spaceAfter=6
    )
    subtitle_style = ParagraphStyle(
        "Subtitle", parent=styles["Normal"], fontSize=10, textColor=colors.grey
    )
    section_style = ParagraphStyle(
        "Section", parent=styles["Heading2"], fontSize=13, spaceBefore=16, spaceAfter=4
    )
    body_style = styles["Normal"]

    device_type_labels = {
        "laptop_hdd":     "Laptop — HDD (Spinning Disk)",
        "laptop_ssd":     "Laptop — SSD (Flash Storage)",
        "desktop_hdd":    "Desktop — HDD (Spinning Disk)",
        "desktop_ssd":    "Desktop — SSD (Flash Storage)",
        "tablet":         "Tablet / Mobile Device",
        "drive_external": "External Storage Drive",
        "no_storage":     "Device — No Usable Storage",
    }

    nist_method_labels = {
        "hdd_purge_v1":            "NIST SP 800-88 — Purge (3-Pass Overwrite)",
        "ssd_secure_erase_v1":     "NIST SP 800-88 — Purge (ATA Secure Erase)",
        "tablet_factory_reset_v1": "NIST SP 800-88 — Purge (Factory Reset)",
        "no_storage_clear_v1":     "NIST SP 800-88 — Clear (Power Cycle Verification)",
    }

    generated_at = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")

    story = []

    # Header
    story.append(Paragraph("CityServe Arizona", title_style))
    story.append(Paragraph("Device Data Destruction — Compliance Record", subtitle_style))
    story.append(Paragraph(f"Generated: {generated_at}", subtitle_style))
    story.append(HRFlowable(width="100%", thickness=1, color=colors.black, spaceAfter=12))

    # Device info table
    story.append(Paragraph("Device Information", section_style))
    device_data = [
        ["Field", "Value"],
        ["Device ID",       device.get("device_id", "—")],
        ["Serial Number",   device.get("serial_number", "—")],
        ["Make / Model",    device.get("make_model", "—")],
        ["Device Type",     device_type_labels.get(device.get("device_type", ""), device.get("device_type", "—"))],
        ["Processed By",    device.get("worker_id", "—")],
        ["Intake Date",     device.get("intake_timestamp", "—")[:19].replace("T", " ")],
        ["NIST Method",     nist_method_labels.get(device.get("procedure_id", ""), device.get("procedure_id", "—"))],
        ["Final Status",    device.get("status", "—").upper()],
    ]

    device_table = Table(device_data, colWidths=[2.2 * inch, 4.3 * inch])
    device_table.setStyle(TableStyle([
        ("BACKGROUND",  (0, 0), (-1, 0), colors.HexColor("#1a1a2e")),
        ("TEXTCOLOR",   (0, 0), (-1, 0), colors.white),
        ("FONTNAME",    (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE",    (0, 0), (-1, 0), 10),
        ("BACKGROUND",  (0, 1), (-1, -1), colors.HexColor("#f8f9fa")),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f0f4ff")]),
        ("FONTNAME",    (0, 1), (0, -1), "Helvetica-Bold"),
        ("FONTSIZE",    (0, 1), (-1, -1), 9),
        ("GRID",        (0, 0), (-1, -1), 0.5, colors.HexColor("#cccccc")),
        ("TOPPADDING",  (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ("LEFTPADDING", (0, 0), (-1, -1), 8),
    ]))
    story.append(device_table)

    # Completed steps table
    steps = device.get("steps_completed", [])
    story.append(Paragraph("Sanitization Steps Completed", section_style))

    if steps:
        step_data = [["#", "Step ID", "Confirmed", "Timestamp", "Notes"]]
        for i, step in enumerate(steps, 1):
            step_data.append([
                str(i),
                step.get("step_id", ""),
                "Yes" if step.get("confirmed") else "No",
                step.get("timestamp", "")[:19].replace("T", " "),
                step.get("notes", "") or "—",
            ])

        step_table = Table(
            step_data,
            colWidths=[0.3 * inch, 1.8 * inch, 0.7 * inch, 1.8 * inch, 1.9 * inch],
        )
        step_table.setStyle(TableStyle([
            ("BACKGROUND",  (0, 0), (-1, 0), colors.HexColor("#1a1a2e")),
            ("TEXTCOLOR",   (0, 0), (-1, 0), colors.white),
            ("FONTNAME",    (0, 0), (-1, 0), "Helvetica-Bold"),
            ("FONTSIZE",    (0, 0), (-1, 0), 9),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f0f4ff")]),
            ("FONTSIZE",    (0, 1), (-1, -1), 8),
            ("GRID",        (0, 0), (-1, -1), 0.5, colors.HexColor("#cccccc")),
            ("TOPPADDING",  (0, 0), (-1, -1), 4),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
            ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ]))
        story.append(step_table)
    else:
        story.append(Paragraph("No steps recorded.", body_style))

    # Certification footer
    story.append(Spacer(1, 0.3 * inch))
    story.append(HRFlowable(width="100%", thickness=1, color=colors.black))
    story.append(Spacer(1, 0.1 * inch))
    story.append(Paragraph(
        "This document certifies that the device identified above was processed in accordance "
        "with NIST SP 800-88 media sanitization guidelines. All steps were completed and "
        "timestamped by the CityServe device tracking system.",
        body_style,
    ))

    doc.build(story)
    return buffer.getvalue()


def generate_compliance_pdf(device: dict) -> str:
    """
    Builds the PDF and uploads to S3 if a bucket is configured.
    Returns the S3 pre-signed URL, or a placeholder URL if bucket is not set.
    """
    pdf_bytes = _build_pdf_bytes(device)
    device_id = device["device_id"]
    s3_key = f"compliance-docs/{device_id}.pdf"

    bucket = settings.s3_compliance_bucket
    if not bucket:
        # No S3 bucket configured yet — store locally for testing
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

    # Generate a pre-signed URL valid for 1 hour
    url = s3.generate_presigned_url(
        "get_object",
        Params={"Bucket": bucket, "Key": s3_key},
        ExpiresIn=3600,
    )
    return url
