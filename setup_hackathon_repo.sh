#!/usr/bin/env bash
set -euo pipefail

# Run from repo root.
# Default behavior: create missing files only.
# Use --force to overwrite generated files.

PYTHON_VERSION="3.14.3"
PYTHON_BIN="python3.14"

# ── Prerequisite check ────────────────────────────────────────────────────────
echo "Checking required tools..."
MISSING=()
for cmd in "$PYTHON_BIN" node npm aws terraform git; do
  if ! command -v "$cmd" &>/dev/null; then
    MISSING+=("$cmd")
  fi
done
if [[ ${#MISSING[@]} -gt 0 ]]; then
  echo ""
  echo "ERROR: The following tools are not installed or not on your PATH:"
  for m in "${MISSING[@]}"; do
    echo "  - $m"
  done
  echo ""
  echo "Install missing tools before running this script."
  echo "  python ${PYTHON_VERSION} / pip : https://www.python.org/downloads/"
  echo "  node / npm    : https://nodejs.org/"
  echo "  aws cli       : https://docs.aws.amazon.com/cli/latest/userguide/install-cliv2.html"
  echo "  terraform     : https://developer.hashicorp.com/terraform/install"
  exit 1
fi

PYTHON_ACTUAL_VERSION="$($PYTHON_BIN --version | awk '{print $2}')"
if [[ "$PYTHON_ACTUAL_VERSION" != "$PYTHON_VERSION" ]]; then
  echo ""
  echo "ERROR: Expected ${PYTHON_BIN} to be version ${PYTHON_VERSION}, but found ${PYTHON_ACTUAL_VERSION}."
  echo "Install Python ${PYTHON_VERSION} or update PYTHON_BIN/PYTHON_VERSION in this script."
  exit 1
fi

echo "All required tools found."
echo ""
# ─────────────────────────────────────────────────────────────────────────────

FORCE="false"
if [[ "${1:-}" == "--force" ]]; then
  FORCE="true"
fi

ROOT_DIR="$(pwd)"

write_from_stdin() {
  local path="$1"
  if [[ -f "$path" && "$FORCE" != "true" ]]; then
    echo "skip  $path (already exists)"
    cat >/dev/null
    return
  fi

  mkdir -p "$(dirname "$path")"
  cat >"$path"
  echo "write $path"
}

mkdir -p \
  "$ROOT_DIR/.github/workflows" \
  "$ROOT_DIR/backend/app" \
  "$ROOT_DIR/frontend/src/api" \
  "$ROOT_DIR/frontend/src/pages" \
  "$ROOT_DIR/infra"

write_from_stdin "$ROOT_DIR/.gitignore" <<'FILE'
# Python
__pycache__/
*.pyc
.venv/
venv/
backend/.env

# Node
node_modules/
frontend/dist/

# Terraform
.terraform/
*.tfstate
*.tfstate.*
terraform.tfvars

# IDE
.vscode/

#OS
thumbs.db
.DS_Store
FILE

write_from_stdin "$ROOT_DIR/backend/requirements.txt" <<'FILE'
fastapi>=0.111.0
uvicorn[standard]>=0.29.0
pydantic>=2.7.0
pydantic-settings>=2.2.0
python-dotenv>=1.0.0
FILE

write_from_stdin "$ROOT_DIR/backend/.env.example" <<'FILE'
ENVIRONMENT=local
PORT=8000
ALLOWED_ORIGINS=*
SERVICE_ENDPOINTS_JSON={"analytics":"","notifications":"","payments":""}
FILE

write_from_stdin "$ROOT_DIR/backend/app/config.py" <<'FILE'
from functools import lru_cache
from typing import Any

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    environment: str = "local"
    port: int = 8000
    allowed_origins: str = "*"
    service_endpoints_json: dict[str, str] = Field(default_factory=dict)

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    @field_validator("service_endpoints_json", mode="before")
    @classmethod
    def parse_json(cls, value: Any) -> dict[str, str]:
        if isinstance(value, dict):
            return value
        if not value:
            return {}
        # pydantic settings handles JSON string parsing in most cases.
        return value


@lru_cache
def get_settings() -> Settings:
    return Settings()
FILE

write_from_stdin "$ROOT_DIR/backend/app/main.py" <<'FILE'
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import get_settings

settings = get_settings()
app = FastAPI(title="Hackathon API", version="0.1.0")

origins = ["*"] if settings.allowed_origins == "*" else [x.strip() for x in settings.allowed_origins.split(",") if x.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok", "environment": settings.environment}


@app.get("/api/integrations")
def integrations() -> dict[str, dict[str, str]]:
    # Placeholder response so future services can be connected without breaking contract.
    return {"services": settings.service_endpoints_json}
FILE

write_from_stdin "$ROOT_DIR/frontend/package.json" <<'FILE'
{
  "name": "hackathon-frontend",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "axios": "^1.7.2",
    "react": "^18.3.1",
    "react-dom": "^18.3.1"
  },
  "devDependencies": {
    "@types/react": "^18.3.3",
    "@types/react-dom": "^18.3.0",
    "@vitejs/plugin-react": "^4.3.1",
    "autoprefixer": "^10.4.19",
    "postcss": "^8.4.38",
    "tailwindcss": "^3.4.4",
    "typescript": "^5.5.4",
    "vite": "^5.3.1"
  }
}
FILE

write_from_stdin "$ROOT_DIR/frontend/tsconfig.json" <<'FILE'
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "Bundler",
    "allowImportingTsExtensions": false,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": false,
    "noUnusedParameters": false,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["src"]
}
FILE

write_from_stdin "$ROOT_DIR/frontend/index.html" <<'FILE'
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Hackathon App</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
FILE

write_from_stdin "$ROOT_DIR/frontend/vite.config.js" <<'FILE'
import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/api": {
        target: "http://localhost:8000",
        changeOrigin: true,
      },
      "/health": {
        target: "http://localhost:8000",
        changeOrigin: true,
      },
    },
  },
})
FILE

