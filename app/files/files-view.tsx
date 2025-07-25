"use client"

import { useQuery } from "@tanstack/react-query"
import { FolderOpen, Grid, List, Search } from "lucide-react"
import React, { useState, useEffect } from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { toast } from "@/components/ui/toast"

import { deleteUserFile, downloadFile, getUserFiles } from "./api"
import { EmptyState } from "./empty-state"
import { FileGrid } from "./file-grid"
import { FileList } from "./file-list"
import type { FileStatus } from "./file-status-indicator"
import { FileStats } from "./file-stats"

interface FilesViewProps {
  userId: string
}

type ViewMode = "grid" | "list"
type SortBy = "newest" | "oldest" | "name" | "size" | "type"
type FilterBy = "all" | "images" | "documents" | "text"

export function FilesView({ userId }: FilesViewProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [viewMode, setViewMode] = useState<ViewMode>("grid")
  const [sortBy, setSortBy] = useState<SortBy>("newest")
  const [filterBy, setFilterBy] = useState<FilterBy>("all")
  const [fileStatuses, setFileStatuses] = useState<Record<string, FileStatus>>({})

  const {
    data: files,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["user-files", userId, sortBy, filterBy],
    queryFn: () => getUserFiles(userId, { sortBy, filterBy }),
    staleTime: 30000, // 30 seconds
  })

  // Demonstration: simulate different file statuses
  // In a real implementation, these would be set during file upload/processing
  useEffect(() => {
    if (files && files.length > 0) {
      const newStatuses: Record<string, FileStatus> = {}
      files.forEach((file, index) => {
        // Demo: show different statuses for first few files
        if (index === 0) {
          newStatuses[file.id] = "uploading"
        } else if (index === 1) {
          newStatuses[file.id] = "processing"
        } else if (index === 2) {
          newStatuses[file.id] = "error"
        } else {
          newStatuses[file.id] = "ready"
        }
      })
      setFileStatuses(newStatuses)
    }
  }, [files])

  const handleDelete = async (fileId: string, fileName: string) => {
    try {
      await deleteUserFile(fileId)
      toast({
        title: "File deleted",
        description: `${fileName} has been removed from your files`,
        status: "success",
      })
      refetch()
    } catch (error) {
      toast({
        title: "Failed to delete file",
        description:
          error instanceof Error ? error.message : "An error occurred",
        status: "error",
      })
    }
  }

  const handleDownload = async (fileUrl: string, fileName: string) => {
    try {
      await downloadFile(fileUrl, fileName)
      toast({
        title: "Download started",
        description: `${fileName} is being downloaded`,
        status: "success",
      })
    } catch (error) {
      toast({
        title: "Download failed",
        description:
          error instanceof Error ? error.message : "An error occurred",
        status: "error",
      })
    }
  }

  // Filter and search files
  const filteredFiles = React.useMemo(() => {
    if (!files) return []

    return files.filter((file) => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase()
        const matchesName = file.file_name?.toLowerCase().includes(query)
        const matchesChat = file.chat?.title?.toLowerCase().includes(query)
        if (!matchesName && !matchesChat) return false
      }

      return true
    })
  }, [files, searchQuery])

  if (error) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <h2 className="font-semibold text-destructive text-lg">
            Error loading files
          </h2>
          <p className="mt-2 text-muted-foreground text-sm">
            {error instanceof Error
              ? error.message
              : "Failed to load your files"}
          </p>
          <Button onClick={() => refetch()} variant="outline" className="mt-4">
            Try again
          </Button>
        </div>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-primary border-b-2"></div>
      </div>
    )
  }

  if (!files || files.length === 0) {
    return <EmptyState />
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header with stats */}
      <div className="border-b p-4">
        <FileStats files={files} />
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between gap-4 border-b p-4">
        <div className="flex flex-1 items-center gap-2">
          <div className="relative max-w-sm flex-1">
            <Search className="-translate-y-1/2 absolute top-1/2 left-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search files and chats..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select
            value={filterBy}
            onValueChange={(value: FilterBy) => setFilterBy(value)}
          >
            <SelectTrigger className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All files</SelectItem>
              <SelectItem value="images">Images</SelectItem>
              <SelectItem value="documents">Documents</SelectItem>
              <SelectItem value="text">Text files</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={sortBy}
            onValueChange={(value: SortBy) => setSortBy(value)}
          >
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Newest</SelectItem>
              <SelectItem value="oldest">Oldest</SelectItem>
              <SelectItem value="name">Name</SelectItem>
              <SelectItem value="size">Size</SelectItem>
              <SelectItem value="type">Type</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant={viewMode === "grid" ? "default" : "ghost"}
            size="sm"
            onClick={() => setViewMode("grid")}
          >
            <Grid className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === "list" ? "default" : "ghost"}
            size="sm"
            onClick={() => setViewMode("list")}
          >
            <List className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Files content */}
      <div className="flex-1 overflow-auto">
        {filteredFiles.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <div className="text-center">
              <FolderOpen className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 font-semibold text-lg">No files found</h3>
              <p className="mt-2 text-muted-foreground text-sm">
                {searchQuery
                  ? `No files match "${searchQuery}"`
                  : "No files match the selected filter"}
              </p>
            </div>
          </div>
        ) : (
          <div className="p-4">
            {viewMode === "grid" ? (
              <FileGrid
                files={filteredFiles}
                onDelete={handleDelete}
                onDownload={handleDownload}
                fileStatuses={fileStatuses}
              />
            ) : (
              <FileList
                files={filteredFiles}
                onDelete={handleDelete}
                onDownload={handleDownload}
                fileStatuses={fileStatuses}
              />
            )}
          </div>
        )}
      </div>
    </div>
  )
}
