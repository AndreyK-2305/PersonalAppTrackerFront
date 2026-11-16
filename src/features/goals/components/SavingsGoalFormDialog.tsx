import { zodResolver } from "@hookform/resolvers/zod"
import { LoaderCircleIcon } from "lucide-react"
import { useId, useState } from "react"
import { Controller, useForm, useWatch } from "react-hook-form"
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
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field"
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select"
import { setServerErrors } from "@/lib/form-errors"
import type { SavingsGoal } from "../api/goals"
import { useCreateSavingsGoal, useUpdateSavingsGoal } from "../hooks/use-goals"
import {
  SAVINGS_PLANS,
  savingsGoalFormDefaults,
  savingsGoalFormSchema,
  toSavingsGoalRequest,
  type SavingsGoalFormValues,
} from "../schemas"

const FIELDS = ["name", "targetAmount", "plan", "targetDate", "monthlyAmount"] as const

/** Campo del formulario al que corresponde cada regla del backend (ADR-0018). */
const FIELD_BY_CODE = {
  "goals.savings_goal.name_invalid": "name",
  "goals.savings_goal.target_invalid": "targetAmount",
  "goals.savings_goal.target_date_invalid": "targetDate",
  "goals.savings_goal.monthly_amount_invalid": "monthlyAmount",
} as const

const PLAN_LABELS: Record<(typeof SAVINGS_PLANS)[number], string> = {
  TARGET_DATE: "Quiero llegar en una fecha",
  MONTHLY_AMOUNT: "Puedo apartar un valor al mes",
}

interface SavingsGoalFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Meta que se edita; si falta, se crea una nueva. */
  goal?: SavingsGoal
  /** Se llama con la meta creada o actualizada. */
  onSaved?: (goal: SavingsGoal) => void
}

export function SavingsGoalFormDialog({
  open,
  onOpenChange,
  goal,
  onSaved,
}: SavingsGoalFormDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{goal ? "Editar meta" : "Nueva meta de ahorro"}</DialogTitle>
          <DialogDescription>
            Para una suma o un bien. Elige una fecha y te decimos cuánto apartar, o un aporte
            mensual y estimamos cuándo llegas.
          </DialogDescription>
        </DialogHeader>
        <SavingsGoalForm
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

function SavingsGoalForm({
  goal,
  onDone,
}: {
  goal?: SavingsGoal
  onDone: (saved?: SavingsGoal) => void
}) {
  const createGoal = useCreateSavingsGoal()
  const updateGoal = useUpdateSavingsGoal()
  const [generalError, setGeneralError] = useState<string | null>(null)
  const planId = useId()
  const form = useForm<SavingsGoalFormValues>({
    resolver: zodResolver(savingsGoalFormSchema),
    defaultValues: savingsGoalFormDefaults(goal),
  })
  const plan = useWatch({ control: form.control, name: "plan" })
  const pending = createGoal.isPending || updateGoal.isPending

  const onSubmit = form.handleSubmit((values) => {
    setGeneralError(null)
    const request = toSavingsGoalRequest(values)
    const options = {
      onSuccess: (saved: SavingsGoal) => {
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
          placeholder="Por ejemplo, Nintendo Switch"
        />
        <MoneyField control={form.control} name="targetAmount" label="Valor objetivo" />
        <Controller
          control={form.control}
          name="plan"
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor={planId}>Plan</FieldLabel>
              <NativeSelect {...field} id={planId}>
                {SAVINGS_PLANS.map((option) => (
                  <NativeSelectOption key={option} value={option}>
                    {PLAN_LABELS[option]}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
              <FieldError errors={[fieldState.error]} />
            </Field>
          )}
        />
        {plan === "TARGET_DATE" ? (
          <FormTextField
            control={form.control}
            name="targetDate"
            label="Fecha objetivo"
            type="date"
          />
        ) : (
          <MoneyField control={form.control} name="monthlyAmount" label="Aporte mensual" />
        )}
      </FieldGroup>
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
