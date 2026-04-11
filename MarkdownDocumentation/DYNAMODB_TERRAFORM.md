# DynamoDB Terraform Configuration

## Status
✅ **DynamoDB is fully configured in Terraform** — Ready to deploy

## What's Already Configured

### DynamoDB Tables (2)

#### 1. Devices Table
```hcl
resource "aws_dynamodb_table" "devices" {
  name         = "hackathon-dev-devices"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "device_id"
  
  attribute {
    name = "device_id"
    type = "S"
  }
}
```

**Purpose:** Stores device intake records and tracks destruction progress
- **Hash Key:** `device_id` (UUID)
- **Billing:** Pay-per-request (no need to provision capacity)
- **Lifecycle:** Prevent destroy (protects data)

**Device Record Schema:**
```json
{
  "device_id": "uuid",
  "serial_number": "SN-123",
  "device_type": "laptop_hdd",
  "make_model": "Dell Latitude 5400",
  "intake_timestamp": "2024-04-10T17:30:00Z",
  "worker_id": "worker1",
  "status": "intake|in_progress|documented",
  "procedure_id": "hdd_purge_v1",
  "steps_completed": [
    {
      "step_id": "hdd_1",
      "confirmed": true,
      "notes": "Device powers on successfully",
      "timestamp": "2024-04-10T17:32:00Z"
    }
  ],
  "compliance_doc_url": "https://s3.../compliance-docs/device-id.pdf",
  "notes": ""
}
```

#### 2. Procedures Table
```hcl
resource "aws_dynamodb_table" "procedures" {
  name         = "hackathon-dev-procedures"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "procedure_id"
  
  attribute {
    name = "procedure_id"
    type = "S"
  }
}
```

**Purpose:** Stores NIST-compliant procedure definitions
- **Hash Key:** `procedure_id` (e.g., "hdd_purge_v1")
- **Billing:** Pay-per-request
- **Lifecycle:** Prevent destroy

**Procedure Record Schema:**
```json
{
  "procedure_id": "hdd_purge_v1",
  "device_type": "laptop_hdd",
  "nist_method": "purge",
  "label": "HDD — 3-Pass Overwrite (NIST Purge)",
  "steps": [
    {
      "id": "hdd_1",
      "instruction": "Verify device powers on and storage drive is detected",
      "requires_confirmation": true
    },
    {
      "id": "hdd_2",
      "instruction": "Boot device from USB sanitization media",
      "requires_confirmation": true
    }
    // ... 5 more steps
  ]
}
```

### IAM Permissions

#### EC2 Instance Access
The EC2 instance has IAM permissions to:
```json
{
  "Effect": "Allow",
  "Action": [
    "dynamodb:GetItem",
    "dynamodb:PutItem",
    "dynamodb:UpdateItem",
    "dynamodb:Query",
    "dynamodb:Scan"
  ],
  "Resource": [
    "arn:aws:dynamodb:us-west-1:ACCOUNT_ID:table/hackathon-dev-devices",
    "arn:aws:dynamodb:us-west-1:ACCOUNT_ID:table/hackathon-dev-procedures"
  ]
}
```

#### Lambda Function Access
The compliance PDF generator Lambda has permissions for:
- `dynamodb:GetItem` — Read device records
- `dynamodb:UpdateItem` — Mark devices as documented
- `s3:PutObject` — Write compliance PDFs to S3

## Deployment Process

### Step 1: Configure AWS Credentials

Set up AWS credentials as GitHub Secrets (for CI/CD):

**GitHub Settings → Secrets and variables → Actions:**
```
AWS_ACCESS_KEY_ID = your-access-key
AWS_SECRET_ACCESS_KEY = your-secret-key
AWS_REGION = us-west-1
```

Or locally:
```bash
export AWS_ACCESS_KEY_ID=your-access-key
export AWS_SECRET_ACCESS_KEY=your-secret-key
export AWS_REGION=us-west-1
```

### Step 2: Plan Terraform

```bash
cd infra
terraform plan -out=tfplan
```

Expected output:
```
Plan: 15 to add, 0 to change, 0 to destroy

Resources to create:
  + aws_dynamodb_table.devices
  + aws_dynamodb_table.procedures
  + aws_lambda_function.compliance_doc_generator
  + aws_s3_bucket.frontend
  + aws_cloudfront_distribution.frontend
  + aws_instance.app (EC2)
  + IAM roles and policies
  + Security groups
  + CloudWatch logs
```

### Step 3: Apply Terraform

```bash
terraform apply -auto-approve tfplan
```

**Expected time:** 3-5 minutes

**Verify success:**
```bash
terraform output
# Should show:
# - ec2_instance_id = i-xxxxx
# - ec2_public_ip = 1.2.3.4
# - dynamodb_devices_table_name = hackathon-dev-devices
# - dynamodb_procedures_table_name = hackathon-dev-procedures
# - cloudfront_url = https://dxxxxxx.cloudfront.net
```

### Step 4: Seed Procedures

Once DynamoDB tables are created, populate procedure definitions:

```bash
cd backend
source .venv/bin/activate
python seed_procedures.py
```

