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

variable "dynamodb_devices_table_name" {
  type    = string
  default = ""
}

variable "dynamodb_procedures_table_name" {
  type    = string
  default = ""
}

variable "lambda_compliance_function_name" {
  type    = string
  default = ""
}

variable "lambda_timeout_seconds" {
  type    = number
  default = 30
}

variable "lambda_memory_mb" {
  type    = number
  default = 256
}

variable "compliance_docs_prefix" {
  type    = string
  default = "compliance-docs/"

  validation {
    condition     = length(trimspace(var.compliance_docs_prefix)) > 0 && endswith(var.compliance_docs_prefix, "/")
    error_message = "compliance_docs_prefix must be non-empty and end with '/'."
  }
}