write_from_stdin "$ROOT_DIR/frontend/tailwind.config.js" <<'FILE'
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: { extend: {} },
  plugins: [],
}
FILE

write_from_stdin "$ROOT_DIR/frontend/postcss.config.js" <<'FILE'
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
FILE

write_from_stdin "$ROOT_DIR/frontend/src/index.css" <<'FILE'
@tailwind base;
@tailwind components;
@tailwind utilities;
FILE

write_from_stdin "$ROOT_DIR/frontend/src/api/client.ts" <<'FILE'
import axios from "axios"

const baseURL = import.meta.env.VITE_API_URL || "http://localhost:8000"

export const api = axios.create({
  baseURL,
  headers: {
    "Content-Type": "application/json",
  },
})
FILE

write_from_stdin "$ROOT_DIR/frontend/src/pages/Home.tsx" <<'FILE'
import { useEffect, useState } from "react"
import { api } from "../api/client"

type ServiceMap = Record<string, string>

export default function Home() {
  const [status, setStatus] = useState("checking...")
  const [services, setServices] = useState<ServiceMap>({})

  const loadStatus = async () => {
    const health = await api.get("/health")
    setStatus(health.data?.status || "unknown")

    const integrations = await api.get("/api/integrations")
    setServices(integrations.data?.services || {})
  }

  useEffect(() => {
    loadStatus().catch(() => setStatus("offline"))
  }, [])

  return (
    <main style={{ maxWidth: 720, margin: "2rem auto", padding: "0 1rem" }}>
      <h1>Hackathon Starter</h1>
      <p>API health: {status}</p>

      <h2>Future Service Connections</h2>
      <ul>
        {Object.keys(services).length === 0 && <li>No services configured yet.</li>}
        {Object.entries(services).map(([name, endpoint]) => (
          <li key={name}>
            <strong>{name}</strong>: {endpoint || "not configured"}
          </li>
        ))}
      </ul>
    </main>
  )
}
FILE

