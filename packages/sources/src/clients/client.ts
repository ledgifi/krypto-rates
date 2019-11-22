import { ApolloError } from 'apollo-server'
import axios, { AxiosError, AxiosInstance, AxiosRequestConfig } from 'axios'

export class RateSourceError extends ApolloError {
  public constructor(message: string, properties?: Record<string, any>) {
    super(message, 'RATE_SOURCE_ERROR', properties)
    Object.defineProperty(this, 'name', { value: 'RateSourceError' })
  }
}

export const createClient = (config: AxiosRequestConfig): AxiosInstance => {
  const client = axios.create(config)
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
