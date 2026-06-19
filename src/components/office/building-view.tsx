'use client'

import type { AgentInfo } from '@/types/agents'
import type { Issue } from '@/types/issues'
import { useEffect, useState } from 'react'

interface BuildingViewProps {
  agents: AgentInfo[]
  issues: Issue[]
}

const FLOOR_CONFIG = [
  { floor: 3, label: '임원실', agents: [
    { agentName: '신민수', role: 'ceo' as const },
    { agentName: '신피엠', role: 'pm' as const },
  ]},
  { floor: 2, label: '프론트엔드', agents: [
    { agentName: '신프엔드', role: 'developer' as const },
    { agentName: '박프엔드', role: 'junior' as const },
    { agentName: '신리뷰', role: 'reviewer' as const },
  ]},
  { floor: 1, label: '백엔드 / 기획', agents: [
    { agentName: '신백엔드', role: 'backend' as const },
    { agentName: '신기획', role: 'planner' as const },
  ]},
]

type AgentStatus = 'working' | 'waiting' | 'resting'
type Role = 'ceo' | 'pm' | 'planner' | 'developer' | 'backend' | 'junior' | 'reviewer'

function getAgentStatus(agentName: string, issues: Issue[]): { status: AgentStatus; currentIssue: Issue | null } {
  if (agentName === '신민수') return { status: 'working', currentIssue: null }
  const agentIssues = issues.filter(
    (issue) => issue.assignees.includes(agentName) && !['closed', 'archived', 'resolved'].includes(issue.status)
  )
  const inProgress = agentIssues.find((i) => i.status === 'in-progress')
  if (inProgress) return { status: 'working', currentIssue: inProgress }
  const open = agentIssues.find((i) => i.status === 'open')
  if (open) return { status: 'waiting', currentIssue: open }
  return { status: 'resting', currentIssue: null }
}

function getRoleColor(role: Role): string {
  const map: Record<Role, string> = {
    ceo: '#1a1a2e', pm: '#a855f7', planner: '#3b82f6', backend: '#ec4899', developer: '#f97316', junior: '#3b82f6', reviewer: '#22c55e',
  }
  return map[role]
}

/* ══════════ Seat Positions (% based, easy to adjust) ══════════ */
const SEAT_POSITIONS: Record<string, { top: string; left: string }> = {
  ceo:      { top: '22%', left: '7.5%' },
  pm:       { top: '23%', left: '38%' },
  developer:{ top: '47%', left: '11%' },
  junior:   { top: '47%', left: '37%' },
  reviewer: { top: '47%', left: '62%' },
  backend:  { top: '72%', left: '9.5%' },
  planner:  { top: '72%', left: '67%' },
}

/* ══════════ Skin color helper ══════════ */
const SKIN = '#f0d0a0'
const SKIN_B = '#f5deb3'

/* ══════════ Character SVGs (upper body, kawaii style) ══════════ */

