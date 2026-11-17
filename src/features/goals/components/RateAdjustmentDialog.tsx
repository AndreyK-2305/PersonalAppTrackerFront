import { zodResolver } from "@hookform/resolvers/zod"
import { useState } from "react"
import { useForm } from "react-hook-form"
import { toast } from "sonner"
import { FormError } from "@/components/common/FormError"
import { FormTextField } from "@/components/common/FormTextField"
import { MoneyField } from "@/components/common/MoneyField"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { FieldGroup } from "@/components/ui/field"
import { setServerErrors } from "@/lib/form-errors"
import { parseMoneyInput } from "@/lib/money"
import type { FinancedGoal } from "../api/goals"
import { useAdjustCreditRate } from "../hooks/use-goals"
import {
  formatPercent,
  rateAdjustmentFormSchema,
  toRatePercent,
  type RateAdjustmentFormValues,
} from "../schemas"
import { FormFooter } from "./CreditPaymentDialogs"

/** Campo del formulario al que corresponde cada regla del backend (ADR-0018). */
const FIELD_BY_CODE = {
  "rate.invalid": "ratePercent",
  "goals.financed_record.actual_installment_invalid": "actualInstallment",
} as const

/**
 * Ajuste de tasa de un crédito de tasa variable. La tasa nueva rige desde la siguiente cuota y la
 * cuota se recalcula sobre el saldo y las cuotas que faltan (ADR-0018).
 */
export function RateAdjustmentDialog({
  goal,
  open,
  onOpenChange,
}: {
  goal: FinancedGoal
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Ajustar tasa</DialogTitle>
          <DialogDescription>
            La tasa vigente es {formatPercent(goal.progress.currentRatePercent)} % EA. La nueva rige
            desde la siguiente cuota y recalcula su valor; el plazo no cambia.
          </DialogDescription>
        </DialogHeader>
        <RateAdjustmentForm goal={goal} onDone={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  )
}

function RateAdjustmentForm({ goal, onDone }: { goal: FinancedGoal; onDone: () => void }) {
  const adjustRate = useAdjustCreditRate()
  const [generalError, setGeneralError] = useState<string | null>(null)
  const form = useForm<RateAdjustmentFormValues>({
    resolver: zodResolver(rateAdjustmentFormSchema),
    defaultValues: { ratePercent: "", actualInstallment: "" },
  })

  const submit = form.handleSubmit((values) => {
    setGeneralError(null)
    const actualInstallment = parseMoneyInput(values.actualInstallment)
    adjustRate.mutate(
      {
        goalId: goal.id,
        ratePercent: toRatePercent(values.ratePercent),
        ...(actualInstallment !== null && { actualInstallment }),
      },
      {
        onSuccess: () => {
          toast.success("Tasa ajustada.")
          onDone()
        },
        onError: (error) => {
          const fields = ["ratePercent", "actualInstallment"] as const
          if (!setServerErrors(error, form.setError, fields, FIELD_BY_CODE)) {
            setGeneralError(error.message)
          }
        },
      },
    )
  })

  return (
    <form onSubmit={submit} noValidate className="space-y-6">
      <FormError message={generalError} />
      <FieldGroup>
        <FormTextField
          control={form.control}
          name="ratePercent"
          label="Nueva tasa EA (%)"
          placeholder="Por ejemplo, 20,5"
        />
        <MoneyField
          control={form.control}
          name="actualInstallment"
          label="Nueva cuota real (opcional)"
          description="Si la dejas vacía, los seguros y otros siguen iguales."
        />
      </FieldGroup>
      <FormFooter pending={adjustRate.isPending} submitLabel="Ajustar tasa" onCancel={onDone} />
    </form>
  )
}
