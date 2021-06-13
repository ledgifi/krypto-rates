import { KryptoRates } from '../src/clients'
import { Market } from '@raptorsystems/krypto-rates-common/src/market'
import { Rate } from '../src/types'

const client = new KryptoRates('http://localhost:4010')

const today = new Date().toISOString().slice(0, 10)

const testRate = (rate: Rate, market: Market, date: string): void => {
  expect(rate.market).toEqual(market)
  expect(rate.date).toMatch(date)
  expect(rate.value).toBeDefined()
}

const testInverseRate = (
  rate: Rate,
  inverse: Rate,
  market: Market,
  date: string,
): void => {
  testRate(rate, market, date)
  expect(1 / rate.value).toEqual(inverse.value)
}

const testRates = (rates: Rate[], markets: Market[], date: string): void => {
  expect(rates).toHaveLength(markets.length)
  rates.forEach(result => {
    expect(markets).toContainEqual(result.market)
    expect(result.date).toMatch(date)
    expect(result.value).toBeDefined()
  })
}

const testInverseRates = (
  rates: Rate[],
  inverse: Rate[],
  markets: Market[],
  date: string,
): void => {
  testRates(rates, markets, date)
  expect(rates).toHaveLength(markets.length)
  rates.forEach((result, idx) => {
    expect(1 / result.value).toEqual(inverse[idx].value)
  })
}

test('live rate', async () => {
  const market = new Market('USD', 'CLP')
  const result = await client.api.liveRate({ market })
  const inverse = await client.api.liveRate({
    market: market.inverse,
  })
  testRate(result, market, today)
  testInverseRate(inverse, result, market.inverse, today)
})

test('live rates', async () => {
  const markets = [new Market('USD', 'CLP'), new Market('BTC', 'CLP')]
  const results = await client.api.liveRates({ markets })
  const inverseMarkets = markets.map(m => m.inverse)
  const inverse = await client.api.liveRates({ markets: inverseMarkets })

  testRates(results, markets, today)
  testInverseRates(inverse, results, inverseMarkets, today)
})

test('historical rate', async () => {
  const market = new Market('USD', 'CLP')
  const date = '2020-01-01'
  const result = await client.api.historicalRateForDate({ market, date })
  const inverse = await client.api.historicalRateForDate({
    market: market.inverse,
    date,
  })

  testInverseRate(inverse, result, market.inverse, date)
  testRate(result, market, date)
})
