declare module 'aws-lambda-fastify' {
  import type { APIGatewayProxyHandler } from 'aws-lambda'
  import type { FastifyInstance } from 'fastify'

  interface AwsLambdaFastifyOptions {
    binaryMimeTypes?: string[]
    callbackWaitsForEmptyEventLoop?: boolean
  }

  function awsLambdaFastify(
    app: FastifyInstance,
    options?: AwsLambdaFastifyOptions,
  ): APIGatewayProxyHandler

  export default awsLambdaFastify
}
