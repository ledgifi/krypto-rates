import { Market } from '@raptorsystems/krypto-rates-common/market'
import {
  Currency,
  ParsedMarket,
  Timeframe,
} from '@raptorsystems/krypto-rates-common/types'
import * as Moment from 'moment'
import { extendMoment } from 'moment-range'

const moment = Moment.default

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

export function generateDateRange({ start, end }: Timeframe): Date[] {
  const moment = extendMoment(Moment)
  return Array.from(
    moment.range(moment.utc(start), moment.utc(end)).by('day'),
    el => el.toDate(),
  )
}

export function consecutiveDateGroups(iterable: Date[]): Date[][] {
  return iterable.reduce<Date[][]>(
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
