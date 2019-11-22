import { Market } from '@krypto-rates/common/market'
import { MarketsByKey, QuotesByBaseCurrency } from './types'
export * from '@krypto-rates/common/utils'

export async function buildMarketsByKey<T>(
  markets: Market[],
  getKey: (market: Market) => T | undefined | Promise<T | undefined>,
): Promise<MarketsByKey<T>> {
  const marketsMap: MarketsByKey<T> = new Map()
  for (let market of markets) {
    let key = await getKey(market)
    if (!key) {
      market = market.inverse
      key = await getKey(market)
    }
    if (key) {
      const markets: Market[] = marketsMap.get(key) || []
      markets.push(market)
      marketsMap.set(key, markets)
    }
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
