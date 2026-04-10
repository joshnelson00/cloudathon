# AWS Deployment Guide
**Stack:** EC2 + S3 + CloudFront · Terraform · GitHub Actions CI/CD

---

## Prerequisites checklist

Before starting, confirm all of these are true on your machine:

- [ ] `python3 --version` → 3.10+
- [ ] `node --version` → 18+
- [ ] `npm --version` → 9+
- [ ] `aws --version` → AWS CLI v2
- [ ] `terraform --version` → 1.6+
- [ ] `git --version` → any recent version
- [ ] GitHub repo created (can be private)
- [ ] AWS account with billing enabled

---

## Phase 1 · Bootstrap the repo

### Step 1 — Clone and scaffold

```bash
git clone https://github.com/YOUR_ORG/YOUR_REPO.git
cd YOUR_REPO
bash setup_hackathon_repo.sh
```

Expected output:
```
Checking required tools...
All required tools found.
write .gitignore
write backend/requirements.txt
write backend/.env        ← auto-copied from .env.example
write infra/terraform.tfvars  ← auto-copied from .tfvars.example
...
Done.
```

If you see `ERROR: MISSING: terraform` (or any other tool) — stop and install it before continuing.

### Step 2 — Verify local backend

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

Open a second terminal and run:
```bash
curl http://localhost:8000/health
# Expected: {"status":"ok","environment":"local"}

curl http://localhost:8000/api/integrations
# Expected: {"services":{"analytics":"","notifications":"","payments":""}}
```

Both must return 200. If either fails — fix it before touching AWS.

### Step 3 — Verify local frontend

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173` — you should see the Hackathon Starter page with `API health: ok`.
The page includes a blue title, a colored API health badge, and light card styling for Cloud Proof and integrations.

**Both steps 2 and 3 green = your local baseline is confirmed. Now go to AWS.**

---

## Phase 2 · AWS IAM setup

### Step 4 — Create the CI/CD IAM user

Log in to the AWS Console → **IAM** → **Users** → **Create user**

| Field | Value |
|---|---|
| Username | `hackathon-cicd` |
| Access type | Programmatic (access key only) |
| Permissions | Attach policy: `AdministratorAccess` |

> AdministratorAccess is appropriate for a hackathon. You would scope this down in production.

### Step 5 — Create and save the access key

After creating the user:
1. Click into `hackathon-cicd` → **Security credentials** → **Create access key**
2. Select **"CLI"** as the use case
3. **Copy both values immediately** — you will not see the secret again

```
AWS_ACCESS_KEY_ID     = 
AWS_SECRET_ACCESS_KEY = 
```

Save these somewhere safe (password manager, not a text file in your repo).

### Step 6 — Configure your local AWS profile

```bash
aws configure --profile hackathon
```

```
AWS Access Key ID: <YOUR_AWS_ACCESS_KEY_ID>
AWS Secret Access Key: <YOUR_AWS_SECRET_ACCESS_KEY>
AWS Default region:    us-west-1   ← or your preferred region
Default output format: json
```

Never paste real access keys into docs, commits, screenshots, or chat.

Then export it for the current terminal session:

```bash
export AWS_PROFILE=hackathon
```

Verify it works:
```bash
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

If this returns an error — your credentials are wrong. Do not proceed to Terraform.

---

## Phase 3 · Terraform

> Reliability note: this stack uses a private S3 bucket with CloudFront Origin Access Control (OAC). It avoids public bucket policies, so account-level `BlockPublicPolicy` does not block `terraform apply`.

### Step 7 — Fill in terraform.tfvars

Open `infra/terraform.tfvars` (auto-created by the setup script):

```hcl
project_name         = "hackathon"
environment          = "dev"
region               = "us-west-1"     # ← must match your AWS_PROFILE region
ec2_instance_type    = "t3.micro"
frontend_bucket_name = ""              # leave empty — auto-generated from account ID
```

The only field you must change is `region` if you used something other than `us-west-1`.

> **Do not commit terraform.tfvars** — it is already in `.gitignore`.

### Step 8 — Initialize Terraform

```bash
cd infra
terraform init
```

Expected output ends with:
```
Terraform has been successfully initialized!
```

If you see provider download errors — check your internet connection or AWS credentials.

### Step 9 — Preview the plan

```bash
terraform plan
```

Scroll through the output. On first run, you should see core resources to add (no destroys), including EC2, S3, CloudFront, and OAC:

