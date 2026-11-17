import { zodResolver } from "@hookform/resolvers/zod"
import { LoaderCircleIcon } from "lucide-react"
import { useState } from "react"
import { useForm, type Control } from "react-hook-form"
import { toast } from "sonner"
import { FormError } from "@/components/common/FormError"
import { FormTextField } from "@/components/common/FormTextField"
import { MoneyField } from "@/components/common/MoneyField"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { FieldGroup } from "@/components/ui/field"
import { setServerErrors } from "@/lib/form-errors"
import type { FinancedGoal, FinancedGoalDetail } from "../api/goals"
import { useCreateFinancedGoal, useUpdateFinancedGoal } from "../hooks/use-goals"
import {
  financedGoalFormDefaults,
  financedGoalFormSchema,
  toFinancedGoalRequest,
  type FinancedGoalFormValues,
} from "../schemas"
import { FinancingPreview } from "./FinancingPreview"

const FIELDS = [
  "name",
  "assetValue",
  "downPayment",
  "ratePercent",
  "installments",
  "firstDueDate",
  "actualInstallment",
] as const

/** Campo del formulario al que corresponde cada regla del backend (ADR-0018). */
const FIELD_BY_CODE = {
  "goals.financed_goal.name_invalid": "name",
  "goals.financed_goal.terms_locked": "name",
  "goals.financed_goal.asset_value_invalid": "assetValue",
  "goals.financed_goal.down_payment_invalid": "downPayment",
  "goals.financed_goal.installments_invalid": "installments",
  "goals.financed_goal.first_due_date_invalid": "firstDueDate",
  "goals.financed_goal.actual_installment_invalid": "actualInstallment",
  "rate.invalid": "ratePercent",
} as const

interface FinancedGoalFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Meta que se edita; si falta, se crea una nueva. */
  goal?: FinancedGoal
  /** Se llama con la meta creada o actualizada. */
  onSaved?: (goal: FinancedGoalDetail) => void
}

export function FinancedGoalFormDialog({
  open,
  onOpenChange,
  goal,
  onSaved,
}: FinancedGoalFormDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{goal ? "Editar meta financiada" : "Nueva meta financiada"}</DialogTitle>
          <DialogDescription>
            Para una compra grande a crédito, como un vehículo o una vivienda. Es un simulador: no
            crea deudas ni movimientos en Finanzas.
          </DialogDescription>
        </DialogHeader>
        <FinancedGoalForm
          goal={goal}
          onDone={(saved) => {
            onOpenChange(false)
            if (saved) {
              onSaved?.(saved)
            }
          }}
        />
      </DialogContent>
    </Dialog>
  )
}

function FinancedGoalForm({
  goal,
  onDone,
}: {
  goal?: FinancedGoal
  onDone: (saved?: FinancedGoalDetail) => void
}) {
  const createGoal = useCreateFinancedGoal()
  const updateGoal = useUpdateFinancedGoal()
  const [generalError, setGeneralError] = useState<string | null>(null)
  const form = useForm<FinancedGoalFormValues>({
    resolver: zodResolver(financedGoalFormSchema),
    defaultValues: financedGoalFormDefaults(goal),
  })
  const pending = createGoal.isPending || updateGoal.isPending
  // Con pagos, abonos o ajustes registrados, las condiciones ya no se pueden cambiar (ADR-0018).
  const termsLocked = goal?.progress.hasRecords ?? false

  const onSubmit = form.handleSubmit((values) => {
    setGeneralError(null)
    const request = toFinancedGoalRequest(values)
    const options = {
      onSuccess: (saved: FinancedGoalDetail) => {
        toast.success(goal ? "Meta actualizada." : "Meta creada.")
        onDone(saved)
      },
      onError: (error: Error) => {
        if (!setServerErrors(error, form.setError, FIELDS, FIELD_BY_CODE)) {
          setGeneralError(error.message)
        }
      },
    }
    if (goal) {
      updateGoal.mutate({ id: goal.id, ...request }, options)
    } else {
      createGoal.mutate(request, options)
    }
  })

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-6">
      <FormError message={generalError} />
      <FieldGroup>
        <FormTextField
          control={form.control}
          name="name"
          label="Nombre"
          placeholder="Por ejemplo, Carro"
        />
        {termsLocked && (
          <p className="rounded-lg border bg-muted/40 p-3 text-sm text-muted-foreground">
            Esta meta ya tiene pagos, abonos o ajustes registrados, así que solo puedes cambiar el
            nombre. Para cambiar la tasa usa "Ajustar tasa"; para lo demás, deshaz primero los
            registros.
          </p>
        )}
      </FieldGroup>
      {!termsLocked && <TermsFields control={form.control} />}
      <DialogFooter>
        <Button type="button" variant="outline" onClick={() => onDone()} disabled={pending}>
          Cancelar
        </Button>
        <Button type="submit" disabled={pending}>
          {pending && <LoaderCircleIcon className="animate-spin" aria-hidden />}
          {goal ? "Guardar cambios" : "Crear meta"}
        </Button>
      </DialogFooter>
    </form>
  )
}

/** Condiciones de la financiación con su vista previa. */
function TermsFields({ control }: { control: Control<FinancedGoalFormValues> }) {
  return (
    <>
      <FieldGroup>
        <div className="grid gap-4 sm:grid-cols-2">
          <MoneyField control={control} name="assetValue" label="Valor del bien" />
          <MoneyField control={control} name="downPayment" label="Cuota inicial (opcional)" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormTextField
            control={control}
            name="ratePercent"
            label="Tasa EA (%)"
            placeholder="Por ejemplo, 18,5"
          />
          <FormTextField
            control={control}
            name="installments"
            label="Número de cuotas"
            inputMode="numeric"
            placeholder="48"
          />
        </div>
        <FormTextField
          control={control}
          name="firstDueDate"
          label="Fecha de la primera cuota"
          type="date"
          description="Puede ser pasada, si el crédito ya empezó."
        />
        <MoneyField
          control={control}
          name="actualInstallment"
          label="Cuota real (opcional)"
          description="Lo que te cobra la entidad. La diferencia con la cuota calculada se muestra como seguros y otros."
        />
      </FieldGroup>
      <FinancingPreview control={control} />
    </>
  )
}
