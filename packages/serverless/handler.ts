import { dotenv } from '@raptorsystems/krypto-rates-utils/src/dotenv'
dotenv.config()

import { app } from '@raptorsystems/krypto-rates-server/app'
import type { APIGatewayProxyHandler } from 'aws-lambda'
import awsLambdaFastify from 'aws-lambda-fastify'

export const graphql: APIGatewayProxyHandler = awsLambdaFastify(app)
