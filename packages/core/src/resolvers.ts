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
export const MarketInput = inputObjectType({
  name: 'MarketInput',
  definition(t) {
    t.currency('base')
    t.currency('quote')
  },
})

export const MarketsInput = inputObjectType({
  name: 'MarketsInput',
  definition(t) {
    t.currency('base')
    t.list.currency('quotes')
  },
})

export const TimeframeInput = inputObjectType({
  name: 'TimeframeInput',
  definition(t) {
    t.date('start')
    t.date('end')
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
        market: arg({ type: MarketInput }),
        ttl: intArg({ required: false, default: TTL }),
      },
      resolve: (_root, { market, ttl }, ctx) =>
        ctx.fetch.fetchRate({
          market,
          fetchDB: market => ctx.db.fetchLiveRate({ market, ttl }),
          writeDB: rate => ctx.db.writeLiveRate({ rate, ttl }),
          fetchSource: (base, quotes) => ctx.rates.fetchLive(base, quotes),
        }),
    })

    t.field('liveRates', {
      type: RateObject,
      nullable: true,
      list: true,
      args: {
        markets: arg({ type: MarketsInput }),
        ttl: intArg({ required: false, default: TTL }),
      },
      resolve: (_root, { markets, ttl }, ctx) =>
        ctx.fetch.fetchRates({
          markets,
          fetchDB: markets => ctx.db.fetchLiveRates({ markets, ttl }),
          writeDB: rates => ctx.db.writeLiveRates({ rates, ttl }),
          fetchSource: (base, quotes) => ctx.rates.fetchLive(base, quotes),
        }),
    })

    t.field('historicalRate', {
      type: RateObject,
      nullable: true,
      args: {
        market: arg({ type: MarketInput }),
        date: dateArg(),
      },
      resolve: (_root, { market, date }, ctx) =>
        ctx.fetch.fetchRate({
          market,
          fetchDB: market =>
            ctx.db.fetchHistoricalRate({ market, date: date.toISOString() }),
          writeDB: rate => ctx.db.writeHistoricalRate({ rate }),
          fetchSource: (base, quotes) =>
            ctx.rates.fetchHistorical(base, quotes, date),
        }),
    })

    t.field('historicalRates', {
      type: RateObject,
      nullable: true,
      list: true,
      args: {
        markets: arg({ type: MarketsInput }),
        date: dateArg(),
      },
      resolve: (_root, { markets, date }, ctx) =>
        ctx.fetch.fetchRates({
          markets,
          fetchDB: markets =>
            ctx.db.fetchHistoricalRates({ markets, date: date.toISOString() }),
          writeDB: rates => ctx.db.writeHistoricalRates({ rates }),
          fetchSource: (base, quotes) =>
            ctx.rates.fetchHistorical(base, quotes, date),
        }),
    })

    t.field('timeframeRates', {
      type: RateObject,
      nullable: true,
      list: true,
      args: {
        markets: arg({ type: MarketsInput }),
        timeframe: arg({ type: TimeframeInput }),
      },
      resolve: (_root, { markets, timeframe }, ctx) =>
        ctx.fetch.fetchRatesTimeframe({
          markets,
          timeframe,
          fetchDB: (markets, timeframe) =>
            ctx.db.fetchRatesTimeframe({ markets, timeframe }),
          writeDB: rates => ctx.db.writeRatesTimeframe({ rates }),

          // TODO: use fetchTimeframe
          // fetchSource: (base, quotes, timeframe) =>
          //   ctx.ratesSource.fetchTimeframe(base, quotes, timeframe),

          // ? Uses fetchHistorical concurrently to avoid using fetchTimeframe
          fetchSource: async (base, quotes, timeframe) => {
            const rates = await Promise.all(
              generateDateRange(timeframe).map(date =>
                ctx.rates.fetchHistorical(base, quotes, date),
              ),
            )
            return rates.flat()
          },
        }),
    })
  },
})
