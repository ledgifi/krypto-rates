import { GraphQLClient } from 'graphql-request'
import { RequestInit as ClientOptions } from 'graphql-request/dist/types.dom'
import {
  DateInput,
  DateMoneyDict,
  FetchBase,
  FetchBy,
  Market,
  MarketDate,
  MarketTimeframe,
  MoneyDict,
  MoneyDictBuilder,
  Rate,
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
    bridged
    market {
      base
      quote
    }
  }
`

const Client = GraphQLClient

export class API extends Client {
  public async liveRate(args: { market: Market; ttl?: number }): Promise<Rate> {
    const response = await this.request<{ liveRate: Rate }>(
      /* GraphQL */ `
        query($market: MarketInput!, $ttl: Int) {
          liveRate(market: $market, ttl: $ttl) {
            ...rate
          }
        }
        ${RATE_FRAGMENT}
      `,
      args,
    )
    return response.liveRate
  }

  public async liveRates(args: {
    markets: Market[]
    ttl?: number
  }): Promise<Rate[]> {
    const response = await this.request<{ liveRates: Rate[] }>(
      /* GraphQL */ `
        query($markets: [MarketInput!]!, $ttl: Int) {
          liveRates(markets: $markets, ttl: $ttl) {
            ...rate
          }
        }
        ${RATE_FRAGMENT}
      `,
      args,
    )
    return response.liveRates
  }

  public async historicalRateForDate(args: {
    market: Market
    date: DateInput
  }): Promise<Rate> {
    const response = await this.request<{ historicalRateForDate: Rate }>(
      /* GraphQL */ `
        query($market: MarketInput!, $date: Date!) {
          historicalRateForDate(market: $market, date: $date) {
            ...rate
          }
        }
        ${RATE_FRAGMENT}
      `,
      args,
    )
    return response.historicalRateForDate
  }

  public async historicalRatesForDate(args: {
    markets: Market[]
    date: DateInput
  }): Promise<Rate[]> {
    const response = await this.request<{ historicalRatesForDate: Rate[] }>(
      /* GraphQL */ `
        query($markets: [MarketInput!]!, $date: Date!) {
          historicalRatesForDate(markets: $markets, date: $date) {
            ...rate
          }
        }
        ${RATE_FRAGMENT}
      `,
      args,
    )
    return response.historicalRatesForDate
  }

  public async historicalRatesForDates(args: {
    markets: Market[]
    dates: DateInput[]
  }): Promise<Rate[]> {
    const response = await this.request<{ historicalRatesForDates: Rate[] }>(
      /* GraphQL */ `
        query($markets: [MarketInput!]!, $dates: [Date!]!) {
          historicalRatesForDates(markets: $markets, dates: $dates) {
            ...rate
          }
        }
        ${RATE_FRAGMENT}
      `,
      args,
    )
    return response.historicalRatesForDates
  }

  public async historicalRatesByDate(args: {
    marketDates: MarketDate<Market, DateInput>[]
  }): Promise<Rate[]> {
    const response = await this.request<{ historicalRatesByDate: Rate[] }>(
      /* GraphQL */ `
        query($marketDates: [MarketDateInput!]!) {
          historicalRatesByDate(marketDates: $marketDates) {
            ...rate
          }
        }
        ${RATE_FRAGMENT}
      `,
      args,
    )
    return response.historicalRatesByDate
  }

  public async historicalRatesForTimeframe(args: {
    markets: Market[]
    timeframe: Timeframe<DateInput>
  }): Promise<Rate[]> {
    const response = await this.request<{
      historicalRatesForTimeframe: Rate[]
    }>(
      /* GraphQL */ `
        query($markets: [MarketInput!]!, $timeframe: TimeframeInput!) {
          historicalRatesForTimeframe(
            markets: $markets
            timeframe: $timeframe
          ) {
            ...rate
          }
        }
        ${RATE_FRAGMENT}
      `,
      args,
    )
    return response.historicalRatesForTimeframe
  }

  public async historicalRatesByTimeframe(args: {
    marketTimeframes: MarketTimeframe<Market, DateInput>[]
  }): Promise<Rate[]> {
    const response = await this.request<{ historicalRatesByTimeframe: Rate[] }>(
      /* GraphQL */ `
        query($marketTimeframes: [MarketTimeframeInput!]!) {
          historicalRatesByTimeframe(marketTimeframes: $marketTimeframes) {
            ...rate
          }
        }
        ${RATE_FRAGMENT}
      `,
      args,
    )
    return response.historicalRatesByTimeframe
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
    from: (base) => ({
      to: (...quotes) =>
        fetch(
          quotes.map((quote) => ({ base, quote })),
          (market) => market.quote,
        ),
    }),
    to: (quote) => ({
      from: (...bases) =>
        fetch(
          bases.map((base) => ({ base, quote })),
          (market) => market.base,
        ),
    }),
    markets: (...markets) =>
      fetch(markets, (market) => market.base + market.quote),
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
      (markets) => this.api.liveRates({ markets }),
      buildMoneyDict,
      this._inverse,
    )
  }

  public historical(...dates: DateInput[]): FetchBase<DateMoneyDict> {
    return fetchRates(
      (markets) => this.api.historicalRatesForDates({ markets, dates }),
      buildDateMoneyDict,
      this._inverse,
    )
  }

  public timeframe(timeframe: Timeframe): FetchBase<DateMoneyDict> {
    return fetchRates(
      (markets) => this.api.historicalRatesForTimeframe({ markets, timeframe }),
      buildDateMoneyDict,
      this._inverse,
    )
  }

  public async marketDates(
    ...marketDates: MarketDate[]
  ): Promise<DateMoneyDict> {
    const rates = await this.api.historicalRatesByDate({ marketDates })
    return buildDateMoneyDict(
      rates,
      (market) => [market.base, market.quote].join('-'),
      this._inverse,
    )
  }

  public async marketTimeframes(
    ...marketTimeframes: MarketTimeframe[]
  ): Promise<DateMoneyDict> {
    const rates = await this.api.historicalRatesByTimeframe({
      marketTimeframes,
    })
    return buildDateMoneyDict(
      rates,
      (market) => [market.base, market.quote].join('-'),
      this._inverse,
    )
  }
}
