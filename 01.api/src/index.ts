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

  // クエリパラメータを取得する
  const queryParams = event.queryStringParameters;

  // クエリパラメータと body を結合する
  const result = {
    ...body,
    queryParams,
    result: "success",
  };

  console.log(result, "PARAM", queryParams);

  return {
    statusCode: 200,
    body: JSON.stringify(result),
  };
};