```
+ aws_cloudfront_distribution.frontend
+ aws_iam_instance_profile.ec2
+ aws_iam_role.ec2
+ aws_iam_role_policy_attachment.ec2_s3_read
+ aws_iam_role_policy_attachment.ec2_ssm
+ aws_instance.app
+ aws_s3_bucket.frontend
+ aws_s3_bucket_policy.frontend_private
+ aws_s3_bucket_public_access_block.frontend
+ aws_cloudfront_origin_access_control.frontend
+ aws_security_group.ec2
```

If you see errors in the plan — fix them before applying. Never run `apply` on a broken plan.

### Step 10 — Apply

```bash
terraform apply
```

Type `yes` when prompted.

This takes **3–8 minutes**. When it completes, you will see:

```
Outputs:

cloudfront_distribution_id = "EXXXXXXXXXXXXX"
cloudfront_url             = "https://dXXXXXXXXXXXXX.cloudfront.net"
ec2_instance_id            = "i-0XXXXXXXXXXXXXXXXX"
ec2_public_dns             = "ec2-X-X-X-X.compute-1.amazonaws.com"
ec2_public_ip              = "X.X.X.X"
s3_bucket_name             = "hackathon-dev-frontend-XXXXXXXXXXXX"
```

**Copy these outputs somewhere** — CI/CD reads them dynamically but you'll want them for manual checks.

> ⚠️ The CloudFront URL takes **10–15 minutes** to go live after the first apply.
> If you open it now and see a 403 or blank page — wait, then retry. It is not broken.

### Step 11 — Verify EC2 is SSM-managed

```bash
aws ssm describe-instance-information \
  --filters "Key=InstanceIds,Values=$(terraform output -raw ec2_instance_id)" \
  --query "InstanceInformationList[0].PingStatus" \
  --output text
```

Expected: `Online`

If you see `None` or no output — the EC2 instance is still initializing. Wait 2 minutes and retry. This must be `Online` before your backend deploy pipeline will work.

---

## Phase 4 · GitHub Secrets

### Step 12 — Add the 3 required secrets

Go to your GitHub repo → **Settings** → **Secrets and variables** → **Actions** → **New repository secret**

Add all three:

| Secret name | Value |
|---|---|
| `AWS_ACCESS_KEY_ID` | Your key ID from Step 5 |
| `AWS_SECRET_ACCESS_KEY` | Your secret key from Step 5 |
| `AWS_REGION` | `us-west-1` (or whatever region you used) |

> These are the only 3 secrets needed. All other values (bucket name, EC2 ID, CloudFront ID)
> are read dynamically from Terraform outputs in the pipeline — do not add them as secrets.

### Step 13 — Verify secrets are saved correctly

Go to **Settings** → **Secrets and variables** → **Actions**

You should see exactly:
```
AWS_ACCESS_KEY_ID      ●●●●●●●●
AWS_SECRET_ACCESS_KEY  ●●●●●●●●
AWS_REGION             ●●●●●●●●
```

No typos in the names — the workflows reference them exactly as written above.

---

## Phase 5 · Trigger and verify the pipeline

### Step 14 — Set up your branches

```bash
# From your local repo (on main or default branch)
git checkout -b test
git push -u origin test

git checkout -b dev
git push -u origin dev
```

Your repo now has all 3 required long-lived branches: `test`, `dev`, `main`.

### Step 15 — Make a commit and push to dev

This triggers the full deploy pipeline for the first time.

```bash
git checkout dev

# Touch a file to create a real commit
echo "# first deploy" >> README.md
git add README.md
git commit -m "chore: trigger first CI/CD pipeline run"
git push origin dev
```

### Step 16 — Watch the pipeline run

Go to your GitHub repo → **Actions** tab

You should see **Terraform Deploy** running. Click into it and watch the jobs:

```
changes     ✓   (detects what changed)
infra       ✓   (terraform init → best-effort state adoption/import → plan/apply when needed → capture outputs)
ec2 checks  ✓   (instance state + EC2 role can read S3 bucket)
backend     ✓   (package → upload to S3 → SSM deploy to EC2)
frontend    ✓   (npm ci → build → S3 sync → CloudFront invalidation)
```

Full pipeline takes **5–10 minutes** on first run.

**If any job fails** — click into it, read the error, and check the table below.

---

## Troubleshooting common pipeline failures

