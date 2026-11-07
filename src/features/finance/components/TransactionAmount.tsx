import { formatMoney } from "@/lib/format"
import { cn } from "@/lib/utils"
import type { Transaction } from "../api/finance"

/**
 * Monto con signo según su efecto: los ingresos suman (+), los gastos restan (−) y las
 * transferencias no tienen signo porque no son ingreso ni gasto. Un ajuste muestra su dirección.
 */
export function TransactionAmount({
  transaction,
  className,
}: {
  transaction: Pick<Transaction, "type" | "amount" | "currency" | "direction">
  className?: string
}) {
  const amount = formatMoney(transaction.amount, transaction.currency)
  const sign =
    transaction.type === "INCOME" ||
    (transaction.type === "ADJUSTMENT" && transaction.direction === "INCREASE")
      ? "+"
      : transaction.type === "TRANSFER"
        ? ""
        : "−"

  return (
    <span
      className={cn(
        "font-medium whitespace-nowrap tabular-nums",
        transaction.type === "INCOME" && "text-emerald-700 dark:text-emerald-400",
        (transaction.type === "TRANSFER" || transaction.type === "ADJUSTMENT") &&
          "text-muted-foreground",
        className,
      )}
    >
      {sign}
      {amount}
    </span>
  )
}
