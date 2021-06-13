import { Currency, MarketInput } from './types'

export class Market implements MarketInput {
  public constructor(public base: Currency, public quote: Currency) {}

  public get id(): string {
    return [this.base, this.quote].join('-')
  }

  public get code(): string {
    return this.base + this.quote
  }

  public get inverse(): Market {
    return new Market(this.quote, this.base)
  }
}