write_from_stdin "$ROOT_DIR/frontend/src/App.tsx" <<'FILE'
import Home from "./pages/Home"

export default function App() {
  return <Home />
}
FILE

write_from_stdin "$ROOT_DIR/frontend/src/main.tsx" <<'FILE'
import React from "react"
import ReactDOM from "react-dom/client"
import App from "./App"
import "./index.css"

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
FILE

write_from_stdin "$ROOT_DIR/infra/variables.tf" <<'FILE'
variable "project_name" {
  type    = string
  default = "hackathon"
}

variable "environment" {
  type    = string
  default = "dev"
}

variable "region" {
  type    = string
  default = "us-west-1"
}

variable "ec2_instance_type" {
  type    = string
  default = "t3.micro"
}

variable "ec2_key_name" {
  type    = string
  default = null
}

variable "allowed_ssh_cidr" {
  type    = string
  default = "0.0.0.0/0"
}

variable "frontend_bucket_name" {
  type    = string
  default = ""
}
FILE

write_from_stdin "$ROOT_DIR/infra/main.tf" <<'FILE'
terraform {
  required_version = ">= 1.6.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.region
}

data "aws_caller_identity" "current" {}

data "aws_vpc" "default" {
  default = true
}

data "aws_subnets" "default" {
  filter {
    name   = "vpc-id"
    values = [data.aws_vpc.default.id]
  }
}

data "aws_ami" "amazon_linux" {
  most_recent = true
  owners      = ["amazon"]

  filter {
    name   = "name"
    values = ["al2023-ami-*-x86_64"]
  }
}

locals {
  prefix      = "${var.project_name}-${var.environment}"
  bucket_name = var.frontend_bucket_name != "" ? var.frontend_bucket_name : "${local.prefix}-frontend-${data.aws_caller_identity.current.account_id}"
}

resource "aws_security_group" "ec2" {
  name        = "${local.prefix}-ec2-sg"
  description = "Allow SSH and app traffic"
  vpc_id      = data.aws_vpc.default.id

  ingress {
    description = "SSH"
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = [var.allowed_ssh_cidr]
  }

  ingress {
    description = "HTTP"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    description = "HTTPS"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    description = "App Port"
    from_port   = 8000
    to_port     = 8000
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

resource "aws_instance" "app" {
  ami                         = data.aws_ami.amazon_linux.id
  instance_type               = var.ec2_instance_type
  subnet_id                   = data.aws_subnets.default.ids[0]
  vpc_security_group_ids      = [aws_security_group.ec2.id]
  associate_public_ip_address = true
  key_name                    = var.ec2_key_name
  iam_instance_profile        = aws_iam_instance_profile.ec2.name

  user_data = <<-EOF
    #!/bin/bash
    dnf update -y
    dnf install -y python3 python3-pip git awscli amazon-ssm-agent
    systemctl enable --now amazon-ssm-agent
    mkdir -p /opt/hackathon

    cat >/etc/systemd/system/hackathon-api.service <<'UNIT'
    [Unit]
    Description=Hackathon FastAPI Service
    After=network.target

    [Service]
    Type=simple
    WorkingDirectory=/opt/hackathon/backend
    ExecStart=/opt/hackathon/venv/bin/python -m uvicorn app.main:app --host 0.0.0.0 --port 8000
    Restart=always
    RestartSec=5
    User=root

    [Install]
    WantedBy=multi-user.target
    UNIT

    systemctl daemon-reload
    systemctl enable hackathon-api.service
  EOF

  tags = {
    Name = "${local.prefix}-ec2"
  }
}

resource "aws_iam_role" "ec2" {
  name = "${local.prefix}-ec2-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Action = "sts:AssumeRole"
      Principal = {
        Service = "ec2.amazonaws.com"
      }
    }]
  })
}

resource "aws_iam_role_policy_attachment" "ec2_ssm" {
  role       = aws_iam_role.ec2.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore"
}

