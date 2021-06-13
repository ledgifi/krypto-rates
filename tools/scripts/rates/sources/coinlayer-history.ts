import { dotenv } from '@raptorsystems/krypto-rates-utils/src/dotenv'
dotenv.config()

import { Timeframe } from '@raptorsystems/krypto-rates-common/src/types'
import {
  CoinlayerSource,
  CoinlayerTimeframeResponse,
} from '@raptorsystems/krypto-rates-sources/src/services/coinlayer'
import {
  chunkDateRange,
  consecutiveTimeframes,
} from '@raptorsystems/krypto-rates-utils/src'
import { parseISO } from 'date-fns'

// coinlayer returns 202 "failed_getting_crypto_currency_data" error before 2010-07-17
const START = parseISO('2010-07-17')

// coinlayer timeframe endpoint maximum range is 365 days
const MAX_RANGE = 365

const dateStr = (value: Date) => value.toISOString().slice(0, 10)

const source = new CoinlayerSource()

async function main() {
  const client = source.client

  const fetchTimeframe = async ({ start, end }: Timeframe<Date>) => {
    const start_date = dateStr(start)
    const end_date = dateStr(end)

    const timeframeMsg = `timeframe: ${start_date} ${end_date}`

    console.log('Fetch coinlayer.com', timeframeMsg)

    const { data } = await client.get<CoinlayerTimeframeResponse>('timeframe', {
      params: { start_date, end_date },
    })

    if ('error' in data) {
      console.warn(
        'Failed to fetch',
        timeframeMsg,
        JSON.stringify(data.error.info, undefined, 2),
      )
      return {}
    }

    return data.rates
  }

  const result = await Promise.all(
    chunkDateRange({ start: START, end: new Date() }, MAX_RANGE).map((range) =>
      fetchTimeframe({ start: range[0], end: range[range.length - 1] }),
    ),
  )

  const ratesByDate = Object.values(result).reduce(
    (obj, rates) => ({ ...obj, ...rates }),
    {},
  )

  const datesByCurrency = Object.entries(ratesByDate).reduce<
    Record<string, Date[]>
  >((obj, [date, rates]) => {
    Object.keys(rates).forEach((currency) => {
      if (currency in obj) obj[currency].push(parseISO(date))
      else obj[currency] = [parseISO(date)]
    })
    return obj
  }, {})

  const timeframesByCurrency = Object.entries(datesByCurrency).reduce<
    Record<string, Timeframe<string>[]>
  >(
    (obj, [currency, dates]) => ({
      ...obj,
      [currency]: consecutiveTimeframes(dates).map(({ start, end }) => ({
        start: dateStr(start),
        end: dateStr(end),
      })),
    }),
    {},
  )

  for (const [currency, timeframes] of Object.entries(timeframesByCurrency)) {
    console.log(
      currency,
      timeframes.map(({ start, end }) => `${start}|${end}`).join(','),
    )
  }
}

try {
  void main()
} catch (error) {
  console.error(error)
}
