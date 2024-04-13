variable "dynamo_table_name" {
  type   = string
  default = "nothing"
}
variable "aws_user_region" {
  type   = string
  default = "nothing"
}
variable "aws_dynamo_table_arn" {
  type   = string
  default = "nothing"
}


data "archive_file" "example_zip" {
  type        = "zip"
  source_dir  = "${path.module}/../01.api"
  output_path = "${path.module}/lambda_package/example_lambda.zip"
  excludes    = ["src", "*.ts", "*.map","tsconfig.json",".gitignore", ".http"]
}

# data "archive_file" "nodejs18_zip" {
#   type        = "zip"
#   source_dir  = "${path.module}/nodejs"
#   output_path = "${path.module}/lambda_layers/nodejs18_layer.zip"
# }


# resource "aws_lambda_layer_version" "nodejs18_layer" {
#   layer_name     = "nodejs18-layer"
#   filename       = data.archive_file.nodejs18_zip.output_path
#   compatible_runtimes = ["nodejs18.x"]
#   source_code_hash = filebase64sha256(data.archive_file.nodejs18_zip.output_path)
# }

resource "aws_s3_bucket" "explore_assistant_bucket" {
  bucket = "explore-assistant-bucket"
}

resource "aws_s3_object" "lambda_zip" {
  bucket = aws_s3_bucket.explore_assistant_bucket.bucket
  key    = "lambda_package/example_lambda.zip"
  source = data.archive_file.example_zip.output_path
  etag   = filemd5(data.archive_file.example_zip.output_path)
}

resource "aws_lambda_function" "example_lambda" {
  function_name    = "example-lambda"
  handler          = "build/index.handler"
  runtime          = "nodejs18.x"
  s3_bucket        = aws_s3_bucket.explore_assistant_bucket.bucket
  s3_key           = aws_s3_object.lambda_zip.key
  source_code_hash = filebase64sha256(data.archive_file.example_zip.output_path)
  role             = aws_iam_role.lambda_role.arn

  environment {
    variables = {
      DYNAMO_TABLE_NAME = var.dynamo_table_name
      AWS_USER_REGION = var.aws_user_region
      // 他の環境変数もここに追加できます
    }
  }
}

resource "aws_iam_role" "lambda_role" {
  name = "example-lambda-role"

  assume_role_policy = <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Action": "sts:AssumeRole",
      "Principal": {
        "Service": "lambda.amazonaws.com"
      },
      "Effect": "Allow",
      "Sid": ""
    }
  ]
}
EOF
}

resource "aws_iam_policy" "lambda_policy" {
  name        = "example-lambda-policy"
  description = "IAM policy for the example Lambda function"

  policy = jsonencode({
    Version   = "2012-10-17"
    Statement = [
      {
        Effect   = "Allow"
        Action   = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents",
           "dynamodb:Scan"  // DynamoDB Scan 操作を許可
        ]
        Resource = [
          "${aws_cloudwatch_log_group.example_log_group.arn}",
          "${aws_cloudwatch_log_group.example_log_group.arn}:*",
          var.aws_dynamo_table_arn,
        ]
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "lambda_policy_attachment" {
  role       = aws_iam_role.lambda_role.name
  policy_arn = aws_iam_policy.lambda_policy.arn
}

resource "aws_cloudwatch_log_group" "example_log_group" {
  name = "/aws/lambda/${aws_lambda_function.example_lambda.function_name}"
  retention_in_days = 30
}



resource "aws_api_gateway_rest_api" "example_api" {
  name        = "example-api"
  description = "Example REST API Gateway for Lambda"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect    = "Allow"
        Principal = "*"
        Action    = "execute-api:Invoke"
        Resource  = "execute-api:/*/*/*"
      }
    ]
  })
}

resource "aws_api_gateway_resource" "example_resource" {
  rest_api_id = aws_api_gateway_rest_api.example_api.id
  parent_id   = aws_api_gateway_rest_api.example_api.root_resource_id
  path_part   = "{proxy+}"
}

resource "aws_api_gateway_method" "example_method" {
  rest_api_id   = aws_api_gateway_rest_api.example_api.id
  resource_id   = aws_api_gateway_resource.example_resource.id
  http_method   = "GET"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "example_lambda_integration" {
  rest_api_id = aws_api_gateway_rest_api.example_api.id
  resource_id = aws_api_gateway_resource.example_resource.id
  http_method = aws_api_gateway_method.example_method.http_method

  integration_http_method = "GET"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.example_lambda.invoke_arn
}

resource "aws_api_gateway_deployment" "example_deployment" {
  depends_on = [
    aws_api_gateway_integration.example_lambda_integration
  ]

  rest_api_id = aws_api_gateway_rest_api.example_api.id
  stage_name  = "default"
}

resource "aws_lambda_permission" "api_gateway" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.example_lambda.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.example_api.execution_arn}/*/*"
}

