import { dotenv } from '@raptorsystems/krypto-rates-utils/src/dotenv'
dotenv.config()

import { processRequest } from '@raptorsystems/krypto-rates-core/src/graphql-helix'
import type { APIGatewayProxyHandler } from 'aws-lambda'
import { getGraphQLParameters, shouldRenderGraphiQL } from 'graphql-helix'
import { Request } from 'graphql-helix/dist/types'
import { renderPlaygroundPage } from 'graphql-playground-html'

export const graphql: APIGatewayProxyHandler = async (event) => {
  const request: Request = {
    body: event.body,
    headers: event.headers,
    method: event.httpMethod,
    query: event.queryStringParameters,
  }

  if (shouldRenderGraphiQL(request)) {
    return {
      statusCode: 200,
      body: renderPlaygroundPage({}),
      headers: {
        'Content-Type': 'text/html',
      },
    }
  }

  const { operationName, query, variables } = getGraphQLParameters(request)

  const result = await processRequest({
    operationName,
    query,
    variables,
    request,
  })

  if (result.type === 'RESPONSE') {
    return {
      statusCode: result.status,
      body: JSON.stringify(result.payload),
      headers: result.headers.reduce(
        (obj, { name, value }) => ({ ...obj, [name]: value }),
        {},
      ),
    }
  } else {
    throw new Error(`Unsupported graphql-helix result type: ${result.type}}`)
  }
}
