import { makeSchema } from '@nexus/schema'
import { workspaceRoot } from '@raptorsystems/krypto-rates-utils/src/paths'
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
  typegenAutoConfig: {
    contextType: 'Context.Context',
    backingTypeMap: {
      Currency: 'string',
      Date: 'Date',
    },
    sources: [
      {
        source: '@raptorsystems/krypto-rates-common/src/types',
        alias: 'commonTypes',
      },
      {
        source: '@raptorsystems/krypto-rates-sources/src/types',
        alias: 'sourceTypes',
      },
      {
        source: require.resolve('./types'),
        alias: 'types',
      },
      {
        source: require.resolve('./context'),
        alias: 'Context',
      },
    ],
  },
})
