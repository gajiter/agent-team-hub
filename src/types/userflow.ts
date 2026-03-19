export type FlowNodeType = 'start' | 'section' | 'page' | 'action'

export interface FlowNode {
  id: string
  type: FlowNodeType
  label: string
  featureIds?: string[]
}

export interface FlowEdge {
  from: string
  to: string
}

export interface FlowSection {
  name: string
  nodes: FlowNode[]
  edges: FlowEdge[]
}

export interface UserFlowData {
  version: string
  project: string
  sections: FlowSection[]
}
