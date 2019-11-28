import { GraphQLClient } from 'graphql-request'
import gql from 'graphql-tag'
import {
  Currency,
  Market,
  Markets,
  Money,
  Rate,
  Rates,
  Timeframe,
} from './types'
import { parseMoney } from './utils'

const RATE_FRAGMENT = gql`
  fragment rate on Rate {
    source
    timestamp
    value
    market {
      base
      quote
    }
  }
`

const Client = GraphQLClient

class API extends Client {
  public fetchLiveRate(market: Market): Promise<Rate> {
    return this.request<Rate>(
      gql`
        query($market: MarketInput!) {
          liveRate(market: $market) {
            ...rate
          }
        }
        ${RATE_FRAGMENT}
      `,
      { market },
    )
  }

  public fetchLiveRates(markets: Markets): Promise<Rates> {
    return this.request<Rates>(
      gql`
        query($markets: MarketsInput!) {
          liveRates(markets: $markets) {
            ...rate
          }
        }
        ${RATE_FRAGMENT}
      `,
      { markets },
    )
  }

  public fetchHistoricalRate(
    market: Market,
    date: string | Date,
  ): Promise<Rate> {
    return this.request<Rate>(
      gql`
        query($market: MarketInput!, $date: Date!) {
          historicalRate(market: $market, date: $date) {
            ...rate
          }
        }
        ${RATE_FRAGMENT}
      `,
      { market, date },
    )
  }

  public fetchHistoricalRates(
    markets: Markets,
    date: string | Date,
  ): Promise<Rates> {
    return this.request<Rates>(
      gql`
        query($markets: MarketsInput!, $date: Date!) {
          historicalRates(markets: $markets, date: $date) {
            ...rate
          }
        }
        ${RATE_FRAGMENT}
      `,
      { markets, date },
    )
  }

  public fetchTimeframeRates(
    markets: Markets,
    timeframe: Timeframe,
  ): Promise<Rates> {
    return this.request<Rates>(
      gql`
        query($markets: MarketsInput!, $timeframe: TimeframeInput!) {
          timeframeRates(markets: $markets, timeframe: $timeframe) {
            ...rate
          }
        }
        ${RATE_FRAGMENT}
      `,
      { markets, timeframe },
    )
  }
}

export class KryptoRates extends Client {
  public api: API

  public constructor(url: string) {
    super(url)
    this.api = new API(url)
  }

  public async fetchRateFor({
    currency,
    to,
    date,
    inverse,
  }: {
    currency: Currency
    to: Currency
    date?: Date | string
    inverse?: boolean
  }): Promise<Money> {
    if (currency.toUpperCase() === to.toUpperCase())
      return { amount: 1, currency }
    const market: Market = { base: currency, quote: to }
    const rate = date
      ? await this.api.fetchHistoricalRate(market, date)
      : await this.api.fetchLiveRate(market)
    return parseMoney(rate, inverse)
  }
}
