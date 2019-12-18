import {
  Currencies,
  Markets,
} from '@raptorsystems/krypto-rates-sources/mapping'
import { GraphQLString } from 'graphql'
import { GraphQLDate } from 'graphql-iso-date'
import moment from 'moment'
import {
  arg,
  core,
  inputObjectType,
  objectType,
  queryType,
  scalarType,
} from 'nexus'
import { fetchRate, fetchRates, fetchRatesTimeframe } from './fetchers'

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
    t.model.source()
    t.model.timestamp()
    t.model.value()
    t.field('market', { type: MarketObject })
  },
})

// Querys
export const Query = queryType({
  definition(t) {
    t.field('markets', {
      type: MarketObject,
      list: true,
      resolve: () => Markets,
    })

    t.string('currencies', {
      list: true,
      resolve: () => Currencies,
    })

    t.field('liveRate', {
      type: RateObject,
      nullable: true,
      args: {
        market: arg({ type: MarketInput }),
        since: dateArg({ required: false }),
      },
      resolve: (_root, { market, since }, ctx) => {
        const date =
          since ??
          moment()
            .subtract(5, 'minutes')
            .toDate()
        return fetchRate({
          ctx,
          market,
          fetchDB: market =>
            ctx.photon.rates.findMany({
              where: { market, timestamp: { gte: date } },
            }),
          fetchSource: (base, quotes) =>
            ctx.ratesSource.fetchLive(base, quotes),
        })
      },
    })

    t.field('liveRates', {
      type: RateObject,
      nullable: true,
      list: true,
      args: {
        markets: arg({ type: MarketsInput }),
        since: dateArg({ required: false }),
      },
      resolve: async (_root, { markets, since }, ctx) => {
        const date =
          since ??
          moment()
            .subtract(5, 'minutes')
            .toDate()
        return fetchRates({
          ctx,
          markets,
          fetchDB: markets =>
            ctx.photon.rates.findMany({
              where: { market: { in: markets }, timestamp: { gte: date } },
            }),
          fetchSource: (base, quotes) =>
            ctx.ratesSource.fetchLive(base, quotes),
        })
      },
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
            ctx.photon.rates.findMany({
              where: { market, timestamp: date },
            }),
          fetchSource: (base, quotes) =>
            ctx.ratesSource.fetchHistorical(base, quotes, date),
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
            ctx.photon.rates.findMany({
              where: { market: { in: markets }, timestamp: date },
            }),
          fetchSource: (base, quotes) =>
            ctx.ratesSource.fetchHistorical(base, quotes, date),
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
          fetchDB: (markets, { start, end }) =>
            ctx.photon.rates.findMany({
              where: {
                market: { in: markets },
                timestamp: { gte: start, lte: end },
              },
            }),
          fetchSource: (base, quotes, timeframe) =>
            ctx.ratesSource.fetchTimeframe(base, quotes, timeframe),
        }),
    })
  },
})
