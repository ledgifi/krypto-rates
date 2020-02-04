import { Market } from '@raptorsystems/krypto-rates-common/market'
import { ApolloError } from 'apollo-server-core'
import axios, { AxiosError, AxiosInstance, AxiosRequestConfig } from 'axios'
import { MarketsByKey } from './services/types'
import { Currency, MarketBase } from '@raptorsystems/krypto-rates-common/types'

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
): Promise<MarketsByKey<T, Market>> {
  const marketsMap: MarketsByKey<T, Market> = new Map()
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

export function expandMarkets<M extends MarketBase>(
  markets: M[],
  by: 'base' | 'quote',
): MarketsByKey<Currency, M> {
  return markets.reduce<MarketsByKey<Currency, M>>((mapping, market) => {
    const markets = mapping.get(market[by]) || []
    markets.push(market)
    mapping.set(market[by], markets)
    return mapping
  }, new Map())
}

export async function mapMarkets<T, M extends MarketBase>(
  markets: M[],
  by: 'base' | 'quote',
  callback: (currency: Currency, markets: M[]) => T[] | Promise<T[]>,
): Promise<T[]> {
  return (
    await Promise.all(
      Array.from(expandMarkets(markets, by)).map(([currency, markets]) =>
        callback(currency, markets),
      ),
    )
  ).flat()
}

export async function mapMarketsByBase<T, M extends MarketBase>(
  markets: M[],
  callback: (currency: Currency, markets: M[]) => T[] | Promise<T[]>,
): Promise<T[]> {
  return mapMarkets(markets, 'base', callback)
}

export async function mapMarketsByQuote<T, M extends MarketBase>(
  markets: M[],
  callback: (currency: Currency, markets: M[]) => T[] | Promise<T[]>,
): Promise<T[]> {
  return mapMarkets(markets, 'quote', callback)
}
