# Hackathon Repo Bootstrap (Lean 24-Hour Version)
> Goal: ship a working demo fast from a simple, extensible base.

This version is intentionally simplified so the full setup (local + AWS + CI/CD) is realistic in <= 3 hours.

---

## Scope Rules (Non-Negotiable)

1. Start with only three AWS resources in scope: EC2, S3, CloudFront.
2. Keep Terraform and GitHub Actions CI/CD from day one.
3. Avoid Lambda, API Gateway, DynamoDB, and multi-service orchestration initially.
4. Keep backend optional and lightweight (single process on EC2 if needed).
5. Keep frontend static and deploy to S3 + CloudFront.
6. Design config so future service integrations can be added without breaking the current contract.

---

## Target Setup Time (<= 3 Hours Total)

1. Tool install + repo bootstrap: 30-45 min
2. AWS credentials + Terraform apply: 45-75 min
3. Local backend + frontend run: 20-30 min
4. GitHub secrets + first CI deploy check: 30-45 min

If you exceed 3 hours, stop adding features and finish only the core path.

---

## Architecture (MVP Baseline)

```text
Browser
  -> CloudFront -> S3 (React static build)

Optional API path for next increment:
Browser
  -> EC2 (single lightweight backend process)
```

Local dev:

```text
localhost:5173 (Vite)
  -> proxy /api to localhost:8000
localhost:8000 (Uvicorn FastAPI)
  -> lightweight placeholders for future integrations
```

---

## Lean Tech Stack

- Frontend: Vite + React + TypeScript + Tailwind
- Backend (optional now, ready for next step): FastAPI + Uvicorn on EC2
- Infra: Terraform (local state)
- CI/CD: GitHub Actions (terraform + frontend deploy)

---

## Branch Strategy (Required)

Use exactly three long-lived branches:

1. test - integration/testing branch for active feature work
2. dev - stable pre-production branch
3. main - production branch

Flow:

1. feature branches -> test
2. test -> dev
3. dev -> main

CI/CD behavior:

1. push/PR on test runs backend API health smoke checks
2. push/PR on dev runs backend API health smoke checks
3. push on dev and main runs terraform + frontend deploy workflow

---

## Simplified Repo Structure

```text
/
├── .github/
│   └── workflows/
│       ├── backend-ci.yml
│       ├── terraform-plan.yml
│       └── terraform-deploy.yml
├── infra/
│   ├── main.tf
│   ├── variables.tf
│   ├── outputs.tf
│   └── terraform.tfvars.example
├── backend/
│   ├── app/
│   │   ├── main.py
│   │   └── config.py
│   ├── requirements.txt
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── App.tsx
│   │   ├── main.tsx
│   │   ├── index.css
│   │   ├── api/
│   │   │   └── client.ts
│   │   └── pages/
│   │       └── Home.tsx
│   ├── index.html
│   ├── package.json
│   ├── vite.config.js
│   ├── tailwind.config.js
│   └── postcss.config.js
├── .gitignore
└── README.md
```

---

## Simplified Terraform (Single Layer, No Modules)

Keep all infra in one infra/main.tf file to reduce complexity.

Reliability defaults used in this repo:

1. `infra/terraform.tfvars.example` defaults `region` to `us-west-1` to match bootstrap and CI guidance.
2. Frontend bucket is private and served through CloudFront OAC (`aws_cloudfront_origin_access_control.frontend`) to avoid public-policy drift.
3. CI performs best-effort Terraform state adoption/import for deterministic names before plan/apply, reducing duplicate resource failures.

Resources only:

1. aws_instance (EC2 app host)
2. aws_security_group (EC2 access)
3. aws_s3_bucket (frontend hosting)
4. aws_s3_bucket_public_access_block
5. aws_s3_bucket_policy (CloudFront service principal read, private bucket)
6. aws_cloudfront_origin_access_control
7. aws_cloudfront_distribution (private S3 origin via OAC)

Outputs:

- cloudfront_url
- s3_bucket_name
- cloudfront_distribution_id
- ec2_instance_id
- ec2_public_ip
- ec2_public_dns

---

## Backend Minimum Contract (Optional but Ready)

Keep backend very small for day one.

Routes:

- GET /health
- GET /api/integrations

The /api/integrations route should return a service map placeholder so new services can be connected later without changing the frontend contract.

---

## Frontend Minimum Contract

Single page (Home) with:

1. API health status display
2. future integrations list display

This gives a deployable UI now and a stable place to surface future service links later.

---

## Environment Variables

### backend/.env.example

```env
ENVIRONMENT=local
PORT=8000
ALLOWED_ORIGINS=*
SERVICE_ENDPOINTS_JSON={"analytics":"","notifications":"","payments":""}
```

### frontend/.env.local

```env
VITE_API_URL=http://localhost:8000
```

---

## CI/CD (Three Workflows)

### backend-ci.yml

Trigger: push + pull request on test, dev, main for backend/** changes.

Checks executed:

1. API health smoke check: GET /health returns 200

### terraform-plan.yml

Trigger: pull request into dev or main for infra/** changes.

Step:

1. terraform plan

### terraform-deploy.yml

Trigger: push to dev or main for infra/backend/frontend changes.

Steps:

1. Ensure Terraform state exists and check EC2 health.
2. Run terraform apply when infra changed or EC2 is missing/terminated.
3. Verify EC2 can read S3 via attached IAM role.
4. Deploy backend package to EC2 via SSM (when backend or infra changes).
5. Build frontend + S3 sync + CloudFront invalidation (when frontend or infra changes).

---

## Required GitHub Secrets (MVP)

Set these only:

1. AWS_ACCESS_KEY_ID
2. AWS_SECRET_ACCESS_KEY
3. AWS_REGION

Terraform outputs are passed between jobs, so bucket/distribution IDs do not need to be static secrets.

---

## AWS Bootstrap (Fastest Path)

1. Create IAM user hackathon-cicd with AdministratorAccess (hackathon only).
2. Create access key.
3. Run aws configure --profile hackathon.
4. Export profile before Terraform/CLI work:

```bash
export AWS_PROFILE=hackathon
```

---

## 3-Hour Execution Plan

### Hour 0:00-0:45

- Clone repo
- Install Python/Node/AWS CLI/Terraform (only if missing)
- Backend and frontend run locally (health endpoint + page load)

### Hour 0:45-1:45

- Fill infra/terraform.tfvars
- terraform init && terraform apply
- verify outputs

### Hour 1:45-2:20

- Add GitHub secrets
- push merge commit to trigger workflows

### Hour 2:20-3:00

- Verify CloudFront URL loads frontend
- Verify backend health endpoint (if backend enabled)
- Freeze architecture and start feature work

---

## Hard Constraints During Hackathon

1. No new AWS services until MVP infra is stable.
2. No Terraform refactors once first apply works.
3. Keep backend lightweight; avoid introducing Lambda/API Gateway until needed.
4. Keep PRs small; merge fast; verify pipeline after each merge.

---

## Definition of Done (MVP)

1. CloudFront URL loads frontend.
2. Terraform apply is repeatable and pipeline passes at least once.
3. EC2 instance is running, SSM-managed, and receives backend deploy from CI.
4. Frontend can read backend health locally (or from EC2 if configured).

If all 4 are true, your team is in a strong position for a 24-hour demo.

---

Document version: lean-mvp-ec2-s3-cf-1.0