function CharacterCEO({ status }: { status: AgentStatus }) {
  const isWork = status === 'working'
  const isRest = status === 'resting'
  return (
    <svg viewBox="0 0 80 120" className="w-full h-full">
      {/* ── Head area ── */}
      <g className={isWork ? 'bldg-nod' : ''}>
        {/* Slicked-back hair */}
        <ellipse cx="40" cy="18" rx="18" ry="8" fill="#1a1a1a" />
        <path d="M22 28 Q22 14 40 10 Q58 14 58 28" fill="#1a1a1a" />
        {/* Head */}
        <circle cx="40" cy="30" r="18" fill={SKIN} />
        {/* Thick black glasses */}
        <rect x="26" y="25" width="12" height="9" rx="2.5" fill="none" stroke="#222" strokeWidth="1.8" />
        <rect x="42" y="25" width="12" height="9" rx="2.5" fill="none" stroke="#222" strokeWidth="1.8" />
        <line x1="38" y1="29" x2="42" y2="29" stroke="#222" strokeWidth="1.2" />
        <line x1="26" y1="29" x2="22" y2="27" stroke="#222" strokeWidth="0.8" />
        <line x1="54" y1="29" x2="58" y2="27" stroke="#222" strokeWidth="0.8" />
        {/* Eyes behind glasses */}
        <circle cx="32" cy="30" r="1.8" fill="#222" className={isWork ? 'bldg-eye-blink' : ''} />
        <circle cx="48" cy="30" r="1.8" fill="#222" className={isWork ? 'bldg-eye-blink' : ''} />
        {isWork && <>
          <circle cx="32.6" cy="29.4" r="0.6" fill="white" />
          <circle cx="48.6" cy="29.4" r="0.6" fill="white" />
        </>}
        {/* Eyebrows */}
        <path d="M27 22 Q32 19 37 22" fill="none" stroke="#222" strokeWidth="1" />
        <path d="M43 22 Q48 19 53 22" fill="none" stroke="#222" strokeWidth="1" />
        {/* Expression */}
        {isWork
          ? <path d="M34 38 Q40 36 46 38" fill="none" stroke="#555" strokeWidth="0.8" />
          : <path d="M33 37 Q40 42 47 37" fill="none" stroke="#555" strokeWidth="1" />
        }
        {/* Ears */}
        <ellipse cx="22" cy="30" rx="3" ry="4" fill={SKIN} />
        <ellipse cx="58" cy="30" rx="3" ry="4" fill={SKIN} />
      </g>

      {/* Navy suit body */}
      <path d="M16 50 L24 48 L40 54 L56 48 L64 50 L68 100 L12 100 Z" fill="#1a1a2e" fillOpacity="0.9" />
      {/* White collar */}
      <path d="M32 48 L40 54 L48 48" fill="none" stroke="white" strokeWidth="2" />
      {/* Red tie */}
      <polygon points="40,54 37,66 40,92 43,66" fill="#c0392b" />
      <polygon points="40,54 38,57 40,60 42,57" fill="#e74c3c" fillOpacity="0.7" />
      {/* Suit lapels */}
      <path d="M32 48 L28 68 L34 76" fill="none" stroke="#111" strokeWidth="0.8" strokeOpacity="0.3" />
      <path d="M48 48 L52 68 L46 76" fill="none" stroke="#111" strokeWidth="0.8" strokeOpacity="0.3" />

      {/* Arms (typing motion when working) */}
      <g className={isWork ? 'bldg-left-arm' : ''}>
        <rect x="4" y="82" width="20" height="8" rx="4" fill="#1a1a2e" fillOpacity="0.85" />
        <circle cx="4" cy="86" r="4" fill={SKIN} />
      </g>
      <g className={isWork ? 'bldg-right-arm' : ''}>
        <rect x="56" y="82" width="20" height="8" rx="4" fill="#1a1a2e" fillOpacity="0.85" />
        <circle cx="76" cy="86" r="4" fill={SKIN} />
      </g>

      {/* Resting: coffee steam */}
      {isRest && (
        <g className="bldg-steam">
          <path d="M68 78 Q66 72 70 66" fill="none" stroke="var(--color-muted-foreground)" strokeWidth="0.6" strokeOpacity="0.2" />
          <path d="M72 76 Q74 70 71 64" fill="none" stroke="var(--color-muted-foreground)" strokeWidth="0.5" strokeOpacity="0.15" />
        </g>
      )}
    </svg>
  )
}

function CharacterPM({ status, color }: { status: AgentStatus; color: string }) {
  const isWork = status === 'working'
  const isRest = status === 'resting'
  return (
    <svg viewBox="0 0 80 120" className="w-full h-full">
      <g className={isWork ? 'bldg-person-working' : ''}>
        {/* Neat hair */}
        <path d="M22 22 Q22 10 40 8 Q58 10 58 22" fill="#3d2b1f" />
        <ellipse cx="40" cy="20" rx="16" ry="6" fill="#3d2b1f" />
        {/* Head */}
        <circle cx="40" cy="28" r="18" fill={SKIN} />
        {/* Eyes */}
        <circle cx="34" cy="26" r="2" fill="#333" className={isWork ? 'bldg-eye-blink' : ''} />
        <circle cx="46" cy="26" r="2" fill="#333" className={isWork ? 'bldg-eye-blink' : ''} />
        {isWork && <>
          <circle cx="34.6" cy="25.4" r="0.6" fill="white" />
          <circle cx="46.6" cy="25.4" r="0.6" fill="white" />
        </>}
        {/* Confident smile */}
        <path d="M34 36 Q40 40 46 36" fill="none" stroke="#555" strokeWidth="1" />
        {/* Ears */}
        <ellipse cx="22" cy="28" rx="3" ry="4" fill={SKIN} />
        <ellipse cx="58" cy="28" rx="3" ry="4" fill={SKIN} />
      </g>

      {/* Purple blazer body */}
      <path d="M16 48 L24 46 L40 52 L56 46 L64 48 L68 100 L12 100 Z" fill={color} fillOpacity="0.75" />
      {/* White inner shirt collar */}
      <path d="M32 46 L40 52 L48 46" fill="none" stroke="white" strokeWidth="1.8" />
      {/* Blazer buttons */}
      <circle cx="40" cy="64" r="1.5" fill="white" fillOpacity="0.4" />
      <circle cx="40" cy="76" r="1.5" fill="white" fillOpacity="0.4" />

      {/* Left arm + clipboard */}
      <g className={isWork ? 'bldg-clipboard-shake' : ''}>
        <rect x="2" y="68" width="18" height="8" rx="4" fill={color} fillOpacity="0.6" />
        {/* Clipboard */}
        <rect x="-4" y="60" width="16" height="24" rx="1.5" fill="#d4a574" fillOpacity="0.55" />
        <rect x="0" y="58" width="6" height="3" rx="1" fill="#aaa" fillOpacity="0.3" />
        <rect x="-1" y="66" width="10" height="2" rx="0.5" fill="white" fillOpacity="0.45" />
        <rect x="-1" y="71" width="8" height="2" rx="0.5" fill="white" fillOpacity="0.35" />
        <rect x="-1" y="76" width="10" height="2" rx="0.5" fill="white" fillOpacity="0.3" />
        <circle cx="-4" cy="72" r="4" fill={SKIN} />
      </g>
      {/* Right arm */}
      <rect x="60" y="74" width="18" height="8" rx="4" fill={color} fillOpacity="0.55" />
      <circle cx="78" cy="78" r="4" fill={SKIN} />

      {/* Resting: thought bubbles */}
      {isRest && (
        <g>
          <circle cx="62" cy="20" r="2" fill="var(--color-muted-foreground)" fillOpacity="0.12" />
          <circle cx="68" cy="12" r="3" fill="var(--color-muted-foreground)" fillOpacity="0.1" />
          <circle cx="74" cy="4" r="4" fill="var(--color-muted-foreground)" fillOpacity="0.08" />
        </g>
      )}
    </svg>
  )
}

