import { zodResolver } from "@hookform/resolvers/zod"
import { LoaderCircleIcon } from "lucide-react"
import { useId, useState, type ReactNode } from "react"
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
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field"
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select"
import { useCurrentProfile } from "@/features/auth/hooks/use-auth"
import { todayIn } from "@/lib/dates"
import { setServerErrors } from "@/lib/form-errors"
import { formatDate, formatMoney } from "@/lib/format"
import { compareDecimal, formatMoneyInput, parseMoneyInput } from "@/lib/money"
import type { FinancedGoal, PrepaymentMode } from "../api/goals"
import { usePayInstallment, usePayThroughInstallment, usePrepayCredit } from "../hooks/use-goals"
import {
  creditPaymentFormSchema,
  payThroughFormSchema,
  PREPAYMENT_MODE_LABELS,
  PREPAYMENT_MODES,
  type CreditPaymentFormValues,
  type PayThroughFormValues,
} from "../schemas"

/** Campo del formulario al que corresponde cada regla del backend (ADR-0018). */
const FIELD_BY_CODE = {
  "goals.financed_record.payment_amount_invalid": "amount",
  "goals.financed_record.prepayment_amount_invalid": "amount",
  "goals.financed_record.date_invalid": "date",
} as const

interface CreditDialogProps {
  goal: FinancedGoal
  open: boolean
  onOpenChange: (open: boolean) => void
}

