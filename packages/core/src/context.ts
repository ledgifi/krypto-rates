import { RedisRatesDb } from './db/redis.db'
import { FetchService } from './services/fetch.service'
import { RatesService } from './services/rates.service'
import { RatesDb } from './types'

const db = new RedisRatesDb()

const rates = new RatesService(db)

const fetch = new FetchService()

export interface Context {
  db: RatesDb
  rates: RatesService
  fetch: FetchService
}

export function createContext(): Context {
  return { db, rates, fetch }
}
