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

output "dynamodb_devices_table_name" {
  value = aws_dynamodb_table.devices.name
}

output "dynamodb_procedures_table_name" {
  value = aws_dynamodb_table.procedures.name
}

output "dynamodb_users_table_name" {
  value = aws_dynamodb_table.users.name
}

output "compliance_bucket_name" {
  value = aws_s3_bucket.compliance_docs.bucket
}

output "lambda_compliance_function_name" {
  value = aws_lambda_function.compliance_doc_generator.function_name
}

output "lambda_compliance_function_arn" {
  value = aws_lambda_function.compliance_doc_generator.arn
}

output "athena_results_bucket_name" {
  value = aws_s3_bucket.athena_results.bucket
}

output "athena_workgroup_name" {
  value = aws_athena_workgroup.analytics.name
}

output "athena_database_name" {
  value = aws_glue_catalog_database.analytics.name
}
