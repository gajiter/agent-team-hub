export interface ScopeLevel {
  scope: string
  name: string
  description: string
}

export interface Role {
  id: string
  name: string
  scope?: string
  description: string
  level: number
}

export interface Permission {
  action: string
  featureId: string
  roles: Record<string, boolean>
  note?: string
}

export interface RolesData {
  version: string
  project: string
  scopeHierarchy?: ScopeLevel[]
  roles: Role[]
  scopeNotes?: Record<string, string>
  permissions: Permission[]
}