resource "aws_iam_role_policy_attachment" "ec2_s3_read" {
  role       = aws_iam_role.ec2.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonS3ReadOnlyAccess"
}

resource "aws_iam_instance_profile" "ec2" {
  name = "${local.prefix}-ec2-profile"
  role = aws_iam_role.ec2.name
}

resource "aws_s3_bucket" "frontend" {
  bucket = local.bucket_name
}

resource "aws_s3_bucket_public_access_block" "frontend" {
  bucket                  = aws_s3_bucket.frontend.id
  block_public_acls       = false
  block_public_policy     = false
  ignore_public_acls      = false
  restrict_public_buckets = false
}

resource "aws_s3_bucket_website_configuration" "frontend" {
  bucket = aws_s3_bucket.frontend.id

  index_document {
    suffix = "index.html"
  }

  error_document {
    key = "index.html"
  }
}

resource "aws_s3_bucket_policy" "frontend_public" {
  bucket = aws_s3_bucket.frontend.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Principal = "*"
      Action = ["s3:GetObject"]
      Resource = ["${aws_s3_bucket.frontend.arn}/*"]
    }]
  })
}

resource "aws_cloudfront_distribution" "frontend" {
  enabled             = true
  default_root_object = "index.html"

  origin {
    domain_name = aws_s3_bucket_website_configuration.frontend.website_endpoint
    origin_id   = "frontendS3Website"

    custom_origin_config {
      http_port              = 80
      https_port             = 443
      origin_protocol_policy = "http-only"
      origin_ssl_protocols   = ["TLSv1.2"]
    }
  }

  default_cache_behavior {
    allowed_methods        = ["GET", "HEAD", "OPTIONS"]
    cached_methods         = ["GET", "HEAD"]
    target_origin_id       = "frontendS3Website"
    viewer_protocol_policy = "redirect-to-https"

    forwarded_values {
      query_string = false
      cookies {
        forward = "none"
      }
    }
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    cloudfront_default_certificate = true
  }
}
FILE

write_from_stdin "$ROOT_DIR/infra/outputs.tf" <<'FILE'
# NOTE: The CloudFront URL takes 10–15 minutes to go live after the first
# terraform apply. If you see a 403 or blank page immediately, wait and retry.
output "cloudfront_url" {
  value = "https://${aws_cloudfront_distribution.frontend.domain_name}"
}

output "s3_bucket_name" {
  value = aws_s3_bucket.frontend.bucket
}

output "cloudfront_distribution_id" {
  value = aws_cloudfront_distribution.frontend.id
}

output "ec2_instance_id" {
  value = aws_instance.app.id
}

output "ec2_public_ip" {
  value = aws_instance.app.public_ip
}

output "ec2_public_dns" {
  value = aws_instance.app.public_dns
}
FILE

write_from_stdin "$ROOT_DIR/infra/terraform.tfvars.example" <<'FILE'
project_name        = "hackathon"
environment         = "dev"
region              = "us-west-1"
ec2_instance_type   = "t3.micro"
ec2_key_name        = null
allowed_ssh_cidr    = "0.0.0.0/0"
frontend_bucket_name = ""
FILE

write_from_stdin "$ROOT_DIR/.github/workflows/terraform-plan.yml" <<'FILE'
name: Terraform Plan

on:
  pull_request:
    branches: [dev, main]
    paths:
      - "infra/**"

permissions:
  contents: read

jobs:
  plan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: aws-actions/configure-aws-credentials@v4
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: ${{ secrets.AWS_REGION }}

      - uses: hashicorp/setup-terraform@v3

      - working-directory: infra
        run: terraform init

      - working-directory: infra
        run: terraform plan -no-color
FILE

write_from_stdin "$ROOT_DIR/.github/workflows/terraform-deploy.yml" <<'FILE'
name: Terraform Deploy

on:
  push:
    branches: [dev, main]
    paths:
      - "infra/**"
      - "backend/**"
      - "frontend/**"
      - ".github/workflows/terraform-deploy.yml"
  workflow_dispatch:

permissions:
  contents: read

