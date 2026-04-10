terraform {
  backend "s3" {
    bucket         = "hackathon-terraform-state-412381748467"
    key            = "dev/terraform.tfstate"
    region         = "us-west-1"
    encrypt        = true
  }
}
