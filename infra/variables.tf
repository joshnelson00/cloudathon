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
