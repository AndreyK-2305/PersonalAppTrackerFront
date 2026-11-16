import { zodResolver } from "@hookform/resolvers/zod"
import { LoaderCircleIcon } from "lucide-react"
import { useState } from "react"
import { useForm } from "react-hook-form"
import { toast } from "sonner"
import { FormError } from "@/components/common/FormError"
import { FormTextField } from "@/components/common/FormTextField"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { setServerErrors } from "@/lib/form-errors"
import { useAdjustSavingsRate } from "../hooks/use-goals"
import { formatPercent, rateFormSchema, toRatePercent, type RateFormValues } from "../schemas"

/**
 * Activa, cambia o apaga la rentabilidad. La tasa nueva rige desde mañana y solo cambia la
 * proyección; un cambio que aún no rige se reemplaza (ADR-0018).
 */
export function RateDialog({
  goalId,
  currentPercent,
  open,
  onOpenChange,
}: {
  goalId: string
  /** Tasa actual en porcentaje ("10.5"); ausente si la rentabilidad está apagada. */
  currentPercent?: string
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Rentabilidad</DialogTitle>
          <DialogDescription>
            La tasa efectiva anual (EA) de donde ahorras. Rige desde mañana y solo cambia la
            proyección: los intereses reales los conoce tu banco. Escribe 0 para apagarla.
          </DialogDescription>
        </DialogHeader>
        <RateForm
          goalId={goalId}
          currentPercent={currentPercent}
          onDone={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  )
}

function RateForm({
  goalId,
  currentPercent,
  onDone,
}: {
  goalId: string
  currentPercent?: string
  onDone: () => void
}) {
  const adjustRate = useAdjustSavingsRate()
  const [generalError, setGeneralError] = useState<string | null>(null)
  const form = useForm<RateFormValues>({
    resolver: zodResolver(rateFormSchema),
    defaultValues: { ratePercent: currentPercent ? formatPercent(currentPercent) : "" },
  })

  const onSubmit = form.handleSubmit((values) => {
    setGeneralError(null)
    adjustRate.mutate(
      { goalId, ratePercent: toRatePercent(values.ratePercent) },
      {
        onSuccess: (goal) => {
          toast.success(
            goal.ratePercent ? "Rentabilidad actualizada desde mañana." : "Rentabilidad apagada.",
          )
          onDone()
        },
        onError: (error) => {
          if (
            !setServerErrors(error, form.setError, ["ratePercent"], {
              "rate.invalid": "ratePercent",
            })
          ) {
            setGeneralError(error.message)
          }
        },
      },
    )
  })

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-6">
      <FormError message={generalError} />
      <FormTextField
        control={form.control}
        name="ratePercent"
        label="Tasa EA (%)"
        placeholder="Por ejemplo, 10,5"
        inputMode="text"
      />
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onDone} disabled={adjustRate.isPending}>
          Cancelar
        </Button>
        <Button type="submit" disabled={adjustRate.isPending}>
          {adjustRate.isPending && <LoaderCircleIcon className="animate-spin" aria-hidden />}
          Guardar tasa
        </Button>
      </DialogFooter>
    </form>
  )
}