function CharacterDeveloper({ status, color }: { status: AgentStatus; color: string }) {
  const isWork = status === 'working'
  const isRest = status === 'resting'
  return (
    <svg viewBox="0 0 80 120" className="w-full h-full">
      <g className={isWork ? 'bldg-person-working' : ''}>
        {/* Black beanie */}
        <path d="M22 24 Q22 8 40 6 Q58 8 58 24" fill="#222" />
        <rect x="22" y="22" width="36" height="5" rx="2" fill="#333" />
        <rect x="37" y="4" width="5" height="5" rx="2.5" fill="#333" fillOpacity="0.5" />
        {/* Head */}
        <circle cx="40" cy="32" r="18" fill={SKIN} />
        {/* Headphones */}
        <path d="M22 38 Q18 28 24 18" fill="none" stroke="#555" strokeWidth="3" />
        <path d="M58 38 Q62 28 56 18" fill="none" stroke="#555" strokeWidth="3" />
        <rect x="18" y="36" width="8" height="6" rx="2.5" fill="#444" fillOpacity="0.6" />
        <rect x="54" y="36" width="8" height="6" rx="2.5" fill="#444" fillOpacity="0.6" />
        {/* Focused rectangular eyes */}
        <rect x="30" y="28" width="7" height="4" rx="1.5" fill="#222" className={isWork ? 'bldg-eye-blink' : ''} />
        <rect x="43" y="28" width="7" height="4" rx="1.5" fill="#222" className={isWork ? 'bldg-eye-blink' : ''} />
        {isWork && <>
          <rect x="31.5" y="29" width="2" height="1.5" rx="0.5" fill="white" fillOpacity="0.6" />
          <rect x="44.5" y="29" width="2" height="1.5" rx="0.5" fill="white" fillOpacity="0.6" />
        </>}
        {/* Mouth */}
        {isWork
          ? <path d="M34 42 L46 42" stroke="#444" strokeWidth="1" strokeLinecap="round" />
          : <path d="M34 41 Q40 44 46 41" fill="none" stroke="#444" strokeWidth="1" />
        }
        {/* Ears */}
        <ellipse cx="22" cy="32" rx="3" ry="4" fill={SKIN} />
        <ellipse cx="58" cy="32" rx="3" ry="4" fill={SKIN} />
      </g>

      {/* Orange hoodie body */}
      <path d="M14 52 L22 50 L40 56 L58 50 L66 52 L70 100 L10 100 Z" fill={color} fillOpacity="0.75" />
      {/* Hoodie strings */}
      <line x1="36" y1="54" x2="34" y2="74" stroke="white" strokeWidth="0.8" strokeOpacity="0.4" />
      <line x1="44" y1="54" x2="46" y2="74" stroke="white" strokeWidth="0.8" strokeOpacity="0.4" />
      {/* Hood drape */}
      <path d="M28 50 Q40 47 52 50" fill="none" stroke={color} strokeWidth="2.5" strokeOpacity="0.5" />

      {/* Arms typing */}
      <g className={isWork ? 'bldg-left-arm' : ''}>
        <rect x="2" y="82" width="18" height="8" rx="4" fill={color} fillOpacity="0.6" />
        <circle cx="2" cy="86" r="4" fill={SKIN} />
      </g>
      <g className={isWork ? 'bldg-right-arm' : ''}>
        <rect x="60" y="82" width="18" height="8" rx="4" fill={color} fillOpacity="0.6" />
        <circle cx="78" cy="86" r="4" fill={SKIN} />
      </g>

      {/* Resting: phone */}
      {isRest && (
        <g>
          <rect x="64" y="76" width="8" height="14" rx="1.5" fill="#222" fillOpacity="0.6" />
          <rect x="65.5" y="78" width="5" height="10" rx="0.5" fill="#60a5fa" fillOpacity="0.2" />
        </g>
      )}
    </svg>
  )
}

