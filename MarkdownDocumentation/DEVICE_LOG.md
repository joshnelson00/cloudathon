# Media Sanitization Activity Log
### CityServe Device Destruction Compliance System
**Standard:** NIST SP 800-88 Rev. 2 — Guidelines for Media Sanitization  
**Organization:** CityServe Arizona  
**System:** CityServe Device Destruction Compliance System (DDCS)  
**Log maintained by:** System administrators and authorized sanitization personnel

> This log satisfies the record-keeping requirements of NIST SP 800-88r2 Section 4.8.  
> All sanitization events must be recorded at the time of occurrence.  
> Records must be retained for a minimum of 3 years per organizational policy.

---

## Sanitization Method Reference (NIST SP 800-88r2)

| Method  | Definition | Applies To |
|---------|-----------|------------|
| **Clear** | Logical techniques to sanitize data in user-addressable storage locations (e.g., factory reset, overwrite) | Phones, tablets, devices with no sensitive data classification |
| **Purge** | Physical or logical techniques that render target data recovery infeasible using state-of-the-art laboratory techniques (e.g., multi-pass overwrite, cryptographic erase) | Laptops, desktops, servers, hard drives, SSDs |
| **Destroy** | Physical destruction of media — shredding, disintegration, incineration, or melting | Monitors, printers, physically damaged media, end-of-life hardware |

---

## Blank Template

Copy this block for each sanitization event. One entry per event.

```
---

### [EVENT TYPE] — YYYY-MM-DD HH:MM:SS UTC

#### Section 1 — Media Identification (NIST SP 800-88r2 §4.8)

| Field                        | Value |
|------------------------------|-------|
| Device ID (System)           |       |
| Chassis Serial Number        |       |
| Media Type                   |       |
| Manufacturer / Model         |       |
| Storage Capacity             |       |
| Interface Type               |       |

#### Section 2 — Sanitization Record (NIST SP 800-88r2 §4.8)

| Field                        | Value |
|------------------------------|-------|
| Sanitization Method          | Clear / Purge / Destroy |
| Sanitization Tool / Technique|       |
| Number of Passes             |       |
| Verification Method          |       |
| Verification Result          | Pass / Fail / Pending |
| Procedure Reference ID       |       |

#### Section 3 — Chain of Custody (NIST SP 800-88r2 §4.9)

| Field                        | Value |
|------------------------------|-------|
| Performed By (Username)      |       |
| Performed By (Role)          |       |
| Worker ID                    |       |
| Reviewed / Witnessed By      |       |
| Intake Timestamp             |       |
| Event Timestamp              |       |

#### Section 4 — Disposition (NIST SP 800-88r2 §4.10)

| Field                        | Value |
|------------------------------|-------|
| Post-Sanitization Status     | intake / in_progress / verified / documented / closed |
| Compliance Document (S3)     |       |
| Final Disposition            | Reuse / Donate / Recycle / Destroyed |
| Notes                        |       |
```

**Event Types:**
- `INTAKE` — media received and logged into the system
- `STATUS UPDATE` — sanitization status changed
- `STEP COMPLETED` — individual procedure step confirmed by technician
- `WIPE RESULT` — pass or fail recorded after sanitization attempt
- `COMPLIANCE GENERATED` — official compliance certificate produced
- `DELETED` — record closed and archived

---

## Example Entries

The entries below show a full device lifecycle — from intake through final disposition.

---

### [INTAKE] — 2026-04-10 08:14:32 UTC

#### Section 1 — Media Identification (NIST SP 800-88r2 §4.8)

| Field                        | Value                                  |
|------------------------------|----------------------------------------|
| Device ID (System)           | `d3f1a2b4-9c10-4e78-a6d5-001122334455` |
| Chassis Serial Number        | `SN-2024-00142`                        |
| Media Type                   | Laptop HDD                             |
| Manufacturer / Model         | Dell Latitude 5520                     |
| Storage Capacity             | 512 GB                                 |
| Interface Type               | SATA III                               |

#### Section 2 — Sanitization Record (NIST SP 800-88r2 §4.8)

