terraform {
  required_version = ">= 1.6.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    archive = {
      source  = "hashicorp/archive"
      version = "~> 2.5"
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
  prefix                 = "${var.project_name}-${var.environment}"
  bucket_name            = var.frontend_bucket_name != "" ? var.frontend_bucket_name : "${local.prefix}-frontend-${data.aws_caller_identity.current.account_id}"
  devices_table_name     = var.dynamodb_devices_table_name != "" ? var.dynamodb_devices_table_name : "${local.prefix}-devices"
  procedures_table_name  = var.dynamodb_procedures_table_name != "" ? var.dynamodb_procedures_table_name : "${local.prefix}-procedures"
  users_table_name       = var.dynamodb_users_table_name != "" ? var.dynamodb_users_table_name : "${local.prefix}-users"
  compliance_bucket_name = var.compliance_bucket_name != "" ? var.compliance_bucket_name : "${local.prefix}-compliance-docs-${data.aws_caller_identity.current.account_id}"
  compliance_lambda_name = var.lambda_compliance_function_name != "" ? var.lambda_compliance_function_name : "${local.prefix}-compliance-doc-generator"
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
    set -euo pipefail
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
    Environment="PATH=/opt/hackathon/venv/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin"
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
  policy_arn = "arn:aws:iam::aws:policy/AmazonS3FullAccess"
}

resource "aws_iam_role_policy" "ec2_app_access" {
  name = "${local.prefix}-ec2-app-access"
  role = aws_iam_role.ec2.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "dynamodb:GetItem",
          "dynamodb:PutItem",
          "dynamodb:UpdateItem",
          "dynamodb:Query",
          "dynamodb:Scan"
        ]
        Resource = [
          aws_dynamodb_table.devices.arn,
          aws_dynamodb_table.procedures.arn,
          aws_dynamodb_table.users.arn
        ]
      },
      {
        Effect   = "Allow"
        Action   = ["lambda:InvokeFunction"]
        Resource = [aws_lambda_function.compliance_doc_generator.arn]
      },
      {
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:PutObject"
        ]
        Resource = [
          "${aws_s3_bucket.compliance_docs.arn}/*"
        ]
      }
    ]
  })
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
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}


resource "aws_cloudfront_origin_access_control" "frontend" {
  name                              = "${local.prefix}-oac"
  description                       = "OAC for frontend S3 bucket"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

resource "aws_s3_bucket_policy" "frontend_private" {
  bucket = aws_s3_bucket.frontend.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = {
        Service = "cloudfront.amazonaws.com"
      }
      Action    = ["s3:GetObject"]
      Resource  = ["${aws_s3_bucket.frontend.arn}/*"]
      Condition = {
        StringEquals = {
          "aws:SourceArn" = "arn:aws:cloudfront::${data.aws_caller_identity.current.account_id}:distribution/${aws_cloudfront_distribution.frontend.id}"
        }
      }
    }]
  })
}

resource "aws_cloudfront_distribution" "frontend" {
  enabled             = true
  default_root_object = "index.html"

  origin {
    domain_name              = aws_s3_bucket.frontend.bucket_regional_domain_name
    origin_id                = "frontendS3"
    origin_access_control_id = aws_cloudfront_origin_access_control.frontend.id
  }

  default_cache_behavior {
    allowed_methods        = ["GET", "HEAD", "OPTIONS"]
    cached_methods         = ["GET", "HEAD"]
    target_origin_id       = "frontendS3"
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

resource "aws_dynamodb_table" "devices" {
  name         = local.devices_table_name
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "device_id"

  attribute {
    name = "device_id"
    type = "S"
  }

  lifecycle {
    prevent_destroy = true
  }
}

resource "aws_dynamodb_table" "procedures" {
  name         = local.procedures_table_name
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "procedure_id"

  attribute {
    name = "procedure_id"
    type = "N"
  }

  lifecycle {
    prevent_destroy = true
  }
}

resource "aws_dynamodb_table" "users" {
  name         = local.users_table_name
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "user_id"

  attribute {
    name = "user_id"
    type = "S"
  }

  lifecycle {
    prevent_destroy = true
  }
}

resource "aws_s3_bucket" "compliance_docs" {
  bucket = local.compliance_bucket_name
}

resource "aws_s3_bucket_public_access_block" "compliance_docs" {
  bucket                  = aws_s3_bucket.compliance_docs.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_versioning" "compliance_docs" {
  bucket = aws_s3_bucket.compliance_docs.id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_iam_role" "lambda" {
  name = "${local.prefix}-lambda-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Action = "sts:AssumeRole"
      Principal = {
        Service = "lambda.amazonaws.com"
      }
    }]
  })
}

resource "aws_iam_role_policy_attachment" "lambda_basic_execution" {
  role       = aws_iam_role.lambda.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

resource "aws_iam_role_policy" "lambda_data_access" {
  name = "${local.prefix}-lambda-data-access"
  role = aws_iam_role.lambda.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "dynamodb:GetItem",
          "dynamodb:PutItem",
          "dynamodb:UpdateItem",
          "dynamodb:Query",
          "dynamodb:Scan"
        ]
        Resource = [
          aws_dynamodb_table.devices.arn,
          aws_dynamodb_table.procedures.arn,
          aws_dynamodb_table.users.arn
        ]
      },
      {
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:PutObject"
        ]
        Resource = ["${aws_s3_bucket.compliance_docs.arn}/*"]
      }
    ]
  })
}

data "archive_file" "compliance_doc_generator" {
  type        = "zip"
  source_file = "${path.module}/lambda/compliance_doc_generator.py"
  output_path = "${path.module}/.terraform/compliance_doc_generator.zip"
}

resource "aws_lambda_function" "compliance_doc_generator" {
  function_name    = local.compliance_lambda_name
  role             = aws_iam_role.lambda.arn
  runtime          = "python3.12"
  handler          = "compliance_doc_generator.lambda_handler"
  filename         = data.archive_file.compliance_doc_generator.output_path
  source_code_hash = data.archive_file.compliance_doc_generator.output_base64sha256
  timeout          = var.lambda_timeout_seconds
  memory_size      = var.lambda_memory_mb

  environment {
    variables = {
      DEVICES_TABLE_NAME    = aws_dynamodb_table.devices.name
      PROCEDURES_TABLE_NAME = aws_dynamodb_table.procedures.name
      USERS_TABLE_NAME      = aws_dynamodb_table.users.name
      COMPLIANCE_BUCKET     = aws_s3_bucket.compliance_docs.bucket
    }
  }

  depends_on = [
    aws_iam_role_policy_attachment.lambda_basic_execution,
    aws_iam_role_policy.lambda_data_access
  ]
}

resource "aws_cloudwatch_log_group" "lambda_compliance_doc_generator" {
  name              = "/aws/lambda/${aws_lambda_function.compliance_doc_generator.function_name}"
  retention_in_days = 14
}
