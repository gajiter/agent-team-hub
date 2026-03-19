'use client'

import Link from 'next/link'
import { FolderOpen, ChevronDown, Plus } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useProject } from '@/hooks/use-project'

export function ProjectSelector() {
  const { currentProject, projects, setCurrentProject, loading } = useProject()

  if (loading) {
    return (
      <div className="px-3 py-2">
        <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-accent/50 text-sm text-muted-foreground">
          <FolderOpen className="w-4 h-4" />
          <span>Loading...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="px-3 py-2">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="flex items-center gap-2 w-full px-3 py-2 rounded-md bg-accent/50 hover:bg-accent text-sm text-foreground transition-colors text-left">
            <FolderOpen className="w-4 h-4 flex-shrink-0 text-muted-foreground" />
            <span className="flex-1 truncate">
              {currentProject?.name ?? 'Select Project'}
            </span>
            <ChevronDown className="w-3.5 h-3.5 flex-shrink-0 text-muted-foreground" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-[194px]">
          {projects.map((project) => (
            <DropdownMenuItem
              key={project.id}
              onClick={() => setCurrentProject(project)}
              className={
                currentProject?.id === project.id
                  ? 'bg-accent font-medium'
                  : ''
              }
            >
              <FolderOpen className="w-4 h-4 mr-2 flex-shrink-0" />
              <span className="truncate">{project.name}</span>
            </DropdownMenuItem>
          ))}
          {projects.length > 0 && <DropdownMenuSeparator />}
          <DropdownMenuItem asChild>
            <Link href="/settings" className="flex items-center">
              <Plus className="w-4 h-4 mr-2" />
              Add Project
            </Link>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
