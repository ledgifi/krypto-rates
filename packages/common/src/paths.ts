import findWorkspaceRoot from 'find-yarn-workspace-root'

export const workspaceRoot = findWorkspaceRoot() || process.cwd()
