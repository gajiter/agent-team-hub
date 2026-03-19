export interface PrdVision {
  oneLiner: string
  goals: string[]
  background: string | string[]
}

export interface PrdCoreValue {
  id: string
  name: string
  description: string
}

export interface PrdUserType {
  role: string
  description: string
  concerns: string
}

export interface PrdPersona {
  name: string
  role: string
  situation: string
  goal: string
  painPoint: string
  coreNeed: string
}

export interface PrdTarget {
  userTypes: PrdUserType[]
  personas: PrdPersona[]
  scenarios: string[]
}

export interface PrdUserStory {
  id: string
  title: string
  size: string
  actor: string
  goal: string
  want: string
  acceptance: {
    given: string
    when: string
    then: string
  }
}

export interface PrdNfrItem {
  id: string
  requirement: string
  target?: string
}

export interface PrdNonFunctionalRequirements {
  performance: PrdNfrItem[]
  security: PrdNfrItem[]
  deployment: PrdNfrItem[]
  dataManagement: PrdNfrItem[]
}

export interface PrdMvpIncluded {
  id: string
  item: string
  relatedStories: string[]
}

export interface PrdMvpExcluded {
  item: string
  reason: string
}

export interface PrdMvpScope {
  included: PrdMvpIncluded[]
  excluded: PrdMvpExcluded[]
}

export interface PrdRoadmapPhase {
  phase: number
  title: string
  targetDate: string | null
  items: string[]
}

export interface PrdKpiItem {
  metric: string
  target: string
  period: string
}

export interface PrdKpiCategories {
  operationalStability: PrdKpiItem[]
  usability: PrdKpiItem[]
  business: PrdKpiItem[]
}

export interface PrdConstraint {
  id: string
  description: string
}

export interface PrdOpenItem {
  id: string
  item: string
  status: string
  prdImpact: string
}

export interface PrdProperties {
  serviceName: string
  version: string
  status: string
  basedOn: string
}

export interface PrdSections {
  vision: PrdVision
  coreValues: PrdCoreValue[]
  target: PrdTarget
  userStories: PrdUserStory[]
  nonFunctionalRequirements: PrdNonFunctionalRequirements
  mvpScope: PrdMvpScope
  roadmap: PrdRoadmapPhase[]
  kpi: PrdKpiCategories
  constraints: PrdConstraint[]
  openIssues: PrdOpenItem[]
  properties: PrdProperties
}

export interface PrdData {
  version: string
  project: string
  updatedAt: string
  progress: number
  sections: PrdSections
}
