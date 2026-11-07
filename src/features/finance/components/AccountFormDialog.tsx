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
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field"
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select"
import { setServerErrors } from "@/lib/form-errors"
import type { Account } from "../api/finance"
import { useCreateAccount, useUpdateAccount } from "../hooks/use-finance"
import {
  ACCOUNT_KIND_LABELS,
  CREATABLE_ACCOUNT_KINDS,
  DEPOSIT_KINDS,
  INSTITUTION_SUGGESTIONS,
} from "../labels"
import {
  accountFormDefaults,
  accountFormSchema,
  toAccountRequest,
  type AccountFormValues,
} from "../schemas"

const FIELDS = [
  "kind",
  "name",
  "institution",
  "lastFourDigits",
  "openingBalance",
  "creditLimit",
  "initialDebt",
] as const

interface AccountFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Producto que se edita; si falta, se crea uno nuevo. */
  account?: Account
}

export function AccountFormDialog({ open, onOpenChange, account }: AccountFormDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{account ? "Editar producto" : "Nuevo producto"}</DialogTitle>
          <DialogDescription>
            Nunca escribas el número completo de una tarjeta o cuenta: bastan los últimos 4 dígitos.
          </DialogDescription>
        </DialogHeader>
        {/* El formulario se monta al abrir el diálogo, así empieza siempre con los datos actuales. */}
        <AccountForm account={account} onDone={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  )
}

function AccountForm({ account, onDone }: { account?: Account; onDone: () => void }) {
  const createAccount = useCreateAccount()
  const updateAccount = useUpdateAccount()
  const [generalError, setGeneralError] = useState<string | null>(null)
  const kindId = useId()
  const form = useForm<AccountFormValues>({
    resolver: zodResolver(accountFormSchema),
    defaultValues: accountFormDefaults(account),
  })
  const kind = useWatch({ control: form.control, name: "kind" })
  const isCard = kind === "CREDIT_CARD"
  const isDeposit = DEPOSIT_KINDS.includes(kind)
  // Al editar, el tipo solo cambia entre cuentas de depósito (ADR-0014).
  const kindOptions = !account
    ? CREATABLE_ACCOUNT_KINDS
    : DEPOSIT_KINDS.includes(account.kind)
      ? CREATABLE_ACCOUNT_KINDS.filter((option) => DEPOSIT_KINDS.includes(option))
      : CREATABLE_ACCOUNT_KINDS.filter((option) => option === account.kind)
  const pending = createAccount.isPending || updateAccount.isPending

  const onSubmit = form.handleSubmit((values) => {
    setGeneralError(null)
    const request = toAccountRequest(values)
    const options = {
      onSuccess: () => {
        toast.success(account ? "Producto actualizado." : "Producto creado.")
        onDone()
      },
      onError: (error: Error) => {
        const fieldByCode = {
          "finance.account.name_taken": "name",
          "finance.account.name_invalid": "name",
          "finance.account.institution_invalid": "institution",
          "finance.account.last_four_invalid": "lastFourDigits",
          "finance.account.credit_limit_invalid": "creditLimit",
          "finance.account.opening_balance_invalid": isCard ? "initialDebt" : "openingBalance",
        } as const
        if (!setServerErrors(error, form.setError, FIELDS, fieldByCode)) {
          setGeneralError(error.message)
        }
      },
    }
    if (account) {
      updateAccount.mutate({ id: account.id, ...request }, options)
    } else {
      createAccount.mutate(request, options)
    }
  })

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-6">
      <FormError message={generalError} />
      <FieldGroup>
        <Controller
          control={form.control}
          name="kind"
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor={kindId}>Tipo</FieldLabel>
              <NativeSelect {...field} id={kindId} disabled={kindOptions.length === 1}>
                {kindOptions.map((option) => (
                  <NativeSelectOption key={option} value={option}>
                    {ACCOUNT_KIND_LABELS[option]}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
              {account && (
                <FieldDescription>
                  {kindOptions.length === 1
                    ? "El tipo de producto no se puede cambiar."
                    : "Puedes cambiar entre cuenta de ahorros, corriente y billetera digital."}
                </FieldDescription>
              )}
              <FieldError errors={[fieldState.error]} />
            </Field>
          )}
        />
        <FormTextField
          control={form.control}
          name="name"
          label="Nombre"
          placeholder={isCard ? "Por ejemplo, Visa Bancolombia" : "Por ejemplo, Ahorros nómina"}
        />
        {(isCard || isDeposit) && (
          <div className="grid gap-4 sm:grid-cols-2">
            <FormTextField
              control={form.control}
              name="institution"
              label="Entidad"
              suggestions={INSTITUTION_SUGGESTIONS}
            />
            <FormTextField
              control={form.control}
              name="lastFourDigits"
              label="Últimos 4 dígitos (opcional)"
              inputMode="numeric"
              placeholder="5403"
            />
          </div>
        )}
        {isCard ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <MoneyField control={form.control} name="creditLimit" label="Cupo" />
            <MoneyField
              control={form.control}
              name="initialDebt"
              label="Deuda actual"
              description="Lo que debes hoy; 0 si la tarjeta está al día."
            />
          </div>
        ) : (
          <MoneyField
            control={form.control}
            name="openingBalance"
            label="Saldo inicial"
            allowNegative={isDeposit}
            description={
              isDeposit
                ? "Saldo antes de los movimientos que registres; negativo si está sobregirada."
                : "Efectivo que tienes antes de los movimientos que registres."
            }
          />
        )}
      </FieldGroup>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onDone} disabled={pending}>
          Cancelar
        </Button>
        <Button type="submit" disabled={pending}>
          {pending && <LoaderCircleIcon className="animate-spin" aria-hidden />}
          {account ? "Guardar cambios" : "Crear producto"}
        </Button>
      </DialogFooter>
    </form>
  )
}
