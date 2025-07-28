"use client"

/* eslint-disable @typescript-eslint/no-unused-vars */

import * as React from "react"

import { cn } from "@/lib/utils"

const COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
]

const ChartContext = React.createContext<{
  config: ChartConfig
  getColor: (key: string, fallback?: string) => string
} | null>(null)

function useChart() {
  const context = React.useContext(ChartContext)
  if (!context) {
    throw new Error("useChart must be used within a <ChartContainer />")
  }
  return context
}

export interface ChartConfig {
  [key: string]: {
    label?: React.ReactNode
    icon?: React.ComponentType<{ className?: string }>
    color?: string
    theme?: Record<string, string>
  }
}

interface ChartDataItem {
  value?: unknown
  name?: string
  dataKey?: string
  color?: string
  payload?: Record<string, unknown>
}

interface ChartLegendItem {
  value: string
  type?: string
  color?: string
}

interface ChartContainerProps extends React.ComponentProps<"div"> {
  config: ChartConfig
  children: React.ReactNode
}

const ChartContainer = React.forwardRef<HTMLDivElement, ChartContainerProps>(
  ({ children, className, config, ...props }, ref) => {
    const getColor = React.useCallback(
      (key: string, fallback?: string) => {
        const colorConfig = config[key]?.color || config[key]?.theme?.light
        return colorConfig || fallback || COLORS[0]
      },
      [config]
    )

    return (
      <ChartContext.Provider value={{ config, getColor }}>
        <div
          data-chart="chart"
          ref={ref}
          className={cn(
            "flex aspect-video justify-center text-xs [&_.recharts-cartesian-axis-tick_text]:fill-muted-foreground [&_.recharts-cartesian-grid_line[stroke='#ccc']]:stroke-border/25 [&_.recharts-curve.recharts-tooltip-cursor]:stroke-border [&_.recharts-dot[stroke='#fff']]:stroke-transparent [&_.recharts-layer]:outline-none [&_.recharts-polar-grid_[stroke='#ccc']]:stroke-border [&_.recharts-radial-bar-background-sector]:fill-muted [&_.recharts-rectangle.recharts-tooltip-cursor]:fill-muted [&_.recharts-reference-line_[stroke='#ccc']]:stroke-border [&_.recharts-sector[stroke='#fff']]:stroke-transparent [&_.recharts-sector]:outline-none [&_.recharts-surface]:outline-none",
            className
          )}
          {...props}
        >
          {children}
        </div>
      </ChartContext.Provider>
    )
  }
)
ChartContainer.displayName = "ChartContainer"

const ChartTooltip = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<"div">
>(({ className, ...props }, ref) => {
  return (
    <div
      ref={ref}
      className={cn(
        "rounded-lg border bg-background px-3 py-1.5 text-xs shadow-md",
        className
      )}
      {...props}
    />
  )
})
ChartTooltip.displayName = "ChartTooltip"

const ChartTooltipContent = React.forwardRef<
  HTMLDivElement,
  {
    active?: boolean
    payload?: ChartDataItem[]
    label?: string
    labelKey?: string
    labelFormatter?: (
      value: unknown,
      payload: ChartDataItem[]
    ) => React.ReactNode
    formatter?: (
      value: unknown,
      name: string,
      props: ChartDataItem
    ) => [React.ReactNode, React.ReactNode]
    hideLabel?: boolean
    hideIndicator?: boolean
    indicator?: "line" | "dot" | "dashed"
    nameKey?: string
    labelClassName?: string
    className?: string
  }
>(
  (
    {
      active,
      payload,
      label,
      labelKey,
      labelFormatter,
      formatter,
      hideLabel = false,
      hideIndicator = false,
      indicator = "dot",
      nameKey,
      labelClassName,
      className,
    },
    ref
  ) => {
    const { config, getColor } = useChart()

    if (!active || !payload?.length) {
      return null
    }

    const renderLabel = (): React.ReactNode => {
      if (hideLabel) return null
      if (labelFormatter && payload) {
        return labelFormatter(label, payload)
      }
      if (labelKey && payload?.[0]?.payload) {
        return payload[0].payload[labelKey] as React.ReactNode
      }
      return label
    }

    return (
      <ChartTooltip
        ref={ref}
        className={cn("grid min-w-[8rem] items-start gap-1.5", className)}
      >
        {!hideLabel && (
          <div className={cn("font-medium", labelClassName)}>
            {renderLabel()}
          </div>
        )}
        <div className="grid gap-1.5">
          {payload.map((item, index) => {
            const key = nameKey || item.dataKey || item.name || "value"
            const itemConfig = config[key] || {}
            const indicatorColor = getColor(key, item.color)

            return (
              <div
                key={`${key}-${item.dataKey || item.name || index}`}
                className="flex w-full items-center text-xs"
              >
                {!hideIndicator && (
                  <div
                    className={cn(
                      "shrink-0 rounded-[2px] border-[--color-border] bg-[--color-bg]",
                      {
                        "h-2.5 w-2.5": indicator === "dot",
                        "h-2.5 w-1": indicator === "line",
                        "w-0 border-l-2 border-dashed bg-transparent":
                          indicator === "dashed",
                      }
                    )}
                    style={
                      {
                        "--color-bg": indicatorColor,
                        "--color-border": indicatorColor,
                      } as React.CSSProperties
                    }
                  />
                )}
                <div className="flex flex-1 justify-between leading-none">
                  <div className="grid gap-1.5">
                    <span className="text-muted-foreground">
                      {itemConfig.label || key}
                    </span>
                  </div>
                  <span className="font-medium font-mono text-foreground tabular-nums">
                    {formatter
                      ? formatter(item.value, item.name || "", item)[0]
                      : typeof item.value === "string" ||
                          typeof item.value === "number"
                        ? item.value.toLocaleString()
                        : String(item.value || "")}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      </ChartTooltip>
    )
  }
)
ChartTooltipContent.displayName = "ChartTooltipContent"

const ChartLegend = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<"div"> & {
    payload?: Array<{
      value: string
      type?: string
      color?: string
    }>
    nameKey?: string
    onMouseEnter?: (data: ChartLegendItem, index: number) => void
    onMouseLeave?: (data: ChartLegendItem, index: number) => void
    onClick?: (data: ChartLegendItem, index: number) => void
  }
>(({ className, payload, nameKey, ...props }, ref) => {
  const { config, getColor } = useChart()

  if (!payload?.length) {
    return null
  }

  return (
    <div
      ref={ref}
      className={cn("flex items-center justify-center gap-4", className)}
      {...props}
    >
      {payload.map((item, index) => {
        const key = nameKey || item.value
        const itemConfig = config[key] || {}

        return (
          <div
            key={`${key}-${item.dataKey || item.name || index}`}
            className="flex items-center gap-1.5 text-sm"
          >
            <div
              className="h-2 w-2 shrink-0 rounded-[2px]"
              style={{
                backgroundColor: getColor(key, item.color),
              }}
            />
            <span className="text-muted-foreground">
              {itemConfig.label || key}
            </span>
          </div>
        )
      })}
    </div>
  )
})
ChartLegend.displayName = "ChartLegend"

export {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  useChart,
}
