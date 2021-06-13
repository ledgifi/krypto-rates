import { Market } from '@raptorsystems/krypto-rates-common/src/market'
import {
  Currency,
  MarketInput,
  Timeframe,
} from '@raptorsystems/krypto-rates-common/src/types'
import { ApolloError } from 'apollo-server-errors'
import axios, { AxiosError, AxiosInstance, AxiosRequestConfig } from 'axios'
import { getUnixTime, isAfter, isBefore, isEqual, startOfDay } from 'date-fns'
import { MarketsByKey } from './services/types'
import { CommonCurrency } from './types'

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
  client.interceptors.request.use((request) => {
    console.log(`Fetching rate from ${name}`)
    return request
  })
  client.interceptors.response.use(
    (response) => response,
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
      if (key) market = market.inverse
    }
    if (key) {
      const markets: Market[] = marketsMap.get(key) || []
      markets.push(market)
      marketsMap.set(key, markets)
    }
  }
  return marketsMap
}

export function expandMarkets<M extends MarketInput>(
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

export async function mapMarkets<T, M extends MarketInput>(
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

export async function mapMarketsByBase<T, M extends MarketInput>(
  markets: M[],
  callback: (currency: Currency, markets: M[]) => T[] | Promise<T[]>,
): Promise<T[]> {
  return mapMarkets(markets, 'base', callback)
}

export async function mapMarketsByQuote<T, M extends MarketInput>(
  markets: M[],
  callback: (currency: Currency, markets: M[]) => T[] | Promise<T[]>,
): Promise<T[]> {
  return mapMarkets(markets, 'quote', callback)
}

export const unixTime = (): number => getUnixTime(new Date())

const START_LIMIT = new Date(2009, 0, 3) // Bitcoin genesis block

export const dateIsValid = (date: Date): boolean =>
  isAfter(date, START_LIMIT) && isBefore(date, new Date())

export const restrictTimeframe = ({
  start,
  end,
}: Timeframe<Date>): Timeframe<Date> => {
  const END_LIMIT = startOfDay(new Date()) // start of today

  const rStart = isBefore(start, START_LIMIT)
    ? START_LIMIT
    : isBefore(start, END_LIMIT) || isEqual(start, END_LIMIT)
    ? start
    : null
  const rEnd = isAfter(end, END_LIMIT)
    ? END_LIMIT
    : isAfter(end, START_LIMIT) || isEqual(end, START_LIMIT)
    ? end
    : null

  if (!rStart || !rEnd)
    throw new RateSourceError(
      `Timeframe outside of limits: ${start.toISOString()}–${end.toISOString()}`,
    )

  return { start: rStart, end: rEnd }
}

type Get<T> = (value: T) => T

const getCurrency = (
  items: CommonCurrency[],
  map: (e: CommonCurrency) => [Currency, Currency],
): Get<Currency> => {
  const obj = Object.fromEntries(items.map(map))
  return (value: string) => (value in obj ? obj[value] : value)
}

const getMarket = (getCurrency: Get<Currency>) => ({
  base,
  quote,
}: MarketInput): MarketInput => ({
  base: getCurrency(base),
  quote: getCurrency(quote),
})

export const commonCurrencies = (
  items: CommonCurrency[],
): {
  toSource: Get<Currency>
  fromSource: Get<Currency>
  marketToSource: Get<MarketInput>
  marketFromSource: Get<MarketInput>
} => {
  const toSource = getCurrency(items, (e) => [e.common, e.source])
  const fromSource = getCurrency(items, (e) => [e.source, e.common])
  return {
    toSource,
    fromSource,
    marketToSource: getMarket(toSource),
    marketFromSource: getMarket(fromSource),
  }
}
