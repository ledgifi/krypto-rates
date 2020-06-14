import { Market } from '@raptorsystems/krypto-rates-common/src/market'
import {
  Currency,
  DbRate,
  NullableDbRate,
  ParsedMarket,
  ParsedRate,
  Rate,
  Timeframe,
} from '@raptorsystems/krypto-rates-common/src/types'
import {
  addDays,
  compareAsc,
  differenceInDays,
  isSameDay,
  subDays,
} from 'date-fns'

export function parseMarket(
  market: string | Market,
  base: Currency,
): ParsedMarket {
  if (market instanceof Market) {
    if (market.base !== base) {
      return {
        market: market.inverse,
        inverse: true,
      }
    }
    return {
      market,
      inverse: false,
    }
  } else {
    let quote: Currency
    let inverse = false
    if (market.includes('-')) {
      const [_base, _quote] = market.split('-')
      if (base === _base) {
        quote = _quote
      } else {
        quote = _base
        inverse = true
      }
    } else {
      if (market.startsWith(base)) {
        quote = market.slice(base.length)
      } else {
        quote = market.slice(0, market.length - base.length)
        inverse = true
      }
    }
    return {
      market: new Market(base, quote),
      inverse,
    }
  }
}

export const normalizeRate = (rate: ParsedRate): ParsedRate => {
  if (rate.inverse) {
    if (rate.value) rate.value **= -1
    rate.inverse = false
  }
  return rate
}

export function parseDbRate(
  base: Currency,
  rate: NullableDbRate,
): Rate<Market> | undefined {
  if (!rate) return
  const { value, date, timestamp, source, sourceData, market } = rate
  const { market: parsedMarket, inverse } = parseMarket(market, base)
  return {
    value,
    date,
    timestamp,
    source,
    sourceData,
    market: parsedMarket,
    inverse,
  }
}

export function parseDbRates(
  base: Currency,
  rates: NullableDbRate[],
): (Rate<Market> | undefined)[] {
  return rates.map((rate) => parseDbRate(base, rate))
}

export const buildDbRate = ({
  date,
  timestamp,
  value,
  source,
  sourceData,
  market,
  inverse,
}: ParsedRate<TData>): DbRate<TData> => {
  if (inverse) market = market.inverse
  return {
    date,
    timestamp,
    value,
    source,
    sourceData,
    market: market.id,
  }
}

export const sortDates = (iterable: Date[]): Date[] => iterable.sort(compareAsc)

export function generateDateRange({ start, end }: Timeframe<Date>): Date[] {
  return [...Array(differenceInDays(end, start) + 1).keys()].map((i) =>
    addDays(start, i),
  )
}

export function consecutiveDateGroups(iterable: Date[]): Date[][] {
  return sortDates(iterable).reduce<Date[][]>((groups, date) => {
    const lastGroup = groups[groups.length - 1]
    const lastGroupDate = lastGroup?.[lastGroup.length - 1]
    if (
      // last date and current date are consecutive
      isSameDay(lastGroupDate, subDays(date, 1)) ||
      isSameDay(lastGroupDate, date)
    ) {
      // add date to last group
      lastGroup.push(date)
    } else {
      // add date to new group
      groups.push([date])
    }
    return groups
  }, [])
}

export function consecutiveTimeframes(iterable: Date[]): Timeframe<Date>[] {
  return consecutiveDateGroups(iterable).map((group) => ({
    start: group[0],
    end: group[group.length - 1],
  }))
}

export function notEmpty<T>(value: T | null | undefined): value is T {
  return value !== null && value !== undefined
}

// https://github.com/you-dont-need/You-Dont-Need-Lodash-Underscore#_chunk
export const chunk = <T>(input: T[], size: number): T[][] =>
  input.reduce<T[][]>((arr, item, idx) => {
    return idx % size === 0
      ? [...arr, [item]]
      : [...arr.slice(0, -1), [...arr.slice(-1)[0], item]]
  }, [])

export const chunkDateRange = (
  timeframe: Timeframe<Date>,
  size: number,
): Date[][] => chunk(generateDateRange(timeframe), size)

// https://stackoverflow.com/a/10284006
export const zip = <T>(rows: T[][]): T[][] =>
  rows[0].map((_, c) => rows.map((row) => row[c]))
