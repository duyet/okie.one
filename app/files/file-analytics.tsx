"use client"

import { useQuery } from "@tanstack/react-query"
import { BarChart, FileText, HardDrive, TrendingUp } from "lucide-react"
import { useState } from "react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

import { formatBytes } from "./utils"

interface FileAnalytics {
  totalFiles: number
  totalSize: number
  averageFileSize: number
  uploadTrend: {
    period: string
    count: number
    size: number
  }[]
  topFileTypes: {
    type: string
    count: number
    size: number
    percentage: number
  }[]
  storageUsageByMonth: {
    month: string
    size: number
    count: number
  }[]
  dailyUploads: {
    date: string
    count: number
    size: number
  }[]
}

interface FileAnalyticsProps {
  userId: string
}

async function getFileAnalytics(userId: string, period: string = "30d"): Promise<FileAnalytics> {
  const response = await fetch(`/api/files/analytics?userId=${userId}&period=${period}`)
  if (!response.ok) {
    throw new Error("Failed to fetch file analytics")
  }
  return response.json()
}

export function FileAnalytics({ userId }: FileAnalyticsProps) {
  const [period, setPeriod] = useState("30d")

  const {
    data: analytics,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["file-analytics", userId, period],
    queryFn: () => getFileAnalytics(userId, period),
    staleTime: 300000, // 5 minutes
  })

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }, (_, i) => `skeleton-card-${i}-${Date.now()}`).map((key) => (
            <Card key={key}>
              <CardContent className="p-6">
                <div className="h-16 animate-pulse rounded bg-muted" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  if (error || !analytics) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-6">
          <div className="text-center">
            <FileText className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
            <p className="text-muted-foreground text-sm">
              Failed to load analytics
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Period Selector */}
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-lg">File Analytics</h2>
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7d">7 days</SelectItem>
            <SelectItem value="30d">30 days</SelectItem>
            <SelectItem value="90d">90 days</SelectItem>
            <SelectItem value="1y">1 year</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="font-medium text-sm">Total Files</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="font-bold text-2xl">{analytics.totalFiles}</div>
            <p className="text-muted-foreground text-xs">
              {analytics.uploadTrend.length > 0 && (
                <span className="flex items-center">
                  <TrendingUp className="mr-1 h-3 w-3" />
                  {analytics.uploadTrend[analytics.uploadTrend.length - 1]?.count || 0} this period
                </span>
              )}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="font-medium text-sm">Storage Used</CardTitle>
            <HardDrive className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="font-bold text-2xl">{formatBytes(analytics.totalSize)}</div>
            <p className="text-muted-foreground text-xs">
              Avg: {formatBytes(analytics.averageFileSize)} per file
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="font-medium text-sm">Upload Trend</CardTitle>
            <BarChart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="font-bold text-2xl">
              {analytics.uploadTrend.reduce((sum, item) => sum + item.count, 0)}
            </div>
            <p className="text-muted-foreground text-xs">
              {formatBytes(analytics.uploadTrend.reduce((sum, item) => sum + item.size, 0))} uploaded
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="font-medium text-sm">Top File Type</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="font-bold text-2xl">
              {analytics.topFileTypes[0]?.type || "N/A"}
            </div>
            <p className="text-muted-foreground text-xs">
              {analytics.topFileTypes[0]?.count || 0} files ({analytics.topFileTypes[0]?.percentage || 0}%)
            </p>
          </CardContent>
        </Card>
      </div>

      {/* File Types Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>File Types Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {analytics.topFileTypes.map((fileType, index) => (
              <div key={fileType.type} className="flex items-center gap-4">
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  <div
                    className="h-3 w-3 rounded-full"
                    style={{
                      backgroundColor: `hsl(${(index * 137.5) % 360}, 70%, 50%)`,
                    }}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-sm">
                      {fileType.type}
                    </p>
                    <p className="text-muted-foreground text-xs">
                      {fileType.count} files • {formatBytes(fileType.size)}
                    </p>
                  </div>
                </div>
                <div className="text-muted-foreground text-sm">
                  {fileType.percentage.toFixed(1)}%
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Upload Timeline */}
      <Card>
        <CardHeader>
          <CardTitle>Upload Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {analytics.dailyUploads.slice(-10).map((day) => (
              <div key={day.date} className="flex items-center justify-between">
                <div className="text-sm">{new Date(day.date).toLocaleDateString()}</div>
                <div className="flex items-center gap-4 text-muted-foreground text-sm">
                  <span>{day.count} files</span>
                  <span>{formatBytes(day.size)}</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}