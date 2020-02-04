import { Market } from '@raptorsystems/krypto-rates-common/market'
import {
  Currency,
  MarketBase,
  ParsedRates,
  Timeframe,
} from '@raptorsystems/krypto-rates-common/types'
import { parseMarket } from '@raptorsystems/krypto-rates-utils'
import { CoinlayerSource } from './services/coinlayer'
import { CurrencylayerSource } from './services/currencylayer'
import { MarketsByKey, RatesSource as BaseRateSource } from './services/types'
import { RatesData, RateSources } from './types'
import { buildMarketsByKey, mapMarketsByBase } from './utils'

export const rateSourceById = {
  [CoinlayerSource.id]: CoinlayerSource,
  [CurrencylayerSource.id]: CurrencylayerSource,
}

export class RatesSource implements BaseRateSource<RatesData> {
  public constructor(
    public getSourceId: (market: string) => Promise<string | null | undefined>,
  ) {}

  public async fetchLive(
    markets: MarketBase[],
  ): Promise<ParsedRates<RatesData>> {
    return this.fetchForMarkets(markets, (source, markets) =>
      source.fetchLive(markets),
    )
  }

  public async fetchHistorical(
    markets: MarketBase[],
    date: Date,
  ): Promise<ParsedRates<RatesData>> {
    return this.fetchForMarkets(markets, (source, markets) =>
      source.fetchHistorical(markets, date),
    )
  }

  public async fetchTimeframe(
    markets: MarketBase[],
    timeframe: Timeframe<Date>,
  ): Promise<ParsedRates<RatesData>> {
    return this.fetchForMarkets(markets, (source, markets) =>
      source.fetchTimeframe(markets, timeframe),
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
    markets: Market[],
  ): Promise<MarketsByKey<RateSources, Market>> {
    return buildMarketsByKey<RateSources>(markets, market =>
      this.getSource(market),
    )
  }

  private async fetchForMarkets(
    markets: MarketBase[],
    fetch: (
      source: RateSources,
      markets: MarketBase[],
    ) => Promise<ParsedRates<RatesData>>,
  ): Promise<ParsedRates<RatesData>> {
    return mapMarketsByBase(
      markets.map(({ base, quote }) => new Market(base, quote)),
      async (base, markets) => {
        const marketsBySource = await this.buildMarketsBySource(markets)
        const rates = await Promise.all(
          Array.from(marketsBySource).flatMap(async ([source, markets]) => {
            const sourceRates = await fetch(source, markets)
            return this.buildResponse(base, sourceRates)
          }),
        )
        return rates.flat()
      },
    )
  }
}
