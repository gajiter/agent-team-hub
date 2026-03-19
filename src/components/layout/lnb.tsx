'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  FileText,
  BookOpen,
  Target,
  Users,
  GitBranch,
  Bug,
  Bot,
  Settings,
  type LucideIcon,
} from 'lucide-react'
import { Separator } from '@/components/ui/separator'
import { ProjectSelector } from '@/components/layout/project-selector'
import { ThemeToggle } from '@/components/theme-toggle'

interface NavItemDef {
  href: string
  icon: LucideIcon
  label: string
}

const OVERVIEW: NavItemDef[] = [
  { href: '/', icon: LayoutDashboard, label: 'Dashboard' },
]

const PLANNING: NavItemDef[] = [
  { href: '/planning/prd', icon: FileText, label: 'PRD' },
  { href: '/planning/features', icon: BookOpen, label: 'Features' },
  { href: '/planning/roles', icon: Users, label: 'Roles' },
  { href: '/planning/userflow', icon: GitBranch, label: 'User Flow' },
]

const DOCS: NavItemDef[] = [
  { href: '/docs', icon: Target, label: 'Documents' },
]

const ISSUES: NavItemDef[] = [
  { href: '/issues', icon: Bug, label: 'Issue Board' },
]

const MANAGE: NavItemDef[] = [
  { href: '/agents', icon: Bot, label: 'Agents' },
  { href: '/settings', icon: Settings, label: 'Settings' },
]

function NavItem({ href, icon: Icon, label }: NavItemDef) {
  const pathname = usePathname()
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
      <span>{label}</span>
    </Link>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="px-3 pb-2 text-xs text-muted-foreground uppercase tracking-widest font-medium">
      {children}
    </div>
  )
}

export function LNB() {
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
        <SectionLabel>Overview</SectionLabel>
        {OVERVIEW.map((item) => (
          <NavItem key={item.href} {...item} />
        ))}
      </div>

      <div className="px-3">
        <Separator />
      </div>

      {/* Planning */}
      <div className="px-3 pt-2 pb-2">
        <SectionLabel>기획 Planning</SectionLabel>
        {PLANNING.map((item) => (
          <NavItem key={item.href} {...item} />
        ))}
      </div>

      <div className="px-3">
        <Separator />
      </div>

      {/* Docs */}
      <div className="px-3 pt-2 pb-2">
        <SectionLabel>문서 Docs</SectionLabel>
        {DOCS.map((item) => (
          <NavItem key={item.href} {...item} />
        ))}
      </div>

      <div className="px-3">
        <Separator />
      </div>

      {/* Issues */}
      <div className="px-3 pt-2 pb-2">
        <SectionLabel>이슈 Issues</SectionLabel>
        {ISSUES.map((item) => (
          <NavItem key={item.href} {...item} />
        ))}
      </div>

      <div className="px-3">
        <Separator />
      </div>

      {/* Manage */}
      <div className="px-3 pt-2 pb-2">
        <SectionLabel>관리 Manage</SectionLabel>
        {MANAGE.map((item) => (
          <NavItem key={item.href} {...item} />
        ))}
      </div>

      {/* Bottom: Theme Toggle + Project Status */}
      <div className="mt-auto p-4 space-y-2">
        <div className="flex items-center justify-between px-3 py-1">
          <span className="text-xs text-muted-foreground">Theme</span>
          <ThemeToggle />
        </div>
        <div className="flex items-center gap-2 px-3 py-2.5 bg-card border border-border rounded-lg text-sm text-muted-foreground">
          <span className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0" />
          Project Active
        </div>
      </div>
    </aside>
  )
}
