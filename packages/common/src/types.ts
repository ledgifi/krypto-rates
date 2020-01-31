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

export interface Rate<M = MarketArg> {
  market: M
  source: string
  sourceData?: any
  value: number
  date: string
  timestamp: number
  inverse: boolean
}

export type Rates<M = MarketArg> = Rate<M>[]

export interface ParsedMarket {
  market: Market
  inverse: boolean
}

export type ParsedRate = Rate<Market>

export type ParsedRates = Rates<Market>

export interface RedisRate {
  market: string
  source: string
  sourceData?: any
  value: number
  date: string
  timestamp: number
}

export interface Timeframe<T = Date | string> {
  start: T
  end: T
}
