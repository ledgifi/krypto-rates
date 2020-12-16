import { workspaceRoot } from '@raptorsystems/krypto-rates-utils/src/paths'
import { makeSchema } from 'nexus'
import path from 'path'
import * as types from './resolvers'

export const schema = makeSchema({
  types,
  outputs: {
    schema: path.join(__dirname, 'generated/schema.gen.graphql'),
    typegen: path.join(__dirname, 'generated/nexusTypes.gen.ts'),
  },
  prettierConfig:
    process.env.NODE_ENV === 'development'
      ? path.join(workspaceRoot, '.prettierrc')
      : undefined,
  nonNullDefaults: {
    input: true,
    output: true,
  },
  contextType: {
    module: require.resolve('./context'),
    export: 'Context',
  },
  sourceTypes: {
    mapping: {
      Currency: 'string',
      Date: 'Date',
    },
    modules: [
      {
        module: '@raptorsystems/krypto-rates-common/src/types',
        alias: 'commonTypes',
      },
      {
        module: '@raptorsystems/krypto-rates-sources/src/types',
        alias: 'sourceTypes',
      },
      {
        module: require.resolve('./types'),
        alias: 'types',
      },
    ],
  },
})
