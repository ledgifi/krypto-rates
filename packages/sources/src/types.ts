export * from '@krypto-rates/common/types'
import { Market } from '@krypto-rates/common/market'
import { Currency } from '@krypto-rates/common/types'

export type QuotesByBaseCurrency = Map<Currency, Currency[]>

export type MarketsByKey<T = string> = Map<T, Market[]>
