'use client'

import { useState, useEffect, useMemo } from 'react'
import { Topbar } from '@/components/layout/topbar'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { useProject } from '@/hooks/use-project'
import { useI18n } from '@/lib/i18n'
import { fileService } from '@/lib/services/file-service'
import type { RolesData, Role, Permission } from '@/types/roles'
import type { FeaturesData, Requirement } from '@/types/features'

const FALLBACK: RolesData = {
  version: '1.0',
  project: '',
  roles: [],
  permissions: [],
}

const SCOPE_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  global: { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-400', dot: 'bg-red-500' },
  workspace: { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-700 dark:text-blue-400', dot: 'bg-blue-500' },
  site: { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-700 dark:text-green-400', dot: 'bg-green-500' },
}

function PermissionCell({ allowed, note }: { allowed: boolean; note?: string }) {
  const cell = allowed ? (
    <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-green-500/20 text-green-600 dark:text-green-400 text-xs font-bold">✓</span>
  ) : (
    <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-muted text-muted-foreground text-xs">-</span>
  )

  if (note && allowed) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-400 text-xs font-bold cursor-help">✓</span>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-[280px] text-xs">{note}</TooltipContent>
      </Tooltip>
    )
  }

  return cell
}

function GroupedPermissionMatrix({
  roles,
  permissions,
  featureReqMap,
  requirements,
}: {
  roles: Role[]
  permissions: Permission[]
  featureReqMap: Map<string, string>
  requirements: Requirement[]
}) {
  const { t } = useI18n()

  const grouped = useMemo(() => {
    const reqMap = new Map<string, Requirement>()
    requirements.forEach(r => reqMap.set(r.id, r))

    const groups = new Map<string, { req: Requirement; perms: Permission[] }>()
    const ungrouped: Permission[] = []

    permissions.forEach(perm => {
      const reqId = featureReqMap.get(perm.featureId)
      if (reqId && reqMap.has(reqId)) {
        if (!groups.has(reqId)) groups.set(reqId, { req: reqMap.get(reqId)!, perms: [] })
        groups.get(reqId)!.perms.push(perm)
      } else {
        ungrouped.push(perm)
      }
    })

    const sorted = Array.from(groups.values()).sort((a, b) => a.req.order - b.req.order)
    if (ungrouped.length > 0) {
      sorted.push({ req: { id: 'OTHER', name: t('planning.prd.other'), description: '', group: 'tenant', order: 999, priority: 'low', status: 'todo', acceptanceCriteria: [] }, perms: ungrouped })
    }
    return sorted
  }, [permissions, featureReqMap, requirements, t])

  if (permissions.length === 0) {
    return <div className="text-sm text-muted-foreground py-10 text-center">{t('planning.roles.noData')}</div>
  }

  return (
    <TooltipProvider delayDuration={200}>
      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead className="sticky top-0 z-10 bg-card">
            <tr className="border-b-2 border-border">
              <th className="text-left py-3 px-4 font-medium text-muted-foreground w-[100px]">{t('planning.roles.featureId')}</th>
              <th className="text-left py-3 px-4 font-medium text-muted-foreground">{t('planning.roles.action')}</th>
              {roles.map(role => (
                <th key={role.id} className="text-center py-3 px-3 font-medium text-muted-foreground whitespace-nowrap">
                  <div className="flex flex-col items-center gap-0.5">
                    <span className="text-xs">{role.name}</span>
                    {role.scope && (
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${SCOPE_COLORS[role.scope]?.bg ?? 'bg-muted'} ${SCOPE_COLORS[role.scope]?.text ?? 'text-muted-foreground'}`}>
                        {role.scope}
                      </span>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {grouped.map(({ req, perms }) => (
              <GroupSection key={req.id} req={req} perms={perms} roles={roles} />
            ))}
          </tbody>
        </table>
      </div>
    </TooltipProvider>
  )
}

function GroupSection({ req, perms, roles }: { req: Requirement; perms: Permission[]; roles: Role[] }) {
  const { t } = useI18n()
  return (
    <>
      <tr className="bg-muted/50 border-t-2 border-border">
        <td colSpan={2 + roles.length} className="py-2.5 px-4">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs text-muted-foreground">{req.id}</span>
            <span className="font-semibold text-foreground text-sm">{req.name}</span>
            <span className="text-xs text-muted-foreground ml-auto">{perms.length}{t('planning.roles.permissions')}</span>
          </div>
        </td>
      </tr>
      {perms.map((perm, i) => (
        <tr key={`${req.id}-${i}`} className="border-b border-border/30 hover:bg-muted/20 transition-colors">
          <td className="py-2 px-4 font-mono text-xs text-muted-foreground">{perm.featureId}</td>
          <td className="py-2 px-4 text-foreground"><span className="text-sm">{perm.action}</span></td>
          {roles.map(role => (
            <td key={role.id} className="py-2 px-3 text-center">
              <PermissionCell allowed={perm.roles[role.id] ?? false} note={perm.note} />
            </td>
          ))}
        </tr>
      ))}
    </>
  )
}

export default function RolesPage() {
  const { currentProject } = useProject()
  const projectId = currentProject?.id ?? null
  const { t } = useI18n()

  const [data, setData] = useState<RolesData>(FALLBACK)
  const [featuresData, setFeaturesData] = useState<FeaturesData | null>(null)
  const [dataExists, setDataExists] = useState(true)

  useEffect(() => {
    if (!projectId) return

    fileService.readFile(projectId, 'data/roles.json')
      .then(({ content, exists }) => {
        setDataExists(exists)
        if (exists) {
          try {
            const parsed = JSON.parse(content)
            setData({
              ...FALLBACK,
              ...parsed,
              roles: parsed.roles ?? [],
              permissions: parsed.permissions ?? [],
            })
          } catch { /* fallback */ }
        }
      })
      .catch(() => {})

    fileService.readFile(projectId, 'data/features.json')
      .then(({ content, exists }) => {
        if (exists) {
          try { setFeaturesData(JSON.parse(content)) } catch { /* ignore */ }
        }
      })
      .catch(() => {})
  }, [projectId])

  const featureReqMap = useMemo(() => {
    const map = new Map<string, string>()
    if (featuresData?.features) {
      featuresData.features.forEach(f => map.set(f.id, f.requirementId))
    }
    return map
  }, [featuresData])

  const requirements = featuresData?.requirements ?? []
  const sortedRoles = [...data.roles].sort((a, b) => a.level - b.level)

  if (!projectId) {
    return (
      <>
        <Topbar title={t('planning.roles.title')} />
        <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">{t('common.selectProjectShort')}</div>
      </>
    )
  }

  if (!dataExists) {
    return (
      <>
        <Topbar title={t('planning.roles.title')} />
        <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground gap-2">
          <span className="text-3xl">🔐</span>
          <p className="text-sm">{t('planning.roles.noData')}</p>
          <p className="text-xs">{t('planning.roles.addFile')}</p>
        </div>
      </>
    )
  }

  return (
    <>
      <Topbar
        title={t('planning.roles.title')}
        right={
          <div className="flex items-center gap-2">
            <span className="text-sm bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 px-2.5 py-1 rounded-full font-medium">
              {data.roles.length}{t('planning.roles.rolesCount')}
            </span>
            <span className="text-sm bg-muted text-muted-foreground px-2.5 py-1 rounded-full font-medium">
              {data.permissions.length}{t('planning.roles.permissions')}
            </span>
          </div>
        }
      />
      <ScrollArea className="flex-1">
        <div className="p-6">
          {data.scopeHierarchy && data.scopeHierarchy.length > 0 && (
            <div className="mb-4">
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <span className="font-medium">{t('planning.roles.permissionScope')}:</span>
                {data.scopeHierarchy.map((s, i) => (
                  <span key={s.scope} className="flex items-center gap-1.5">
                    <span className={`w-2 h-2 rounded-full ${SCOPE_COLORS[s.scope]?.dot ?? 'bg-muted'}`} />
                    <span className={SCOPE_COLORS[s.scope]?.text ?? ''}>{s.name} ({s.scope})</span>
                    {i < data.scopeHierarchy!.length - 1 && <span className="text-muted-foreground/50 ml-2">→</span>}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-4 gap-3 mb-6">
            {sortedRoles.map(role => {
              const scopeColor = SCOPE_COLORS[role.scope ?? '']
              return (
                <div key={role.id} className="border border-border rounded-lg p-4 bg-card">
                  <div className="flex items-center gap-2 mb-2">
                    {scopeColor && <span className={`w-2.5 h-2.5 rounded-full ${scopeColor.dot}`} />}
                    <span className="text-sm font-semibold text-foreground">{role.name}</span>
                    <Badge variant="outline" className="text-[10px] px-1.5">Lv.{role.level}</Badge>
                    {role.scope && (
                      <Badge className={`text-[10px] px-1.5 py-0 ${scopeColor?.bg ?? ''} ${scopeColor?.text ?? ''} border-0`}>{role.scope}</Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">{role.description}</p>
                </div>
              )
            })}
          </div>

          <div className="border border-border rounded-lg bg-card overflow-hidden">
            <div className="px-4 py-3 border-b border-border flex items-center justify-between">
              <h3 className="text-sm font-medium text-foreground">{t('planning.roles.permissionMatrix')}</h3>
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-green-500/20 text-green-600 dark:text-green-400 text-[10px] font-bold">✓</span>{t('planning.roles.allowed')}
                </span>
                <span className="flex items-center gap-1">
                  <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-400 text-[10px] font-bold">✓</span>{t('planning.roles.conditional')}
                </span>
                <span className="flex items-center gap-1">
                  <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-muted text-muted-foreground text-[10px]">-</span>{t('planning.roles.denied')}
                </span>
              </div>
            </div>
            <GroupedPermissionMatrix roles={sortedRoles} permissions={data.permissions} featureReqMap={featureReqMap} requirements={requirements} />
          </div>

          {data.scopeNotes && (
            <div className="mt-4 border border-border rounded-lg bg-card p-4">
              <h4 className="text-xs font-medium text-muted-foreground mb-2">{t('planning.roles.permissionPrinciples')}</h4>
              <div className="space-y-1.5">
                {Object.entries(data.scopeNotes).map(([key, value]) => (
                  <p key={key} className="text-xs text-muted-foreground leading-relaxed">
                    <span className="font-mono text-foreground/70">{key}</span>: {value}
                  </p>
                ))}
              </div>
            </div>
          )}
        </div>
      </ScrollArea>
    </>
  )
}