jobs:
  changes:
    runs-on: ubuntu-latest
    outputs:
      infra_changed: ${{ steps.filter.outputs.infra }}
      backend_changed: ${{ steps.filter.outputs.backend }}
      frontend_changed: ${{ steps.filter.outputs.frontend }}
      workflow_changed: ${{ steps.filter.outputs.workflow }}
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - uses: dorny/paths-filter@v3
        id: filter
        with:
          filters: |
            infra:
              - 'infra/**'
            backend:
              - 'backend/**'
            frontend:
              - 'frontend/**'
            workflow:
              - '.github/workflows/terraform-deploy.yml'

  infra:
    runs-on: ubuntu-latest
    needs: changes
    outputs:
      s3_bucket_name: ${{ steps.tfout.outputs.s3_bucket_name }}
      cloudfront_distribution_id: ${{ steps.tfout.outputs.cloudfront_distribution_id }}
      ec2_instance_id: ${{ steps.tfout.outputs.ec2_instance_id }}
    steps:
      - uses: actions/checkout@v4

      - uses: aws-actions/configure-aws-credentials@v4
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: ${{ secrets.AWS_REGION }}

      - uses: hashicorp/setup-terraform@v3

      - working-directory: infra
        run: terraform init

      - name: Detect EC2 from Terraform state
        id: ec2check
        working-directory: infra
        run: |
          set -euo pipefail

          if ! ec2_id="$(terraform output -raw ec2_instance_id 2>/dev/null)"; then
            echo "ec2_missing=true" >> "$GITHUB_OUTPUT"
            exit 0
          fi

          if [[ -z "$ec2_id" ]]; then
            echo "ec2_missing=true" >> "$GITHUB_OUTPUT"
            exit 0
          fi

          state="$(aws ec2 describe-instances \
            --instance-ids "$ec2_id" \
            --query 'Reservations[0].Instances[0].State.Name' \
            --output text 2>/dev/null || true)"

          if [[ -z "$state" || "$state" == "None" || "$state" == "terminated" || "$state" == "shutting-down" ]]; then
            echo "ec2_missing=true" >> "$GITHUB_OUTPUT"
          else
            echo "ec2_missing=false" >> "$GITHUB_OUTPUT"
          fi

      - working-directory: infra
        if: github.event_name == 'workflow_dispatch' || needs.changes.outputs.infra_changed == 'true' || needs.changes.outputs.workflow_changed == 'true' || steps.ec2check.outputs.ec2_missing == 'true'
        run: terraform plan -out=tfplan

      - working-directory: infra
        if: github.event_name == 'workflow_dispatch' || needs.changes.outputs.infra_changed == 'true' || needs.changes.outputs.workflow_changed == 'true' || steps.ec2check.outputs.ec2_missing == 'true'
        run: terraform apply -auto-approve tfplan

      - name: Capture Terraform Outputs
        id: tfout
        working-directory: infra
        run: |
          echo "s3_bucket_name=$(terraform output -raw s3_bucket_name)" >> "$GITHUB_OUTPUT"
          echo "cloudfront_distribution_id=$(terraform output -raw cloudfront_distribution_id)" >> "$GITHUB_OUTPUT"
          echo "ec2_instance_id=$(terraform output -raw ec2_instance_id)" >> "$GITHUB_OUTPUT"

  backend:
    runs-on: ubuntu-latest
    needs: [changes, infra]
    if: github.event_name == 'workflow_dispatch' || needs.changes.outputs.backend_changed == 'true'
    steps:
      - uses: actions/checkout@v4

      - uses: aws-actions/configure-aws-credentials@v4
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: ${{ secrets.AWS_REGION }}

      - name: Package backend source
        run: |
          tar -czf backend.tgz -C backend .

      - name: Upload backend package to S3
        run: |
          aws s3 cp backend.tgz s3://${{ needs.infra.outputs.s3_bucket_name }}/deployments/backend-${{ github.sha }}.tgz

      - name: Wait for EC2 to become SSM managed
        run: |
          set -euo pipefail
          instance_id="${{ needs.infra.outputs.ec2_instance_id }}"
          for i in $(seq 1 40); do
            ping_status="$(aws ssm describe-instance-information \
              --filters Key=InstanceIds,Values="$instance_id" \
              --query 'InstanceInformationList[0].PingStatus' \
              --output text 2>/dev/null || true)"

            if [[ "$ping_status" == "Online" ]]; then
              exit 0
            fi

            sleep 15
          done
          echo "EC2 instance is not online in SSM" >&2
          exit 1

      - name: Deploy backend on EC2 via SSM
        run: |
          set -euo pipefail
          instance_id="${{ needs.infra.outputs.ec2_instance_id }}"
          bucket="${{ needs.infra.outputs.s3_bucket_name }}"
          object_key="deployments/backend-${{ github.sha }}.tgz"

          cat > ssm-params.json <<EOF
          {
            "commands": [
              "set -euo pipefail",
              "mkdir -p /opt/hackathon",
              "cd /opt/hackathon",
              "aws s3 cp s3://${bucket}/${object_key} backend.tgz",
              "rm -rf backend && mkdir -p backend",
              "tar -xzf backend.tgz -C backend",
              "python3.14 -m venv /opt/hackathon/venv",
              "/opt/hackathon/venv/bin/pip install --upgrade pip",
              "/opt/hackathon/venv/bin/pip install -r /opt/hackathon/backend/requirements.txt",
              "systemctl daemon-reload",
              "systemctl restart hackathon-api.service",
              "systemctl is-active hackathon-api.service"
            ]
          }
          EOF

          command_id="$(aws ssm send-command \
            --instance-ids "$instance_id" \
            --document-name "AWS-RunShellScript" \
            --comment "Deploy backend ${GITHUB_SHA}" \
            --parameters file://ssm-params.json \
            --query 'Command.CommandId' \
            --output text)"

          aws ssm wait command-executed --command-id "$command_id" --instance-id "$instance_id"

          status="$(aws ssm get-command-invocation \
            --command-id "$command_id" \
            --instance-id "$instance_id" \
            --query 'Status' \
            --output text)"

          if [[ "$status" != "Success" ]]; then
            aws ssm get-command-invocation \
              --command-id "$command_id" \
              --instance-id "$instance_id" \
              --query '{Status:Status,StandardOutput:StandardOutputContent,StandardError:StandardErrorContent}'
            exit 1
          fi

  frontend:
    runs-on: ubuntu-latest
    needs: [changes, infra]
    if: github.event_name == 'workflow_dispatch' || needs.changes.outputs.frontend_changed == 'true'
    steps:
      - uses: actions/checkout@v4

      - uses: aws-actions/configure-aws-credentials@v4
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: ${{ secrets.AWS_REGION }}

      - uses: actions/setup-node@v4
        with:
          node-version: "20"

      - name: Install and Build Frontend
        working-directory: frontend
        run: |
          npm ci
          npm run build

      - name: Upload Frontend to S3
        run: aws s3 sync frontend/dist s3://${{ needs.infra.outputs.s3_bucket_name }} --delete

      - name: Invalidate CloudFront
        run: aws cloudfront create-invalidation --distribution-id ${{ needs.infra.outputs.cloudfront_distribution_id }} --paths '/*'

  ec2-ready-check:
    runs-on: ubuntu-latest
    needs: [changes, infra]
    if: github.event_name == 'workflow_dispatch' || needs.changes.outputs.infra_changed == 'true'
    steps:
      - uses: aws-actions/configure-aws-credentials@v4
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: ${{ secrets.AWS_REGION }}

      - name: Confirm EC2 instance state
        run: |
          aws ec2 describe-instance-status \
            --instance-ids "${{ needs.infra.outputs.ec2_instance_id }}" \
            --include-all-instances
