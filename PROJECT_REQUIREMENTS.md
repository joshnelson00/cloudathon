# Project Requirements — CityServe Device Destruction Compliance System
> **Event:** GCU + AWS Cloud-a-thon · Grand Canyon University · Phoenix, AZ
> **Nonprofit partner:** CityServe Arizona
> **Stack:** `lean-mvp-ec2-s3-cf-1.0`

---

## Problem Statement

CityServe receives donated devices (laptops, desktops, tablets, drives) from corporate
donors and must securely wipe each one before reuse. Workers follow manual checklists today,
which breaks down because:

- Workers frequently leave, forcing repeated training cycles
- Different device types need different procedures — manual steps create inconsistency
- Proof of NIST SP 800-88 compliance requires manual paperwork that is slow and error-prone
- Large donation batches (e.g., corporate refresh events) overwhelm the current process

**What winning looks like:** A worker with minimal training opens the app, scans or enters a
device, follows an on-screen guided procedure, and the system auto-generates a signed
compliance record — no paperwork, no guesswork.

---

## Solution One-Liner

An AWS-powered guided workflow system that walks any worker through NIST-compliant
device sanitization and automatically generates audit-ready compliance documentation.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                          USER (Worker / Admin)                       │
└────────────────────┬──────────────────────┬─────────────────────────┘
                     │ HTTPS                 │ HTTPS
                     ▼                       ▼
           ┌─────────────────┐    ┌──────────────────────┐
           │   CloudFront    │    │    EC2 :8000          │
           │   (CDN / HTTPS) │    │    FastAPI + Uvicorn  │
           └────────┬────────┘    └──────────┬───────────┘
                    │                        │
                    ▼                        │ boto3
           ┌─────────────────┐              │
           │   S3 Bucket     │◄─────────────┤  compliance PDF upload
           │  (React build + │              │
           │  compliance docs│              │
           └─────────────────┘              │
                                            ├──► DynamoDB
                                            │    (device records,
                                            │     step logs, status)
                                            │
                                            └──► Lambda (async)
                                                 (PDF generation,
                                                  batch processing)
```

### Request Flow

```
Browser → CloudFront → S3                  (React frontend — static)
Browser → EC2:8000                         (FastAPI — all API routes)
EC2     → DynamoDB                         (device CRUD, step tracking)
EC2     → S3                               (compliance PDF upload/download)
EC2     → Lambda (async invoke)            (PDF generation, batch ops)
```

---

## AWS Services

| Service | Purpose | Why this, not something else |
|---|---|---|
| EC2 (t3.micro) | FastAPI backend host, SSM-managed | Single process, no cold starts, already in stack |
| S3 | React build hosting + compliance PDF storage | Already in stack; PDFs stored as objects with device ID key |
| CloudFront | HTTPS CDN for React frontend | Already in stack; HTTPS out of the box |
| DynamoDB | Device records, step completion logs, worker assignments | Schema-less (device types vary), single-digit ms reads, no migration overhead |
| Lambda | Async PDF generation, batch compliance report assembly | Offloads slow PDF rendering from the FastAPI request cycle |
| AWS Step Functions *(optional P1)* | Guided workflow state machine per device type | Models each device type's sanitization procedure as explicit states |

---

## Device Lifecycle

```
INTAKE → IDENTIFICATION → PROCEDURE → VERIFICATION → DOCUMENTED → CLOSED
  │            │               │             │              │
  │        Assign           Guide         Auto-check    Generate
  │        procedure        worker        step logs      PDF +
  │        by type          step-by-step  completeness   audit log
  │
  └── DynamoDB record created with device_id, type, worker_id, timestamp
```

### Device Types and Procedures

> Source: NIST SP 800-88 Rev 1 — Appendix G (Certificate of Media Sanitization)
> The certificate is issued per **storage media (drive)**, not per device chassis.
> Drive details are captured during Step 1 of every procedure, not at intake.

| Device Type | Storage Tech | NIST 800-88 Method | Required Steps |
|---|---|---|---|
| HDD Laptop/Desktop | Spinning disk | Purge (overwrite) | Record drive info → 3-pass wipe → verify → label → log |
| SSD Laptop/Desktop | Flash storage | Purge (ATA Secure Erase) | Record drive info → ATA Secure Erase → verify → label → log |
| Tablet / Mobile | eMMC / Flash | Purge (factory reset) | Record device info → full factory reset → verify → label → log |
| External Drive (HDD) | Spinning disk | Purge (overwrite) | Record drive info → 3-pass wipe → verify → label → log |
| External Drive (SSD) | Flash storage | Purge (ATA Secure Erase) | Record drive info → ATA Secure Erase → verify → label → log |
| Device with no usable storage | N/A | Clear (power cycle) | Confirm inoperable → document → log |

### Hardcoded Procedure Steps (per NIST SP 800-88 Appendix G)

All procedures share a **Step 1: Record Drive Details** where the worker physically inspects
the drive and enters the information that will appear on the compliance certificate.

**`laptop_hdd` — HDD Purge (3-pass overwrite)**
```
Step 1: Record drive details
        Worker enters: drive_serial, drive_manufacturer, drive_model, drive_capacity_gb
Step 2: Boot device and confirm HDD is detected by the OS or wipe tool
Step 3: Run 3-pass overwrite using approved wipe tool (e.g. DBAN, Eraser)
        Worker enters: tool_name, tool_version
Step 4: Confirm tool reports successful completion — record pass/fail
Step 5: Affix NIST-compliant destruction label to the drive
Step 6: Record completion — system auto-logs timestamp and worker ID
```

**`laptop_ssd` — SSD Purge (ATA Secure Erase)**
```
Step 1: Record drive details
        Worker enters: drive_serial, drive_manufacturer, drive_model, drive_capacity_gb
Step 2: Boot to BIOS/UEFI and confirm SSD is detected
Step 3: Run ATA Secure Erase command using approved tool (e.g. hdparm, manufacturer tool)
        Worker enters: tool_name, tool_version
Step 4: Confirm tool reports successful completion — record pass/fail
Step 5: Affix NIST-compliant destruction label to the drive
Step 6: Record completion — system auto-logs timestamp and worker ID
```

**`tablet` — eMMC/Flash Purge (Factory Reset)**
```
Step 1: Record device details
        Worker enters: device_serial, device_manufacturer, device_model, storage_capacity_gb
Step 2: Disable factory reset protection / remove Google or Apple account
Step 3: Perform full factory reset via device settings menu
Step 4: Confirm device boots to setup wizard (confirms wipe succeeded)
Step 5: Affix NIST-compliant destruction label
Step 6: Record completion — system auto-logs timestamp and worker ID
```

---

## Data Model (DynamoDB)

> Procedures are hardcoded in the backend (Python dict), not stored in DynamoDB.
> DynamoDB stores only device records and step completion logs.

### Table: `devices`

**Chassis fields — captured at intake**

| Field | Type | Description |
|---|---|---|
| `device_id` | String (PK) | UUID generated at intake |
| `chassis_serial` | String | Chassis/asset serial number — entered at intake |
| `device_type` | String | `laptop_hdd`, `laptop_ssd`, `tablet`, `drive_external_hdd`, `drive_external_ssd` |
| `chassis_make_model` | String | e.g. "Dell Latitude 5400" |
| `intake_timestamp` | String (ISO 8601) | When device was entered |
| `worker_id` | String | Who is processing this device |
| `status` | String | `intake` / `in_progress` / `verified` / `documented` / `closed` |
| `procedure_id` | String | Which hardcoded procedure was assigned (e.g. `laptop_hdd`) |

**Drive fields — captured during Step 1 of the procedure**

| Field | Type | Description |
|---|---|---|
| `drive_serial` | String | Drive serial number — read off the physical drive label |
| `drive_manufacturer` | String | e.g. "Seagate", "Samsung", "WD" |
| `drive_model` | String | e.g. "MZ-77E500" |
| `drive_capacity_gb` | Number | e.g. 500 |
| `drive_type` | String | `hdd` / `ssd` / `emmc` — confirms physical media type |
| `wipe_tool_name` | String | Software used — e.g. "DBAN", "hdparm", "Eraser" |
| `wipe_tool_version` | String | Version of the tool — required for certificate |
| `wipe_result` | String | `pass` / `fail` — recorded after tool completes |

**Completion fields — written when procedure finishes**

| Field | Type | Description |
|---|---|---|
| `steps_completed` | List | `[{ step_id, timestamp, worker_id, notes, input_data }]` |
| `completed_timestamp` | String (ISO 8601) | When all steps were confirmed |
| `compliance_doc_url` | String | S3 pre-signed URL to generated PDF certificate |
| `notes` | String | Free-text worker notes |

### NIST SP 800-88 Appendix G — Certificate Fields Mapped to Data Model

| Certificate Field (NIST) | Source in our system |
|---|---|
| Organization name | Hardcoded: "CityServe Arizona" |
| Date of sanitization | `completed_timestamp` |
| Tracking / item number | `device_id` |
| Media manufacturer | `drive_manufacturer` |
| Media model number | `drive_model` |
| Media serial number | `drive_serial` |
| Media type | `drive_type` |
| Capacity | `drive_capacity_gb` |
| Sanitization method | `procedure_id` → maps to NIST method string |
| Tool used | `wipe_tool_name` + `wipe_tool_version` |
| Verification result | `wipe_result` |
| Technician name | `worker_id` → resolved to full name at PDF generation |

---

## API Routes

> Frozen baseline routes (`/health`, `/api/integrations`) are unchanged.
> All new routes are additive.

### Auth Routes (required)

```
POST /auth/login
body:  { "username": "...", "password": "..." }
→     { "access_token": "...", "token_type": "bearer" }

POST /auth/logout
→     { "message": "logged out" }

GET  /auth/me
→     { "username": "...", "role": "worker" | "admin" }
```

### Device Routes

```
POST   /api/devices
body:  { "serial_number": "...", "device_type": "...", "make_model": "..." }
→     { "device_id": "...", "procedure_id": "...", "status": "intake" }

GET    /api/devices
→     { "devices": [ { device summary objects } ] }

GET    /api/devices/{device_id}
→     { full device record + steps_completed }

PATCH  /api/devices/{device_id}/step
body:  { "step_id": "...", "confirmed": true, "notes": "...", "input_data": { } }
→     { "device_id": "...", "step_id": "...", "status": "in_progress" | "verified" }

# input_data on Step 1 carries drive details, e.g.:
# { "drive_serial": "...", "drive_manufacturer": "...",
#   "drive_model": "...", "drive_capacity_gb": 500, "drive_type": "hdd" }
# input_data on the wipe step carries tool info, e.g.:
# { "wipe_tool_name": "DBAN", "wipe_tool_version": "2.3.0", "wipe_result": "pass" }

POST   /api/devices/{device_id}/complete
→     { "device_id": "...", "status": "documented", "compliance_doc_url": "..." }
```

### Compliance / Admin Routes

```
GET    /api/compliance/{device_id}
→     { "device_id": "...", "compliance_doc_url": "...", "generated_at": "..." }

GET    /api/dashboard
→     { "total": N, "in_progress": N, "completed": N, "by_type": { ... } }
```

---

## Frontend Pages

| Page | Route | Auth Required | Purpose |
|---|---|---|---|
| Login | `/login` | No | Username + password → JWT |
| Dashboard | `/` | Yes | Summary stats: total, in-progress, completed by type |
| Intake | `/intake` | Yes | Worker enters device details → system assigns procedure |
| Device Detail | `/device/:id` | Yes | Step-by-step guided procedure for a single device |
| Compliance Record | `/compliance/:id` | Yes | View + download the generated PDF for a device |
| Admin / Batch View | `/admin` | Yes (admin role) | Table of all devices, filter by status/type/date |

---

## P0 Features — Must Ship

- [ ] CloudFront URL loads the React frontend `[LOCKED — baseline]`
- [ ] `/health` returns `200 {"status":"ok"}` from EC2 `[LOCKED — baseline]`
- [ ] Basic auth — login page, JWT token, protected routes, redirect on 401 `[REQUIRED]`
- [ ] Device intake form — serial number, type, make/model → creates DynamoDB record
- [ ] Guided procedure view — step-by-step checklist driven by device type
- [ ] Step completion tracking — each confirmed step is logged to DynamoDB with timestamp
- [ ] Compliance doc generation — on procedure completion, Lambda generates PDF and uploads to S3
- [ ] Compliance doc download — worker can download the PDF from the device detail page
- [ ] Dashboard — shows live counts of devices by status

## P1 Features — Nice to Have (only if P0 is green before hour 16)

- [ ] AWS Step Functions state machine replacing the FastAPI step logic (cleaner, more auditable)
- [ ] Batch summary report — single PDF covering all devices processed in a date range
- [ ] QR code / barcode scan at intake instead of manual serial number entry
- [ ] Admin role with ability to reassign devices between workers
- [ ] Email notification (SES) when a compliance doc is ready

## Explicitly Out of Scope

- Hardware integration (physical disk wipe tools reporting back to the system)
- Mobile-specific UI
- OAuth, SSO, or MFA — basic token auth only
- Multi-tenant / multi-organization support
- Production-grade error handling and logging
- Terraform module refactoring

---

## User Stories

### P0

**Story 1 — Device Intake**
> As a **CityServe device worker**, I want to **enter a donated device's serial number and
> type into the app** so that **the system assigns the correct NIST procedure automatically
> and I never have to look up which process to follow.**

**Story 2 — Guided Procedure**
> As a **device worker**, I want to **follow an on-screen checklist that tells me exactly
> what to do for this device type** so that **I can't skip a required step and every device
> is processed consistently even if I'm new.**

**Story 3 — Compliance Documentation**
> As a **CityServe operations manager**, I want to **download a PDF record proving each device
> was sanitized according to NIST SP 800-88** so that **we can satisfy audit requests or donor
> compliance requirements without digging through paper checklists.**

**Story 4 — Dashboard**
> As an **operations manager**, I want to **see a live dashboard showing how many devices are
> in progress, completed, and pending** so that **I can manage throughput during large
> corporate donation events without manually counting checklists.**

### P1

**Story 5 — Batch Report**
> As an **operations manager**, I want to **generate a single compliance report covering all
> devices processed in a date range** so that **I can send one document to a corporate donor
> confirming all their equipment was properly destroyed.**

---

## Acceptance Criteria

**Story 1 — Intake**
- [ ] Given a worker is logged in, when they open `/intake`, then a form with serial number, device type, and make/model fields is visible
- [ ] Given valid form data, when the worker submits, then a DynamoDB record is created and the worker is redirected to the device's procedure page within 2 seconds
- [ ] Given an invalid or duplicate serial number, when submitted, then an inline error message appears and no record is created

**Story 2 — Guided Procedure**
- [ ] Given a device record exists, when the worker opens `/device/:id`, then the correct step list for that device type is displayed in order
- [ ] Given the worker checks a step, when they confirm, then the step is marked complete in DynamoDB and a timestamp is recorded
- [ ] Given all steps are complete, when the worker clicks "Mark Complete", then the system triggers compliance doc generation and shows a loading indicator
- [ ] Given a worker tries to skip a step, then the "Mark Complete" button remains disabled until all steps are confirmed

**Story 3 — Compliance Doc**
- [ ] Given all steps are marked complete, when generation finishes, then a download link for the PDF appears within 15 seconds
- [ ] Given the worker clicks download, then the PDF is served from S3 and opens correctly
- [ ] Given the PDF opens, then it contains the device serial number, type, worker ID, each completed step with timestamp, and the NIST method applied

**Story 4 — Dashboard**
- [ ] Given any logged-in user visits `/`, then they see counts for total devices, in-progress, and completed
- [ ] Given a device is completed, when the dashboard is refreshed, then the completed count increments and in-progress decrements

---

## AWS Well-Architected Alignment

| Pillar | How we address it |
|---|---|
| **Operational Excellence** | CI/CD pipeline auto-deploys on every push to `dev`; Lambda decouples PDF generation from the request cycle; DynamoDB step logs provide full audit trail |
| **Security** | JWT auth on all routes; S3 bucket private with CloudFront OAC; no SSH (SSM only); compliance PDFs accessible only via pre-signed S3 URLs or authenticated API |
| **Reliability** | EC2 health checks in CI; DynamoDB is fully managed with no single point of failure; Lambda retries on failure; `/health` monitored by pipeline |
| **Performance Efficiency** | DynamoDB single-digit ms reads for device status; Lambda handles slow PDF rendering async so UI stays responsive; CloudFront caches static assets |
| **Cost Optimization** | t3.micro EC2 (free tier eligible); DynamoDB on-demand billing (pay per request, zero cost at idle); Lambda pay-per-invocation; S3 minimal storage cost for PDFs |
| **Sustainability** | Serverless Lambda for bursty PDF workloads (no idle compute); DynamoDB on-demand avoids over-provisioned capacity; EC2 t3.micro runs only what's needed |

---

## 60-Second Demo Script

> "A corporate donor just dropped off 50 laptops. Watch what happens."

1. Worker logs in → lands on dashboard showing current device counts
2. Worker clicks **Intake New Device** → enters serial number, selects "Laptop — SSD", enters make/model
3. System instantly shows the **guided procedure** for SSD purge (ATA Secure Erase steps)
4. Worker checks off each step → last step confirmed → clicks **Mark Complete**
5. Loading spinner → within 10 seconds: **"Compliance document ready"**
6. Worker clicks **Download PDF** → PDF opens showing device ID, serial, all steps, timestamps, worker ID, NIST method
7. Admin opens dashboard → completed count has incremented

**The judge sees:** zero paperwork, zero manual steps, instant audit-ready proof, NIST compliance enforced by the system not by memory.

---

## Feature Milestones

| Time | Milestone |
|---|---|
| Hour 0–3 | DoD green: pipeline, CloudFront, EC2, /health all confirmed |
| Hour 5 | Auth working: login page, JWT, protected routes |
| Hour 7 | Device intake form → DynamoDB record created |
| Hour 9 | Guided procedure page pulls steps from DynamoDB by device type |
| Hour 11 | Step completion tracking working end-to-end |
| Hour 13 | Lambda generates PDF, uploads to S3, download link appears in UI |
| Hour 15 | Dashboard shows live counts; full demo scenario runs on CloudFront URL |
| Hour 16 | Feature freeze — P0 complete, begin polish and rehearsal |
| Hour 20 | Demo rehearsed, slide deck ready, Loom backup recorded |

---

*Stack version: lean-mvp-ec2-s3-cf-1.0*
*Problem: CityServe — Device Data Destruction and Compliance Automation*
*Event: GCU + AWS Cloud-a-thon · Grand Canyon University · Phoenix, AZ*