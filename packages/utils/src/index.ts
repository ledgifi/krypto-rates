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
import * as Moment from 'moment'
import { extendMoment } from 'moment-range'

const moment = Moment.default
const momentRange = extendMoment(Moment)

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

export const parseRate = <TData>(
  rate: ParsedRate<TData>,
): ParsedRate<TData> => {
  if (rate.inverse) {
    rate.value **= -1
    rate.inverse = false
  }
  return rate
}

export function parseDbRate<TData>(
  base: Currency,
  rate: NullableDbRate<TData>,
): Rate<TData, Market> | undefined {
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

export function parseDbRates<TData>(
  base: Currency,
  rates: NullableDbRate<TData>[],
): (Rate<TData, Market> | undefined)[] {
  return rates.map(rate => parseDbRate(base, rate))
}

export const buildDbRate = <TData>({
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

export const sortDates = (iterable: Date[]): Date[] =>
  iterable.sort((a, b) => moment(a).diff(b))

export function generateDateRange({ start, end }: Timeframe): Date[] {
  return Array.from(
    momentRange.range(moment.utc(start), moment.utc(end)).by('day'),
    el => el.toDate(),
  )
}

export function consecutiveDateGroups(iterable: Date[]): Date[][] {
  return sortDates(iterable).reduce<Date[][]>(
    (groups, date) => {
      const lastGroup = groups[groups.length - 1]
      if (
        // difference in days is greater than 1
        moment(date).diff(
          moment(lastGroup[lastGroup.length - 1] || date),
          'days',
        ) > 1
      ) {
        // add new group
        groups.push([date])
      } else {
        // add date to last group
        lastGroup.push(date)
      }
      return groups
    },
    [[]],
  )
}

export function consecutiveTimeframes(iterable: Date[]): Timeframe<Date>[] {
  return consecutiveDateGroups(iterable).map(group => ({
    start: group[0],
    end: group[group.length - 1],
  }))
}

export function notEmpty<T>(value: T | null | undefined): value is T {
  return value !== null && value !== undefined
}

export function dailyFilter({ timestamp }: { timestamp: Date }): boolean {
  const date = moment(timestamp)
  const startOfDate = moment(timestamp).startOf('day')
  return date.isSame(startOfDate)
}

// https://github.com/you-dont-need/You-Dont-Need-Lodash-Underscore#_chunk
export const chunk = <T>(input: T[], size: number): T[][] =>
  input.reduce<T[][]>((arr, item, idx) => {
    return idx % size === 0
      ? [...arr, [item]]
      : [...arr.slice(0, -1), [...arr.slice(-1)[0], item]]
  }, [])

export const chunkDateRange = (timeframe: Timeframe, size: number): Date[][] =>
  chunk(generateDateRange(timeframe), size)