FILE

write_from_stdin "$ROOT_DIR/.github/workflows/backend-ci.yml" <<'FILE'
name: Backend API CI

on:
  push:
    branches: [test, dev, main]
    paths:
      - "backend/**"
      - ".github/workflows/backend-ci.yml"
  pull_request:
    branches: [test, dev, main]
    paths:
      - "backend/**"
      - ".github/workflows/backend-ci.yml"

permissions:
  contents: read

jobs:
  backend-health-check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-python@v5
        with:
          python-version: "3.14.3"

      - name: Install backend dependencies
        run: |
          python -m pip install --upgrade pip
          pip install -r backend/requirements.txt

      - name: Run API health smoke check
        run: |
          cd backend
          python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 &
          APP_PID=$!
          sleep 3
          curl -sf http://127.0.0.1:8000/health
          kill $APP_PID
FILE

chmod +x "$ROOT_DIR/setup_hackathon_repo.sh"

# ── Auto-copy example configs if real files don't exist yet ──────────────────
if [[ ! -f "$ROOT_DIR/backend/.env" ]]; then
  cp "$ROOT_DIR/backend/.env.example" "$ROOT_DIR/backend/.env"
  echo "write backend/.env  (copied from .env.example — edit before deploying)"
else
  echo "skip  backend/.env (already exists)"
