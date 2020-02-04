import {
  NullableDbRate,
  ParsedRates,
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
        markets: arg({ type: MarketInput, list: true }),
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

    t.field('historicalRate', {
      type: RateObject,
      nullable: true,
      args: {
        market: arg({ type: MarketInput }),
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

    t.field('historicalRates', {
      type: RateObject,
      nullable: true,
      list: true,
      args: {
        markets: arg({ type: MarketInput, list: true }),
        dates: dateArg({ list: true }),
      },
      resolve: (_root, { markets, dates }, ctx) =>
        ctx.fetch.fetchRatesDates({
          marketsInput: markets,
          dates,
          fetchDB: {
            single: (markets, date): Promise<NullableDbRate[]> =>
              ctx.db.fetchHistoricalRates({
                markets,
                dates: [date.toISOString()],
              }),
            timeframe: (markets, timeframe): Promise<NullableDbRate[]> =>
              ctx.db.fetchRatesTimeframe({
                markets,
                timeframe,
              }),
          },
          writeDB: rates => ctx.db.writeHistoricalRates({ rates }),
          fetchSource: {
            single: (markets, date): Promise<ParsedRates> =>
              ctx.rates.fetchHistorical(markets, date),
            timeframe: (markets, timeframe): Promise<ParsedRates> =>
              ctx.rates.fetchTimeframe(markets, timeframe),
          },
        }),
    })

    t.field('timeframeRates', {
      type: RateObject,
      nullable: true,
      list: true,
      args: {
        markets: arg({ type: MarketInput, list: true }),
        timeframe: arg({ type: TimeframeInput }),
      },
      resolve: (_root, { markets, timeframe }, ctx) =>
        ctx.fetch.fetchRatesDates({
          marketsInput: markets,
          dates: generateDateRange(timeframe),
          fetchDB: {
            single: (markets, date): Promise<NullableDbRate[]> =>
              ctx.db.fetchHistoricalRates({
                markets,
                dates: [date.toISOString()],
              }),
            timeframe: (markets, timeframe): Promise<NullableDbRate[]> =>
              ctx.db.fetchRatesTimeframe({ markets, timeframe }),
          },
          writeDB: rates => ctx.db.writeRatesTimeframe({ rates }),
          fetchSource: {
            single: (markets, dates): Promise<ParsedRates> =>
              ctx.rates.fetchHistorical(markets, dates),
            timeframe: (markets, timeframe): Promise<ParsedRates> =>
              ctx.rates.fetchTimeframe(markets, timeframe),
          },
        }),
    })
  },
})
