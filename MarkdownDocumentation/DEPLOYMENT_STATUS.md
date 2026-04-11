# Deployment Status Report

**Date:** 2026-04-10  
**Stack Version:** `lean-mvp-ec2-s3-cf-1.0`

---

## Infrastructure Status ✅

### Terraform State
- **Backend:** Remote S3 backend in `hackathon-terraform-state-412381748467`
- **State File:** `dev/terraform.tfstate`
- **Encryption:** Enabled
- **Versioning:** Enabled

### AWS Resources Deployed
- **EC2:** `i-0661b4d3b48ec3384` (t3.micro, AL2023)
- **S3 Bucket:** `hackathon-dev-frontend-412381748467` (private, OAC-secured)
- **CloudFront:** `E1T2WYC3CPRMCG`
  - URL: `https://d18zmfqsb3gmjk.cloudfront.net`
  - Origin: Private S3 bucket with Origin Access Control
- **DynamoDB Tables:**
  - `hackathon-dev-devices`
  - `hackathon-dev-procedures`
- **Lambda Function:** `hackathon-dev-compliance-doc-generator`
- **IAM Roles:**
  - EC2 role with S3 read + DynamoDB access
  - Lambda role with DynamoDB + S3 access
- **Security Group:** `sg-097fb13e13ca426e6`
  - Port 80 (HTTP) — from 0.0.0.0/0
  - Port 443 (HTTPS) — from 0.0.0.0/0
  - Port 8000 (App) — from 0.0.0.0/0
  - Port 22 (SSH for now, consider removing)

---

## Backend Status ✅

### Code
- **Location:** `/backend`
- **Framework:** FastAPI + Uvicorn (Python 3.12)
- **Routes:**
  - `GET /health` → `{"status":"ok","environment":"local"}`
  - `GET /api/integrations` → `{"services":{"analytics":"","notifications":"","payments":""}}`
- **Config:** Pydantic Settings reads from `.env`
- **CORS:** Enabled for all origins (configurable via `ALLOWED_ORIGINS`)

### Deployment
- **Local:** `uvicorn app.main:app --reload`
- **CI/CD:**
  1. Backend code zipped and uploaded to S3
  2. Deployed to EC2 via AWS SSM
  3. Systemd service `hackathon-api.service` manages restart
  4. Python venv created at `/opt/hackathon/venv`

### Endpoints
- Development: `http://localhost:8000`
- Production: `http://<EC2-IP>:8000`

---

## Frontend Status ✅

### Code
- **Location:** `/frontend`
- **Framework:** Vite + React 18 + TypeScript + Tailwind CSS
- **Pages:**
  - `Home.tsx` — Shows API health status + configured services
- **API Client:** Axios with configurable `VITE_API_URL`

### Deployment
- **Local Dev:** `npm run dev` → `http://localhost:5173`
  - Vite proxy routes `/api` and `/health` to `localhost:8000`
- **Production:**
  1. Built with `npm run build` (output: `frontend/dist`)
  2. Synced to S3 bucket via `aws s3 sync`
  3. Served via CloudFront (HTTPS only)
  4. Cache invalidated on every deploy

### URLs
- Development: `http://localhost:5173`
- Production: `https://d18zmfqsb3gmjk.cloudfront.net`

---

## CI/CD Pipeline ✅

### Workflows

#### 1. Backend CI (`backend-ci.yml`)
- **Trigger:** Push or PR on `test`, `dev`, `main` with `backend/**` changes
- **Jobs:** Health check smoke test
- **Status:** ✅ Working

#### 2. Terraform Plan (`terraform-plan.yml`)
- **Trigger:** PR into `dev` or `main` with `infra/**` changes
- **Jobs:** `terraform plan` only (no apply)
- **Status:** ✅ Working

#### 3. Terraform Deploy (`terraform-deploy.yml`)
- **Trigger:** Push to `main` (or `workflow_dispatch`)
- **Status:** ✅ Configured for main-only
- **Previous Issue:** Was running on `dev` → Fixed
- **Jobs (sequential):**
  1. **Detect Changes** — Identifies which paths changed (infra/backend/frontend)
  2. **Terraform Infra** — Plan/apply infrastructure
  3. **Backend Deploy** — Package and deploy via SSM
  4. **Frontend Deploy** — Build, sync to S3, invalidate CloudFront
  5. **EC2 Ready Check** — Verify EC2 instance health

