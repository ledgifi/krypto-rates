import {
  MarketDate,
  MarketInput,
} from '@raptorsystems/krypto-rates-common/types'
import {
  NullableDbRate,
  ParsedRate,
} from '@raptorsystems/krypto-rates-sources/types'
import { generateDateRange } from '@raptorsystems/krypto-rates-utils'
import { GraphQLString } from 'graphql'
import { GraphQLDate } from 'graphql-iso-date'
import {
  arg,
  core,
  inputObjectType,
  intArg,
  objectType,
  queryType,
  scalarType,
} from 'nexus'
import { Context } from './context'

const TTL = parseInt(process.env.RATES_LIVE_TTL ?? '') || 300

// Scalars
export const Currency = scalarType({
  ...GraphQLString,
  name: 'Currency',
  asNexusMethod: 'currency',
})

export function currencyArg(
  options?: core.ScalarArgConfig<string>,
): core.NexusArgDef<'Currency'> {
  return arg({ type: 'Currency', ...options })
}

export const Date = scalarType({
  ...GraphQLDate,
  name: 'Date',
  asNexusMethod: 'date',
})

export function dateArg(
  options?: core.ScalarArgConfig<Date>,
): core.NexusArgDef<'Date'> {
  return arg({ type: 'Date', ...options })
}

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
    t.float('value')
    t.field('market', { type: MarketObject })
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
          marketDates: markets.map(market => ({
            market,
            date: date.toISOString(),
          })),
        }),
      timeframe: (markets, timeframe): Promise<NullableDbRate[]> =>
        ctx.db.fetchHistoricalRates({
          marketDates: generateDateRange(timeframe).flatMap(date =>
            markets.map(market => ({
              market,
              date: date.toISOString(),
            })),
          ),
        }),
    },
    writeDB: rates => ctx.db.writeHistoricalRates({ rates }),
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
    t.string('currencies', {
      list: true,
      resolve: (_root, _args, ctx) => ctx.db.fetchCurrencies(),
    })

    t.field('liveRate', {
      type: RateObject,
      nullable: true,
      args: {
        market: arg({ type: 'MarketInput' }),
        ttl: intArg({ required: false, default: TTL }),
      },
      resolve: (_root, { market, ttl }, ctx) =>
        ctx.fetch.fetchRate({
          marketInput: market,
          fetchDB: market => ctx.db.fetchLiveRate({ market, ttl }),
          writeDB: rate => ctx.db.writeLiveRate({ rate, ttl }),
          fetchSource: market => ctx.rates.fetchLive([market]),
        }),
    })

    t.field('liveRates', {
      type: RateObject,
      nullable: true,
      list: true,
      args: {
        markets: arg({ type: 'MarketInput', list: true }),
        ttl: intArg({ required: false, default: TTL }),
      },
      resolve: (_root, { markets, ttl }, ctx) =>
        ctx.fetch.fetchRates({
          marketsInput: markets,
          fetchDB: markets => ctx.db.fetchLiveRates({ markets, ttl }),
          writeDB: rates => ctx.db.writeLiveRates({ rates, ttl }),
          fetchSource: markets => ctx.rates.fetchLive(markets),
        }),
    })

    t.field('historicalRateForDate', {
      type: RateObject,
      nullable: true,
      args: {
        market: arg({ type: 'MarketInput' }),
        date: dateArg(),
      },
      resolve: (_root, { market, date }, ctx) =>
        ctx.fetch.fetchRate({
          marketInput: market,
          fetchDB: market =>
            ctx.db.fetchHistoricalRate({ market, date: date.toISOString() }),
          writeDB: rate => ctx.db.writeHistoricalRate({ rate }),
          fetchSource: market => ctx.rates.fetchHistorical([market], date),
        }),
    })

    t.field('historicalRatesForDate', {
      type: RateObject,
      nullable: true,
      list: true,
      args: {
        markets: arg({ type: 'MarketInput', list: true }),
        date: dateArg(),
      },
      resolve: (_root, { markets, date }, ctx) =>
        fetchHistoricalMarketDates({
          ctx,
          marketDates: markets.map(market => ({ market, date })),
        }),
    })

    t.field('historicalRatesForDates', {
      type: RateObject,
      nullable: true,
      list: true,
      args: {
        markets: arg({ type: 'MarketInput', list: true }),
        dates: dateArg({ list: true }),
      },
      resolve: (_root, { markets, dates }, ctx) =>
        fetchHistoricalMarketDates({
          ctx,
          marketDates: markets.flatMap(market =>
            dates.map(date => ({ market, date })),
          ),
        }),
    })

    t.field('historicalRatesByDate', {
      type: RateObject,
      nullable: true,
      list: true,
      args: { marketDates: arg({ list: true, type: 'MarketDateInput' }) },
      resolve: (_root, { marketDates }, ctx) =>
        fetchHistoricalMarketDates({ ctx, marketDates }),
    })

    t.field('historicalRatesForTimeframe', {
      type: RateObject,
      nullable: true,
      list: true,
      args: {
        markets: arg({ type: 'MarketInput', list: true }),
        timeframe: arg({ type: TimeframeInput }),
      },
      resolve: (_root, { markets, timeframe }, ctx) =>
        fetchHistoricalMarketDates({
          ctx,
          marketDates: generateDateRange(timeframe).flatMap(date =>
            markets.map(market => ({ market, date })),
          ),
        }),
    })

    t.field('historicalRatesByTimeframe', {
      type: RateObject,
      nullable: true,
      list: true,
      args: {
        marketTimeframes: arg({ list: true, type: 'MarketTimeframeInput' }),
      },
      resolve: (_root, { marketTimeframes }, ctx) =>
        fetchHistoricalMarketDates({
          ctx,
          marketDates: marketTimeframes.flatMap(({ market, timeframe }) =>
            generateDateRange(timeframe).map(date => ({ market, date })),
          ),
        }),
    })
  },
})
