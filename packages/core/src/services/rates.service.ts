import { RatesSource } from '@raptorsystems/krypto-rates-sources'
import { RatesDb } from '../types'

export class RatesService extends RatesSource {
  constructor(db: RatesDb) {
    super(market => db.fetchMarketSourceId({ market }))
  }
}
