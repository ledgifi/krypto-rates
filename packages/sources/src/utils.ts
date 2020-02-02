import { Market } from '@raptorsystems/krypto-rates-common/market'
import { ApolloError } from 'apollo-server-core'
import axios, { AxiosError, AxiosInstance, AxiosRequestConfig } from 'axios'
import { MarketsByKey, QuotesByBaseCurrency } from './services/types'

export class RateSourceError<T> extends ApolloError {
  public constructor(message: string, properties?: T) {
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

export async function buildMarketsByKey<T>(
  markets: Market[],
  getKey: (market: Market) => T | undefined | Promise<T | undefined>,
): Promise<MarketsByKey<T>> {
  const marketsMap: MarketsByKey<T> = new Map()
  for (let market of markets) {
    let key = await getKey(market)
    if (!key) {
      key = await getKey(market.inverse)
      if (!key) throw `Market ${market.id} is not supported`
      market = market.inverse
    }
    const markets: Market[] = marketsMap.get(key) || []
    markets.push(market)
    marketsMap.set(key, markets)
  }
  return marketsMap
}

export function expandMarkets(markets: Market[]): QuotesByBaseCurrency {
  return markets.reduce<QuotesByBaseCurrency>((mapping, market) => {
    const quotes = mapping.get(market.base) || []
    quotes.push(market.quote)
    mapping.set(market.base, quotes)
    return mapping
  }, new Map())
}
