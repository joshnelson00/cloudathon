# Pitch — CityServe Device Destruction Compliance System
> **Event:** GCU + AWS Cloud-a-thon · Grand Canyon University · Phoenix, AZ
> **Nonprofit partner:** CityServe Arizona

---

## The One-Line Pitch

> "Scan a drive, follow the steps, get an automatic NIST compliance certificate —
> no paperwork, no training required, audit-ready from day one."

---

## The Villain — What Happens Today

CityServe processes hundreds of donated devices every year. Every single one must be
wiped to a federal standard (NIST SP 800-88) before it can be reused or redistributed.

Today that process looks like this:

- A worker looks up the right paper checklist for the device type — if they can find it
- They guess at which procedure applies based on experience they may or may not have
- They follow steps from memory, with no system enforcing that anything was done correctly
- They fill out a compliance form by hand when they're done
- A manager collects the paper, files it somewhere, and hopes it's findable later
- When an audit request comes in, responding to it can take hours of digging through binders

The biggest threat to this process is not malicious — **it's turnover.** The moment an
experienced worker leaves, that knowledge walks out the door. The next volunteer starts
the cycle over: train, learn, leave, repeat.

---

## The Hero — What Our System Does

Three things happen automatically that humans do manually today:

### 1. Selects the right procedure
Worker enters the drive serial number and selects the drive type (HDD / SSD / Tablet).
The system instantly assigns the correct NIST-compliant sanitization procedure.
No lookup. No guesswork. No experience required.

### 2. Guides the worker through every step
The app displays one step at a time. The worker cannot skip a step or mark the device
complete until every required action is confirmed. The procedure knowledge lives in the
system — not in any individual worker's memory.

### 3. Generates the compliance certificate automatically
When the last step is confirmed, the system generates a NIST SP 800-88 compliant
certificate — signed, timestamped, and stored in the cloud. No paperwork. No manual
filing. One search and a download link answers any audit request instantly.

---

## Before vs. After

```
BEFORE                                  AFTER
────────────────────────────────────────────────────────────────
Worker looks up paper checklist     →   Worker opens the app
Guesses which procedure applies     →   Enters serial + selects drive type
Follows steps from memory           →   Follows on-screen guided steps
Fills out paper compliance form     →   System logs every step automatically
Manager manually files the form     →   NIST certificate auto-generated + stored in S3
Audit request = hours of digging    →   Audit request = one search + PDF download
New worker requires weeks training  →   New worker is productive on day one
```

---

## The Demo (60 Seconds)

> "A corporate donor just dropped off 30 laptops. Watch what happens."

1. Worker logs into the app — no special training needed
2. Worker clicks **Intake New Device**
3. Worker enters the drive serial number and selects **Laptop — SSD**
4. System instantly loads the **ATA Secure Erase procedure** — the right steps for this exact drive type
5. Worker follows each on-screen step, confirming as they go — the system records every action with a timestamp
6. Worker enters the wipe tool name and confirms the result: **Pass**
7. Worker clicks **Mark Complete**
8. Within seconds: **"Compliance certificate ready"**
9. Worker clicks **Download** — a NIST SP 800-88 certificate opens, showing:
   - Drive serial number, manufacturer, model, capacity
   - Sanitization method applied
   - Every step completed, with timestamps and worker ID
   - The wipe tool used and the result
10. Admin opens the dashboard — completed count has incremented, certificate is searchable forever

**What the judge sees:** a brand new volunteer just produced audit-ready federal compliance
documentation without touching a single piece of paper.

---

## AWS Architecture (How It's Built)

```
Worker / Admin (Browser)
        │
        ▼
  CloudFront (HTTPS CDN)
        │
   ┌────┴────┐
   ▼         ▼
  S3        EC2 :8000
 (React    (FastAPI backend)
 frontend)      │
                ├──► DynamoDB
                │    Device records
                │    Step completion logs
                │    Certificate metadata
                │
                ├──► Lambda (async)
                │    PDF certificate generation
                │    S3 upload
                │
                └──► S3
                     Compliance PDF storage
```

---

## AWS Well-Architected Alignment

| Pillar | How we address it |
|---|---|
| **Operational Excellence** | Guided steps eliminate human error; every action is auto-logged; CI/CD pipeline deploys on every push |
| **Security** | All routes require JWT auth; compliance PDFs stored in private S3 with pre-signed URLs; no SSH on EC2 (SSM only); full audit trail in DynamoDB |
| **Reliability** | Cloud-based — works across all CityServe locations; survives staff turnover; DynamoDB is fully managed with no single point of failure |
| **Performance Efficiency** | Lambda handles slow PDF generation async so the UI stays responsive; DynamoDB delivers single-digit millisecond reads for device status |
| **Cost Optimization** | Lambda is pay-per-invocation — zero cost when idle, scales to large donation batches; t3.micro EC2; DynamoDB on-demand billing |
| **Sustainability** | Serverless burst capacity for bursty donation events — no idle compute sitting around; right-sized infrastructure for a nonprofit budget |

---

## Why This Wins

- **Directly answers the stated pain** — staff turnover, manual checklists, inconsistent procedures
- **Real federal compliance** — NIST SP 800-88, not a custom standard we invented
- **Audit-ready by default** — every certificate is stored, searchable, and downloadable
- **Works for any skill level** — the system holds the knowledge, not the worker
- **Scales to donation events** — Lambda handles batch processing without over-provisioning
- **Built on AWS** — all data stays inside the AWS boundary, no third-party dependencies

---

*Stack: lean-mvp-ec2-s3-cf-1.0 · React + FastAPI + DynamoDB + Lambda + S3 + CloudFront*
*Event: GCU + AWS Cloud-a-thon · Grand Canyon University · Phoenix, AZ*