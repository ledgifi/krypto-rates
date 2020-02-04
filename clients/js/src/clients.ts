/* eslint-disable @typescript-eslint/explicit-function-return-type */

import { GraphQLClient } from 'graphql-request'
import { Options as ClientOptions } from 'graphql-request/dist/src/types'
import {
  DateMoneyDict,
  FetchBase,
  FetchBy,
  Market,
  Markets,
  MoneyDict,
  MoneyDictBuilder,
  Rate,
  Rates,
  Response,
  Timeframe,
} from './types'
import { buildDateMoneyDict, buildMoneyDict } from './utils'

const RATE_FRAGMENT = /* GraphQL */ `
  fragment rate on Rate {
    value
    date
    timestamp
    source
    market {
      base
      quote
    }
  }
`

const Client = GraphQLClient

class API extends Client {
  public async fetchLiveRate(market: Market): Promise<Rate> {
    const response = await this.request<{ liveRate: Rate }>(
      /* GraphQL */ `
        query($market: MarketInput!) {
          liveRate(market: $market) {
            ...rate
          }
        }
        ${RATE_FRAGMENT}
      `,
      { market },
    )
    return response.liveRate
  }

  public async fetchLiveRates(markets: Markets): Promise<Rates> {
    const response = await this.request<{ liveRates: Rates }>(
      /* GraphQL */ `
        query($markets: [MarketInput!]!) {
          liveRates(markets: $markets) {
            ...rate
          }
        }
        ${RATE_FRAGMENT}
      `,
      { markets },
    )
    return response.liveRates
  }

  public async fetchHistoricalRate(
    market: Market,
    date: string | Date,
  ): Promise<Rate> {
    const response = await this.request<{ historicalRate: Rate }>(
      /* GraphQL */ `
        query($market: MarketInput!, $date: Date!) {
          historicalRate(market: $market, date: $date) {
            ...rate
          }
        }
        ${RATE_FRAGMENT}
      `,
      { market, date },
    )
    return response.historicalRate
  }

  public async fetchHistoricalRates(
    markets: Markets,
    dates: (string | Date)[],
  ): Promise<Rates> {
    const response = await this.request<{ historicalRates: Rates }>(
      /* GraphQL */ `
        query($markets: [MarketInput!]!, $dates: [Date!]!) {
          historicalRates(markets: $markets, dates: $dates) {
            ...rate
          }
        }
        ${RATE_FRAGMENT}
      `,
      { markets, dates },
    )
    return response.historicalRates
  }

  public async fetchTimeframeRates(
    markets: Markets,
    timeframe: Timeframe,
  ): Promise<Rates> {
    const response = await this.request<{ timeframeRates: Rates }>(
      /* GraphQL */ `
        query($markets: [MarketInput!]!, $timeframe: TimeframeInput!) {
          timeframeRates(markets: $markets, timeframe: $timeframe) {
            ...rate
          }
        }
        ${RATE_FRAGMENT}
      `,
      { markets, timeframe },
    )
    return response.timeframeRates
  }
}

const fetchRates = <R extends Response>(
  fn: (markets: Market[]) => Promise<Rate[]>,
  builder: MoneyDictBuilder<R>,
  inverse?: boolean,
): FetchBase<R> => {
  const fetch: FetchBy<Market, R> = async (markets, by) => {
    const rates = await fn(markets)
    return builder(rates, by, inverse)
  }
  return {
    from: base => ({
      to: (...quotes) =>
        fetch(
          quotes.map(quote => ({ base, quote })),
          market => market.quote,
        ),
    }),
    to: quote => ({
      from: (...bases) =>
        fetch(
          bases.map(base => ({ base, quote })),
          market => market.base,
        ),
    }),
    markets: (...markets) =>
      fetch(markets, market => market.base + market.quote),
  }
}

export class KryptoRates {
  public api: API
  private _inverse = false

  public constructor(url: string, options?: ClientOptions) {
    this.api = new API(url, options)
  }

  public get inverse(): KryptoRates {
    this._inverse = !this._inverse
    return this
  }

  public get live(): FetchBase<MoneyDict> {
    return fetchRates(
      markets => this.api.fetchLiveRates(markets),
      buildMoneyDict,
      this._inverse,
    )
  }

  public historical(...dates: (string | Date)[]): FetchBase<DateMoneyDict> {
    return fetchRates(
      markets => this.api.fetchHistoricalRates(markets, dates),
      buildDateMoneyDict,
      this._inverse,
    )
  }

  public timeframe(timeframe: Timeframe): FetchBase<DateMoneyDict> {
    return fetchRates(
      markets => this.api.fetchTimeframeRates(markets, timeframe),
      buildDateMoneyDict,
      this._inverse,
    )
  }
}
