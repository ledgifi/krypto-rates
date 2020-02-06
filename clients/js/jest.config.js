/* eslint-disable no-undef */
/* eslint-disable @typescript-eslint/no-var-requires */
const { pathsToModuleNameMapper } = require('ts-jest/utils')

module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  moduleNameMapper: pathsToModuleNameMapper({
    '@raptorsystems/krypto-rates-common/*': [
      '<rootDir>/../../packages/common/src/*',
    ],
  }),
}
