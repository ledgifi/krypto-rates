import {
  MarketDate,
  MarketInput,
} from '@raptorsystems/krypto-rates-common/src/types'
import {
  NullableDbRate,
  ParsedRate,
} from '@raptorsystems/krypto-rates-sources/src/types'
import { generateDateRange } from '@raptorsystems/krypto-rates-utils/src/index'
import { GraphQLString } from 'graphql'
import { GraphQLDate } from 'graphql-scalars'
import {
  arg,
  inputObjectType,
  intArg,
  list,
  nullable,
  objectType,
  queryType,
  scalarType,
} from 'nexus/dist' // ? import from /dist to avoid error with webpack 5: The export "blocks" in "../../node_modules/nexus/dist-esm/index.js" has no internal name (existing names: none)
import { Context } from './context'

const TTL = parseInt(process.env.RATES_LIVE_TTL ?? '') || 300

// Scalars
export const Currency = scalarType({
  ...GraphQLString,
  name: 'Currency',
  asNexusMethod: 'currency',
})

export const Date = scalarType({
  ...GraphQLDate,
  name: 'Date',
  asNexusMethod: 'date',
})

// Inputs
export const MarketInputType = inputObjectType({
  name: 'MarketInput',
  definition(t) {
    t.currency('base')
    t.currency('quote')
  },
})

export const MarketDateInput = inputObjectType({
  name: 'MarketDateInput',
  definition(t) {
    t.field('market', { type: 'MarketInput' })
    t.date('date')
  },
})

export const TimeframeInput = inputObjectType({
  name: 'TimeframeInput',
  definition(t) {
    t.date('start')
    t.date('end')
  },
})

export const MarketTimeframeInput = inputObjectType({
  name: 'MarketTimeframeInput',
  definition(t) {
    t.field('market', { type: 'MarketInput' })
    t.field('timeframe', { type: 'TimeframeInput' })
  },
})

// Objects
export const MarketObject = objectType({
  name: 'Market',
  definition(t) {
    t.currency('base')
    t.currency('quote')
  },
})

export const RateObject = objectType({
  name: 'Rate',
  definition(t) {
    t.string('source')
    t.date('date')
    t.int('timestamp')
    t.nullable.float('value')
    t.field('market', { type: MarketObject })
    t.boolean('bridged')
  },
})

// Common functions
const fetchHistoricalMarketDates = ({
  ctx,
  marketDates,
}: {
  ctx: Context
  marketDates: MarketDate<MarketInput, Date>[]
}): Promise<ParsedRate[]> =>
  ctx.fetch.fetchRatesDates({
    marketDatesInput: marketDates,
    fetchDB: {
      single: (markets, date): Promise<NullableDbRate[]> =>
        ctx.db.fetchHistoricalRates({
          marketDates: markets.map((market) => ({
            market,
            date: date.toISOString(),
          })),
        }),
      timeframe: (markets, timeframe): Promise<NullableDbRate[]> =>
        ctx.db.fetchHistoricalRates({
          marketDates: generateDateRange(timeframe).flatMap((date) =>
            markets.map((market) => ({
              market,
              date: date.toISOString(),
            })),
          ),
        }),
    },
    writeDB: (rates) => ctx.db.writeHistoricalRates({ rates }),
    fetchSource: {
      single: (markets, date): Promise<ParsedRate[]> =>
        ctx.rates.fetchHistorical(markets, date),
      timeframe: (markets, timeframe): Promise<ParsedRate[]> =>
        ctx.rates.fetchTimeframe(markets, timeframe),
    },
  })

// Querys
export const Query = queryType({
  definition(t) {
    t.list.string('currencies', {
      resolve: (_root, _args, ctx) => ctx.db.fetchCurrencies(),
    })

    t.nullable.field('liveRate', {
      type: RateObject,
      args: {
        market: arg({ type: 'MarketInput' }),
        ttl: nullable(intArg({ default: TTL })),
      },
      resolve: (_root, { market, ttl }, ctx) =>
        ctx.fetch.fetchRate({
          marketInput: market,
          fetchDB: (market) => ctx.db.fetchLiveRate({ market, ttl }),
          writeDB: (rate) => ctx.db.writeLiveRate({ rate, ttl }),
          fetchSource: (market) => ctx.rates.fetchLive([market]),
        }),
    })

    t.nullable.list.field('liveRates', {
      type: RateObject,
      args: {
        markets: list(arg({ type: 'MarketInput' })),
        ttl: nullable(intArg({ default: TTL })),
      },
      resolve: (_root, { markets, ttl }, ctx) =>
        ctx.fetch.fetchRates({
          marketsInput: markets,
          fetchDB: (markets) => ctx.db.fetchLiveRates({ markets, ttl }),
          writeDB: (rates) => ctx.db.writeLiveRates({ rates, ttl }),
          fetchSource: (markets) => ctx.rates.fetchLive(markets),
        }),
    })

    t.nullable.field('historicalRateForDate', {
      type: RateObject,
      args: {
        market: arg({ type: 'MarketInput' }),
        date: arg({ type: 'Date' }),
      },
      resolve: (_root, { market, date }, ctx) =>
        ctx.fetch.fetchRate({
          marketInput: market,
          fetchDB: (market) =>
            ctx.db.fetchHistoricalRate({ market, date: date.toISOString() }),
          writeDB: (rate) => ctx.db.writeHistoricalRate({ rate }),
          fetchSource: (market) => ctx.rates.fetchHistorical([market], date),
        }),
    })

    t.nullable.list.field('historicalRatesForDate', {
      type: RateObject,
      args: {
        markets: list(arg({ type: 'MarketInput' })),
        date: arg({ type: 'Date' }),
      },
      resolve: (_root, { markets, date }, ctx) =>
        fetchHistoricalMarketDates({
          ctx,
          marketDates: markets.map((market) => ({ market, date })),
        }),
    })

    t.nullable.list.field('historicalRatesForDates', {
      type: RateObject,
      args: {
        markets: list(arg({ type: 'MarketInput' })),
        dates: list(arg({ type: 'Date' })),
      },
      resolve: (_root, { markets, dates }, ctx) =>
        fetchHistoricalMarketDates({
          ctx,
          marketDates: markets.flatMap((market) =>
            dates.map((date) => ({ market, date })),
          ),
        }),
    })

    t.nullable.list.field('historicalRatesByDate', {
      type: RateObject,
      args: {
        marketDates: list(arg({ type: 'MarketDateInput' })),
      },
      resolve: (_root, { marketDates }, ctx) =>
        fetchHistoricalMarketDates({ ctx, marketDates }),
    })

    t.nullable.list.field('historicalRatesForTimeframe', {
      type: RateObject,
      args: {
        markets: list(arg({ type: 'MarketInput' })),
        timeframe: arg({ type: TimeframeInput }),
      },
      resolve: (_root, { markets, timeframe }, ctx) =>
        fetchHistoricalMarketDates({
          ctx,
          marketDates: generateDateRange(timeframe).flatMap((date) =>
            markets.map((market) => ({ market, date })),
          ),
        }),
    })

    t.nullable.list.field('historicalRatesByTimeframe', {
      type: RateObject,
      args: {
        marketTimeframes: list(arg({ type: 'MarketTimeframeInput' })),
      },
      resolve: (_root, { marketTimeframes }, ctx) =>
        fetchHistoricalMarketDates({
          ctx,
          marketDates: marketTimeframes.flatMap(({ market, timeframe }) =>
            generateDateRange(timeframe).map((date) => ({ market, date })),
          ),
        }),
    })
  },
})
