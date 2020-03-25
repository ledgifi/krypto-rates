# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

# [2.0.0-alpha.9](https://github.com/raptorsystems/krypto-rates/compare/@raptorsystems/krypto-rates-core@2.0.0-alpha.8...@raptorsystems/krypto-rates-core@2.0.0-alpha.9) (2020-03-25)

**Note:** Version bump only for package @raptorsystems/krypto-rates-core





# [2.0.0-alpha.8](https://github.com/raptorsystems/krypto-rates/compare/@raptorsystems/krypto-rates-core@2.0.0-alpha.7...@raptorsystems/krypto-rates-core@2.0.0-alpha.8) (2020-02-19)

**Note:** Version bump only for package @raptorsystems/krypto-rates-core





# [2.0.0-alpha.7](https://github.com/raptorsystems/krypto-rates/compare/@raptorsystems/krypto-rates-core@2.0.0-alpha.6...@raptorsystems/krypto-rates-core@2.0.0-alpha.7) (2020-02-19)


### Performance Improvements

* **core:** optimize filter for missing market dates ([d844abd](https://github.com/raptorsystems/krypto-rates/commit/d844abdae28ae6134809f05af672009905b6a5b8))





# [2.0.0-alpha.6](https://github.com/raptorsystems/krypto-rates/compare/@raptorsystems/krypto-rates-core@2.0.0-alpha.5...@raptorsystems/krypto-rates-core@2.0.0-alpha.6) (2020-02-07)

**Note:** Version bump only for package @raptorsystems/krypto-rates-core





# [2.0.0-alpha.5](https://github.com/raptorsystems/krypto-rates/compare/@raptorsystems/krypto-rates-core@2.0.0-alpha.4...@raptorsystems/krypto-rates-core@2.0.0-alpha.5) (2020-02-06)


### Bug Fixes

* **core:** don't write to db if rates is empty ([7b54d26](https://github.com/raptorsystems/krypto-rates/commit/7b54d260a544c6993be6ea9e4b79f8717c01767c))
* **core:** use strings as keys when building marketDateGroups ([bbd7d63](https://github.com/raptorsystems/krypto-rates/commit/bbd7d633b75ede182ef226381686d60c5311ee9c))


### Performance Improvements

* **core:** optimize filter for missing market dates ([24e4c16](https://github.com/raptorsystems/krypto-rates/commit/24e4c16a962550de5b02debfa0ec8216c44f2488))





# [2.0.0-alpha.4](https://github.com/raptorsystems/krypto-rates/compare/@raptorsystems/krypto-rates-core@2.0.0-alpha.3...@raptorsystems/krypto-rates-core@2.0.0-alpha.4) (2020-02-06)

**Note:** Version bump only for package @raptorsystems/krypto-rates-core





# [2.0.0-alpha.3](https://github.com/raptorsystems/krypto-rates/compare/@raptorsystems/krypto-rates-core@2.0.0-alpha.2...@raptorsystems/krypto-rates-core@2.0.0-alpha.3) (2020-02-04)

**Note:** Version bump only for package @raptorsystems/krypto-rates-core





# [2.0.0-alpha.2](https://github.com/raptorsystems/krypto-rates/compare/@raptorsystems/krypto-rates-core@2.0.0-alpha.1...@raptorsystems/krypto-rates-core@2.0.0-alpha.2) (2020-02-04)

**Note:** Version bump only for package @raptorsystems/krypto-rates-core





# [2.0.0-alpha.1](https://github.com/raptorsystems/krypto-rates/compare/@raptorsystems/krypto-rates-core@2.0.0-alpha.0...@raptorsystems/krypto-rates-core@2.0.0-alpha.1) (2020-02-04)

**Note:** Version bump only for package @raptorsystems/krypto-rates-core





# 2.0.0-alpha.0 (2020-02-04)


### Bug Fixes

* **core:** fix missing markets date match for fetchTimeframe ([7f11f90](https://github.com/raptorsystems/krypto-rates/commit/7f11f901f8b83240a2c50ffbec9c93193d3a3f4c))
* **redis:** use regexp to replace all '-' for ':' on keys ([6b90c60](https://github.com/raptorsystems/krypto-rates/commit/6b90c6082820f952d5ac5161ad5dbe6053baae0a))


### Code Refactoring

* complete refactor, multiple dates on historical ([f094008](https://github.com/raptorsystems/krypto-rates/commit/f0940080bb43b12dde2f3795a0623179a59ee29e))


### BREAKING CHANGES

* allow multiple dates on historical
