"use client"

import { Check, FolderIcon, X } from "@phosphor-icons/react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useCallback, useMemo, useRef, useState } from "react"

import { useBreakpoint } from "@/app/hooks/use-breakpoint"
import useClickOutside from "@/app/hooks/use-click-outside"
import { fetchClient } from "@/lib/fetch"
import { cn } from "@/lib/utils"

import { SidebarProjectMenu } from "./sidebar-project-menu"

type Project = {
  id: string
  name: string
  user_id: string
  created_at: string
}

type SidebarProjectItemProps = {
  project: Project
}

export function SidebarProjectItem({ project }: SidebarProjectItemProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editName, setEditName] = useState(project.name || "")
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const lastProjectNameRef = useRef(project.name)
  const isMobile = useBreakpoint(768)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const pathname = usePathname()
  const queryClient = useQueryClient()

  if (!isEditing && lastProjectNameRef.current !== project.name) {
    lastProjectNameRef.current = project.name
    setEditName(project.name || "")
  }

  const updateProjectMutation = useMutation({
    mutationFn: async ({
      projectId,
      name,
    }: {
      projectId: string
      name: string
    }) => {
      const response = await fetchClient(`/api/projects/${projectId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to update project")
      }

      return response.json()
    },
    onMutate: async ({ projectId, name }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ["projects"] })
      await queryClient.cancelQueries({ queryKey: ["project", projectId] })

      // Snapshot the previous values
      const previousProjects = queryClient.getQueryData(["projects"])
      const previousProject = queryClient.getQueryData(["project", projectId])

      // Optimistically update projects list
      queryClient.setQueryData(["projects"], (old: Project[] | undefined) => {
        if (!old) return old
        return old.map((p: Project) =>
          p.id === projectId ? { ...p, name } : p
        )
      })

      // Optimistically update individual project
      queryClient.setQueryData(
        ["project", projectId],
        (old: Project | undefined) => {
          if (!old) return old
          return { ...old, name }
        }
      )

      // Return a context object with the snapshotted values
      return { previousProjects, previousProject, projectId }
    },
    onError: (_err, _variables, context) => {
      // If the mutation fails, use the context returned from onMutate to roll back
      if (context?.previousProjects) {
        queryClient.setQueryData(["projects"], context.previousProjects)
      }
      if (context?.previousProject) {
        queryClient.setQueryData(
          ["project", context.projectId],
          context.previousProject
        )
      }
    },
    onSettled: () => {
      // Always refetch after error or success to ensure we have the latest data
      queryClient.invalidateQueries({ queryKey: ["projects"] })
      queryClient.invalidateQueries({ queryKey: ["project", project.id] })
    },
  })

  const handleStartEditing = useCallback(() => {
    setIsEditing(true)
    setEditName(project.name || "")

    requestAnimationFrame(() => {
      if (inputRef.current) {
        inputRef.current.focus()
        inputRef.current.select()
      }
    })
  }, [project.name])

  const handleSave = useCallback(async () => {
    if (editName.trim() !== project.name) {
      updateProjectMutation.mutate({
        projectId: project.id,
        name: editName.trim(),
      })
    }
    setIsEditing(false)
    setIsMenuOpen(false)
  }, [project.id, project.name, editName, updateProjectMutation])

  const handleCancel = useCallback(() => {
    setEditName(project.name || "")
    setIsEditing(false)
    setIsMenuOpen(false)
  }, [project.name])

  const handleMenuOpenChange = useCallback((open: boolean) => {
    setIsMenuOpen(open)
  }, [])

  const handleClickOutside = useCallback(() => {
    if (isEditing) {
      handleSave()
    }
  }, [isEditing, handleSave])

  useClickOutside(containerRef, handleClickOutside)

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setEditName(e.target.value)
    },
    []
  )

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        e.preventDefault()
        handleSave()
      } else if (e.key === "Escape") {
        e.preventDefault()
        handleCancel()
      }
    },
    [handleSave, handleCancel]
  )

  const handleContainerClick = useCallback(
    (e: React.MouseEvent) => {
      if (isEditing) {
        e.stopPropagation()
      }
    },
    [isEditing]
  )

  const handleContainerKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault()
        if (isEditing) {
          e.stopPropagation()
        }
      }
    },
    [isEditing]
  )

  const handleSaveClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      handleSave()
    },
    [handleSave]
  )

  const handleCancelClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      handleCancel()
    },
    [handleCancel]
  )

  const handleLinkClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
  }, [])

  // Memoize computed values
  const isActive = useMemo(
    () => pathname.startsWith(`/p/${project.id}`) || isEditing || isMenuOpen,
    [pathname, project.id, isEditing, isMenuOpen]
  )

  const displayName = useMemo(
    () => project.name || "Untitled Project",
    [project.name]
  )

  const containerClassName = useMemo(
    () =>
      cn(
        "hover:bg-accent/80 hover:text-foreground group/project relative w-full rounded-md transition-colors",
        isActive && "bg-accent hover:bg-accent text-foreground"
      ),
    [isActive]
  )

  const menuClassName = useMemo(
    () =>
      cn(
        "absolute top-0 right-1 flex h-full items-center justify-center opacity-0 transition-opacity group-hover/project:opacity-100",
        isMobile && "opacity-100 group-hover/project:opacity-100"
      ),
    [isMobile]
  )

  return (
    <div
      className={containerClassName}
      onClick={handleContainerClick}
      onKeyDown={handleContainerKeyDown}
      role="button"
      tabIndex={0}
      ref={containerRef}
    >
      {isEditing ? (
        <div className="flex items-center rounded-md bg-accent py-1 pr-1 pl-2">
          <FolderIcon size={20} className="mr-2 flex-shrink-0 text-primary" />
          <input
            ref={inputRef}
            value={editName}
            onChange={handleInputChange}
            className="max-h-full w-full bg-transparent text-primary text-sm focus:outline-none"
            onKeyDown={handleKeyDown}
          />
          <div className="flex gap-0.5">
            <button
              onClick={handleSaveClick}
              className="flex size-7 items-center justify-center rounded-md p-1 text-muted-foreground transition-colors duration-150 hover:bg-secondary hover:text-primary"
              type="button"
            >
              <Check size={16} weight="bold" />
            </button>
            <button
              onClick={handleCancelClick}
              className="flex size-7 items-center justify-center rounded-md p-1 text-muted-foreground transition-colors duration-150 hover:bg-secondary hover:text-primary"
              type="button"
            >
              <X size={16} weight="bold" />
            </button>
          </div>
        </div>
      ) : (
        <>
          <Link
            href={`/p/${project.id}`}
            className="block w-full"
            prefetch
            onClick={handleLinkClick}
          >
            <div
              className="mask-r-from-80% mask-r-to-85% relative line-clamp-1 flex w-full items-center gap-2 text-ellipsis whitespace-nowrap px-2 py-2 text-primary text-sm"
              title={displayName}
            >
              <FolderIcon size={20} />
              {displayName}
            </div>
          </Link>

          <div className={menuClassName} key={project.id}>
            <SidebarProjectMenu
              project={project}
              onStartEditing={handleStartEditing}
              onMenuOpenChange={handleMenuOpenChange}
            />
          </div>
        </>
      )}
    </div>
  )
}
