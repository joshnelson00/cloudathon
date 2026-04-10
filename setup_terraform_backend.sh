#!/bin/bash
set -euo pipefail

echo "Setting up Terraform remote state backend..."

# Create S3 bucket for state
BUCKET_NAME="hackathon-terraform-state"
REGION="us-west-1"

echo "Creating S3 bucket: $BUCKET_NAME"
aws s3api create-bucket \
  --bucket "$BUCKET_NAME" \
  --region "$REGION" \
  --create-bucket-configuration LocationConstraint="$REGION" \
  2>/dev/null || echo "Bucket already exists or error occurred"

# Enable versioning on state bucket
echo "Enabling versioning on bucket..."
aws s3api put-bucket-versioning \
  --bucket "$BUCKET_NAME" \
  --versioning-configuration Status=Enabled \
  2>/dev/null || true

# Block public access
echo "Blocking public access..."
aws s3api put-public-access-block \
  --bucket "$BUCKET_NAME" \
  --public-access-block-configuration \
    "BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true" \
  2>/dev/null || true

# Create DynamoDB table for state locking
TABLE_NAME="hackathon-terraform-locks"
echo "Creating DynamoDB table for state locking: $TABLE_NAME"
aws dynamodb create-table \
  --table-name "$TABLE_NAME" \
  --attribute-definitions AttributeName=LockID,AttributeType=S \
  --key-schema AttributeName=LockID,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST \
  --region "$REGION" \
  2>/dev/null || echo "Table already exists or error occurred"

echo "Backend setup complete!"
echo ""
echo "Now run: cd infra && terraform init"
