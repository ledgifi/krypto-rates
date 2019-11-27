import { workspaceRoot } from '@krypto-rates/common/paths'
import { makeSchema } from 'nexus'
import { nexusPrismaPlugin } from 'nexus-prisma'
import path from 'path'
import * as types from './resolvers'

export const schema = makeSchema({
  types,
  plugins: [
    nexusPrismaPlugin({
      inputs: {
        photon: path.join(workspaceRoot, 'node_modules/@prisma/photon'),
      },
    }),
  ],
  outputs: {
    typegen: path.join(
      workspaceRoot,
      'node_modules/@types/nexus-prisma-typegen/index.d.ts',
    ),
  },
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
        source: '@prisma/photon',
        alias: 'photon',
      },
      {
        source: '@krypto-rates/common/types',
        alias: 'types',
      },
      {
        source: require.resolve('./context'),
        alias: 'Context',
      },
    ],
  },
})