fi

if [[ ! -f "$ROOT_DIR/infra/terraform.tfvars" ]]; then
  cp "$ROOT_DIR/infra/terraform.tfvars.example" "$ROOT_DIR/infra/terraform.tfvars"
  echo "write infra/terraform.tfvars  (copied from .example — fill in your values)"
else
  echo "skip  infra/terraform.tfvars (already exists)"
fi
# ─────────────────────────────────────────────────────────────────────────────

write_from_stdin "$ROOT_DIR/README.md" <<'FILE'
# Hackathon Starter

## Quick start (local dev)

### Backend
```bash
cd backend
python3.14 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env          # already done by setup script
uvicorn app.main:app --reload
# → http://localhost:8000/health
# → http://localhost:8000/api/integrations
```

### Frontend
```bash
cd frontend
npm install
npm run dev
# → http://localhost:5173  (proxies /api and /health to localhost:8000)
```

### Quick health check
```bash
cd backend && curl http://localhost:8000/health
```

---

## AWS deploy

### 1. Configure AWS credentials
```bash
# Create IAM user hackathon-cicd with AdministratorAccess, then:
aws configure --profile hackathon
export AWS_PROFILE=hackathon
```

### 2. Add GitHub Secrets (3 only)
- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`
- `AWS_REGION`

### 3. Apply Terraform
```bash
cd infra
cp terraform.tfvars.example terraform.tfvars   # already done by setup script
# Edit terraform.tfvars — set your region at minimum
terraform init
terraform apply
```

> **Note:** The CloudFront URL takes **10–15 minutes** to go live after the first
> `terraform apply`. If you see a 403 or blank page, wait and retry — it is not broken.

### 4. Trigger CI/CD
Push to `dev` to deploy backend + frontend automatically.

---

## Branch strategy
```
feature/* → test (backend CI)
test      → dev  (full deploy on push)
dev       → main (production)
```

## Definition of Done (must be green before feature work)
- [ ] `terraform apply` passes and pipeline runs end-to-end
- [ ] CloudFront URL loads the React frontend
- [ ] EC2 is running and SSM-managed
- [ ] `/health` returns `{"status": "ok"}` locally and from EC2
FILE

echo ""
echo "Done."
echo ""
echo "Next steps:"
echo "  1. cd backend && python3.14 -m venv .venv && source .venv/bin/activate && pip install -r requirements.txt"
echo "  2. uvicorn app.main:app --reload  →  verify http://localhost:8000/health returns 200"
echo "  3. cd frontend && npm install && npm run dev  →  verify http://localhost:5173 loads"
echo "  4. Edit infra/terraform.tfvars with your AWS region, then: cd infra && terraform init && terraform apply"
echo "  5. Add GitHub secrets: AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_REGION"
echo ""
echo "See README.md for the full setup guide."