import { MinusIcon, TrendingDownIcon, TrendingUpIcon } from "lucide-react"
import { Bar, BarChart, CartesianGrid, XAxis } from "recharts"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import { formatDateRange, formatMoney, formatShortDate, formatShortMonth } from "@/lib/format"
import { chartValue, compareDecimal } from "@/lib/money"
import { cn } from "@/lib/utils"
import type { PeriodKind, Summary } from "../api/finance"

const KPIS: { key: "income" | "expense" | "net"; label: string; higherIsBetter: boolean }[] = [
  { key: "income", label: "Ingresos", higherIsBetter: true },
  { key: "expense", label: "Gastos", higherIsBetter: false },
  { key: "net", label: "Balance", higherIsBetter: true },
]

/**
 * Ingresos, gastos y balance del periodo comparados con el periodo anterior equivalente. En un
 * periodo en curso, la comparación usa los mismos días del anterior (ADR-0013).
 */
export function SummaryKpis({ summary }: { summary: Summary }) {
  const previousRange = formatDateRange(summary.previous.start, summary.previous.end)

  return (
    <div className="grid gap-4 sm:grid-cols-3">
      {KPIS.map(({ key, label, higherIsBetter }) => (
        <Card key={key}>
          <CardHeader>
            <CardDescription>{label}</CardDescription>
            <CardTitle className="text-2xl tabular-nums">
              {formatMoney(summary.current[key], summary.currency)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Comparison
              current={summary.current[key]}
              previous={summary.previous[key]}
              currency={summary.currency}
              higherIsBetter={higherIsBetter}
              range={previousRange}
            />
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

function Comparison({
  current,
  previous,
  currency,
  higherIsBetter,
  range,
}: {
  current: string
  previous: string
  currency: string
  higherIsBetter: boolean
  range: string
}) {
  const direction = compareDecimal(current, previous)
  const Icon = direction > 0 ? TrendingUpIcon : direction < 0 ? TrendingDownIcon : MinusIcon
  const good = direction !== 0 && direction > 0 === higherIsBetter

  return (
    <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
      <Icon
        className={cn(
          "mt-px size-3.5 shrink-0",
          direction !== 0 && (good ? "text-emerald-600" : "text-destructive"),
        )}
        aria-hidden
      />
      <span>
        Periodo anterior: {formatMoney(previous, currency)}
        <span className="sr-only">
          {direction > 0
            ? ", ahora es mayor"
            : direction < 0
              ? ", ahora es menor"
              : ", sin cambios"}
        </span>
        <span className="block">{range}</span>
      </span>
    </p>
  )
}

const trendConfig = {
  income: { label: "Ingresos", color: "var(--chart-income)" },
  expense: { label: "Gastos", color: "var(--chart-expense)" },
} satisfies ChartConfig

/** Ingresos y gastos de los últimos 6 periodos. Las barras usan valores aproximados solo para dibujar. */
export function TrendChart({ summary }: { summary: Summary }) {
  const data = summary.trend.map((point) => ({
    label: axisLabel(summary.kind, point.start),
    range: formatDateRange(point.start, point.end),
    income: chartValue(point.income),
    expense: chartValue(point.expense),
    incomeText: point.income,
    expenseText: point.expense,
  }))

  return (
    <Card>
      <CardHeader>
        <CardTitle>Tendencia</CardTitle>
        <CardDescription>Ingresos y gastos de los últimos 6 periodos.</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={trendConfig} className="aspect-auto h-64 w-full">
          <BarChart data={data} accessibilityLayer>
            <CartesianGrid vertical={false} />
            <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  labelFormatter={(_, payload) => payload?.[0]?.payload?.range}
                  formatter={(_, name, item) => (
                    <div className="flex w-full items-center justify-between gap-3">
                      <span className="flex items-center gap-1.5 text-muted-foreground">
                        <span
                          className="size-2.5 rounded-[2px]"
                          style={{ background: item.color }}
                          aria-hidden
                        />
                        {trendConfig[name as keyof typeof trendConfig]?.label ?? name}
                      </span>
                      <span className="font-medium text-foreground tabular-nums">
                        {formatMoney(item.payload[`${name}Text`], summary.currency)}
                      </span>
                    </div>
                  )}
                />
              }
            />
            <ChartLegend content={<ChartLegendContent />} />
            <Bar dataKey="income" fill="var(--color-income)" radius={4} />
            <Bar dataKey="expense" fill="var(--color-expense)" radius={4} />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}

function axisLabel(kind: PeriodKind, start: string): string {
  return kind === "MONTH" ? formatShortMonth(start) : formatShortDate(start)
}

/**
 * Gastos del periodo por categoría principal, de mayor a menor. La longitud de cada barra es
 * aproximada y solo sirve para comparar a simple vista; el monto exacto es el texto.
 */
export function ExpensesByCategory({
  totals,
  categoryNames,
  currency,
}: {
  totals: Summary["expensesByCategory"]
  categoryNames: Map<string, string>
  currency: string
}) {
  const largest = Math.max(...totals.map((total) => chartValue(total.total)), 0)

  return (
    <Card>
      <CardHeader>
        <CardTitle>Gastos por categoría</CardTitle>
        <CardDescription>Agrupados por categoría principal.</CardDescription>
      </CardHeader>
      <CardContent>
        {totals.length === 0 ? (
          <p className="text-sm text-muted-foreground">No hay gastos en este periodo.</p>
        ) : (
          <ul className="space-y-3">
            {totals.map((total) => {
              const name = total.categoryId
                ? (categoryNames.get(total.categoryId) ?? "Categoría eliminada")
                : "Sin categoría"
              const width = largest > 0 ? (chartValue(total.total) / largest) * 100 : 0
              return (
                <li key={total.categoryId ?? "none"} className="space-y-1">
                  <div className="flex items-center justify-between gap-2 text-sm">
                    <span className="truncate">{name}</span>
                    <span className="font-medium tabular-nums">
                      {formatMoney(total.total, currency)}
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-muted" aria-hidden>
                    <div
                      className="h-2 rounded-full bg-(--chart-expense)"
                      style={{ width: `${Math.max(width, 2)}%` }}
                    />
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
