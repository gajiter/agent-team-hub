export interface AgentInfo {
  name: string
  description: string
  model: string
  color: string
  emoji: string
  role: string
  responsibilities?: string[]
  content: string  // Full markdown content
  fileName: string // Original file name
}

/** color name -> Tailwind class mapping */
const COLOR_MAP: Record<string, { bg: string; text: string; ring: string; bgLight: string; border: string }> = {
  red:    { bg: 'bg-red-500',    text: 'text-red-700 dark:text-red-400',    ring: 'ring-red-500',    bgLight: 'bg-red-50 dark:bg-red-950/30',    border: 'border-red-200 dark:border-red-800' },
  orange: { bg: 'bg-orange-500', text: 'text-orange-700 dark:text-orange-400', ring: 'ring-orange-500', bgLight: 'bg-orange-50 dark:bg-orange-950/30', border: 'border-orange-200 dark:border-orange-800' },
  yellow: { bg: 'bg-yellow-500', text: 'text-yellow-700 dark:text-yellow-400', ring: 'ring-yellow-500', bgLight: 'bg-yellow-50 dark:bg-yellow-950/30', border: 'border-yellow-200 dark:border-yellow-800' },
  green:  { bg: 'bg-green-500',  text: 'text-green-700 dark:text-green-400',  ring: 'ring-green-500',  bgLight: 'bg-green-50 dark:bg-green-950/30',  border: 'border-green-200 dark:border-green-800' },
  cyan:   { bg: 'bg-cyan-500',   text: 'text-cyan-700 dark:text-cyan-400',   ring: 'ring-cyan-500',   bgLight: 'bg-cyan-50 dark:bg-cyan-950/30',   border: 'border-cyan-200 dark:border-cyan-800' },
  blue:   { bg: 'bg-blue-500',   text: 'text-blue-700 dark:text-blue-400',   ring: 'ring-blue-500',   bgLight: 'bg-blue-50 dark:bg-blue-950/30',   border: 'border-blue-200 dark:border-blue-800' },
  indigo: { bg: 'bg-indigo-500', text: 'text-indigo-700 dark:text-indigo-400', ring: 'ring-indigo-500', bgLight: 'bg-indigo-50 dark:bg-indigo-950/30', border: 'border-indigo-200 dark:border-indigo-800' },
  purple: { bg: 'bg-purple-500', text: 'text-purple-700 dark:text-purple-400', ring: 'ring-purple-500', bgLight: 'bg-purple-50 dark:bg-purple-950/30', border: 'border-purple-200 dark:border-purple-800' },
  pink:   { bg: 'bg-pink-500',   text: 'text-pink-700 dark:text-pink-400',   ring: 'ring-pink-500',   bgLight: 'bg-pink-50 dark:bg-pink-950/30',   border: 'border-pink-200 dark:border-pink-800' },
}

const DEFAULT_COLORS = { bg: 'bg-gray-500', text: 'text-gray-700 dark:text-gray-400', ring: 'ring-gray-500', bgLight: 'bg-gray-50 dark:bg-gray-950/30', border: 'border-gray-200 dark:border-gray-800' }

export function getAgentColors(agent: AgentInfo) {
  return COLOR_MAP[agent.color] ?? DEFAULT_COLORS
}
