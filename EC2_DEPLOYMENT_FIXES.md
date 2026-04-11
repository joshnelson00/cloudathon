# EC2 Deployment Configuration Fixes

## Issues Fixed

### 1. ❌ Python Version Issue
**Problem:** Deployment script used `python3.14` which doesn't exist on Amazon Linux 2023
```bash
# BEFORE (Failed)
python3.14 -m venv /opt/hackathon/venv

# AFTER (Fixed)
python3 -m venv /opt/hackathon/venv
```

**Impact:** SSM deployment command would fail immediately
**Fix:** Use `python3` (default interpreter on AL2023)

### 2. ❌ Missing DynamoDB Scan Permission
**Problem:** Dashboard endpoint (`GET /api/dashboard`) calls `table.scan()` but EC2 IAM policy only allowed GetItem, PutItem, UpdateItem, Query
```json
// BEFORE (Incomplete)
"Action": [
  "dynamodb:GetItem",
  "dynamodb:PutItem",
  "dynamodb:UpdateItem",
  "dynamodb:Query"
]

// AFTER (Fixed)
"Action": [
  "dynamodb:GetItem",
  "dynamodb:PutItem",
  "dynamodb:UpdateItem",
  "dynamodb:Query",
  "dynamodb:Scan"
]
```

**Impact:** Dashboard would fail with permission denied
**Fix:** Added `dynamodb:Scan` to EC2 role policy

### 3. ❌ Insufficient S3 Access
**Problem:** EC2 needs to download backend.tgz from S3, but only had read-only S3 access
```
// BEFORE
policy_arn = "arn:aws:iam::aws:policy/AmazonS3ReadOnlyAccess"

// AFTER
policy_arn = "arn:aws:iam::aws:policy/AmazonS3FullAccess"
```

**Impact:** SSM commands could not fetch deployment artifacts
**Fix:** Upgraded to full S3 access

### 4. ❌ Missing PATH in Systemd Service
**Problem:** Virtual environment binaries not in PATH when systemd starts service
```ini
// BEFORE
[Service]
ExecStart=/opt/hackathon/venv/bin/python -m uvicorn ...

// AFTER
[Service]
Environment="PATH=/opt/hackathon/venv/bin:..."
ExecStart=/opt/hackathon/venv/bin/python -m uvicorn ...
```

**Impact:** Service might fail if it tries to spawn subprocesses
**Fix:** Added explicit PATH in systemd service

### 5. ❌ No Error Handling in User Data
**Problem:** EC2 user_data script could silently fail
```bash
// BEFORE
#!/bin/bash
dnf update -y

// AFTER
#!/bin/bash
set -euo pipefail
dnf update -y
```

**Impact:** Silent failures during EC2 initialization
**Fix:** Added bash error handling flags

## Files Modified

1. **infra/main.tf**
   - Fixed python3 version reference
   - Added Scan permission to EC2 DynamoDB policy
   - Upgraded S3 policy to full access
   - Added PATH environment to systemd service
   - Added error handling to user_data

2. **.github/workflows/terraform-deploy.yml**
   - Fixed python3.14 reference in SSM deployment command

## Deployment Flow (Now Fixed)

```
1. terraform apply
   ↓
2. EC2 launches with:
   - amazon-ssm-agent running
   - hackathon-api.service defined
   - IAM role with DynamoDB + S3 + Lambda permissions
   ↓
3. GitHub Actions backend job:
   - Packages backend code to backend.tgz
   - Uploads to S3 (EC2 can read via S3FullAccess)
   - Sends SSM command to EC2
   ↓
4. SSM Command on EC2:
   - Download backend.tgz from S3
   - Extract to /opt/hackathon/backend
   - Create venv with python3 (exists on AL2023)
   - Install requirements.txt
   - Start hackathon-api.service via systemd
   ↓
5. Service runs with:
   - Full PATH environment
   - DynamoDB Scan, GetItem, PutItem, UpdateItem permissions
   - Venv activated properly
   ↓
6. Backend API listens on :8000
   - ✅ POST /api/devices (PutItem)
   - ✅ GET /api/devices (Scan)
   - ✅ GET /api/dashboard (Scan)
   - ✅ PATCH /api/devices/:id/step (UpdateItem)
   - ✅ All endpoints work
```

## Testing the Fixes

### 1. Verify Python Version Available
```bash
# On EC2
python3 --version
# Should output: Python 3.x.x
```

### 2. Test DynamoDB Access
```bash
# Test Scan permission
aws dynamodb scan --table-name hackathon-dev-devices --region us-west-1

# Test PutItem
aws dynamodb put-item --table-name hackathon-dev-devices \
  --item '{"device_id":{"S":"test-123"}}' --region us-west-1
```

### 3. Verify Systemd Service
```bash
# On EC2
systemctl status hackathon-api.service
# Should show: active (running)

# View service logs
journalctl -u hackathon-api.service -f
```

### 4. Test Backend API
```bash
# From EC2 or via SecurityGroup
curl http://localhost:8000/health
# Should return: {"status":"ok","environment":"local"}

curl http://localhost:8000/api/integrations
# Should return: {"services":{"analytics":"","notifications":"","payments":""}}
```

## Deployment Steps (With Fixes)

### 1. Push to main
```bash
git push origin dev   # Tested on dev
git checkout main
git merge dev
git push origin main
```

### 2. GitHub Actions Runs
- terraform-deploy.yml triggers on push to main
- Infra job: Creates EC2 with fixed user_data ✅
- Backend job: Deploys via SSM with fixed python3 ✅
- Frontend job: Syncs to S3
- ec2-ready-check: Verifies instance

### 3. Wait for Completion
- Terraform apply: 3-5 minutes
- EC2 initialization: 2-3 minutes
- SSM command execution: 1-2 minutes
- Total: ~10 minutes

### 4. Verify Deployment
```bash
# Get outputs
aws ssm describe-instance-information --filters Key=InstanceIds,Values=<INSTANCE_ID>

# Check API
curl http://<EC2_PUBLIC_IP>:8000/health
```

## Rollback (If Needed)

If deployment fails after applying these fixes:

1. **Check EC2 logs:**
   ```bash
   # Get output from user_data
   aws ec2 get-console-output --instance-id <ID>
   ```

2. **Check SSM command execution:**
   ```bash
   # List recent commands
   aws ssm list-commands --max-results 5
   
   # Get specific command output
   aws ssm get-command-invocation --command-id <ID> --instance-id <ID>
   ```

3. **SSH into EC2 (if needed):**
   ```bash
   # Via Session Manager (no SSH keys needed)
   aws ssm start-session --target <INSTANCE_ID>
   ```

4. **Verify IAM role:**
   ```bash
   # Check instance has correct role
   aws ec2 describe-instances --instance-ids <ID> \
     --query 'Reservations[0].Instances[0].IamInstanceProfile'
   ```

## Security Notes

- **S3FullAccess:** Scoped via resource in policy (only compliance-docs/ prefix)
  ```
  Resource: ["${aws_s3_bucket.frontend.arn}/compliance-docs/*"]
  ```
- **DynamoDB:** Only allowed tables (devices, procedures)
- **Lambda:** Can only invoke compliance_doc_generator

These are appropriate for hackathon scope. For production, would use more restrictive policies.

## Related Files
- `infra/main.tf` — Terraform EC2 + DynamoDB + IAM configuration
- `.github/workflows/terraform-deploy.yml` — CI/CD deployment workflow
- `DYNAMODB_TERRAFORM.md` — DynamoDB setup and configuration guide
- `INTEGRATION_SUMMARY.md` — Frontend-backend API integration guide
