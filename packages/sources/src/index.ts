import { Market } from '@raptorsystems/krypto-rates-common/market'
import {
  Currency,
  ParsedRates,
  Timeframe,
} from '@raptorsystems/krypto-rates-common/types'
import { parseMarket } from '@raptorsystems/krypto-rates-utils'
import { BitcoinAverageSource } from './services/bitcoinaverage'
import { CoinlayerSource } from './services/coinlayer'
import { CurrencylayerSource } from './services/currencylayer'
import { MarketsByKey, RatesSource as BaseRateSource } from './services/types'
import { RatesData, RateSources } from './types'
import { buildMarketsByKey, expandMarkets } from './utils'

export const rateSourceById = {
  [BitcoinAverageSource.id]: BitcoinAverageSource,
  [CoinlayerSource.id]: CoinlayerSource,
  [CurrencylayerSource.id]: CurrencylayerSource,
}

export class RatesSource implements BaseRateSource<RatesData> {
  public constructor(
    public getSourceId: (market: string) => Promise<string | null | undefined>,
  ) {}

  public async fetchLive(
    base: Currency,
    currencies: Currency[],
  ): Promise<ParsedRates<RatesData>> {
    return this.fetchForCurrencies(base, currencies, (source, base, quotes) =>
      source.fetchLive(base, quotes),
    )
  }

  public async fetchHistorical(
    base: Currency,
    currencies: Currency[],
    date: Date,
  ): Promise<ParsedRates<RatesData>> {
    return this.fetchForCurrencies(base, currencies, (source, base, quotes) =>
      source.fetchHistorical(base, quotes, date),
    )
  }

  public async fetchTimeframe(
    base: Currency,
    currencies: Currency[],
    timeframe: Timeframe<Date>,
  ): Promise<ParsedRates<RatesData>> {
    return this.fetchForCurrencies(
      base,
      currencies,
      (source, base, currencies) =>
        source.fetchTimeframe(base, currencies, timeframe),
    )
  }

  public setSource(sourceId: string): RateSources {
    const source = rateSourceById[sourceId]
    if (!source) throw `RateSource '${sourceId}' is not supported`
    return new source()
  }

  private async getSource(market: Market): Promise<RateSources | undefined> {
    const sourceId = await this.getSourceId(market.id)
    if (sourceId) {
      const source = rateSourceById[sourceId]
      if (source) return new source()
    }
  }

  private buildResponse<TData>(
    base: Currency,
    rates: ParsedRates<TData>,
  ): ParsedRates<TData> {
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
  ): Promise<MarketsByKey<RateSources>> {
    const markets: Market[] = currencies.map(quote => new Market(base, quote))
    return buildMarketsByKey<RateSources>(markets, market =>
      this.getSource(market),
    )
  }

  private async fetchForCurrencies(
    base: Currency,
    currencies: Currency[],
    fetch: (
      source: RateSources,
      base: Currency,
      quotes: Currency[],
    ) => Promise<ParsedRates<RatesData>>,
  ): Promise<ParsedRates<RatesData>> {
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
