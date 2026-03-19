export type FeaturePriority = 'high' | 'medium' | 'low'
export type FeatureStatus = 'done' | 'in-progress' | 'todo'
export type RelationType = 'depends' | 'related' | 'extends'

export interface Requirement {
  id: string
  name: string
  description: string
  group: 'tenant' | 'admin' | 'platform'
  order: number
  priority: FeaturePriority
  status: FeatureStatus
  acceptanceCriteria: string[]
}

export interface Feature {
  id: string
  name: string
  description: string
  requirementId: string
  phase: number
  priority: FeaturePriority
  status: FeatureStatus
  userStories: string[]
  acceptanceCriteria: string[]
  parentId: string | null
  dependencies: string[]
  screens?: string[]
}

export interface Relation {
  from: string
  to: string
  type: RelationType
  description?: string
}

export interface FeaturesData {
  version: string
  project: string
  requirements: Requirement[]
  features: Feature[]
  relations: Relation[]
}

// Backward compat: keep Category as alias
export type Category = Requirement
