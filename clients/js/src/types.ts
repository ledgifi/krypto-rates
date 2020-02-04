import { Currency, MarketBase } from '@raptorsystems/krypto-rates-common/types'

export {
  Currency,
  MarketBase as Market,
  Timeframe,
} from '@raptorsystems/krypto-rates-common/types'

export type Markets = MarketBase[]

export type Money = {
  amount: number
  currency: Currency
}

export type Rate = {
  market: MarketBase
  source: string
  value: number
  date: string
  timestamp: number
}

export type Rates = Rate[]

export type MoneyDict = Record<Currency, Money>
export type DateMoneyDict = Record<string, MoneyDict>
export type Response = MoneyDict | DateMoneyDict

export type Fetch<T, R extends Response> = (...value: T[]) => Promise<R>

export type FetchBy<T, R extends Response> = (
  value: T[],
  by: (market: MarketBase) => string,
) => Promise<R>

export interface FetchBase<R extends Response> {
  from: (base: string) => { to: Fetch<Currency, R> }
  to: (quote: string) => { from: Fetch<Currency, R> }
  markets: Fetch<MarketBase, R>
}

export type MoneyDictBuilder<R extends Response> = (
  rates: Rate[],
  by: (market: MarketBase) => string,
  inverse?: boolean,
) => R
