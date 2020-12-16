import { processRequest as _processRequest } from 'graphql-helix'
import {
  ProcessRequestOptions,
  ProcessRequestResult,
} from 'graphql-helix/dist/types'
import { Context, createContext } from './context'
import { schema } from './schema'

export const processRequest = <TRootValue = unknown>(
  options: Omit<
    ProcessRequestOptions<Context, TRootValue>,
    'schema' | 'contextFactory'
  >,
): Promise<ProcessRequestResult<Context, TRootValue>> =>
  _processRequest({
    ...options,
    schema,
    contextFactory: createContext,
  })
