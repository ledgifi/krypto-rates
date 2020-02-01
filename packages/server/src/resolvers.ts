import { GraphQLString } from 'graphql'
import { GraphQLDate } from 'graphql-iso-date'
import {
  arg,
  core,
  inputObjectType,
  objectType,
  queryType,
  scalarType,
  intArg,
} from 'nexus'
import { fetchRate, fetchRates, fetchRatesTimeframe } from './fetchers'
import { generateDateRange } from './utils'

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
      resolve: async (_root, _args, ctx) => {
        const currencies = await ctx.redis.get('config:currencies')
        return currencies && JSON.parse(currencies)
      },
    })

    t.field('liveRate', {
      type: RateObject,
      nullable: true,
      args: {
        market: arg({ type: MarketInput }),
        ttl: intArg({ required: false, default: 300 }),
      },
      resolve: (_root, { market, ttl }, ctx) =>
        fetchRate({
          ctx,
          market,
          fetchDB: market => ctx.redis.get(`rates:${market}:LIVE`),
          writeDB: rate =>
            ctx.redis.setex(
              `rates:${rate.market}:LIVE`,
              ttl as number,
              JSON.stringify(rate),
            ),
          fetchSource: (base, quotes) => ctx.rates.fetchLive(base, quotes),
        }),
    })

    t.field('liveRates', {
      type: RateObject,
      nullable: true,
      list: true,
      args: {
        markets: arg({ type: MarketsInput }),
        ttl: intArg({ required: false, default: 300 }),
      },
      resolve: async (_root, { markets, ttl }, ctx) =>
        fetchRates({
          ctx,
          markets,
          fetchDB: markets =>
            ctx.redis.mget(...markets.map(market => `rates:${market}:LIVE`)),
          writeDB: rates => {
            const pipeline = ctx.redis.pipeline()
            rates.forEach(rate =>
              pipeline.setex(
                `rates:${rate.market}:LIVE`,
                ttl as number,
                JSON.stringify(rate),
              ),
            )
            return pipeline.exec()
          },
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
        fetchRate({
          ctx,
          market,
          fetchDB: market =>
            ctx.redis.get(`rates:${market}:${date.toISOString().slice(0, 10)}`),
          writeDB: rate =>
            ctx.redis.set(
              `rates:${rate.market}:${rate.date}`,
              JSON.stringify(rate),
            ),
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
      resolve: async (_root, { markets, date }, ctx) =>
        fetchRates({
          ctx,
          markets,
          fetchDB: markets =>
            ctx.redis.mget(
              ...markets.map(
                market => `rates:${market}:${date.toISOString().slice(0, 10)}`,
              ),
            ),
          writeDB: rates =>
            ctx.redis.mset(
              new Map(
                rates.map(rate => [
                  `rates:${rate.market}:${rate.date}`,
                  JSON.stringify(rate),
                ]),
              ),
            ),
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
      resolve: async (_root, { markets, timeframe }, ctx) =>
        fetchRatesTimeframe({
          ctx,
          markets,
          timeframe,
          fetchDB: (markets, timeframe) =>
            ctx.redis.mget(
              ...markets.flatMap(market =>
                generateDateRange(timeframe).map(
                  date => `rates:${market}:${date.toISOString().slice(0, 10)}`,
                ),
              ),
            ),
          writeDB: rates =>
            ctx.redis.mset(
              new Map(
                rates.map(rate => [
                  `rates:${rate.market}:${rate.date}`,
                  JSON.stringify(rate),
                ]),
              ),
            ),

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