function CharacterJunior({ status, color }: { status: AgentStatus; color: string }) {
  const isWork = status === 'working'
  const isRest = status === 'resting'
  return (
    <svg viewBox="0 0 80 120" className="w-full h-full">
      <g className={isWork ? 'bldg-person-working' : ''}>
        {/* Fluffy messy hair */}
        <ellipse cx="40" cy="14" rx="20" ry="10" fill="#5a3825" />
        <ellipse cx="28" cy="12" rx="10" ry="8" fill="#5a3825" />
        <ellipse cx="52" cy="16" rx="8" ry="6" fill="#5a3825" />
        {/* Head */}
        <circle cx="40" cy="24" r="18" fill={SKIN_B} />
        {/* BIG eager eyes (sparkly) */}
        <circle cx="34" cy="20" r="3.2" fill="#222" className={isWork ? 'bldg-eye-blink' : ''} />
        <circle cx="46" cy="20" r="3.2" fill="#222" className={isWork ? 'bldg-eye-blink' : ''} />
        <circle cx="35.2" cy="18.8" r="1.2" fill="white" />
        <circle cx="47.2" cy="18.8" r="1.2" fill="white" />
        <circle cx="33.2" cy="21.2" r="0.6" fill="white" fillOpacity="0.6" />
        <circle cx="45.2" cy="21.2" r="0.6" fill="white" fillOpacity="0.6" />
        {/* Wide smile */}
        <path d="M34 32 Q40 38 46 32" fill="none" stroke="#555" strokeWidth="1" />
        {/* Pink blush */}
        <ellipse cx="28" cy="30" rx="3" ry="2" fill="#ffb3b3" fillOpacity="0.15" />
        <ellipse cx="52" cy="30" rx="3" ry="2" fill="#ffb3b3" fillOpacity="0.15" />
        {/* Ears */}
        <ellipse cx="22" cy="24" rx="3" ry="4" fill={SKIN_B} />
        <ellipse cx="58" cy="24" rx="3" ry="4" fill={SKIN_B} />
      </g>

      {/* Blue hoodie zip body */}
      <path d="M14 44 L22 42 L40 48 L58 42 L66 44 L70 100 L10 100 Z" fill={color} fillOpacity="0.65" />
      {/* Zip line */}
      <line x1="40" y1="48" x2="40" y2="96" stroke="white" strokeWidth="1" strokeOpacity="0.35" />
      {/* Zip pull */}
      <rect x="38.5" y="56" width="3" height="5" rx="0.5" fill="#ccc" fillOpacity="0.3" />
      {/* Lanyard + badge */}
      <line x1="34" y1="42" x2="30" y2="62" stroke="#f59e0b" strokeWidth="1" strokeOpacity="0.5" />
      <line x1="30" y1="62" x2="30" y2="72" stroke="#f59e0b" strokeWidth="1" strokeOpacity="0.5" />
      <rect x="25" y="66" width="11" height="14" rx="1.5" fill="white" fillOpacity="0.3" />
      <rect x="27" y="69" width="7" height="2" rx="0.5" fill="var(--color-muted-foreground)" fillOpacity="0.15" />
      <rect x="28" y="74" width="5" height="4" rx="0.5" fill="#60a5fa" fillOpacity="0.15" />

      {/* Arms */}
      <g className={isWork ? 'bldg-left-arm' : ''}>
        <rect x="2" y="82" width="18" height="8" rx="4" fill={color} fillOpacity="0.5" />
        <circle cx="2" cy="86" r="4" fill={SKIN_B} />
      </g>
      <g className={isWork ? 'bldg-right-arm' : ''}>
        <rect x="60" y="82" width="18" height="8" rx="4" fill={color} fillOpacity="0.5" />
        <circle cx="78" cy="86" r="4" fill={SKIN_B} />
      </g>

      {/* Resting: looking left toward senior */}
      {isRest && (
        <g>
          <circle cx="30" cy="20" r="2.8" fill="#222" />
          <circle cx="42" cy="20" r="2.8" fill="#222" />
          <circle cx="31.2" cy="18.8" r="1" fill="white" />
          <circle cx="43.2" cy="18.8" r="1" fill="white" />
        </g>
      )}
    </svg>
  )
}

