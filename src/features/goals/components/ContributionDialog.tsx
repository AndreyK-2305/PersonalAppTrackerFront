import { zodResolver } from "@hookform/resolvers/zod"
import { LoaderCircleIcon } from "lucide-react"
import { useState } from "react"
import { useForm } from "react-hook-form"
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
import { useCurrentProfile } from "@/features/auth/hooks/use-auth"
import { todayIn } from "@/lib/dates"
import { setServerErrors } from "@/lib/form-errors"
import { parseMoneyInput } from "@/lib/money"
import { useAddContribution } from "../hooks/use-goals"
import { contributionFormSchema, type ContributionFormValues } from "../schemas"

const FIELDS = ["date", "amount"] as const

/** Campo del formulario al que corresponde cada regla del backend (ADR-0018). */
const FIELD_BY_CODE = {
  "goals.contribution.amount_invalid": "amount",
  "goals.contribution.date_invalid": "date",
  // La suma de los abonos ya no cabe en un monto.
  "money.amount_invalid": "amount",
} as const

/** Marca un abono a la meta. No crea un movimiento en Finanzas (ADR-0018). */
export function ContributionDialog({
  goalId,
  open,
  onOpenChange,
}: {
  goalId: string
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Registrar abono</DialogTitle>
          <DialogDescription>
            Es una marca dentro de la meta: si el dinero se movió entre tus cuentas, regístralo
            también en Finanzas.
          </DialogDescription>
        </DialogHeader>
        <ContributionForm goalId={goalId} onDone={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  )
}

function ContributionForm({ goalId, onDone }: { goalId: string; onDone: () => void }) {
  const profile = useCurrentProfile()
  const addContribution = useAddContribution()
  const [generalError, setGeneralError] = useState<string | null>(null)
  const today = todayIn(profile.timeZone)
  const form = useForm<ContributionFormValues>({
    resolver: zodResolver(contributionFormSchema),
    defaultValues: { date: today, amount: "" },
  })

  const onSubmit = form.handleSubmit((values) => {
    setGeneralError(null)
    addContribution.mutate(
      { goalId, date: values.date, amount: parseMoneyInput(values.amount) ?? "" },
      {
        onSuccess: () => {
          toast.success("Abono registrado.")
          onDone()
        },
        onError: (error) => {
          if (!setServerErrors(error, form.setError, FIELDS, FIELD_BY_CODE)) {
            setGeneralError(error.message)
          }
        },
      },
    )
  })

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-6">
      <FormError message={generalError} />
      <FieldGroup>
        <MoneyField control={form.control} name="amount" label="Valor" />
        <FormTextField control={form.control} name="date" label="Fecha" type="date" />
      </FieldGroup>
      <DialogFooter>
        <Button
          type="button"
          variant="outline"
          onClick={onDone}
          disabled={addContribution.isPending}
        >
          Cancelar
        </Button>
        <Button type="submit" disabled={addContribution.isPending}>
          {addContribution.isPending && <LoaderCircleIcon className="animate-spin" aria-hidden />}
          Registrar abono
        </Button>
      </DialogFooter>
    </form>
  )
}
