# CLAUDE.md — Project Instructions

This file is read automatically by Claude Code at the start of every session.
Follow every instruction here before writing a single line of code.

---

## Project identity

- **Event:** GCU + AWS Cloud-a-thon — 24-hour hackathon
- **Nonprofit partners:** Circle the City (homeless healthcare, Phoenix AZ) · CityServe Arizona (community coordination)
- **Goal:** Working proof of concept that maps clearly to AWS services — not production code
- **Stack version:** `lean-mvp-ec2-s3-cf-1.0`

---

## Read these files before making any changes

When starting a session or taking on a new task, read in this order:

1. `README.md` — repo structure, stack, branch rules, API contract, DoD, hard constraints
2. `PRD.md` — problem statement, MVP scope, P0 features, out-of-scope list
3. `hackathon_bootstrap.md` — architecture decisions and the reasoning behind every structural choice

If a task involves Terraform or CI/CD, also read:
4. `deploymentguide.md` — exact infra steps, verification commands, expected outputs

Do not make changes that conflict with decisions documented in these files.
If you see a conflict, flag it and ask before proceeding.

---

## Repo structure (do not restructure this)

```
/
├── .github/workflows/
│   ├── backend-ci.yml
│   ├── terraform-plan.yml
│   └── terraform-deploy.yml
├── backend/
│   ├── app/main.py          ← FastAPI app — frozen API contract lives here
│   ├── app/config.py        ← Pydantic Settings — all config via .env
│   └── requirements.txt
├── frontend/
│   ├── src/api/client.ts    ← Axios client — reads VITE_API_URL
│   ├── src/pages/Home.tsx
│   └── vite.config.js       ← proxies /api and /health to localhost:8000
├── infra/
│   └── main.tf              ← ALL Terraform resources in one file — no modules
├── setup_hackathon_repo.sh
├── README.md
├── PRD.md
├── deploymentguide.md
└── CLAUDE.md                ← this file
```

---

## Stack

| Layer | Technology | Notes |
|---|---|---|
| Frontend | Vite + React 18 + TypeScript + Tailwind | `noUnusedLocals` and `noUnusedParameters` are disabled — do not re-enable |
| Backend | FastAPI + Uvicorn (Python 3.12) | Pydantic Settings reads from `.env` |
| Infra | Terraform — local state | Single `main.tf`, no modules |
| CI/CD | GitHub Actions — 3 workflows | Path-filtered deploys |
| EC2 access | AWS SSM only | No SSH key — never add SSH-based access patterns |

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

## AWS architecture — MVP baseline

```
Browser → CloudFront → S3       (React static frontend)
Browser → EC2:8000              (FastAPI backend)
```

### Terraform resources in scope

These are the baseline resources in `infra/main.tf`. Additional resources (Lambda functions,
DynamoDB tables, RDS instances) may be added here after DoD is confirmed green — keep them
flat in the same file, no modules.

- `aws_instance`
- `aws_security_group`
- `aws_s3_bucket` + `aws_s3_bucket_policy` + `aws_s3_bucket_public_access_block`
- `aws_cloudfront_origin_access_control`
- `aws_cloudfront_distribution`
- `aws_iam_role` + `aws_iam_instance_profile` + `aws_iam_role_policy_attachment` (SSM + S3 read)

### Terraform outputs (do not rename — CI/CD reads these by exact name)

```
cloudfront_url
cloudfront_distribution_id
s3_bucket_name
ec2_instance_id
ec2_public_ip
ec2_public_dns
```

---

## Hard constraints — treat these as absolute rules

### Infrastructure
1. **No new AWS services** until all four DoD items are confirmed green.
2. **No Terraform modules** — keep all resources flat in `infra/main.tf`. Do not refactor into modules once the first `apply` succeeds.
3. **No SSH access patterns** — EC2 is accessed via SSM only. Do not add key pairs, SSH ingress rules, or SSH-based deployment steps.
4. **Region baseline** — keep `infra/terraform.tfvars` and `infra/terraform.tfvars.example` on `us-west-1` unless the team intentionally changes regions.
5. **Private S3 + OAC baseline** — keep frontend bucket private and use `aws_cloudfront_origin_access_control.frontend` with `aws_s3_bucket_policy.frontend_private`.
6. **State adoption in CI** — keep best-effort Terraform import/adoption in deploy workflow to avoid duplicate deterministic resource creation.

### Service graduation rules (available after DoD is green)
7. **Lambda** — use for async/background tasks or anything that blocks the FastAPI request cycle. Not needed by default — only add when EC2 sync processing creates a real problem.
8. **Amazon Bedrock** — use for LLM inference, text generation, summarization. Call via boto3 from FastAPI on EC2. No external LLM APIs — keep data inside AWS.
9. **DynamoDB** — use for key-value storage, session data, event logs, or schema-less data. Faster to set up than RDS for simple data needs.
10. **RDS (PostgreSQL)** — use when you need relational queries, joins, or ACID transactions. Do not use for simple key-value patterns.
11. **API Gateway** — do not use. FastAPI on EC2 covers all routing for this scope.

### Auth
9. **Basic auth is required** — JWT tokens, protected routes, login page. Use FastAPI `python-jose` + `passlib`. No third-party auth providers.
10. **Scope is username/password + JWT only** — no OAuth, SSO, or MFA.
11. All protected routes must return `401` when no valid token is present. The frontend must redirect to `/login` on any `401`.

