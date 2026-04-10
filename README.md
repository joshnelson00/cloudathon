# GCU + AWS Cloud-a-thon — Hackathon Starter

> **Event:** GCU + AWS Cloud-a-thon · Building 5, Grand Canyon University · Phoenix, AZ
> **Stack version:** `lean-mvp-ec2-s3-cf-1.0`
> **Nonprofit partners:** Circle the City · CityServe Arizona

---

## Table of contents

1. [Who does what](#who-does-what)
2. [Prerequisites — install by OS](#prerequisites--install-by-os)
3. [Teammate quick start](#teammate-quick-start)
4. [What this repo is](#what-this-repo-is)
5. [Repo structure](#repo-structure)
6. [Tech stack](#tech-stack)
7. [Local development](#local-development)
8. [AWS deployment](#aws-deployment)
9. [CI/CD pipeline](#cicd-pipeline)
10. [Branch strategy](#branch-strategy)
11. [API contract](#api-contract)
12. [Environment variables](#environment-variables)
13. [Definition of Done](#definition-of-done)
14. [Hard constraints](#hard-constraints)
15. [Useful commands](#useful-commands)
16. [Troubleshooting](#troubleshooting)

---

## Who does what

**Repo owner (one person only):**
- Runs `setup_hackathon_repo.sh`
- Sets up AWS IAM, Terraform, and GitHub Secrets
- Runs the first `terraform apply` to get infrastructure live
- Creates the `test`, `dev`, and `main` branches
- Confirms the Definition of Done is green before handing off to teammates

**Teammates (everyone else):**
- Installs tools from the [Prerequisites](#prerequisites--install-by-os) section
- Clones the repo and follows [Teammate quick start](#teammate-quick-start) — 4 steps to be running locally
- Starts building features immediately

> Teammates never need to touch Terraform, AWS credentials, or GitHub Secrets.
> The CI/CD pipeline handles all deploys automatically on every push to `dev`.

---

## Prerequisites — install by OS

Install all required tools before cloning the repo. Pick your OS below.

> **Repo owner needs:** `python3` · `node` · `npm` · `aws` · `terraform` · `git`
>
> **Teammates only need:** `python3` · `node` · `npm` · `git`
> (AWS CLI and Terraform are only needed by the repo owner for the initial AWS setup)

---

### macOS

**Step 1 — Install Homebrew** (skip if already installed)

```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

Expected output ends with:
```
==> Installation successful!
```

**Step 2 — Install all tools**

```bash
brew install python@3.12 node awscli terraform git
```

**Step 3 — Verify**

```bash
python3 --version && node --version && npm --version && aws --version && terraform --version && git --version
```

Expected output:
```
Python 3.12.x
v20.x.x
10.x.x
aws-cli/2.x.x Python/3.x.x Darwin/...
Terraform v1.x.x
git version 2.x.x
```

All six lines must appear. If any line is missing, re-run the `brew install` command for that tool.

---

### Windows

Use **winget** (built into Windows 11 and Windows 10 1709+).
Open **PowerShell as Administrator** (right-click Start → "Windows PowerShell (Admin)").

**Step 1 — Install all tools**

```powershell
winget install Python.Python.3.12
winget install OpenJS.NodeJS.LTS
winget install Amazon.AWSCLI
winget install Hashicorp.Terraform
winget install Git.Git
```

**Step 2 — Close and reopen PowerShell** (required to pick up PATH changes), then verify:

```powershell
python3 --version
node --version
npm --version
aws --version
terraform --version
git --version
```

Expected output:
```
Python 3.12.x
v20.x.x
10.x.x
aws-cli/2.x.x Python/3.x.x Windows/...
Terraform v1.x.x
git version 2.x.x.windows.x
```

**Step 3 — Choose a shell for bash commands**

The setup script is a bash script and does not run in PowerShell or CMD. Choose one:

- **Git Bash** (simpler — installed automatically with Git above):
  Search "Git Bash" in Start menu and use it for all bash commands in this README.

- **WSL2** (recommended for a full Linux environment):
  ```powershell
  # In PowerShell as Administrator
  wsl --install
  # Restart your machine when prompted, then open the Ubuntu app
  # Inside Ubuntu, follow the Ubuntu section below
  ```

---

### Ubuntu / Debian (and WSL2)

**Step 1 — Update package index**

```bash
sudo apt update && sudo apt upgrade -y
```

**Step 2 — Install Python, Git, and utilities**

```bash
sudo apt install -y python3 python3-pip python3-venv git curl unzip
```

Expected output ends with:
```
Processing triggers for man-db ...
```

**Step 3 — Install Node via nvm**

```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
source ~/.bashrc
nvm install --lts
nvm use --lts
```

Expected output:
```
Now using node v20.x.x (npm v10.x.x)
```

**Step 4 — Install AWS CLI v2**

```bash
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip
sudo ./aws/install
rm -rf awscliv2.zip aws/
```

Expected output ends with:
```
You can now run: /usr/local/bin/aws --version
```

**Step 5 — Install Terraform**

```bash
sudo apt install -y gnupg software-properties-common
wget -O- https://apt.releases.hashicorp.com/gpg | \
  gpg --dearmor | sudo tee /usr/share/keyrings/hashicorp-archive-keyring.gpg > /dev/null
echo "deb [signed-by=/usr/share/keyrings/hashicorp-archive-keyring.gpg] \
  https://apt.releases.hashicorp.com $(lsb_release -cs) main" | \
  sudo tee /etc/apt/sources.list.d/hashicorp.list
sudo apt update && sudo apt install -y terraform
```

**Step 6 — Verify all tools**

```bash
python3 --version && node --version && npm --version && aws --version && terraform --version && git --version
```

Expected output:
```
Python 3.x.x
v20.x.x
10.x.x
aws-cli/2.x.x Python/3.x.x Linux/...
Terraform v1.x.x
git version 2.x.x
```

---

### Manjaro / Arch Linux

**Step 1 — Update system**

```bash
sudo pacman -Syu
```

**Step 2 — Install Python, Node, and Git**

```bash
sudo pacman -S --needed python nodejs npm git
```

**Step 3 — Install AWS CLI v2**

```bash
sudo pacman -S aws-cli-v2
```

**Step 4 — Install Terraform via AUR**

Install `yay` if you do not already have an AUR helper:

```bash
sudo pacman -S --needed base-devel git
git clone https://aur.archlinux.org/yay.git /tmp/yay
cd /tmp/yay && makepkg -si
cd ~ && rm -rf /tmp/yay
```

Then install Terraform:

```bash
yay -S terraform
# or: paru -S terraform
```

**Step 5 — Verify all tools**

```bash
python3 --version && node --version && npm --version && aws --version && terraform --version && git --version
```

Expected output:
```
Python 3.x.x
v20.x.x
10.x.x
aws-cli/2.x.x Python/3.x.x Linux/...
Terraform v1.x.x
git version 2.x.x
```

---

### All platforms — final PATH check

Run this before executing the setup script or cloning:

```bash
for cmd in python3 node npm aws terraform git; do
  printf "%-12s " "$cmd"
  command -v "$cmd" &>/dev/null && echo "✓  $(command -v $cmd)" || echo "✗  NOT FOUND"
done
```

Expected — all six must show `✓`:
```
python3      ✓  /usr/bin/python3
node         ✓  /usr/bin/node
npm          ✓  /usr/bin/npm
aws          ✓  /usr/local/bin/aws
terraform    ✓  /usr/bin/terraform
git          ✓  /usr/bin/git
```

If any show `✗  NOT FOUND` — go back to your OS section and reinstall that tool.

---

## Teammate quick start

> **This section is for teammates joining the repo after the owner has completed setup.**
> The owner has already run the setup script, applied Terraform, confirmed the DoD is green,
> and pushed all scaffolded files to the repo. You just need to get running locally.

### Step 1 — Clone the repo

```bash
git clone https://github.com/YOUR_ORG/YOUR_REPO.git
cd YOUR_REPO
```

Expected output:
```
Cloning into 'YOUR_REPO'...
remote: Enumerating objects: ...
Resolving deltas: 100% (xx/xx), done.
```

### Step 2 — Check out dev

Always work off `dev` — never off `main`.

```bash
git checkout dev
```

Expected output:
```
branch 'dev' set up to track 'origin/dev'.
Switched to a new branch 'dev'
```

### Step 3 — Set up and run the backend

**macOS / Linux / Manjaro / WSL2:**
```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

**Windows — Git Bash:**
```bash
cd backend
python3 -m venv .venv
source .venv/Scripts/activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

**Windows — PowerShell:**
```powershell
cd backend
python3 -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn app.main:app --reload
```

Expected output when the server is ready:
```
INFO:     Will watch for changes in these directories: ['/path/to/backend']
INFO:     Uvicorn running on http://0.0.0.0:8000 (Press CTRL+C to quit)
INFO:     Started reloader process [...] using WatchFiles
INFO:     Started server process [...]
INFO:     Waiting for application startup.
INFO:     Application startup complete.
```

**Verify it works** — open a second terminal and run:

```bash
curl http://localhost:8000/health
```

Expected:
```json
{"status":"ok","environment":"local"}
```

```bash
curl http://localhost:8000/api/integrations
```

Expected:
```json
{"services":{"analytics":"","notifications":"","payments":""}}
```

If you see a connection error — the backend is not running. Check the first terminal for errors.

### Step 4 — Set up and run the frontend

Keep the backend terminal running. Open a **new terminal**:

**macOS / Linux / Manjaro / WSL2 / Windows Git Bash / Windows PowerShell:**
```bash
cd frontend
npm install
npm run dev
```

Expected output:
```
  VITE v5.x.x  ready in xxx ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
  ➜  press h + enter to show help
```

Open `http://localhost:5173` in your browser.

Expected: a page showing **Hackathon Starter** with `API health: ok`.

If you see `API health: offline` — your backend terminal has stopped. Restart it.

### Step 5 — Quick API health check

**macOS / Linux / Manjaro / WSL2:**
```bash
cd backend
source .venv/bin/activate
curl http://localhost:8000/health
```

**Windows — Git Bash:**
```bash
cd backend
source .venv/Scripts/activate
curl http://localhost:8000/health
```

**Windows — PowerShell:**
```powershell
cd backend
.venv\Scripts\Activate.ps1
curl http://localhost:8000/health
```

Expected output:
```
{"status":"ok","environment":"local"}
```

If you see a connection error or non-200 response — your backend is not healthy yet.
Re-run the `pip install -r requirements.txt` step from Step 3.

### Step 6 — Create your feature branch and start building

```bash
git checkout dev
git pull origin dev
git checkout -b feature/your-feature-name
```

Expected:
```
Switched to a new branch 'feature/your-feature-name'
```

You're ready. See [Branch strategy](#branch-strategy) for how to get changes merged and deployed.

---

## What this repo is

This is the bootstrapped starter for a 24-hour AWS hackathon proof of concept. It provides a
working full-stack baseline — FastAPI backend on EC2, React frontend on S3 + CloudFront, Terraform
infra, and three GitHub Actions workflows — so the team can start building features immediately
rather than spending the event on scaffolding.

The architecture is intentionally minimal: **EC2, S3, CloudFront only** until the Definition of
Done is confirmed green. New AWS services are added incrementally after that baseline is stable.

---

## Repo structure

```
/
├── .github/
│   └── workflows/
│       ├── backend-ci.yml         # /health smoke check
│       ├── terraform-plan.yml     # terraform plan on PRs to dev/main
│       └── terraform-deploy.yml   # full deploy on push to dev/main
├── backend/
│   ├── app/
│   │   ├── main.py                # FastAPI app — /health and /api/integrations
│   │   └── config.py              # Pydantic Settings — reads from .env
│   ├── requirements.txt           # backend runtime dependencies
│   └── .env.example               # auto-copied to .env by setup script
├── frontend/
│   ├── src/
│   │   ├── App.tsx
│   │   ├── main.tsx
│   │   ├── index.css
│   │   ├── api/
│   │   │   └── client.ts          # Axios client — reads VITE_API_URL
│   │   └── pages/
│   │       └── Home.tsx           # baseline page: health status + integrations list
│   ├── index.html
│   ├── package.json               # Vite + React 18 + TypeScript + Tailwind
│   └── vite.config.js             # proxies /api and /health to localhost:8000
├── infra/
│   ├── main.tf                    # all resources in one file — no modules
│   ├── variables.tf
│   ├── outputs.tf
│   └── terraform.tfvars.example   # auto-copied to terraform.tfvars by setup script
├── setup_hackathon_repo.sh        # bootstraps the entire repo from scratch
└── README.md
```

---

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | Vite + React 18 + TypeScript + Tailwind CSS |
| API client | Axios (`frontend/src/api/client.ts`) |
| Backend | FastAPI + Uvicorn (Python 3.12) |
| Config | Pydantic Settings + `.env` |
| Infrastructure | Terraform (local state) · EC2 + S3 + CloudFront |
| CI/CD | GitHub Actions (3 workflows) |
| EC2 access | AWS SSM — no SSH key required |

### AWS architecture

```
Browser → CloudFront → S3            (static React frontend)
Browser → EC2:8000                   (FastAPI backend — /health, /api/integrations)
```

### Local dev architecture

```
localhost:5173 (Vite)
  → proxy /api    → localhost:8000 (FastAPI/Uvicorn)
  → proxy /health → localhost:8000
```

---

## Local development

### 1. Bootstrap the repo (repo owner only — run once)

```bash
bash setup_hackathon_repo.sh
```

The script checks all required tools, scaffolds missing files, and auto-copies `.env.example`
and `terraform.tfvars.example` to their real counterparts.

To regenerate everything from scratch:
```bash
bash setup_hackathon_repo.sh --force
```

> Teammates do not run this script — all files are already committed to the repo.
> Go to [Teammate quick start](#teammate-quick-start) instead.

### 2. Run the backend

**macOS / Linux / Manjaro / WSL2:**
```bash
cd backend && python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

**Windows — Git Bash:**
```bash
cd backend && python3 -m venv .venv && source .venv/Scripts/activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

**Windows — PowerShell:**
```powershell
cd backend; python3 -m venv .venv; .venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn app.main:app --reload
```

### 3. Run the frontend

```bash
cd frontend && npm install && npm run dev
# → http://localhost:5173
```

### 4. Quick health check

**macOS / Linux / Manjaro / WSL2:**
```bash
cd backend && source .venv/bin/activate && curl http://localhost:8000/health
```

**Windows — Git Bash:**
```bash
cd backend && source .venv/Scripts/activate && curl http://localhost:8000/health
```

**Windows — PowerShell:**
```powershell
cd backend; .venv\Scripts\Activate.ps1; curl http://localhost:8000/health
```

Expected: `{"status":"ok","environment":"local"}`

---

## AWS deployment

> See `deploymentguide.md` for the full walkthrough with verification at every step.
> This section is the condensed reference for the **repo owner only**.

### Prerequisites

- AWS account with billing enabled
- IAM user `hackathon-cicd` with `AdministratorAccess` and an access key
  (select **"Third-party service"** when prompted for the use case)
- GitHub repo with Actions enabled

### Step 1 — Configure local AWS credentials

```bash
aws configure --profile hackathon
export AWS_PROFILE=hackathon
aws sts get-caller-identity
```

Expected:
```json
{
    "UserId": "AIDA...",
    "Account": "123456789012",
    "Arn": "arn:aws:iam::123456789012:user/hackathon-cicd"
}
```

If this errors — stop and fix credentials before touching Terraform.

### Step 2 — Fill in Terraform variables

Edit `infra/terraform.tfvars`:

```hcl
project_name         = "hackathon"
environment          = "dev"
region               = "us-west-1"    # must match your AWS_PROFILE region
ec2_instance_type    = "t3.micro"
frontend_bucket_name = ""             # leave empty — auto-generated
```

> `terraform.tfvars` is gitignored — never commit it.

### Step 3 — Apply Terraform

```bash
cd infra
terraform init
terraform plan     # must show ~11 to add, 0 to change, 0 to destroy
terraform apply    # type "yes" when prompted — takes 3–8 minutes
```

Expected outputs:
```
cloudfront_url             = "https://dXXXXXXXXXXXXX.cloudfront.net"
cloudfront_distribution_id = "EXXXXXXXXXXXXX"
ec2_instance_id            = "i-0XXXXXXXXXXXXXXXXX"
ec2_public_ip              = "X.X.X.X"
ec2_public_dns             = "ec2-X-X-X-X.compute-1.amazonaws.com"
s3_bucket_name             = "hackathon-dev-frontend-XXXXXXXXXXXX"
```

> ⚠️ The CloudFront URL takes **10–15 minutes** to go live after the first apply.
> A 403 or blank page immediately after apply is normal — wait and retry.

### Step 4 — Add GitHub Secrets

GitHub repo → **Settings** → **Secrets and variables** → **Actions** → **New repository secret**

| Secret name | Value |
|---|---|
| `AWS_ACCESS_KEY_ID` | Your IAM access key ID |
| `AWS_SECRET_ACCESS_KEY` | Your IAM secret access key |
| `AWS_REGION` | e.g. `us-west-1` |

These are the only 3 secrets needed. All other values come from Terraform outputs at runtime.

### Step 5 — Create branches and trigger the pipeline

```bash
git checkout -b test && git push -u origin test
git checkout -b dev  && git push -u origin dev

# Trigger the first full deploy
git checkout dev
echo "# first deploy" >> README.md
git add README.md && git commit -m "chore: trigger first pipeline run"
git push origin dev
```

Watch: GitHub → **Actions** → **Terraform Deploy** — all jobs should be green within 5–10 minutes.

---

## CI/CD pipeline

### What triggers what

| Trigger | Workflow | Jobs |
|---|---|---|
| Push or PR on `test`, `dev`, `main` — `backend/**` | `backend-ci.yml` | /health smoke check |
| PR into `dev` or `main` — `infra/**` | `terraform-plan.yml` | terraform plan only |
| Push to `dev` or `main` — any path | `terraform-deploy.yml` | infra + backend + frontend (path-filtered) |

### Deploy job sequence

```
changes      detects which paths changed (infra / backend / frontend)
    ↓
infra        terraform init → adopt/import existing named resources → EC2 state check → apply if needed → capture outputs
  ↓
ec2 checks   EC2 state check + EC2 can read S3 via instance role
  ↓                ↓
backend      package → upload to S3 → SSM deploy to EC2 → restart service
frontend     npm ci → vite build → S3 sync → CloudFront invalidation
```

Notes:
- Backend deploy runs on backend changes and infra changes.
- Frontend deploy runs on frontend changes and infra changes.
- This keeps fresh/replaced infra in sync without requiring a second push.

---

## Branch strategy

```
feature/your-feature
        ↓  PR → test
      test              backend CI on push + PR
        ↓  PR → dev
       dev               full deploy on push
        ↓  PR → main
      main               production
```

### Day-to-day workflow

```bash
git checkout dev && git pull origin dev
git checkout -b feature/your-feature-name

# Build and test locally, then:
git push origin feature/your-feature-name
# Open PR: feature/* → test — backend CI runs

# After CI passes, open PR: test → dev — full deploy triggers on merge
```

---

## API contract

> Frozen for the duration of the hackathon. Do not change response shapes.

### `GET /health`
```json
{"status": "ok", "environment": "local"}
```

### `GET /api/integrations`
```json
{"services": {"analytics": "", "notifications": "", "payments": ""}}
```

### Adding new integrations

```env
# backend/.env — add endpoints here, never change the response shape
SERVICE_ENDPOINTS_JSON={"analytics":"https://...","notifications":"","payments":""}
```

---

## Environment variables

### `backend/.env` — auto-created, never commit

```env
ENVIRONMENT=local
PORT=8000
ALLOWED_ORIGINS=*
SERVICE_ENDPOINTS_JSON={"analytics":"","notifications":"","payments":""}
```

### `frontend/.env.local` — create manually if needed

```env
VITE_API_URL=http://<ec2_public_ip>:8000
```

Without this, the Axios client defaults to `http://localhost:8000` — correct for local dev.

### `infra/terraform.tfvars` — auto-created, never commit

```hcl
project_name = "hackathon"
environment  = "dev"
region       = "us-west-1"
```

---

## Definition of Done

All four must be green before feature work starts.

- [ ] `terraform apply` passes and the full pipeline runs end-to-end at least once
- [ ] CloudFront URL loads the React frontend
- [ ] EC2 is running, SSM-managed, and receives backend deploys from CI
- [ ] `/health` returns `{"status":"ok"}` from `localhost:8000` and from the EC2 IP

**If DoD is not green by hour 3 — stop adding features and finish only the core path.**

---

## Hard constraints

### Infrastructure
1. No new AWS services until DoD is confirmed green
2. No Terraform module refactors once the first `apply` succeeds — flat `main.tf` only
3. No SSH access patterns — EC2 is SSM-only at all times

### Service graduation rules (available after DoD is green)
4. **Lambda** — use for async/background processing or anything that blocks the FastAPI request cycle
5. **Amazon Bedrock** — use for LLM inference, text generation, summarization; call via boto3 from FastAPI
6. **DynamoDB** — use for key-value storage, session data, or schema-less data needs
7. **RDS (PostgreSQL)** — use when relational queries or ACID transactions are genuinely required
8. **API Gateway** — do not use; FastAPI on EC2 covers all routing for this scope

### Auth
9. Basic auth is required — JWT tokens, protected routes, login page; use FastAPI `python-jose` + `passlib`
10. Scope is username/password + JWT only — no OAuth, SSO, or MFA

### Code and workflow
11. Keep PRs small, merge fast, verify the pipeline after every merge
12. If setup exceeds 3 hours — stop adding features and finish only the core path
13. New integrations go into `SERVICE_ENDPOINTS_JSON` only — never change the API contract shape
14. Feature freeze at 1:00pm Saturday — no new code after this point

---

## Useful commands

### Backend

**macOS / Linux / Manjaro / WSL2:**
```bash
source backend/.venv/bin/activate
uvicorn app.main:app --reload
cd backend && curl http://localhost:8000/health
```

**Windows — Git Bash:**
```bash
source backend/.venv/Scripts/activate
uvicorn app.main:app --reload
cd backend && curl http://localhost:8000/health
```

**Windows — PowerShell:**
```powershell
backend\.venv\Scripts\Activate.ps1
uvicorn app.main:app --reload
cd backend; curl http://localhost:8000/health
```

### Frontend

```bash
cd frontend && npm run dev           # dev server → http://localhost:5173
cd frontend && npm run build         # production build (mirrors CI)
```

### Terraform (repo owner only)

```bash
cd infra
terraform init
terraform plan
terraform apply
terraform output
terraform output -raw cloudfront_url
terraform output -raw ec2_instance_id
terraform output -raw ec2_public_ip
```

### AWS CLI (repo owner only)

```bash
# Check EC2 SSM status
aws ssm describe-instance-information \
  --filters "Key=InstanceIds,Values=$(cd infra && terraform output -raw ec2_instance_id)" \
  --query "InstanceInformationList[0].PingStatus" --output text
# Expected: Online

# Open a shell on EC2 — no SSH key needed
aws ssm start-session \
  --target $(cd infra && terraform output -raw ec2_instance_id)

# Inside the SSM session
systemctl status hackathon-api.service
journalctl -u hackathon-api.service -n 50    # last 50 log lines
journalctl -u hackathon-api.service -f       # live tail

# Manually invalidate CloudFront cache
aws cloudfront create-invalidation \
  --distribution-id $(cd infra && terraform output -raw cloudfront_distribution_id) \
  --paths "/*"

# Hit the backend directly on EC2
curl http://$(cd infra && terraform output -raw ec2_public_ip):8000/health
```

### GitHub Actions

```bash
# Full deploy runs automatically on push to dev/main
# To force a full deploy, commit an infra or workflow change and push to dev
```

---

## Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| Script exits `MISSING: terraform` | Tool not on PATH | Install per OS section, reopen terminal, rerun |
| `aws sts get-caller-identity` → `InvalidClientTokenId` | Wrong access key | Recreate key in IAM, re-run `aws configure` |
| `terraform apply` → `BucketAlreadyExists` | S3 names are globally unique | Set a unique `frontend_bucket_name` in `terraform.tfvars` |
| `terraform apply` → `PutBucketPolicy ... BlockPublicPolicy` | Old/public bucket policy config is still being applied | Pull latest infra changes and verify `infra/main.tf` uses `aws_cloudfront_origin_access_control.frontend` + `aws_s3_bucket_policy.frontend_private`; then run `terraform init -upgrade` and `terraform plan` before apply |
| CloudFront URL → 403 right after first apply | Distribution still propagating | Wait 10–15 min and reload — not broken |
| CloudFront URL shows stale content | Cache not cleared yet | Wait 2–3 min or run manual CloudFront invalidation |
| `source .venv/bin/activate` → `No such file or directory` | venv not created | Run `python3 -m venv .venv` first |
| `.venv\Scripts\Activate.ps1` blocked on Windows | PowerShell execution policy | Run `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned` then retry |
| `vite build` → `error TS...` | Real TypeScript error in code | Fix the error — `noUnusedLocals` and `noUnusedParameters` are disabled so it's genuine |
| EC2 SSM PingStatus → `None` | EC2 still initializing | Wait 2 min and recheck |
| Pipeline → `EC2 instance is not online in SSM` | EC2 not yet SSM-registered | Wait 2–3 min, then push a no-op commit to `dev` to retrigger deploy |
| `/health` times out on EC2 IP | Port 8000 blocked or service down | Check SG inbound rule for port 8000; check service via SSM session |
| Browser shows `API health: offline` on CloudFront URL | `VITE_API_URL` not set | Create `frontend/.env.local` with `VITE_API_URL=http://<ec2_ip>:8000` |
| `npm run dev` fails `ENOENT` on Windows | Path separator issue in Git Bash | Switch to PowerShell or WSL2 for Node commands |

---

*Stack version: `lean-mvp-ec2-s3-cf-1.0` · matches `setup_hackathon_repo.sh` (patched)*
*Event: GCU + AWS Cloud-a-thon · Grand Canyon University · Phoenix, AZ*