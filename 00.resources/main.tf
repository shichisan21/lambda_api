data "archive_file" "example_zip" {
  type        = "zip"
  source_dir  = "${path.module}/../01.api"
  output_path = "${path.module}/lambda_package/example_lambda.zip"
  excludes    = ["src", "*.ts", "*.map","tsconfig.json"]
}

resource "aws_lambda_function" "example_lambda" {
  function_name    = "example-lambda"
  handler          = "build/index.handler"
  runtime          = "nodejs18.x"
  filename         = data.archive_file.example_zip.output_path
  source_code_hash = filebase64sha256(data.archive_file.example_zip.output_path)
  role = aws_iam_role.lambda_role.arn

  environment {
    variables = {
      DYNAMO_TABLE_NAME = "example_value"
      AWS_USER_REGION = "example_value"
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
          "logs:PutLogEvents"
        ]
        Resource = [
          "${aws_cloudwatch_log_group.example_log_group.arn}",
          "${aws_cloudwatch_log_group.example_log_group.arn}:*"
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



resource "aws_apigatewayv2_api" "example_api" {
  name          = "example-api"
  protocol_type = "HTTP"
  description   = "Example API Gateway for Lambda"
}

resource "aws_apigatewayv2_integration" "example_lambda_integration" {
  api_id           = aws_apigatewayv2_api.example_api.id
  integration_type = "AWS_PROXY"
  integration_uri  = aws_lambda_function.example_lambda.invoke_arn
}

resource "aws_apigatewayv2_route" "example_route" {
  api_id    = aws_apigatewayv2_api.example_api.id
  route_key = "ANY /{proxy+}"
  target    = "integrations/${aws_apigatewayv2_integration.example_lambda_integration.id}"
}

resource "aws_apigatewayv2_stage" "example_stage" {
  api_id      = aws_apigatewayv2_api.example_api.id
  name        = "default"
  auto_deploy = true
}

resource "aws_lambda_permission" "api_gateway" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.example_lambda.function_name
  principal     = "apigateway.amazonaws.com"

  # API Gatewayの全ステージからの呼び出しを許可する
  source_arn = "${aws_apigatewayv2_api.example_api.execution_arn}/*/*"
}
