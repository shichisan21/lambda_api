import {
  APIGatewayProxyHandler,
  APIGatewayProxyEvent,
  APIGatewayProxyResult,
} from "aws-lambda";

import axios from "axios";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  PutCommand,
  ScanCommand,
  DynamoDBDocumentClient,
  QueryCommand,
} from "@aws-sdk/lib-dynamodb";
import { marshall } from "@aws-sdk/util-dynamodb";
import { defaultProvider } from "@aws-sdk/credential-provider-node";
import { fromEnv } from "@aws-sdk/credential-providers";

/***
 *Interface & Type
 */
interface Item {
  timestamp: string;
  // 他のプロパティもここに追加できます
}
/**
 * Constant
 */

/**
 * Program
 */

export const handler: APIGatewayProxyHandler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  console.log(event);
  console.log("TEST 01");
  /* Lambda Function Code */

  const tableName = process.env.DYNAMO_TABLE_NAME;

  const body = event.body ? JSON.parse(event.body) : {};
  body.response = "response from lambda";

  const queryParams = event.queryStringParameters;

  const origin = event.headers.origin;

  if (body.lambdaTest) {
    body.lambdaTest += "--> response from Lambda";
  }

  // CORS ヘッダーの設定
  const headers = {
    "Access-Control-Allow-Origin": origin ? origin : "*", // または特定のオリジン
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "OPTIONS,POST,GET",
  };
  const result = {
    ...body,
    result: "success",
  };

  console.log(result, "PARAM", queryParams);

  if (!tableName) {
    return {
      statusCode: 500,
      headers: headers,
      body: "DynamoDB table name is not set",
    };
  }

  if (event.httpMethod === "GET") {
    try {
      const dbClient = new DynamoDBClient({
        region: process.env.AWS_USER_REGION,
        credentials: fromEnv(),
      });

      const params = {
        TableName: tableName,
      };

      const command = new ScanCommand(params);
      const data = await dbClient.send(command);

      const sortedItems = data?.Items?.sort((a: any, b: any) => {
        return b.timestamp.localeCompare(a.timestamp);
      });

      const latestItems = sortedItems?.slice(0, 2);
      return {
        statusCode: 200,
        headers: headers,
        body: JSON.stringify(latestItems),
      };
    } catch (error: any) {
      console.error("Error", error);
      return {
        statusCode: 500,
        headers: headers,
        body: JSON.stringify({ error: error.message }),
      };
    }
  }

  return {
    statusCode: 200,
    headers: headers,
    body: JSON.stringify(result),
  };
};
