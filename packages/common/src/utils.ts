import { Market } from './market'
import { Currency, ParsedMarket } from './types'

export function parseMarket(
  market: string | Market,
  base: Currency,
): ParsedMarket {
  if (market instanceof Market) {
    if (market.base !== base) {
      return {
        market: market.inverse,
        inverse: true,
      }
    }
    return {
      market,
      inverse: false,
    }
  } else {
    let quote: Currency
    let inverse = false
    if (market.includes('-')) {
      const [_base, _quote] = market.split('-')
      if (base === _base) {
        quote = _quote
      } else {
        quote = _base
        inverse = true
      }
    } else {
      if (market.startsWith(base)) {
        quote = market.slice(base.length)
      } else {
        quote = market.slice(0, market.length - base.length)
        inverse = true
      }
    }
    return {
      market: new Market(base, quote),
      inverse,
    }
  }
}