function CharacterReviewer({ status, color }: { status: AgentStatus; color: string }) {
  const isWork = status === 'working'
  const isRest = status === 'resting'
  return (
    <svg viewBox="0 0 80 120" className="w-full h-full">
      <g className={isWork ? 'bldg-person-working' : ''}>
        {/* Neat short hair */}
        <ellipse cx="40" cy="16" rx="16" ry="8" fill="#1a1a2e" />
        <path d="M24 24 Q24 12 40 8 Q56 12 56 24" fill="#1a1a2e" />
        {/* Head */}
        <circle cx="40" cy="24" r="18" fill={SKIN} />
        {/* Sharp attentive eyes */}
        <circle cx="34" cy="22" r="1.8" fill="#333" className={isWork ? 'bldg-eye-blink' : ''} />
        <circle cx="46" cy="22" r="1.8" fill="#333" className={isWork ? 'bldg-eye-blink' : ''} />
        {/* Eyebrows */}
        {isWork ? <>
          <path d="M28 17 Q34 14 39 17" fill="none" stroke="#333" strokeWidth="0.8" />
          <path d="M41 17 Q46 14 52 17" fill="none" stroke="#333" strokeWidth="0.8" />
        </> : <>
          <path d="M28 19 Q34 17 39 19" fill="none" stroke="#333" strokeWidth="0.8" />
          <path d="M41 19 Q46 17 52 19" fill="none" stroke="#333" strokeWidth="0.8" />
        </>}
        {/* Expression */}
        {isWork
          ? <path d="M34 32 Q40 30 46 32" fill="none" stroke="#555" strokeWidth="0.8" />
          : <path d="M34 32 Q40 36 46 32" fill="none" stroke="#555" strokeWidth="1" />
        }
        {/* Ears */}
        <ellipse cx="22" cy="24" rx="3" ry="4" fill={SKIN} />
        <ellipse cx="58" cy="24" rx="3" ry="4" fill={SKIN} />
      </g>

      {/* White shirt + green vest body */}
      <rect x="18" y="42" width="44" height="58" rx="5" fill="white" fillOpacity="0.75" />
      <rect x="22" y="42" width="36" height="58" rx="5" fill={color} fillOpacity="0.45" />
      {/* Vest opening showing shirt */}
      <rect x="32" y="42" width="16" height="22" rx="2" fill="white" fillOpacity="0.6" />
      {/* Vest buttons */}
      <circle cx="40" cy="56" r="1.5" fill="white" fillOpacity="0.5" />
      <circle cx="40" cy="66" r="1.5" fill="white" fillOpacity="0.5" />
      <circle cx="40" cy="76" r="1.5" fill="white" fillOpacity="0.5" />

      {/* Arms */}
      <g className={isWork ? 'bldg-left-arm' : ''}>
        <rect x="2" y="82" width="18" height="8" rx="4" fill="white" fillOpacity="0.65" />
        <circle cx="2" cy="86" r="4" fill={SKIN} />
      </g>
      <g className={isWork ? 'bldg-right-arm' : ''}>
        <rect x="60" y="82" width="18" height="8" rx="4" fill="white" fillOpacity="0.65" />
        <circle cx="78" cy="86" r="4" fill={SKIN} />
      </g>

      {/* Working: magnifying glass */}
      {isWork && (
        <g className="bldg-magnify-move">
          <circle cx="68" cy="62" r="7" fill="none" stroke={color} strokeWidth="1.5" />
          <line x1="63" y1="68" x2="58" y2="74" stroke="#888" strokeWidth="2" strokeLinecap="round" />
        </g>
      )}

      {/* Resting: reading a book */}
      {isRest && (
        <g>
          <rect x="8" y="74" width="14" height="20" rx="1.5" fill="#8b5cf6" fillOpacity="0.22" />
          <rect x="14" y="74" width="8" height="20" rx="1.5" fill="#7c3aed" fillOpacity="0.18" />
        </g>
      )}
    </svg>
  )
}

