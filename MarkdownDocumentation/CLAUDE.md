# CLAUDE.md — Project Instructions

This file is read automatically by Claude Code at the start of every session.
Follow every instruction here before writing a single line of code.

---

## Project identity

- **Origin:** GCU Cloud-a-thon hackathon project
- **Nonprofit partners:** Circle the City (homeless healthcare, Phoenix AZ) · CityServe Arizona (community coordination)
- **Goal:** Device sanitization tracking system with NIST SP 800-88 compliance
- **Stack version:** `local-standalone-1.0`

---

## Read these files before making any changes

When starting a session or taking on a new task, read in this order:

1. `README.md` — repo structure, stack, API contract
2. `PRD.md` — problem statement, MVP scope, P0 features, out-of-scope list

Do not make changes that conflict with decisions documented in these files.
If you see a conflict, flag it and ask before proceeding.

---

## Repo structure (do not restructure this)

```
/
├── backend/
│   ├── app/main.py          ← FastAPI app — frozen API contract lives here
│   ├── app/config.py        ← Pydantic Settings — all config via .env
│   ├── app/db.py            ← Database access (JSON file-based mock DB)
│   ├── app/mock_db.py       ← DynamoDB-like interface using JSON files
│   ├── app/auth.py          ← JWT auth routes
│   ├── app/pdf.py           ← NIST compliance PDF generator
│   ├── app/routers/         ← devices, compliance, analytics routers
│   ├── data/                ← JSON database files
│   └── requirements.txt
├── frontend/
│   ├── src/api/client.ts    ← Axios client — reads VITE_API_URL
│   ├── src/pages/           ← React page components
│   ├── src/components/      ← Shared components
│   └── vite.config.js       ← proxies /api and /health to localhost:8000
├── README.md
├── PRD.md
└── CLAUDE.md                ← this file
```

---

## Stack

| Layer | Technology | Notes |
|---|---|---|
| Frontend | Vite + React 18 + TypeScript + Tailwind | `noUnusedLocals` and `noUnusedParameters` are disabled — do not re-enable |
| Backend | FastAPI + Uvicorn (Python 3.12) | Pydantic Settings reads from `.env` |
| Database | JSON file-based mock DB | Files in `backend/data/`, DynamoDB-like interface |

---

## API contract — FROZEN — do not change response shapes

These two routes are the stable contract between backend and frontend.
Never rename keys, add top-level keys, or change response structure.

```
GET /health
→ { "status": "ok", "environment": "local" }

GET /api/integrations
→ { "services": { "analytics": "", "notifications": "", "payments": "" } }
```

### How to add new integrations

Add new services through `SERVICE_ENDPOINTS_JSON` in `backend/.env` only:

```env
SERVICE_ENDPOINTS_JSON={"analytics":"https://...","notifications":"","payments":""}
```

The `services` object in the response will reflect these values automatically.
Do not add new routes or new top-level response keys to satisfy an integration need.

---

## Hard constraints — treat these as absolute rules

### Auth
1. **Basic auth is required** — JWT tokens, protected routes, login page. Use FastAPI `python-jose` + `passlib`. No third-party auth providers.
2. **Scope is username/password + JWT only** — no OAuth, SSO, or MFA.
3. All protected routes must return `401` when no valid token is present. The frontend must redirect to `/login` on any `401`.

### Code and workflow
4. **Do not change the API contract** — `/health` and `/api/integrations` response shapes are permanent.
5. **Do not commit** `backend/.env`.
6. **Keep PRs and changes small** — one working thing per change.
7. **Do not re-enable TypeScript strict flags** — `noUnusedLocals` and `noUnusedParameters` are intentionally `false` in `tsconfig.json`.

---

## How to run things locally

### Backend

```bash
cd backend
source .venv/bin/activate
uvicorn app.main:app --reload
```

### Frontend

```bash
cd frontend
npm run dev
```

### Seed the database

```bash
cd backend
python seed_db.py        # seeds procedures, devices, users from data/ JSON
python seed_mock_db.py   # regenerates seed data JSON files
```

### Health Check

```bash
curl http://localhost:8000/health
# Must return: {"status":"ok","environment":"local"}

curl http://localhost:8000/api/integrations
# Must return: {"services":{"analytics":"","notifications":"","payments":""}}
```

---

## Environment variables

### `backend/.env` (never commit)

```env
ENVIRONMENT=local
PORT=8000
ALLOWED_ORIGINS=*
SERVICE_ENDPOINTS_JSON={"analytics":"","notifications":"","payments":""}
JWT_SECRET_KEY=change-me-to-a-random-secret
```

### `frontend/.env.local` (never commit — create manually if needed)

```env
VITE_API_URL=http://localhost:8000
```

---

## What good output looks like for this project

- Auth routes live in `backend/app/auth.py` — never inline in `main.py`
- New backend features are FastAPI routes added to `backend/app/main.py` or new files under `backend/app/`
- New frontend features are React components added under `frontend/src/pages/` or `frontend/src/components/`
- Protected frontend routes check for a valid token before rendering — redirect to `/login` on `401`
- New service integrations are added to `SERVICE_ENDPOINTS_JSON` in `.env` — never as new API routes unless explicitly required
- All changes are small enough to review in under 5 minutes
- No change breaks the two frozen baseline routes (`/health`, `/api/integrations`)

---

## When you are unsure

If a requested change would:
- Conflict with the frozen API contract (`/health`, `/api/integrations`) — stop and flag it
- Add auth beyond username/password + JWT — stop and flag it

Do not work around constraints silently. State the conflict explicitly and wait for a decision.

---

*Stack version: local-standalone-1.0*
*Origin: GCU Cloud-a-thon · Grand Canyon University · Phoenix, AZ*