### Code and workflow
12. **Do not change the API contract** — `/health` and `/api/integrations` response shapes are permanent.
13. **Do not commit** `backend/.env`, `infra/terraform.tfvars`, `.terraform/`, `*.tfstate`, or `*.tfstate.*`.
14. **Do not add GitHub Secrets** beyond the three required ones (`AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`).
15. **Keep PRs and changes small** — one working thing per change.
16. **Do not re-enable TypeScript strict flags** — `noUnusedLocals` and `noUnusedParameters` are intentionally `false` in `tsconfig.json`.

---

## Branch strategy — always follow this flow

```
feature/* → test → dev → main
```

- All new work branches off `dev`
- `feature/*` PRs target `test` — backend CI runs
- `test` PRs target `dev` — full deploy triggers on merge
- `dev` PRs target `main` — production deploy

Never commit directly to `dev` or `main`.
Never branch off `main` for feature work.

---

## How to run things locally

### Backend

```bash
cd backend
source .venv/bin/activate          # Windows Git Bash: source .venv/Scripts/activate
                                    # Windows PowerShell: .venv\Scripts\Activate.ps1
uvicorn app.main:app --reload
```

### Frontend

```bash
cd frontend
npm run dev
```

### Health Check

```bash
cd backend
source .venv/bin/activate
curl http://localhost:8000/health
```

Expected: `{"status":"ok","environment":"local"}`.
If this check fails, fix the backend before making any other changes.

### Verify backend is healthy

```bash
curl http://localhost:8000/health
# Must return: {"status":"ok","environment":"local"}

curl http://localhost:8000/api/integrations
# Must return: {"services":{"analytics":"","notifications":"","payments":""}}
```

---

## Definition of Done — check before adding any features

All four must be green:

- [ ] `terraform apply` is repeatable and the full pipeline passes end-to-end
- [ ] CloudFront URL loads the React frontend
- [ ] EC2 is running, SSM-managed, and receives backend deploys from CI
- [ ] `/health` returns `{"status":"ok"}` from `localhost:8000` and from the EC2 IP

If DoD is not confirmed green, do not add new features or new AWS services.

---

## CI/CD — what each workflow does

| Workflow | Trigger | Jobs |
|---|---|---|
| `backend-ci.yml` | push/PR on `test`, `dev`, `main` — `backend/**` | /health smoke check |
| `terraform-plan.yml` | PR into `dev` or `main` — `infra/**` | terraform plan only |
| `terraform-deploy.yml` | push to `dev` or `main` — any path | infra adopt/apply + EC2 checks + backend SSM deploy + frontend S3 sync + CloudFront invalidation |

### Deploy job sequence (do not reorder or skip steps)

```
changes → infra → ec2 checks → backend + frontend
```

The `infra` job captures Terraform outputs and passes them to `backend` and `frontend` jobs.
Do not hardcode bucket names, distribution IDs, or instance IDs in workflow files.

---

## Environment variables

### `backend/.env` (never commit — auto-created by setup script)

```env
ENVIRONMENT=local
PORT=8000
ALLOWED_ORIGINS=*
SERVICE_ENDPOINTS_JSON={"analytics":"","notifications":"","payments":""}
```

### `frontend/.env.local` (never commit — create manually if needed)

```env
VITE_API_URL=http://<ec2_public_ip>:8000
```

### `infra/terraform.tfvars` (never commit — auto-created by setup script)

```hcl
project_name         = "hackathon"
environment          = "dev"
region               = "us-west-1"
ec2_instance_type    = "t3.micro"
ec2_key_name         = null
frontend_bucket_name = ""
```

---

## Auto-generated files — do not recreate or overwrite

These files are generated by `setup_hackathon_repo.sh`. Do not regenerate them
unless explicitly asked, and never use `--force` without confirming with the team:

- `backend/.env` (copied from `.env.example`)
- `infra/terraform.tfvars` (copied from `.tfvars.example`)
- All files under `.github/workflows/`
- `backend/app/main.py` and `backend/app/config.py` (baseline scaffolded)
- `frontend/vite.config.js` (Vite proxy config — do not change proxy targets)

---

## What good output looks like for this project

- Auth routes live in `backend/app/auth.py` (or `backend/app/routers/auth.py`) — never inline in `main.py`
- New backend features are FastAPI routes added to `backend/app/main.py` or new files under `backend/app/`
- New frontend features are React components added under `frontend/src/pages/` or `frontend/src/components/`
- Protected frontend routes check for a valid token before rendering — redirect to `/login` on `401`
- New service integrations are added to `SERVICE_ENDPOINTS_JSON` in `.env` — never as new API routes unless explicitly required
- All changes are small enough to review in under 5 minutes
- No change breaks the two frozen baseline routes (`/health`, `/api/integrations`)

---

## When you are unsure

If a requested change would:
- Add a new AWS service **before DoD is green** — stop and flag it
- Add Lambda, DynamoDB, RDS, or Bedrock **without a clear reason why EC2 alone won't work** — flag it and ask
- Conflict with the frozen API contract (`/health`, `/api/integrations`) — stop and flag it
- Restructure Terraform into modules — stop and flag it
- Add auth beyond username/password + JWT — stop and flag it

Do not work around constraints silently. State the conflict explicitly and wait for a decision.

---

*Stack version: lean-mvp-ec2-s3-cf-1.0*
*Event: GCU + AWS Cloud-a-thon · Grand Canyon University · Phoenix, AZ*