function CharacterBackend({ status, color }: { status: AgentStatus; color: string }) {
  const isWork = status === 'working'
  const isRest = status === 'resting'
  return (
    <svg viewBox="0 0 80 120" className="w-full h-full">
      <g className={isWork ? 'bldg-person-working' : ''}>
        {/* Short cropped hair */}
        <ellipse cx="40" cy="14" rx="16" ry="6" fill="#1a1a1a" />
        {/* Head */}
        <circle cx="40" cy="22" r="18" fill={SKIN} />
        {/* Green-reflective glasses */}
        <rect x="26" y="16" width="12" height="9" rx="2.5" fill="none" stroke="#333" strokeWidth="1.5" />
        <rect x="42" y="16" width="12" height="9" rx="2.5" fill="none" stroke="#333" strokeWidth="1.5" />
        <line x1="38" y1="20" x2="42" y2="20" stroke="#333" strokeWidth="1" />
        <line x1="26" y1="20" x2="22" y2="18" stroke="#333" strokeWidth="0.7" />
        <line x1="54" y1="20" x2="58" y2="18" stroke="#333" strokeWidth="0.7" />
        {/* Green-tinted lens */}
        <rect x="27.5" y="17.5" width="9" height="6" rx="1.5" fill="#22c55e" fillOpacity="0.08" />
        <rect x="43.5" y="17.5" width="9" height="6" rx="1.5" fill="#22c55e" fillOpacity="0.08" />
        {/* Eyes behind glasses */}
        <circle cx="32" cy="21" r="1.6" fill="#22c55e" fillOpacity="0.85" className={isWork ? 'bldg-eye-blink' : ''} />
        <circle cx="48" cy="21" r="1.6" fill="#22c55e" fillOpacity="0.85" className={isWork ? 'bldg-eye-blink' : ''} />
        {/* Mouth */}
        {isWork
          ? <path d="M34 32 L46 32" stroke="#444" strokeWidth="1" strokeLinecap="round" />
          : <path d="M34 32 Q40 35 46 32" fill="none" stroke="#444" strokeWidth="1" />
        }
        {/* Ears */}
        <ellipse cx="22" cy="22" rx="3" ry="4" fill={SKIN} />
        <ellipse cx="58" cy="22" rx="3" ry="4" fill={SKIN} />
      </g>

      {/* Pink T-shirt body with >_ */}
      <rect x="18" y="40" width="44" height="60" rx="5" fill={color} fillOpacity="0.65" />
      {/* >_ on shirt */}
      <text x="28" y="68" fontSize="13" fill="white" fillOpacity="0.4" fontFamily="monospace">&gt;_</text>

      {/* Arms */}
      <g className={isWork ? 'bldg-left-arm' : ''}>
        <rect x="2" y="82" width="18" height="8" rx="4" fill={color} fillOpacity="0.55" />
        <circle cx="2" cy="86" r="4" fill={SKIN} />
      </g>
      <g className={isWork ? 'bldg-right-arm' : ''}>
        <rect x="60" y="82" width="18" height="8" rx="4" fill={color} fillOpacity="0.55" />
        <circle cx="78" cy="86" r="4" fill={SKIN} />
      </g>

      {/* Resting: looking at server rack */}
      {isRest && (
        <g>
          <circle cx="30" cy="21" r="1.4" fill="#333" />
          <circle cx="46" cy="21" r="1.4" fill="#333" />
        </g>
      )}
    </svg>
  )
}

function CharacterPlanner({ status, color }: { status: AgentStatus; color: string }) {
  const isWork = status === 'working'
  const isRest = status === 'resting'
  return (
    <svg viewBox="0 0 80 120" className="w-full h-full">
      <g className={isWork ? 'bldg-person-working' : ''}>
        {/* Neat side-parted hair */}
        <path d="M24 24 Q24 8 40 6 Q56 8 56 24" fill="#3d2b1f" />
        <path d="M28 14 Q40 8 52 14" fill="#3d2b1f" />
        {/* Head */}
        <circle cx="40" cy="24" r="18" fill={SKIN} />
        {/* Eyes - looking up when working (thinking) */}
        {isWork ? (
          <>
            <circle cx="34" cy="20" r="1.8" fill="#333" />
            <circle cx="46" cy="20" r="1.8" fill="#333" />
          </>
        ) : (
          <>
            <circle cx="34" cy="22" r="1.8" fill="#333" />
            <circle cx="46" cy="22" r="1.8" fill="#333" />
          </>
        )}
        {/* Expression */}
        {isWork
          ? <path d="M34 34 L46 34" stroke="#555" strokeWidth="0.8" strokeLinecap="round" />
          : <path d="M34 34 Q40 38 46 34" fill="none" stroke="#555" strokeWidth="1" />
        }
        {/* Ears */}
        <ellipse cx="22" cy="24" rx="3" ry="4" fill={SKIN} />
        <ellipse cx="58" cy="24" rx="3" ry="4" fill={SKIN} />
      </g>

      {/* Blue cardigan body */}
      <rect x="18" y="42" width="44" height="58" rx="5" fill={color} fillOpacity="0.65" />
      {/* Inner white shirt */}
      <rect x="26" y="42" width="28" height="22" rx="3" fill="white" fillOpacity="0.65" />
      {/* Pens in breast pocket */}
      <rect x="52" y="48" width="6" height="10" rx="1" fill={color} fillOpacity="0.3" />
      <line x1="54" y1="48" x2="54" y2="42" stroke="#e74c3c" strokeWidth="1" strokeLinecap="round" strokeOpacity="0.45" />
      <line x1="56" y1="48" x2="56.4" y2="43" stroke="#3498db" strokeWidth="1" strokeLinecap="round" strokeOpacity="0.45" />

      {/* Arms */}
      {isWork ? (
        <>
          {/* Chin-rest thinking pose */}
          <rect x="4" y="82" width="18" height="8" rx="4" fill={color} fillOpacity="0.55" />
          <circle cx="4" cy="86" r="4" fill={SKIN} />
          <g>
            <rect x="56" y="58" width="18" height="8" rx="4" fill={color} fillOpacity="0.55" />
            <circle cx="74" cy="62" r="4" fill={SKIN} />
            {/* hand under chin */}
            <circle cx="58" cy="34" r="5" fill={SKIN} />
          </g>
        </>
      ) : (
        <>
          <rect x="4" y="82" width="18" height="8" rx="4" fill={color} fillOpacity="0.55" />
          <circle cx="4" cy="86" r="4" fill={SKIN} />
          <rect x="60" y="82" width="18" height="8" rx="4" fill={color} fillOpacity="0.55" />
          <circle cx="78" cy="86" r="4" fill={SKIN} />
        </>
      )}

      {/* Resting: twirling pencil */}
      {isRest && (
        <g className="bldg-clipboard-shake">
          <line x1="66" y1="76" x2="76" y2="64" stroke="#f39c12" strokeWidth="1.5" strokeLinecap="round" strokeOpacity="0.4" />
        </g>
      )}
    </svg>
  )
}

