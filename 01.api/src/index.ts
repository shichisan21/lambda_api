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
  UpdateCommand,
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

  console.log(result, "PARAM", queryParams, event.httpMethod);

  if (!tableName) {
    return {
      statusCode: 500,
      headers: headers,
      body: "DynamoDB table name is not set",
    };
  }

  switch (event.httpMethod) {
    case "GET":
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

    case "POST":
      try {
        console.log("POST", event);
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

        const latestItems = sortedItems?.slice(0, 3);
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
      break;

    case "PUT":
      try {
        console.log("PUT", event);

        // const itemToUpdate = event.body && JSON.parse(event.body);

        // const dbClient = new DynamoDBClient({
        //   region: process.env.AWS_USER_REGION,
        //   credentials: fromEnv(),
        // });

        // const params = {
        //   TableName: tableName,
        // };

        // // 更新用のコマンドを作成
        // const updateCommand = new UpdateCommand({
        //   TableName: tableName,
        //   Key: marshall({ timestamp: itemToUpdate.timestamp }), // 主キーを指定
        //   UpdateExpression: "set #attrName = :attrValue",
        //   ExpressionAttributeNames: { "#attrName": "attributeToUpdate" },
        //   ExpressionAttributeValues: marshall({
        //     ":attrValue": itemToUpdate.newValue,
        //   }),
        //   ReturnValues: "UPDATED_NEW",
        // });

        // const updateResult = await dbClient.send(updateCommand);

        // 成功したレスポンスを返す
        const updateResult = { result: "成功！" };
        return {
          statusCode: 200,
          headers: headers,
          body: JSON.stringify(updateResult),
        };
      } catch (error: any) {
        console.error("Error", error);
        // エラーレスポンスを返す
        return {
          statusCode: 500,
          headers: headers,
          body: JSON.stringify({ error: error.message }),
        };
      }
      break;
    case "OPTIONS":
      return {
        statusCode: 200,
        headers: {
          "Access-Control-Allow-Origin": "*", // Adjust this to match your needs
          "Access-Control-Allow-Headers":
            "Content-Type, X-Amz-Date, Authorization, X-Api-Key, X-Amz-Security-Token",
          "Access-Control-Allow-Methods": "OPTIONS,POST,GET", // List all supported methods
        },
        body: "", // No need for a body in OPTIONS response
      };

    default:
      return {
        statusCode: 500,
        headers: headers,
        body: JSON.stringify({ error: "error" }),
      };
  }
};

// return {
//   statusCode: 200,
//   headers: headers,
//   body: JSON.stringify(result),
// };
