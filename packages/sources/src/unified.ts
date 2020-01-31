import { Market } from '@raptorsystems/krypto-rates-common/market'
import { RedisClient } from '@raptorsystems/krypto-rates-common/redis'
import { RateSourceById } from './mapping'
import { RateSource } from './models'
import { Currency, MarketsByKey, ParsedRates, Timeframe } from './types'
import { buildMarketsByKey, expandMarkets, parseMarket } from './utils'

export class UnifiedSource extends RateSource {
  private redis = new RedisClient()

  public async fetchLive(
    base: Currency,
    currencies: Currency[],
  ): Promise<ParsedRates> {
    return this.fetchForCurrencies(base, currencies, (source, base, quotes) =>
      source.fetchLive(base, quotes),
    )
  }

  public async fetchHistorical(
    base: Currency,
    currencies: Currency[],
    date: Date,
  ): Promise<ParsedRates> {
    return this.fetchForCurrencies(base, currencies, (source, base, quotes) =>
      source.fetchHistorical(base, quotes, date),
    )
  }

  public async fetchTimeframe(
    base: Currency,
    currencies: Currency[],
    timeframe: Timeframe<Date>,
  ): Promise<ParsedRates> {
    return this.fetchForCurrencies(
      base,
      currencies,
      (source, base, currencies) =>
        source.fetchTimeframe(base, currencies, timeframe),
    )
  }

  public setSource(sourceId: string): RateSource {
    const source = RateSourceById.get(sourceId)
    if (!source) throw `RateSource '${sourceId}' is not supported`
    return new source()
  }

  private async getSource(market: Market): Promise<RateSource | undefined> {
    const sourceId = await this.redis.get(`config:sources:${market.id}`)
    if (sourceId) {
      const source = RateSourceById.get(sourceId)
      if (source) return new source()
    }
  }

  private buildResponse(base: Currency, rates: ParsedRates): ParsedRates {
    return rates.map(rate => {
      const { market: parsedMarket, inverse } = parseMarket(rate.market, base)
      if (inverse) {
        rate.market = parsedMarket
        rate.value **= -1
      }
      return rate
    })
  }

  private async buildMarketsBySource(
    base: Currency,
    currencies: Currency[],
  ): Promise<MarketsByKey<RateSource>> {
    const markets: Market[] = currencies.map(quote => new Market(base, quote))
    return buildMarketsByKey<RateSource>(markets, market =>
      this.getSource(market),
    )
  }

  private async fetchForCurrencies(
    base: Currency,
    currencies: Currency[],
    fetch: (
      source: RateSource,
      base: Currency,
      quotes: Currency[],
    ) => Promise<ParsedRates>,
  ): Promise<ParsedRates> {
    const marketsBySource = await this.buildMarketsBySource(base, currencies)
    const sourceRates = await Promise.all(
      Array.from(marketsBySource).flatMap(([source, markets]) =>
        Array.from(expandMarkets(markets)).map(([base, quotes]) =>
          fetch(source, base, quotes),
        ),
      ),
    )
    return this.buildResponse(base, sourceRates.flat())
  }
}
