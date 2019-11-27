import { Market } from '@raptorsystems/krypto-rates-common/market'
import { RateSourceById, RateSourceByMarket } from './mapping'
import { RateSource } from './models'
import { Currency, MarketsByKey, ParsedRates, Timeframe } from './types'
import { buildMarketsByKey, expandMarkets, parseMarket } from './utils'

export class UnifiedSource extends RateSource {
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

  private getSource(market: Market): RateSource {
    let source = RateSourceByMarket.get(market.id)
    if (!source) source = RateSourceByMarket.get(market.inverse.id)
    if (!source) throw `Market ${market.code} is not supported`
    return new source()
  }

  private buildResponse(base: Currency, rates: ParsedRates): ParsedRates {
    return rates.map(rate => {
      const { market: parsedMarket, inverse } = parseMarket(rate.market, base)
      if (parsedMarket !== rate.market) {
        rate.market = parsedMarket
        rate.inverse = inverse
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
