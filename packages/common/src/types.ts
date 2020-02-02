import { Market } from './market'

export type Currency = string

export interface MarketArg {
  base: string
  quote: string
}

export interface MarketsArg {
  base: string
  quotes: string[]
}

export interface Rate<TData, TMarket = MarketArg> {
  market: TMarket
  source: string
  sourceData?: TData
  value: number
  date: string
  timestamp: number
  inverse: boolean
}

export type Rates<TData, TMarket = MarketArg> = Rate<TData, TMarket>[]

export interface ParsedMarket {
  market: Market
  inverse: boolean
}

export type ParsedRate<TData> = Rate<TData, Market>

export type ParsedRates<TData> = Rates<TData, Market>

export interface DbRate<TData> {
  market: string
  source: string
  sourceData?: TData
  value: number
  date: string
  timestamp: number
}

export type NullableDbRate<TData> = DbRate<TData> | null | undefined

export interface Timeframe<T = Date | string> {
  start: T
  end: T
}
