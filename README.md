# CityServe Device Sanitization Compliance System

A guided workflow system that walks workers through NIST SP 800-88 compliant device sanitization and automatically generates audit-ready compliance documentation. Built for [CityServe Arizona](https://www.cityserveaz.org/), a nonprofit coordinating community services in Phoenix, AZ.

> **Origin:** GCU + AWS Cloud-a-thon hackathon project

---

## What It Does

CityServe processes donated devices that must be securely wiped to federal standards before reuse. This system replaces manual paper checklists with a guided digital workflow:

1. **Intake** -- Worker enters a device serial number and selects the drive type
2. **Guided procedure** -- The system loads the correct NIST-compliant steps and walks the worker through each one
3. **Compliance certificate** -- On completion, a NIST SP 800-88 PDF certificate is auto-generated with full audit trail

No training required. The system holds the knowledge, not the worker.

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Vite + React 18 + TypeScript + Tailwind CSS |
| Backend | FastAPI + Uvicorn (Python 3.12) |
| Database | JSON file-based mock DB (DynamoDB-compatible interface) |
| Auth | JWT (`python-jose` + `passlib`) |
| PDF Generation | ReportLab (NIST SP 800-88 certificates) |

---

## Local Development

### Prerequisites

- Python 3.12+
- Node.js 20+ / npm 10+
- Git

### Backend

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate       # Windows Git Bash: source .venv/Scripts/activate
pip install -r requirements.txt
cp .env.example .env            # then edit JWT_SECRET_KEY
uvicorn app.main:app --reload
```

The backend runs at `http://localhost:8000`.

### Frontend

```bash
cd frontend
npm install
npm run dev
```

The frontend runs at `http://localhost:5173` and proxies API requests to the backend.

### Seed Data

```bash
cd backend
python seed_db.py
```

### Verify

```bash
curl http://localhost:8000/health
# {"status":"ok","environment":"local"}
```

---

## Project Structure

```
/
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI app entry point
│   │   ├── config.py            # Pydantic Settings (.env)
│   │   ├── db.py                # Database access layer
│   │   ├── mock_db.py           # DynamoDB-like interface using JSON files
│   │   ├── auth.py              # JWT auth (login, signup, token validation)
│   │   ├── pdf.py               # NIST compliance PDF generator
│   │   ├── models.py            # Pydantic response models
│   │   └── routers/
│   │       ├── devices.py       # Device CRUD + step completion
│   │       ├── compliance.py    # Compliance docs + dashboard + audit log
│   │       └── analytics.py     # Operational statistics
│   ├── data/                    # JSON database files (gitignored)
│   ├── seed_db.py               # Database seeder
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── api/client.ts        # Axios client
│   │   ├── pages/               # React page components
│   │   └── components/          # Shared components
│   └── vite.config.js           # Proxies /api and /health to backend
└── MarkdownDocumentation/       # Project docs, guides, pitch deck
```

---

## API Overview

### Auth

| Method | Route | Description |
|--------|-------|-------------|
| POST | `/auth/login` | Login with username/password, returns JWT |
| POST | `/auth/signup` | Self-service account creation (worker role) |
| GET | `/auth/me` | Current user info |

### Devices

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/devices` | List all devices |
| POST | `/api/devices` | Intake a new device |
| GET | `/api/devices/{id}` | Device detail with step history |
| PATCH | `/api/devices/{id}/step` | Confirm a procedure step |
| POST | `/api/devices/{id}/complete` | Mark device complete, generate PDF |

### Compliance & Analytics

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/compliance/{id}` | Compliance doc status |
| GET | `/api/compliance/{id}/download` | Download PDF certificate |
| GET | `/api/dashboard` | Device counts by status and type |
| GET | `/api/audit` | Chronological activity log |
| GET | `/api/stats` | Operational statistics |

---

## Environment Variables

### `backend/.env` (never commit)

```env
ENVIRONMENT=local
PORT=8000
ALLOWED_ORIGINS=*
SERVICE_ENDPOINTS_JSON={"analytics":"","notifications":"","payments":""}
JWT_SECRET_KEY=change-me-to-a-random-secret
```

See `backend/.env.example` for the full template.

---

## Device Types Supported

| Type | NIST Method | Procedure |
|------|-------------|-----------|
| HDD (Laptop/Desktop) | Purge (overwrite) | 3-pass wipe |
| SSD (Laptop/Desktop) | Purge (ATA Secure Erase) | ATA Secure Erase |
| Tablet / Mobile | Purge (factory reset) | Full factory reset |
| External Drive (HDD) | Purge (overwrite) | 3-pass wipe |
| External Drive (SSD) | Purge (ATA Secure Erase) | ATA Secure Erase |

---

## Frontend Pages

| Page | Route | Description |
|------|-------|-------------|
| Login | `/login` | Username/password authentication |
| Sign Up | `/signup` | Self-service account creation |
| Dashboard | `/` | Summary stats and device counts |
| Device Intake | `/intake` | Enter new device for processing |
| Device Detail | `/device/:id` | Step-by-step guided procedure |
| Drive Type ID | `/drive-type` | Drive type identification helper |
| All Devices | `/devices` | Full device list with search |
| Search | `/search` | Search devices by serial/ID |
| Compliance Record | `/compliance/:id` | View/download compliance PDF |
| Analytics | `/analytics` | Operational metrics |
| Admin Dashboard | `/admin` | Admin device management |
| Admin Users | `/admin/users` | User management (admin only) |

---

## Branch Strategy

```
feature/* → dev → main
```

---

## License

Hackathon project -- built for CityServe Arizona at the GCU + AWS Cloud-a-thon, Grand Canyon University, Phoenix, AZ.