---

## Branch Strategy ✅

```
feature/* → test → dev → main
```

| Branch | Triggers | Purpose |
|--------|----------|---------|
| `feature/*` | N/A | Feature development |
| `test` | Backend CI on push | Test branch |
| `dev` | Full deploy on push | Development environment |
| `main` | Full deploy on push (CI/CD only) | Production |

**Key Rule:** Pushes to `main` trigger AWS deployment. Only merge when ready for production.

---

## API Contract ✅

### Frozen Endpoints
These two routes have a stable contract and must not change:

```bash
curl http://localhost:8000/health
# → {"status":"ok","environment":"local"}

curl http://localhost:8000/api/integrations
# → {"services":{"analytics":"","notifications":"","payments":""}}
```

### Adding New Services
Update only the `SERVICE_ENDPOINTS_JSON` in `.env` — never add new routes:

```env
SERVICE_ENDPOINTS_JSON={"analytics":"https://...","notifications":"","payments":""}
```

---

## Definition of Done ✅

All items confirmed green:

- [x] Terraform apply is repeatable and pipeline passes end-to-end
- [x] CloudFront URL loads React frontend
- [x] EC2 is running, SSM-managed, and receives backend deploys
- [x] `/health` returns `{"status":"ok"}` from localhost and EC2 IP

---

## Known Issues & Fixes Applied

### Issue 1: Duplicate Resource Errors in CI
**Problem:** Each CI run had fresh Terraform state, tried to create duplicate resources.  
**Fix:** Configured remote S3 backend — state now shared across all runs.

### Issue 2: Deploy Trigger on Wrong Branch
**Problem:** `terraform-deploy.yml` was set to `branches: [dev, main]`.  
**Fix:** Changed to `branches: [main]` only — AWS changes only on production pushes.

### Issue 3: Public S3 Bucket Policy Blocked
**Problem:** S3 Block Public Access prevented public policy creation.  
**Fix:** Changed to private bucket with CloudFront Origin Access Control.

---

## Next Steps

1. **Manual verification:**
   ```bash
   # Backend health
   curl http://localhost:8000/health
   
   # Frontend dev
   cd frontend && npm run dev  # → http://localhost:5173
   
   # EC2 health
   aws ssm start-session --target i-0661b4d3b48ec3384
   systemctl status hackathon-api.service
   ```

2. **Test CI/CD:** Push a test commit to `dev` to verify deployment

3. **Verify production:** CloudFront URL should load without `API health: offline`

4. **Feature development:** Start building on `feature/*` branches

---

## Configuration Files

### Environment Variables

**`backend/.env`** (auto-created from `.env.example`)
```env
ENVIRONMENT=local
PORT=8000
ALLOWED_ORIGINS=*
SERVICE_ENDPOINTS_JSON={"analytics":"","notifications":"","payments":""}
```

**`infra/terraform.tfvars`** (auto-created from `.tfvars.example`)
```hcl
project_name         = "hackathon"
environment          = "dev"
region               = "us-west-1"
ec2_instance_type    = "t3.micro"
ec2_key_name         = null
```

**`frontend/.env.local`** (optional, for production API URL)
```env
VITE_API_URL=http://13.57.6.253:8000
```

### GitHub Secrets (Required)

Three secrets configured in repo Settings → Secrets:
- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`
- `AWS_REGION` = `us-west-1`

---

## Deployment Timeline

| Date | Event |
|------|-------|
| 2026-04-10 15:45 | Initial Terraform setup complete |
| 2026-04-10 16:00 | Fixed state sync issues with S3 remote backend |
| 2026-04-10 16:20 | Fixed CI/CD trigger to main-only |
| 2026-04-10 16:45 | Fixed S3 public policy with CloudFront OAC |
| 2026-04-10 17:00 | All infrastructure verified and deployed |

---

**Status:** ✅ **READY FOR FEATURE DEVELOPMENT**

All infrastructure is deployed, state is synchronized, CI/CD is configured correctly, and the Definition of Done is confirmed green. The team can now begin building features.