Expected output:
```
Seeding procedures into 'hackathon-dev-procedures' (us-west-1)...
  Seeded: hdd_purge_v1 (7 steps)
  Seeded: ssd_secure_erase_v1 (8 steps)
  Seeded: tablet_factory_reset_v1 (6 steps)
  Seeded: no_storage_clear_v1 (4 steps)

Done — 4 procedures seeded into 'hackathon-dev-procedures'
```

### Step 5: Verify DynamoDB Access

Test from EC2 or via AWS SDK:

```bash
# Via AWS CLI
aws dynamodb describe-table --table-name hackathon-dev-devices --region us-west-1

# Via Python SDK
import boto3
dynamodb = boto3.resource('dynamodb', region_name='us-west-1')
table = dynamodb.Table('hackathon-dev-devices')
response = table.scan(Limit=1)
print(f"Items in table: {len(response['Items'])}")
```

## CI/CD Integration

### GitHub Actions Terraform Deploy Workflow

The `.github/workflows/terraform-deploy.yml` handles:

1. **terraform apply** — Creates DynamoDB tables
2. **EC2 deployment** — Deploys backend code
3. **Frontend sync** — Uploads React app to S3
4. **CloudFront invalidation** — Clears CDN cache

Workflow triggers on push to `dev` or `main` branches.

## Backend Integration

### Environment Variables

The backend reads DynamoDB table names from `.env`:

```env
ENVIRONMENT=local
PORT=8000
AWS_REGION=us-west-1
DYNAMODB_DEVICES_TABLE=hackathon-dev-devices
DYNAMODB_PROCEDURES_TABLE=hackathon-dev-procedures
```

When deployed on EC2:
- IAM instance role provides AWS credentials
- Backend connects via boto3
- No credentials file needed

### Endpoints

Backend API endpoints that use DynamoDB:

| Endpoint | Operation | DynamoDB Action |
|----------|-----------|-----------------|
| POST /api/devices | Create device | `PutItem` to devices |
| GET /api/devices | List devices | `Scan` devices |
| GET /api/devices/{id} | Get device | `GetItem` from devices |
| GET /api/procedures/{id} | Get procedure | `GetItem` from procedures |
| PATCH /api/devices/{id}/step | Complete step | `UpdateItem` devices |
| POST /api/devices/{id}/complete | Complete device | `UpdateItem` devices |
| GET /api/dashboard | Dashboard stats | `Scan` devices |

## Cost Estimation

### DynamoDB (Pay-Per-Request)
- **Read capacity:** $1.25 per million RCU (read capacity units)
- **Write capacity:** $6.25 per million WCU (write capacity units)

For hackathon scope (100 devices, ~1000 reads/writes):
- **Estimated cost:** <$0.01/month

### Lambda (Compliance PDF Generation)
- **Free tier:** 1,000,000 invocations/month
- **Price:** $0.20 per 1M invocations (after free tier)

For hackathon scope:
- **Estimated cost:** Free (within free tier)

### Total Monthly Cost
- **Development:** <$5 (EC2 + S3 + minimal DynamoDB)
- **Production:** Would need provisioned capacity and additional services

## Monitoring

### CloudWatch Metrics

Monitor DynamoDB health via AWS Console:

```
CloudWatch → Dashboards → DynamoDB
```

Key metrics:
- **ConsumedWriteCapacityUnits** — Writes per second
- **ConsumedReadCapacityUnits** — Reads per second
- **SuccessfulRequestLatency** — Request latency in ms
- **UserErrors** — Failed requests

### Lambda Logs

Compliance PDF generation logs:

```bash
# View last 10 logs
aws logs tail /aws/lambda/hackathon-dev-compliance-doc-generator --follow

# Search for errors
aws logs filter-log-events \
  --log-group-name /aws/lambda/hackathon-dev-compliance-doc-generator \
  --filter-pattern "ERROR"
```

## Troubleshooting

### "Unable to locate credentials"
- **Cause:** AWS credentials not configured
- **Fix:** Set `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` environment variables

### "NoCredentialsError" from backend
- **Cause:** EC2 instance role not configured or expired
- **Fix:** Verify EC2 instance has proper IAM role attached

### Terraform state conflicts
- **Cause:** State file out of sync with AWS
- **Fix:** Use `terraform refresh` to update state, then `terraform plan`

### DynamoDB table doesn't exist
- **Cause:** Terraform apply failed or incomplete
- **Fix:** Check CloudFormation events, run `terraform apply` again

### Procedures table is empty
- **Cause:** Seed script wasn't run after table creation
- **Fix:** Run `python seed_procedures.py` after `terraform apply`

## Next Steps

1. **Configure AWS credentials** in GitHub Secrets
2. **Push to main branch** to trigger terraform-deploy workflow
3. **Monitor workflow** in GitHub Actions
4. **Verify tables created** via AWS Console → DynamoDB
5. **Run seed_procedures.py** to populate procedures
6. **Test backend** by creating a device via API

## Related Documentation

- [INTEGRATION_SUMMARY.md](./INTEGRATION_SUMMARY.md) — Frontend-backend API contract
- [deploymentguide.md](./deploymentguide.md) — Full AWS deployment steps
- [CLAUDE.md](./CLAUDE.md) — Architecture decisions and constraints