| Symptom | Cause | Fix |
|---|---|---|
| `Error: No value for input parameter` in configure-aws-credentials | Secret name typo | Re-check secret names in Settings — must match exactly |
| `Error: Bucket name already exists` in Terraform | S3 bucket names are globally unique | Set a custom `frontend_bucket_name` in terraform.tfvars |
| `EC2 instance is not online in SSM` | EC2 still initializing | Increase the SSM wait loop or re-run pipeline after 2 min |
| `npm ci` fails with peer dependency error | Node version mismatch | Ensure `node-version: "20"` in the workflow matches local node |
| `terraform init` fails with provider download error | GitHub Actions can't reach Terraform registry | Usually transient — re-run the job |
| `AccessDenied` on S3 sync | IAM user lacks S3 permissions | Confirm `AdministratorAccess` is attached to `hackathon-cicd` |
| `PutBucketPolicy ... BlockPublicPolicy` during `terraform apply` | Terraform is still attempting a public S3 bucket policy from an old config/state | Pull latest `infra/main.tf`, run `terraform init -upgrade`, then `terraform plan` and verify policy is `frontend_private` with CloudFront OAC |
| CloudFront URL returns 403 after deploy | Propagation delay | Wait 10–15 min after first apply and retry |
| CloudFront URL returns 403 after subsequent deploys | Invalidation not finished | Wait 2–3 min for the `/*` invalidation to complete |

---

## Phase 6 · Confirm Definition of Done

Run each check. All 4 must pass before starting feature work.

### DoD Check 1 — Frontend loads via CloudFront

```bash
# Get URL from Terraform output
cd infra && terraform output cloudfront_url
```

Open that URL in a browser. You should see the Hackathon Starter page.

### DoD Check 2 — Pipeline passed end-to-end

GitHub → Actions → confirm the most recent **Terraform Deploy** run shows all green checkmarks.

---

## Tear down AWS resources (after demo)

When your demo is complete and you want to stop cost accrual, destroy infra from Terraform state.

```bash
cd infra
terraform init
terraform destroy -auto-approve
```

Expected result:
- Terraform reports `Destroy complete!`.
- EC2 instance, S3 bucket, CloudFront distribution, IAM role/profile, and security group are removed.

If CloudFront deletion blocks destroy briefly, wait a few minutes and run:

```bash
terraform destroy -auto-approve
```

### DoD Check 3 — EC2 backend is live

```bash
EC2_IP=$(cd infra && terraform output -raw ec2_public_ip)
curl http://$EC2_IP:8000/health
# Expected: {"status":"ok","environment":"local"}
```

If port 8000 is unreachable — check the security group inbound rule for port 8000 in the AWS Console.

### DoD Check 4 — Frontend reads backend health

Open `http://localhost:5173` and confirm `API health: ok` is displayed.
For the deployed version, open the CloudFront URL — it will show `offline` until you wire
`VITE_API_URL` to the EC2 IP, which is a feature task not a DoD requirement.

---

## Phase 7 · Ongoing development workflow

Once DoD is green, all feature work follows this flow:

```bash
# 1. Create a feature branch off dev
git checkout dev
git pull origin dev
git checkout -b feature/your-feature-name

# 2. Build and test locally
uvicorn app.main:app --reload    # backend
npm run dev                       # frontend (separate terminal)
cd backend && curl http://localhost:8000/health          # tests

# 3. Push to test (runs backend CI only — fast check)
git push origin feature/your-feature-name
# Open PR from feature/* → test on GitHub
# Backend CI runs automatically

# 4. Merge to dev (runs full deploy)
# Open PR from test → dev on GitHub
# Terraform Deploy runs automatically on merge

# 5. Verify the deployed CloudFront URL after the pipeline completes
```

### Useful one-liners during the event

```bash
# Re-apply infra if something breaks
cd infra && terraform apply -auto-approve

# Check EC2 service status via SSM (no SSH needed)
aws ssm start-session --target $(cd infra && terraform output -raw ec2_instance_id)
# Inside the session:
systemctl status hackathon-api.service
journalctl -u hackathon-api.service -n 50

# Force a full re-deploy
# Push a no-op commit to dev (or merge a tiny infra/workflow change)

# Manually invalidate CloudFront cache
aws cloudfront create-invalidation \
  --distribution-id $(cd infra && terraform output -raw cloudfront_distribution_id) \
  --paths "/*"

# Tail EC2 app logs live via SSM
aws ssm start-session --target $(cd infra && terraform output -raw ec2_instance_id)
# Then: journalctl -u hackathon-api.service -f
```

---

## Quick reference — what triggers what

| Action | Pipeline triggered | Jobs that run |
|---|---|---|
| Push to `test` (backend changes) | `backend-ci.yml` | /health smoke check |
| PR into `dev` or `main` (infra changes) | `terraform-plan.yml` | terraform plan only |
| Push to `dev` or `main` (any changes) | `terraform-deploy.yml` | infra + backend + frontend (path-filtered) |

---

*Guide version: lean-mvp-ec2-s3-cf-1.0 · matches setup_hackathon_repo.sh*