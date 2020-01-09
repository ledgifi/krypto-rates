import { ApolloError } from 'apollo-server-core'
import axios, { AxiosError, AxiosInstance, AxiosRequestConfig } from 'axios'

export class RateSourceError extends ApolloError {
  public constructor(message: string, properties?: Record<string, any>) {
    super(message, 'RATE_SOURCE_ERROR', properties)
    Object.defineProperty(this, 'name', { value: 'RateSourceError' })
  }
}

export const createClient = (
  name: string,
  config: AxiosRequestConfig,
): AxiosInstance => {
  const client = axios.create(config)
  client.interceptors.request.use(request => {
    console.log(`Fetching rate from ${name}`)
    return request
  })
  client.interceptors.response.use(
    response => response,
    ({ message, response }: AxiosError) => {
      const { data, status, statusText, config } = response || {}
      throw new RateSourceError(message, {
        data,
        status,
        statusText,
        config,
      })
    },
  )
  return client
}
