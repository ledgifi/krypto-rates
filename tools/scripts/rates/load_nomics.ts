import { dotenv } from '@raptorsystems/krypto-rates-utils/src/dotenv'
dotenv.config()

import { RedisRatesDb } from '@raptorsystems/krypto-rates-core/src/db/redis.db'
import axios from 'axios'

const PER_PAGE = 1000
const SOURCE = 'nomics.com'

const fetchTickerCurrenciesPage = async (page: number): Promise<string[]> => {
  const { data } = await axios.get<{ id: string }[]>(
    'https://api.nomics.com/v1/currencies/ticker',
    { params: { key: process.env.NOMICS_API_KEY, page, 'per-page': PER_PAGE } },
  )
  return data.map(({ id }) => id)
}

const fetchTickerCurrencies = async (): Promise<string[]> => {
  let currencies: string[] = []
  let nFetched = 0
  let page = 1
  do {
    const fetched = await fetchTickerCurrenciesPage(page)
    currencies = [...currencies, ...fetched]
    nFetched = fetched.length
    page++
  } while (nFetched === PER_PAGE)
  return currencies
}

const buildMarkets = (currencies: string[], quote: string): string[] =>
  currencies.map((currency) => [currency, quote].join('-'))

const mapSourceByMarket = (markets: string[]): Map<string, string> =>
  new Map(
    markets.map((market) => [
      `config:sources:${market}`.replace(/-/g, ':'),
      SOURCE,
    ]),
  )

async function main(): Promise<void> {
  const redis = new RedisRatesDb()
  const currencies = await fetchTickerCurrencies()
  const markets = buildMarkets(currencies, 'USD')
  const sourceByMarket = mapSourceByMarket(markets)
  await Promise.all([
    redis.mset(sourceByMarket),
    redis.sadd('config:currencies', ...currencies),
  ])
  redis.disconnect()
}

try {
  void main()
} catch (error) {
  console.error(error)
}