| Field                        | Value                                  |
|------------------------------|----------------------------------------|
| Sanitization Method          | Purge                                  |
| Sanitization Tool / Technique| Pending assignment                     |
| Number of Passes             | N/A — not yet started                  |
| Verification Method          | Pending                                |
| Verification Result          | Pending                                |
| Procedure Reference ID       | `proc-purge-001`                       |

#### Section 3 — Chain of Custody (NIST SP 800-88r2 §4.9)

| Field                        | Value                                  |
|------------------------------|----------------------------------------|
| Performed By (Username)      | worker1                                |
| Performed By (Role)          | Worker                                 |
| Worker ID                    | `usr-9a1b2c3d`                         |
| Reviewed / Witnessed By      | Pending                                |
| Intake Timestamp             | 2026-04-10 08:14:32 UTC                |
| Event Timestamp              | 2026-04-10 08:14:32 UTC                |

#### Section 4 — Disposition (NIST SP 800-88r2 §4.10)

| Field                        | Value                                                    |
|------------------------------|----------------------------------------------------------|
| Post-Sanitization Status     | `intake`                                                 |
| Compliance Document (S3)     | N/A                                                      |
| Final Disposition            | TBD                                                      |
| Notes                        | Device received from Circle the City donation drive. Minor scratches on lid, no physical damage to ports. |

---

### [STATUS UPDATE] — 2026-04-10 08:22:11 UTC

#### Section 1 — Media Identification (NIST SP 800-88r2 §4.8)

| Field                        | Value                                  |
|------------------------------|----------------------------------------|
| Device ID (System)           | `d3f1a2b4-9c10-4e78-a6d5-001122334455` |
| Chassis Serial Number        | `SN-2024-00142`                        |
| Media Type                   | Laptop HDD                             |
| Manufacturer / Model         | Dell Latitude 5520                     |
| Storage Capacity             | 512 GB                                 |
| Interface Type               | SATA III                               |

#### Section 2 — Sanitization Record (NIST SP 800-88r2 §4.8)

| Field                        | Value                                  |
|------------------------------|----------------------------------------|
| Sanitization Method          | Purge                                  |
| Sanitization Tool / Technique| Blancco Drive Eraser v6.9              |
| Number of Passes             | 7 (DoD 5220.22-M)                      |
| Verification Method          | Hash validation post-wipe              |
| Verification Result          | Pending                                |
| Procedure Reference ID       | `proc-purge-001`                       |

#### Section 3 — Chain of Custody (NIST SP 800-88r2 §4.9)

| Field                        | Value                                  |
|------------------------------|----------------------------------------|
| Performed By (Username)      | worker1                                |
| Performed By (Role)          | Worker                                 |
| Worker ID                    | `usr-9a1b2c3d`                         |
| Reviewed / Witnessed By      | Pending                                |
| Intake Timestamp             | 2026-04-10 08:14:32 UTC                |
| Event Timestamp              | 2026-04-10 08:22:11 UTC                |

#### Section 4 — Disposition (NIST SP 800-88r2 §4.10)

| Field                        | Value                                                    |
|------------------------------|----------------------------------------------------------|
| Post-Sanitization Status     | `in_progress` ← *(was: intake)*                         |
| Compliance Document (S3)     | N/A                                                      |
| Final Disposition            | TBD                                                      |
| Notes                        | Worker began sanitization procedure. HDD removed and labeled. Overwrite in progress. |

---

### [STEP COMPLETED] — 2026-04-10 08:35:47 UTC

#### Section 1 — Media Identification (NIST SP 800-88r2 §4.8)

| Field                        | Value                                  |
|------------------------------|----------------------------------------|
| Device ID (System)           | `d3f1a2b4-9c10-4e78-a6d5-001122334455` |
| Chassis Serial Number        | `SN-2024-00142`                        |
| Media Type                   | Laptop HDD                             |
| Manufacturer / Model         | Dell Latitude 5520                     |
| Storage Capacity             | 512 GB                                 |
| Interface Type               | SATA III                               |

