import { CheckIcon } from "lucide-react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { formatDate, formatMoneyExact } from "@/lib/format"
import { compareDecimal } from "@/lib/money"
import type { Installment } from "../api/goals"

/**
 * Tabla de amortización: una fila por cuota, pagada o pendiente, con su interés, su capital y el
 * saldo que queda. Muestra centavos para que cada fila sume exacto. Las columnas de seguros y otros
 * y de abono solo aparecen si alguna cuota los tiene.
 */
export function AmortizationTable({
  schedule,
  currency,
}: {
  schedule: Installment[]
  currency: string
}) {
  const hasExtras = schedule.some((row) => compareDecimal(row.extras, "0") > 0)
  const hasExtraPrincipal = schedule.some((row) => compareDecimal(row.extraPrincipal, "0") > 0)
  const money = (amount: string) => formatMoneyExact(amount, currency)

  if (schedule.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        El crédito se pagó antes de la primera cuota: no hay cuotas que mostrar.
      </p>
    )
  }

  return (
    <div className="overflow-x-auto">
      <Table aria-label="Tabla de amortización">
        <TableHeader>
          <TableRow>
            <TableHead className="w-12">#</TableHead>
            <TableHead>Vence</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead className="text-right">Cuota</TableHead>
            <TableHead className="text-right">Interés</TableHead>
            <TableHead className="text-right">Capital</TableHead>
            {hasExtras && <TableHead className="text-right">Seguros y otros</TableHead>}
            {hasExtraPrincipal && <TableHead className="text-right">Abono</TableHead>}
            <TableHead className="text-right">Saldo</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {schedule.map((row) => (
            <TableRow key={row.number} className={row.paid ? "bg-muted/40" : undefined}>
              <TableCell className="text-muted-foreground">{row.number}</TableCell>
              <TableCell className="whitespace-nowrap">{formatDate(row.dueDate)}</TableCell>
              <TableCell className="whitespace-nowrap">
                {row.paid ? (
                  <span className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-400">
                    <CheckIcon className="size-3.5" aria-hidden />
                    Pagada{row.paidOn ? ` el ${formatDate(row.paidOn)}` : ""}
                  </span>
                ) : (
                  <span className="text-muted-foreground">Pendiente</span>
                )}
              </TableCell>
              <TableCell className="text-right font-medium tabular-nums">
                {money(row.payment)}
              </TableCell>
              <TableCell className="text-right tabular-nums">{money(row.interest)}</TableCell>
              <TableCell className="text-right tabular-nums">{money(row.principal)}</TableCell>
              {hasExtras && (
                <TableCell className="text-right tabular-nums">{money(row.extras)}</TableCell>
              )}
              {hasExtraPrincipal && (
                <TableCell className="text-right tabular-nums">
                  {compareDecimal(row.extraPrincipal, "0") > 0 ? money(row.extraPrincipal) : "—"}
                </TableCell>
              )}
              <TableCell className="text-right tabular-nums">{money(row.balance)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
