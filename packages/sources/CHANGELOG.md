# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

# [2.0.0-alpha.4](https://github.com/raptorsystems/krypto-rates/compare/@raptorsystems/krypto-rates-sources@2.0.0-alpha.3...@raptorsystems/krypto-rates-sources@2.0.0-alpha.4) (2020-02-06)

**Note:** Version bump only for package @raptorsystems/krypto-rates-sources





# [2.0.0-alpha.3](https://github.com/raptorsystems/krypto-rates/compare/@raptorsystems/krypto-rates-sources@2.0.0-alpha.2...@raptorsystems/krypto-rates-sources@2.0.0-alpha.3) (2020-02-04)

**Note:** Version bump only for package @raptorsystems/krypto-rates-sources





# [2.0.0-alpha.2](https://github.com/raptorsystems/krypto-rates/compare/@raptorsystems/krypto-rates-sources@2.0.0-alpha.1...@raptorsystems/krypto-rates-sources@2.0.0-alpha.2) (2020-02-04)

**Note:** Version bump only for package @raptorsystems/krypto-rates-sources





# [2.0.0-alpha.1](https://github.com/raptorsystems/krypto-rates/compare/@raptorsystems/krypto-rates-sources@2.0.0-alpha.0...@raptorsystems/krypto-rates-sources@2.0.0-alpha.1) (2020-02-04)

**Note:** Version bump only for package @raptorsystems/krypto-rates-sources





# [2.0.0-alpha.0](https://github.com/raptorsystems/krypto-rates/compare/@raptorsystems/krypto-rates-sources@1.1.1...@raptorsystems/krypto-rates-sources@2.0.0-alpha.0) (2020-02-04)


### Bug Fixes

* **sources:** check for str value of timeframe env vars ([4ace659](https://github.com/raptorsystems/krypto-rates/commit/4ace6596ba4a03c362c7fb2eae9539d9537595c2))
* **sources:** pass correct base and quote on coinlayer ([1bf947d](https://github.com/raptorsystems/krypto-rates/commit/1bf947d7f0c3d515ac0f9f32a3fb3ef212a4c89d))


### Code Refactoring

* complete refactor, multiple dates on historical ([f094008](https://github.com/raptorsystems/krypto-rates/commit/f0940080bb43b12dde2f3795a0623179a59ee29e))
* **sources:** remove bitcoinaverage service ([fc2537c](https://github.com/raptorsystems/krypto-rates/commit/fc2537c4926d9b9fc31638447c56cf6ee2e7bf70))


### BREAKING CHANGES

* allow multiple dates on historical
* **sources:** drop support for bitcoinaverage





## [1.1.1](https://github.com/raptorsystems/krypto-rates/compare/@raptorsystems/krypto-rates-sources@1.1.0...@raptorsystems/krypto-rates-sources@1.1.1) (2019-12-31)


### Bug Fixes

* **coinlayer:** dont flip base and currencies for single currency ([94bc03d](https://github.com/raptorsystems/krypto-rates/commit/94bc03dc9156a47914ddd1ca10c06fe5630ed232))
* **sources:** use configured market on fetch ([7f98496](https://github.com/raptorsystems/krypto-rates/commit/7f9849614311b80658d293c1946da4336ebd1390))





# [1.1.0](https://github.com/raptorsystems/krypto-rates/compare/@raptorsystems/krypto-rates-sources@1.0.3...@raptorsystems/krypto-rates-sources@1.1.0) (2019-12-23)


### Bug Fixes

* **coinlayer:** fix implementation ([020582a](https://github.com/raptorsystems/krypto-rates/commit/020582a0f19abcb79758515a28123906a09d39e6))
* **sources:** don't invert value on bitcoinaverage on inv market ([9c0b249](https://github.com/raptorsystems/krypto-rates/commit/9c0b249cbed6493c15642d7ff08a65d7c11b182e))
* **sources:** handle max timeframe for coinlayer & currencylayer ([2e42bd2](https://github.com/raptorsystems/krypto-rates/commit/2e42bd2af5938c8f83830d6939c35863daeba22c))


### Features

* **api:** add markets and currencies resolvers ([154484a](https://github.com/raptorsystems/krypto-rates/commit/154484a8095027bf0d66e31c745fc7c1ab562d49))





## [1.0.3](https://github.com/raptorsystems/krypto-rates/compare/@raptorsystems/krypto-rates-sources@1.0.2...@raptorsystems/krypto-rates-sources@1.0.3) (2019-12-17)

**Note:** Version bump only for package @raptorsystems/krypto-rates-sources





## [1.0.2](https://github.com/raptorsystems/krypto-rates/compare/@raptorsystems/krypto-rates-sources@1.0.1...@raptorsystems/krypto-rates-sources@1.0.2) (2019-11-28)

**Note:** Version bump only for package @raptorsystems/krypto-rates-sources





## 1.0.1 (2019-11-28)

**Note:** Version bump only for package @raptorsystems/krypto-rates-sources





## 1.0.0 (2019-11-28)

* Add js-yaml ([2fd15ce](https://github.com/raptorsystems/krypto-rates/commit/2fd15ce))
* Add setSource method on UnifiedRateSource ([e8c2ba6](https://github.com/raptorsystems/krypto-rates/commit/e8c2ba6))
* Initial commit ([41c76ef](https://github.com/raptorsystems/krypto-rates/commit/41c76ef))
* Move RateSourceByMarket mapping to a yaml config file ([0fd2f8a](https://github.com/raptorsystems/krypto-rates/commit/0fd2f8a))
* Rename packages, use @raptorsystems scope ([fb10780](https://github.com/raptorsystems/krypto-rates/commit/fb10780))
* Rename RateSource name prop to id as static prop ([bbc3251](https://github.com/raptorsystems/krypto-rates/commit/bbc3251))
* Use MIT license ([5b25f1f](https://github.com/raptorsystems/krypto-rates/commit/5b25f1f))
