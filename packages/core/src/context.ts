import { RedisRatesDb } from './db/redis.db'
import { FetcheService } from './services/fetch.service'
import { RatesService } from './services/rates.service'
import { RatesDb } from './types'

const db = new RedisRatesDb()

const rates = new RatesService(db)

const fetch = new FetcheService()

export interface Context {
  db: RatesDb
  rates: RatesService
  fetch: FetcheService
}

export function createContext(): Context {
  return { db, rates, fetch }
}
