import { CheckCircle, Loader2, AlertCircle, Upload } from "lucide-react"
import { cn } from "@/lib/utils"

export type FileStatus = "uploading" | "processing" | "ready" | "error"

interface FileStatusIndicatorProps {
  status: FileStatus
  className?: string
}

export function FileStatusIndicator({
  status,
  className,
}: FileStatusIndicatorProps) {
  const statusConfig = {
    uploading: {
      icon: Upload,
      label: "Uploading",
      className: "text-blue-500",
      animate: true,
    },
    processing: {
      icon: Loader2,
      label: "Processing",
      className: "text-orange-500",
      animate: true,
    },
    ready: {
      icon: CheckCircle,
      label: "Ready",
      className: "text-green-500",
      animate: false,
    },
    error: {
      icon: AlertCircle,
      label: "Error",
      className: "text-red-500",
      animate: false,
    },
  }

  const config = statusConfig[status]
  const Icon = config.icon

  return (
    <div className={cn("flex items-center gap-1.5", className)}>
      <Icon
        className={cn(
          "h-4 w-4",
          config.className,
          config.animate && "animate-spin"
        )}
      />
      <span className={cn("text-xs", config.className)}>{config.label}</span>
    </div>
  )
}