/** Paga la siguiente cuota pendiente. Lo que se pague de más es un abono a capital. */
export function PayInstallmentDialog({ goal, open, onOpenChange }: CreditDialogProps) {
  const next = goal.progress.nextInstallment
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Pagar cuota</DialogTitle>
          <DialogDescription>
            {next
              ? `Cuota ${next.number}, de ${formatMoney(next.payment, goal.currency)}, que vence el ${formatDate(next.dueDate)}. Es una marca dentro de la meta: no crea un movimiento en Finanzas.`
              : "El crédito ya está pagado."}
          </DialogDescription>
        </DialogHeader>
        {next && (
          <PayInstallmentForm
            goal={goal}
            installmentPayment={next.payment}
            onDone={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}

function PayInstallmentForm({
  goal,
  installmentPayment,
  onDone,
}: {
  goal: FinancedGoal
  installmentPayment: string
  onDone: () => void
}) {
  const payInstallment = usePayInstallment()
  return (
    <PaymentForm
      defaultAmount={formatMoneyInput(installmentPayment)}
      amountLabel="Valor pagado"
      amountDescription="Si pagas más que la cuota, el resto va a capital."
      submitLabel="Registrar pago"
      pending={payInstallment.isPending}
      showMode={(amount) => amount !== null && compareDecimal(amount, installmentPayment) > 0}
      modeLabel="Con lo pagado de más"
      onCancel={onDone}
      onSubmit={(values, amount, hasExcess, onError) =>
        payInstallment.mutate(
          {
            goalId: goal.id,
            date: values.date,
            amount,
            ...(hasExcess && { excessMode: values.mode }),
          },
          {
            onSuccess: () => {
              toast.success("Pago registrado.")
              onDone()
            },
            onError,
          },
        )
      }
    />
  )
}

/** Abono extraordinario: va completo a capital y reduce el plazo o la cuota. */
export function PrepaymentDialog({ goal, open, onOpenChange }: CreditDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Abonar a capital</DialogTitle>
          <DialogDescription>
            El abono baja el saldo de {formatMoney(goal.progress.balance, goal.currency)} y no
            reemplaza la cuota del mes.
          </DialogDescription>
        </DialogHeader>
        <PrepaymentForm goal={goal} onDone={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  )
}

function PrepaymentForm({ goal, onDone }: { goal: FinancedGoal; onDone: () => void }) {
  const prepayCredit = usePrepayCredit()
  return (
    <PaymentForm
      defaultAmount=""
      amountLabel="Valor del abono"
      submitLabel="Registrar abono"
      pending={prepayCredit.isPending}
      showMode={() => true}
      modeLabel="Qué hacer con el abono"
      onCancel={onDone}
      onSubmit={(values, amount, _hasExcess, onError) =>
        prepayCredit.mutate(
          { goalId: goal.id, date: values.date, amount, mode: values.mode },
          {
            onSuccess: () => {
              toast.success("Abono registrado.")
              onDone()
            },
            onError,
          },
        )
      }
    />
  )
}

/** Formulario común de un pago o un abono: valor, fecha y, si aplica, cómo usar el abono. */
function PaymentForm({
  defaultAmount,
  amountLabel,
  amountDescription,
  submitLabel,
  pending,
  showMode,
  modeLabel,
  onCancel,
  onSubmit,
}: {
  defaultAmount: string
  amountLabel: string
  amountDescription?: string
  submitLabel: string
  pending: boolean
  /** Recibe el valor escrito como cadena decimal, o `null` si aún no es un monto. */
  showMode: (amount: string | null) => boolean
  modeLabel: string
  onCancel: () => void
  onSubmit: (
    values: CreditPaymentFormValues,
    amount: string,
    modeShown: boolean,
    onError: (error: Error) => void,
  ) => void
}) {
  const profile = useCurrentProfile()
  const modeId = useId()
  const [generalError, setGeneralError] = useState<string | null>(null)
  const form = useForm<CreditPaymentFormValues>({
    resolver: zodResolver(creditPaymentFormSchema),
    defaultValues: {
      date: todayIn(profile.timeZone),
      amount: defaultAmount,
      mode: "REDUCE_TERM" satisfies PrepaymentMode,
    },
  })
  const typedAmount = parseMoneyInput(useWatch({ control: form.control, name: "amount" }) ?? "")
  const modeShown = showMode(typedAmount)

  const submit = form.handleSubmit((values) => {
    setGeneralError(null)
    const amount = parseMoneyInput(values.amount) ?? ""
    onSubmit(values, amount, showMode(amount), (error) => {
      if (!setServerErrors(error, form.setError, ["date", "amount"], FIELD_BY_CODE)) {
        setGeneralError(error.message)
      }
    })
  })

  return (
    <form onSubmit={submit} noValidate className="space-y-6">
      <FormError message={generalError} />
      <FieldGroup>
        <MoneyField
          control={form.control}
          name="amount"
          label={amountLabel}
          description={amountDescription}
        />
        <FormTextField control={form.control} name="date" label="Fecha" type="date" />
        {modeShown && (
          <Controller
            control={form.control}
            name="mode"
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor={modeId}>{modeLabel}</FieldLabel>
                <NativeSelect {...field} id={modeId}>
                  {PREPAYMENT_MODES.map((mode) => (
                    <NativeSelectOption key={mode} value={mode}>
                      {PREPAYMENT_MODE_LABELS[mode]}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
                <FieldDescription>Reducir el plazo ahorra más intereses.</FieldDescription>
                <FieldError errors={[fieldState.error]} />
              </Field>
            )}
          />
        )}
      </FieldGroup>
      <FormFooter pending={pending} submitLabel={submitLabel} onCancel={onCancel} />
    </form>
  )
}

/** Marca como pagadas todas las cuotas pendientes hasta la elegida, para un crédito que ya empezó. */
export function PayThroughDialog({ goal, open, onOpenChange }: CreditDialogProps) {
  const next = goal.progress.nextInstallment
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Marcar cuotas pagadas</DialogTitle>
          <DialogDescription>
            Para un crédito que ya empezó: marca de una vez todas las cuotas pendientes hasta la que
            elijas, cada una por su valor y en su fecha de vencimiento.
          </DialogDescription>
        </DialogHeader>
        {next && (
          <PayThroughForm
            goal={goal}
            firstPending={next.number}
            onDone={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}

function PayThroughForm({
  goal,
  firstPending,
  onDone,
}: {
  goal: FinancedGoal
  firstPending: number
  onDone: () => void
}) {
  const payThrough = usePayThroughInstallment()
  const lastPending = firstPending + goal.progress.pendingInstallments - 1
  const [generalError, setGeneralError] = useState<string | null>(null)
  const form = useForm<PayThroughFormValues>({
    resolver: zodResolver(payThroughFormSchema(firstPending, lastPending)),
    defaultValues: { installmentNumber: "" },
  })

  const submit = form.handleSubmit((values) => {
    setGeneralError(null)
    payThrough.mutate(
      { goalId: goal.id, installmentNumber: Number(values.installmentNumber) },
      {
        onSuccess: (detail) => {
          toast.success(`Cuotas pagadas: ${detail.goal.progress.paidInstallments}.`)
          onDone()
        },
        onError: (error) => {
          const assigned = setServerErrors(error, form.setError, ["installmentNumber"], {
            "goals.financed_record.installment_number_invalid": "installmentNumber",
          })
          if (!assigned) {
            setGeneralError(error.message)
          }
        },
      },
    )
  })

  return (
    <form onSubmit={submit} noValidate className="space-y-6">
      <FormError message={generalError} />
      <FormTextField
        control={form.control}
        name="installmentNumber"
        label="Pagadas hasta la cuota"
        inputMode="numeric"
        description={`Entre la ${firstPending} y la ${lastPending}.`}
      />
      <FormFooter pending={payThrough.isPending} submitLabel="Marcar pagadas" onCancel={onDone} />
    </form>
  )
}

export function FormFooter({
  pending,
  submitLabel,
  onCancel,
}: {
  pending: boolean
  submitLabel: ReactNode
  onCancel: () => void
}) {
  return (
    <DialogFooter>
      <Button type="button" variant="outline" onClick={onCancel} disabled={pending}>
        Cancelar
      </Button>
      <Button type="submit" disabled={pending}>
        {pending && <LoaderCircleIcon className="animate-spin" aria-hidden />}
        {submitLabel}
      </Button>
    </DialogFooter>
  )
}