/* ══════════ Character Router ══════════ */
function CharacterSVG({ role, status, color }: { role: Role; status: AgentStatus; color: string }) {
  switch (role) {
    case 'ceo': return <CharacterCEO status={status} />
    case 'pm': return <CharacterPM status={status} color={color} />
    case 'developer': return <CharacterDeveloper status={status} color={color} />
    case 'junior': return <CharacterJunior status={status} color={color} />
    case 'reviewer': return <CharacterReviewer status={status} color={color} />
    case 'backend': return <CharacterBackend status={status} color={color} />
    case 'planner': return <CharacterPlanner status={status} color={color} />
  }
}

/* ══════════ Agent Overlay: Character + Bubble + Name ══════════ */
function AgentOverlay({ agentName, role, status, currentIssue, color }: {
  agentName: string; role: Role; status: AgentStatus; currentIssue: Issue | null; color: string
}) {
  const pos = SEAT_POSITIONS[role]
  if (!pos) return null

  const bubbleText = agentName === '신민수'
    ? '전체 프로젝트 총괄 중'
    : currentIssue ? currentIssue.title : '할당된 이슈 없음'

  return (
    <div
      className="absolute flex flex-col items-center"
      style={{
        top: pos.top,
        left: pos.left,
        width: '80px',
        transform: 'translate(-50%, -100%)',
      }}
    >
      {/* Speech bubble */}
      <div className="relative mb-1 w-[160px]" style={{ marginLeft: '-40px' }}>
        <div className="bldg-bubble-appear bg-popover/95 backdrop-blur-sm border border-border rounded-lg px-2.5 py-1.5 shadow-md">
          <div className="flex items-center gap-1 mb-0.5">
            <span className={`text-[9px] font-semibold ${status === 'working' ? 'text-amber-500' : status === 'waiting' ? 'text-blue-500' : 'text-muted-foreground'}`}>
              {status === 'working' ? '작업 중' : status === 'waiting' ? '대기 중' : '휴식 중'}
            </span>
            {status === 'working' && <span className="bldg-typing-dots text-[9px] text-amber-500">...</span>}
          </div>
          <div className="text-[10px] text-foreground/80 leading-snug line-clamp-2">{bubbleText}</div>
        </div>
        <div className="absolute -bottom-[4px] left-1/2 -translate-x-1/2 w-2 h-2 bg-popover/95 border-r border-b border-border rotate-45" />
      </div>

      {/* Character SVG */}
      <div className="w-[80px] h-[120px]">
        <CharacterSVG role={role} status={status} color={color} />
      </div>

      {/* Name tag */}
      <div className="flex items-center gap-1 px-2 py-0.5 rounded-md mt-0.5" style={{ backgroundColor: `${color}12`, border: `1px solid ${color}25` }}>
        <div className={`w-1.5 h-1.5 rounded-full ${status === 'working' ? 'bldg-status-pulse' : ''}`} style={{ backgroundColor: color }} />
        <span className="text-[10px] font-medium whitespace-nowrap" style={{ color }}>{agentName}</span>
      </div>
    </div>
  )
}

