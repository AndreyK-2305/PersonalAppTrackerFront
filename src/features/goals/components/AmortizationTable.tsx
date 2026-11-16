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
 * Tabla de amortización: una fila por cuota con su interés, su capital y el saldo que queda. Muestra
 * centavos para que cada fila sume exacto. La columna de seguros y otros solo aparece si hay.
 */
export function AmortizationTable({
  schedule,
  currency,
}: {
  schedule: Installment[]
  currency: string
}) {
  const hasExtras = schedule.some((row) => compareDecimal(row.extras, "0") > 0)
  const money = (amount: string) => formatMoneyExact(amount, currency)

  return (
    <div className="overflow-x-auto">
      <Table aria-label="Tabla de amortización">
        <TableHeader>
          <TableRow>
            <TableHead className="w-12">#</TableHead>
            <TableHead>Fecha</TableHead>
            <TableHead className="text-right">Cuota</TableHead>
            <TableHead className="text-right">Interés</TableHead>
            <TableHead className="text-right">Capital</TableHead>
            {hasExtras && <TableHead className="text-right">Seguros y otros</TableHead>}
            <TableHead className="text-right">Saldo</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {schedule.map((row) => (
            <TableRow key={row.number}>
              <TableCell className="text-muted-foreground">{row.number}</TableCell>
              <TableCell className="whitespace-nowrap">{formatDate(row.dueDate)}</TableCell>
              <TableCell className="text-right font-medium tabular-nums">
                {money(row.payment)}
              </TableCell>
              <TableCell className="text-right tabular-nums">{money(row.interest)}</TableCell>
              <TableCell className="text-right tabular-nums">{money(row.principal)}</TableCell>
              {hasExtras && (
                <TableCell className="text-right tabular-nums">{money(row.extras)}</TableCell>
              )}
              <TableCell className="text-right tabular-nums">{money(row.balance)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
