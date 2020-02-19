import { dotenv } from '@raptorsystems/krypto-rates-utils/src/dotenv'
dotenv.config()

import { ApolloServer } from 'apollo-server-lambda'
import { APIGatewayProxyEvent, Handler } from 'aws-lambda'
import { config } from '@raptorsystems/krypto-rates-core/src/apollo.config'

const server = new ApolloServer(config)

// Reference
// https://github.com/apollographql/apollo-server/issues/2156#issuecomment-533623556

export const graphql: Handler<APIGatewayProxyEvent> = async (
  event,
  context,
) => {
  const apollo = server.createHandler({
    cors: {
      origin: true,
      credentials: true,
      methods: 'GET, POST',
      allowedHeaders:
        'Origin, X-Requested-With, Content-Type, Accept, Authorization',
    },
  })

  return await new Promise((resolve, reject) => {
    apollo(
      // Handle Playground path
      // https://github.com/apollographql/apollo-server/pull/2241#issuecomment-460889307
      event.httpMethod === 'GET'
        ? { ...event, path: event.requestContext.path ?? event.path }
        : event,
      context,
      (error, body) => (error ? reject(error) : resolve(body)),
    )
  })
}
