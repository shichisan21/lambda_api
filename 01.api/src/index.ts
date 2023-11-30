import {
  APIGatewayProxyHandler,
  APIGatewayProxyEvent,
  APIGatewayProxyResult,
} from "aws-lambda";

export const handler: APIGatewayProxyHandler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  console.log(event);
  console.log("TEST 01");
  /* Lambda Function Code */

  const body = event.body ? JSON.parse(event.body) : {};

  const queryParams = event.queryStringParameters;

  const origin = event.headers.origin;

  // CORS ヘッダーの設定
  const headers = {
    "Access-Control-Allow-Origin": origin ? origin : "*", // または特定のオリジン
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "OPTIONS,POST,GET",
  };
  const result = {
    ...body,
    queryParams,
    result: "success",
  };

  console.log(result, "PARAM", queryParams);

  return {
    statusCode: 200,
    headers: headers,
    body: JSON.stringify(result),
  };
};
