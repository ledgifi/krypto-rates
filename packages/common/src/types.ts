import { Market } from './market'

export type Currency = string

export type DateInput = Date | string

export interface MarketInput {
  base: string
  quote: string
}

export interface MarketDate<TMarket = MarketInput, TDate = string> {
  market: TMarket
  date: TDate
}

export interface Timeframe<T = DateInput> {
  start: T
  end: T
}

export interface MarketTimeframe<TMarket = MarketInput, TDate = DateInput> {
  market: TMarket
  timeframe: Timeframe<TDate>
}

export interface Rate<TData, TMarket = MarketInput> {
  market: TMarket
  source: string
  sourceData?: TData
  value: number | null
  date: string
  timestamp: number
  inverse: boolean
}

export interface ParsedMarket {
  market: Market
  inverse: boolean
}

export type ParsedRate<TData> = Rate<TData, Market>

export interface DbRate<TData> {
  market: string
  source: string
  sourceData?: TData
  value: number | null
  date: string
  timestamp: number
}

export type NullableDbRate<TData> = DbRate<TData> | null | undefined