#### Section 2 — Sanitization Record (NIST SP 800-88r2 §4.8)

| Field                        | Value                                            |
|------------------------------|--------------------------------------------------|
| Sanitization Method          | Purge                                            |
| Sanitization Tool / Technique| Blancco Drive Eraser v6.9                        |
| Step Completed               | Step 3 of 6 — DoD 5220.22-M 7-pass overwrite executed |
| Number of Passes             | 7 ✓ Complete                                     |
| Verification Method          | Hash validation post-wipe                        |
| Verification Result          | Pending                                          |
| Procedure Reference ID       | `proc-purge-001`                                 |

#### Section 3 — Chain of Custody (NIST SP 800-88r2 §4.9)

| Field                        | Value                                  |
|------------------------------|----------------------------------------|
| Performed By (Username)      | worker1                                |
| Performed By (Role)          | Worker                                 |
| Worker ID                    | `usr-9a1b2c3d`                         |
| Reviewed / Witnessed By      | Pending                                |
| Intake Timestamp             | 2026-04-10 08:14:32 UTC                |
| Event Timestamp              | 2026-04-10 08:35:47 UTC                |

#### Section 4 — Disposition (NIST SP 800-88r2 §4.10)

| Field                        | Value                                                    |
|------------------------------|----------------------------------------------------------|
| Post-Sanitization Status     | `in_progress`                                            |
| Compliance Document (S3)     | N/A                                                      |
| Final Disposition            | TBD                                                      |
| Notes                        | Overwrite completed successfully. Proceeding to hash validation step. |

---

### [WIPE RESULT] — 2026-04-10 08:41:09 UTC

#### Section 1 — Media Identification (NIST SP 800-88r2 §4.8)

| Field                        | Value                                  |
|------------------------------|----------------------------------------|
| Device ID (System)           | `d3f1a2b4-9c10-4e78-a6d5-001122334455` |
| Chassis Serial Number        | `SN-2024-00142`                        |
| Media Type                   | Laptop HDD                             |
| Manufacturer / Model         | Dell Latitude 5520                     |
| Storage Capacity             | 512 GB                                 |
| Interface Type               | SATA III                               |

#### Section 2 — Sanitization Record (NIST SP 800-88r2 §4.8)

| Field                        | Value                                  |
|------------------------------|----------------------------------------|
| Sanitization Method          | Purge                                  |
| Sanitization Tool / Technique| Blancco Drive Eraser v6.9              |
| Number of Passes             | 7 ✓                                   |
| Verification Method          | SHA-256 hash comparison post-wipe      |
| Verification Result          | **PASS ✓**                             |
| Procedure Reference ID       | `proc-purge-001`                       |

#### Section 3 — Chain of Custody (NIST SP 800-88r2 §4.9)

| Field                        | Value                                  |
|------------------------------|----------------------------------------|
| Performed By (Username)      | worker1                                |
| Performed By (Role)          | Worker                                 |
| Worker ID                    | `usr-9a1b2c3d`                         |
| Reviewed / Witnessed By      | admin                                  |
| Intake Timestamp             | 2026-04-10 08:14:32 UTC                |
| Event Timestamp              | 2026-04-10 08:41:09 UTC                |

#### Section 4 — Disposition (NIST SP 800-88r2 §4.10)

| Field                        | Value                                                    |
|------------------------------|----------------------------------------------------------|
| Post-Sanitization Status     | `verified` ← *(was: in_progress)*                       |
| Compliance Document (S3)     | N/A                                                      |
| Final Disposition            | Donate                                                   |
| Notes                        | Hash validation confirmed. All sectors zeroed. NIST-compliant destruction label applied with date and technician initials. |

---

### [COMPLIANCE GENERATED] — 2026-04-10 08:43:55 UTC

#### Section 1 — Media Identification (NIST SP 800-88r2 §4.8)

| Field                        | Value                                  |
|------------------------------|----------------------------------------|
| Device ID (System)           | `d3f1a2b4-9c10-4e78-a6d5-001122334455` |
| Chassis Serial Number        | `SN-2024-00142`                        |
| Media Type                   | Laptop HDD                             |
| Manufacturer / Model         | Dell Latitude 5520                     |
| Storage Capacity             | 512 GB                                 |
| Interface Type               | SATA III                               |

