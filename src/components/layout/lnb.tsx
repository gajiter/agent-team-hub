'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  FileText,
  BookOpen,
  Target,
  GitBranch,
  Bug,
  Bot,
  Settings,
  Building2,
  type LucideIcon,
} from 'lucide-react'
import { Separator } from '@/components/ui/separator'
import { ProjectSelector } from '@/components/layout/project-selector'
import { ThemeToggle } from '@/components/theme-toggle'
import { useI18n } from '@/lib/i18n'

interface NavItemDef {
  href: string
  icon: LucideIcon
  labelKey: string
}

const OVERVIEW: NavItemDef[] = [
  { href: '/', icon: LayoutDashboard, labelKey: 'nav.dashboard' },
  { href: '/office', icon: Building2, labelKey: 'nav.office' },
]

const PLANNING: NavItemDef[] = [
  { href: '/planning/prd', icon: FileText, labelKey: 'nav.prd' },
  { href: '/planning/features', icon: BookOpen, labelKey: 'nav.features' },
  { href: '/planning/userflow', icon: GitBranch, labelKey: 'nav.userflow' },
]

const DOCS: NavItemDef[] = [
  { href: '/docs', icon: Target, labelKey: 'nav.documents' },
]

const ISSUES: NavItemDef[] = [
  { href: '/issues', icon: Bug, labelKey: 'nav.issueBoard' },
]

const MANAGE: NavItemDef[] = [
  { href: '/agents', icon: Bot, labelKey: 'nav.agents' },
  { href: '/settings', icon: Settings, labelKey: 'nav.settings' },
]

function NavItem({ href, icon: Icon, labelKey }: NavItemDef) {
  const pathname = usePathname()
  const { t } = useI18n()
  const isActive = href === '/' ? pathname === '/' : pathname.startsWith(href)
  return (
    <Link
      href={href}
      className={[
        'flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors',
        isActive
          ? 'bg-accent text-accent-foreground font-medium'
          : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
      ].join(' ')}
    >
      <Icon className="w-4 h-4" />
      <span>{t(labelKey)}</span>
    </Link>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  const { locale } = useI18n()
  return (
    <div className={`px-3 pb-2 text-xs text-muted-foreground font-medium ${locale === 'en' ? 'uppercase tracking-widest' : 'tracking-wide'}`}>
      {children}
    </div>
  )
}

export function LNB() {
  const { t } = useI18n()

  return (
    <aside className="w-[220px] min-w-[220px] bg-sidebar border-r border-sidebar-border flex flex-col">
      {/* Logo */}
      <div className="px-5 flex items-center border-b border-sidebar-border min-h-[56px]">
        <div className="text-base font-bold text-foreground leading-tight">agent-team-hub</div>
      </div>

      {/* Project Selector */}
      <ProjectSelector />

      {/* Overview */}
      <div className="px-3 pt-2 pb-2">
        <SectionLabel>{t('nav.overview')}</SectionLabel>
        {OVERVIEW.map((item) => (
          <NavItem key={item.href} {...item} />
        ))}
      </div>

      <div className="px-3">
        <Separator />
      </div>

      {/* Planning */}
      <div className="px-3 pt-2 pb-2">
        <SectionLabel>{t('nav.planning')}</SectionLabel>
        {PLANNING.map((item) => (
          <NavItem key={item.href} {...item} />
        ))}
      </div>

      <div className="px-3">
        <Separator />
      </div>

      {/* Docs */}
      <div className="px-3 pt-2 pb-2">
        <SectionLabel>{t('nav.docs')}</SectionLabel>
        {DOCS.map((item) => (
          <NavItem key={item.href} {...item} />
        ))}
      </div>

      <div className="px-3">
        <Separator />
      </div>

      {/* Issues */}
      <div className="px-3 pt-2 pb-2">
        <SectionLabel>{t('nav.issues')}</SectionLabel>
        {ISSUES.map((item) => (
          <NavItem key={item.href} {...item} />
        ))}
      </div>

      <div className="px-3">
        <Separator />
      </div>

      {/* Manage */}
      <div className="px-3 pt-2 pb-2">
        <SectionLabel>{t('nav.manage')}</SectionLabel>
        {MANAGE.map((item) => (
          <NavItem key={item.href} {...item} />
        ))}
      </div>

      {/* Bottom: Theme Toggle + Project Status */}
      <div className="mt-auto p-4 space-y-2">
        <div className="flex items-center justify-between px-3 py-1">
          <span className="text-xs text-muted-foreground">{t('nav.theme')}</span>
          <ThemeToggle />
        </div>
        <div className="flex items-center gap-2 px-3 py-2.5 bg-card border border-border rounded-lg text-sm text-muted-foreground">
          <span className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0" />
          {t('nav.projectActive')}
        </div>
      </div>
    </aside>
  )
}
