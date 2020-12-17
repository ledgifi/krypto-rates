import { dotenv } from '@raptorsystems/krypto-rates-utils/src/dotenv'
dotenv.config()

import {
  formatResult,
  processRequest,
} from '@raptorsystems/krypto-rates-core/src/graphql-helix'
import chalk from 'chalk'
import fastify from 'fastify'
import { getGraphQLParameters } from 'graphql-helix'
import { Request } from 'graphql-helix/dist/types'
import { renderPlaygroundPage } from 'graphql-playground-html'

const isProd = process.env.NODE_ENV === 'production'
const port = parseInt(process.env.PORT as string) || 4000
const address = isProd ? '0.0.0.0' : undefined

const app = fastify()

app.route({
  method: ['GET', 'POST'],
  url: '/',
  async handler(req, res) {
    const request: Request = {
      body: req.body,
      headers: req.headers,
      method: req.method,
      query: req.query,
    }

    if (request.method === 'GET') {
      void res.type('text/html')
      void res.send(renderPlaygroundPage({ endpoint: '/' }))
    } else {
      const { operationName, query, variables } = getGraphQLParameters(request)

      const result = await processRequest({
        operationName,
        query,
        variables,
        request,
      })

      if (result.type === 'RESPONSE') {
        void res.headers(result.headers)
        void res.status(result.status)
        void res.send(formatResult(result.payload))
      } else {
        throw new Error(`Unsupported graphql-helix result type: ${result.type}`)
      }
    }
  },
})

async function runServer() {
  try {
    const url = await app.listen(port, address)
    console.log(`Server listening on ${chalk.cyan(url)}`)
  } catch (error) {
    app.log.error(error)
    process.exit(1)
  }
}

runServer().catch((error) => app.log.error(error))