#### Section 2 — Sanitization Record (NIST SP 800-88r2 §4.8)

| Field                        | Value                                  |
|------------------------------|----------------------------------------|
| Sanitization Method          | Purge                                  |
| Sanitization Tool / Technique| Blancco Drive Eraser v6.9              |
| Number of Passes             | 7 ✓                                   |
| Verification Method          | SHA-256 hash comparison post-wipe      |
| Verification Result          | PASS ✓                                 |
| Procedure Reference ID       | `proc-purge-001`                       |

#### Section 3 — Chain of Custody (NIST SP 800-88r2 §4.9)

| Field                        | Value                                  |
|------------------------------|----------------------------------------|
| Performed By (Username)      | admin                                  |
| Performed By (Role)          | Administrator                          |
| Worker ID                    | `usr-9a1b2c3d`                         |
| Reviewed / Witnessed By      | admin                                  |
| Intake Timestamp             | 2026-04-10 08:14:32 UTC                |
| Event Timestamp              | 2026-04-10 08:43:55 UTC                |

#### Section 4 — Disposition (NIST SP 800-88r2 §4.10)

| Field                        | Value                                                                    |
|------------------------------|--------------------------------------------------------------------------|
| Post-Sanitization Status     | `documented` ← *(was: verified)*                                        |
| Compliance Document (S3)     | `s3://cityserve-docs/compliance/d3f1a2b4-2026-04-10.pdf`                |
| Final Disposition            | Donate                                                                   |
| Notes                        | Official NIST SP 800-88r2 compliance certificate generated and archived to S3. |

---

### [DELETED] — 2026-04-10 09:00:00 UTC

#### Section 1 — Media Identification (NIST SP 800-88r2 §4.8)

| Field                        | Value                                  |
|------------------------------|----------------------------------------|
| Device ID (System)           | `d3f1a2b4-9c10-4e78-a6d5-001122334455` |
| Chassis Serial Number        | `SN-2024-00142`                        |
| Media Type                   | Laptop HDD                             |
| Manufacturer / Model         | Dell Latitude 5520                     |
| Storage Capacity             | 512 GB                                 |
| Interface Type               | SATA III                               |

#### Section 2 — Sanitization Record (NIST SP 800-88r2 §4.8)

| Field                        | Value                                  |
|------------------------------|----------------------------------------|
| Sanitization Method          | Purge                                  |
| Sanitization Tool / Technique| Blancco Drive Eraser v6.9              |
| Number of Passes             | 7 ✓                                   |
| Verification Method          | SHA-256 hash comparison post-wipe      |
| Verification Result          | PASS ✓                                 |
| Procedure Reference ID       | `proc-purge-001`                       |

#### Section 3 — Chain of Custody (NIST SP 800-88r2 §4.9)

| Field                        | Value                                  |
|------------------------------|----------------------------------------|
| Performed By (Username)      | admin                                  |
| Performed By (Role)          | Administrator                          |
| Worker ID                    | `usr-9a1b2c3d`                         |
| Reviewed / Witnessed By      | admin                                  |
| Intake Timestamp             | 2026-04-10 08:14:32 UTC                |
| Event Timestamp              | 2026-04-10 09:00:00 UTC                |

#### Section 4 — Disposition (NIST SP 800-88r2 §4.10)

| Field                        | Value                                                                    |
|------------------------------|--------------------------------------------------------------------------|
| Post-Sanitization Status     | `closed`                                                                 |
| Compliance Document (S3)     | `s3://cityserve-docs/compliance/d3f1a2b4-2026-04-10.pdf`                |
| Final Disposition            | Donated — transferred to CityServe Arizona storage facility              |
| Notes                        | Record closed and archived per retention policy. Physical device transferred with compliance certificate. |

---

## Live Log

> Entries below are real. Add new entries above this line, newest first.

<!-- LIVE ENTRIES START -->
