import { Undo2Icon } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"
import { ConfirmDialog } from "@/components/common/ConfirmDialog"
import { Button } from "@/components/ui/button"
import { formatDate, formatMoney } from "@/lib/format"
import type { CreditRecord } from "../api/goals"
import { useUndoCreditRecord } from "../hooks/use-goals"
import { formatPercent } from "../schemas"

/**
 * Pagos, abonos y ajustes de tasa del crédito, del más reciente al más antiguo. Solo el último se
 * puede deshacer: los anteriores son la base de los siguientes (ADR-0018).
 */
export function CreditRecordsList({
  goalId,
  currency,
  records,
}: {
  goalId: string
  currency: string
  records: CreditRecord[]
}) {
  const undoRecord = useUndoCreditRecord()
  const [undoing, setUndoing] = useState<CreditRecord | null>(null)

  const confirmUndo = () => {
    if (!undoing) {
      return
    }
    undoRecord.mutate(
      { goalId, recordId: undoing.id },
      {
        onSuccess: () => toast.success("Registro deshecho."),
        onError: (error) => toast.error(error.message),
        onSettled: () => setUndoing(null),
      },
    )
  }

  if (records.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Aún no has registrado pagos, abonos ni ajustes de tasa.
      </p>
    )
  }

  return (
    <>
      <ul className="max-h-80 divide-y overflow-y-auto" aria-label="Movimientos del crédito">
        {records.map((record) => (
          <li key={record.id} className="flex items-center gap-2 py-2 text-sm">
            <div className="min-w-0 flex-1">
              <p className="font-medium">{recordTitle(record)}</p>
              <p className="text-xs text-muted-foreground">
                {formatDate(record.date)}
                {recordDetail(record, currency)}
              </p>
            </div>
            {record.amount && (
              <span className="font-medium tabular-nums">
                {formatMoney(record.amount, currency)}
              </span>
            )}
            {record.undoable && (
              <Button variant="outline" size="sm" onClick={() => setUndoing(record)}>
                <Undo2Icon aria-hidden />
                Deshacer
              </Button>
            )}
          </li>
        ))}
      </ul>
      <ConfirmDialog
        open={undoing !== null}
        onOpenChange={(open) => !open && setUndoing(null)}
        title="¿Deshacer el último registro?"
        description={
          undoing ? `Se borra "${recordTitle(undoing)}" y el plan vuelve a como estaba antes.` : ""
        }
        confirmLabel="Deshacer"
        onConfirm={confirmUndo}
        pending={undoRecord.isPending}
      />
    </>
  )
}

function recordTitle(record: CreditRecord): string {
  switch (record.kind) {
    case "PAYMENT":
      return `Cuota ${record.installmentNumber} pagada`
    case "PREPAYMENT":
      return "Abono a capital"
    default:
      return `Ajuste de tasa al ${formatPercent(record.ratePercent ?? "")} % EA`
  }
}

function recordDetail(record: CreditRecord, currency: string): string {
  if (record.kind === "PREPAYMENT") {
    return record.mode === "REDUCE_INSTALLMENT" ? " · reduce la cuota" : " · reduce el plazo"
  }
  if (record.kind === "RATE_ADJUSTMENT" && record.actualInstallment) {
    return ` · cuota real de ${formatMoney(record.actualInstallment, currency)}`
  }
  return ""
}