/* ══════════ Floor Labels (overlaid on the image) ══════════ */
function FloorLabels() {
  const labels = [
    { floor: 3, label: '임원실', top: '5%', isCeo: true },
    { floor: 2, label: '프론트엔드', top: '30%', isCeo: false },
    { floor: 1, label: '백엔드 / 기획', top: '55%', isCeo: false },
  ]
  return (
    <>
      {labels.map(({ floor, label, top, isCeo }) => (
        <div
          key={floor}
          className="absolute left-3 z-20"
          style={{ top }}
        >
          <div className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 border border-border/50 ${isCeo ? 'bg-amber-500/10' : 'bg-muted/60'} backdrop-blur-sm`}>
            <span className={`text-[10px] font-bold ${isCeo ? 'text-amber-600 dark:text-amber-400' : 'text-foreground/70'}`}>{floor}F</span>
            <span className={`text-[9px] ${isCeo ? 'text-amber-600/70 dark:text-amber-400/70' : 'text-muted-foreground'}`}>{label}</span>
          </div>
        </div>
      ))}
    </>
  )
}

/* ══════════ Lobby (below building image) ══════════ */
function Lobby({ issues }: { issues: Issue[] }) {
  const active = issues.filter((i) => !['closed', 'archived'].includes(i.status))
  const open = active.filter((i) => i.status === 'open').length
  const inProg = active.filter((i) => i.status === 'in-progress').length
  const resolved = active.filter((i) => i.status === 'resolved').length

  return (
    <div className="relative bg-card/50 backdrop-blur-sm border border-border rounded-b-2xl overflow-hidden">
      <div className="relative z-10 px-6 py-2.5 border-b border-border/50">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-bold text-muted-foreground tracking-[0.2em] uppercase">Lobby</span>
          <div className="flex-1 h-[1px] bg-border/50" />
        </div>
      </div>
      <div className="relative z-10 flex items-center justify-center gap-6 py-5 px-6">
        <StatItem value={active.length} label="전체" cls="text-foreground" />
        <div className="w-[1px] h-8 bg-border/50" />
        <StatItem value={open} label="대기" cls="text-blue-500" />
        <div className="w-[1px] h-8 bg-border/50" />
        <StatItem value={inProg} label="진행" cls="text-amber-500" />
        <div className="w-[1px] h-8 bg-border/50" />
        <StatItem value={resolved} label="완료" cls="text-green-500" />
      </div>
    </div>
  )
}

function StatItem({ value, label, cls }: { value: number; label: string; cls: string }) {
  return (
    <div className="text-center min-w-[48px]">
      <div className={`text-xl font-bold ${cls}`}>{value}</div>
      <div className="text-[10px] text-muted-foreground mt-0.5">{label}</div>
    </div>
  )
}

/* ══════════ Legend ══════════ */
function Legend() {
  return (
    <div className="flex items-center justify-center gap-6 py-3">
      {[
        { label: '작업 중', color: 'bg-amber-500' },
        { label: '대기 중', color: 'bg-blue-500' },
        { label: '휴식 중', color: 'bg-muted-foreground/50' },
      ].map((item) => (
        <div key={item.label} className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <span className={`w-2.5 h-2.5 rounded-full ${item.color}`} />
          <span>{item.label}</span>
        </div>
      ))}
    </div>
  )
}

/* ══════════ Main ══════════ */
export function BuildingView({ agents, issues }: BuildingViewProps) {
  const agentMap = new Map(agents.map((a) => [a.name, a]))
  void agentMap
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  if (!mounted) return null

  return (
    <div className="max-w-5xl mx-auto px-4">
      <Legend />
      <div className={`relative transition-all duration-700 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
        {/* Building: background image + character overlays */}
        <div className="relative max-w-5xl mx-auto">
          {/* Background image */}
          <img
            src="/images/office-bg.png"
            alt="Office"
            className="w-full h-auto rounded-2xl dark:brightness-75 dark:contrast-110"
          />

          {/* Floor labels overlay */}
          <FloorLabels />

          {/* Character overlays */}
          {FLOOR_CONFIG.flatMap(f => f.agents as { agentName: string; role: Role }[]).map(({ agentName, role }) => {
            const { status, currentIssue } = getAgentStatus(agentName, issues)
            const color = getRoleColor(role)
            return (
              <AgentOverlay
                key={agentName}
                agentName={agentName}
                role={role}
                status={status}
                currentIssue={currentIssue}
                color={color}
              />
            )
          })}
        </div>

        {/* Lobby stats below the building */}
        <Lobby issues={issues} />
      </div>
    </div>
  )
}
