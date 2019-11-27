import { Market } from '@raptorsystems/krypto-rates-common/market'
import { Currency } from '@raptorsystems/krypto-rates-common/types'

export * from '@raptorsystems/krypto-rates-common/types'

export type QuotesByBaseCurrency = Map<Currency, Currency[]>

export type MarketsByKey<T = string> = Map<T, Market[]>
