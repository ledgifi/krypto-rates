import { workspaceRoot } from '@raptorsystems/krypto-rates-utils/paths'
import { makeSchema } from 'nexus'
import path from 'path'
import * as types from './resolvers'

export const schema = makeSchema({
  types,
  outputs: {
    typegen: path.join(__dirname, '../generated/nexusTypes.gen.ts'),
  },
  prettierConfig: path.join(workspaceRoot, '.prettierrc'),
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
        source: '@raptorsystems/krypto-rates-common/types',
        alias: 'types',
      },
      {
        source: require.resolve('./context'),
        alias: 'Context',
      },
    ],
  },
})
