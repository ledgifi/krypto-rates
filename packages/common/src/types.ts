import { Market } from './market'
import { JsonValue } from 'type-fest'

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

export interface Rate<TMarket = MarketInput> {
  market: TMarket
  source: string
  sourceData: JsonValue
  value: number | null
  date: string
  timestamp: number
  inverse: boolean
  bridged: boolean
}

export interface ParsedMarket {
  market: Market
  inverse: boolean
}

export type ParsedRate = Rate<Market>

export interface DbRate {
  market: string
  source: string
  sourceData: JsonValue
  value: number | null
  date: string
  timestamp: number
  bridged: boolean
}

export type NullableDbRate = DbRate | null | undefined
