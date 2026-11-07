import { zodResolver } from "@hookform/resolvers/zod"
import { LoaderCircleIcon } from "lucide-react"
import { useId, useState } from "react"
import { Controller, useForm, useWatch, type Control } from "react-hook-form"
import { toast } from "sonner"
import { FormError } from "@/components/common/FormError"
import { FormTextField } from "@/components/common/FormTextField"
import { MoneyField } from "@/components/common/MoneyField"
import { Badge } from "@/components/ui/badge"
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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useCurrentProfile } from "@/features/auth/hooks/use-auth"
import { todayIn } from "@/lib/dates"
import { setServerErrors } from "@/lib/form-errors"
import type { Account, Category, Transaction, TransactionType } from "../api/finance"
import { useRecordTransaction, useUpdateTransaction } from "../hooks/use-finance"
import { PAYMENT_CHANNEL_LABELS, TRANSACTION_TYPE_LABELS } from "../labels"
import { categoryOptions, selectableAccounts } from "../lookups"
import {
  toTransactionRequest,
  transactionFormDefaults,
  transactionFormSchema,
  type TransactionFormValues,
} from "../schemas"

const TYPES: TransactionType[] = ["EXPENSE", "INCOME", "TRANSFER", "ADJUSTMENT"]

const FIELDS = [
  "type",
  "amount",
  "date",
  "sourceAccountId",
  "destinationAccountId",
  "accountId",
  "direction",
  "categoryId",
  "description",
  "merchant",
  "channel",
] as const

const DESCRIPTIONS: Record<TransactionType, string> = {
  EXPENSE: "Dinero que sale de un producto tuyo: compras, pagos de servicios, retiros que gastas.",
  INCOME: "Dinero que entra a un producto tuyo desde afuera: salario, ventas, rendimientos.",
  TRANSFER:
    "Dinero entre tus productos, como pagar la tarjeta o pasar plata a Nequi. No es ingreso ni gasto.",
  ADJUSTMENT: "Corrige un saldo para que cuadre con el banco. No cuenta como ingreso ni gasto.",
}

interface TransactionFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  accounts: Account[]
  categories: Category[]
  /** Movimiento que se edita; si falta, se registra uno nuevo. */
  transaction?: Transaction
}

export function TransactionFormDialog({
  open,
  onOpenChange,
  ...props
}: TransactionFormDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{props.transaction ? "Editar movimiento" : "Nuevo movimiento"}</DialogTitle>
          <DialogDescription>
            {props.transaction
              ? "El tipo no se puede cambiar: si te equivocaste, bórralo y regístralo de nuevo."
              : "Registra un gasto, un ingreso, una transferencia entre tus productos o un ajuste."}
          </DialogDescription>
        </DialogHeader>
        <TransactionForm {...props} onDone={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  )
}

function TransactionForm({
  accounts,
  categories,
  transaction,
  onDone,
}: Omit<TransactionFormDialogProps, "open" | "onOpenChange"> & { onDone: () => void }) {
  const { timeZone } = useCurrentProfile()
  const recordTransaction = useRecordTransaction()
  const updateTransaction = useUpdateTransaction()
  const [generalError, setGeneralError] = useState<string | null>(null)
  const form = useForm<TransactionFormValues>({
    resolver: zodResolver(transactionFormSchema),
    defaultValues: transactionFormDefaults(todayIn(timeZone), transaction),
  })
  const type = useWatch({ control: form.control, name: "type" })
  const pending = recordTransaction.isPending || updateTransaction.isPending

  const keep = (id?: string | null) => id ?? undefined
  const withOther = selectableAccounts(accounts, {
    withOther: true,
    keep: keep(transaction?.sourceAccountId ?? transaction?.destinationAccountId),
  })
  const ownAccounts = (current?: string | null) =>
    selectableAccounts(accounts, { withOther: false, keep: keep(current) })
  const categoryKind = type === "INCOME" ? "INCOME" : "EXPENSE"
  const selectableCategories = categoryOptions(categories).filter(
    (option) =>
      option.kind === categoryKind && (!option.archived || option.id === transaction?.categoryId),
  )

  const onSubmit = form.handleSubmit((values) => {
    setGeneralError(null)
    const accountField =
      values.type === "EXPENSE"
        ? "sourceAccountId"
        : values.type === "INCOME"
          ? "destinationAccountId"
          : values.type === "TRANSFER"
            ? "destinationAccountId"
            : "accountId"
    const options = {
      onSuccess: () => {
        toast.success(transaction ? "Movimiento actualizado." : "Movimiento registrado.")
        onDone()
      },
      onError: (error: Error) => {
        const fieldByCode = {
          "finance.transaction.amount_invalid": "amount",
          "finance.transfer.same_account": "destinationAccountId",
          "finance.transaction.account_not_allowed": accountField,
          "finance.account.archived": accountField,
          "finance.category.kind_mismatch": "categoryId",
          "finance.category.archived": "categoryId",
        } as const
        if (!setServerErrors(error, form.setError, FIELDS, fieldByCode)) {
          setGeneralError(error.message)
        }
      },
    }
    const request = toTransactionRequest(values)
    if (transaction) {
      updateTransaction.mutate({ id: transaction.id, ...request }, options)
    } else {
      recordTransaction.mutate(request, options)
    }
  })

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-6">
      {transaction ? (
        <Badge variant="secondary">{TRANSACTION_TYPE_LABELS[transaction.type]}</Badge>
      ) : (
        <Controller
          control={form.control}
          name="type"
          render={({ field }) => (
            <Tabs
              value={field.value}
              onValueChange={(value) => {
                field.onChange(value)
                form.clearErrors()
              }}
            >
              <TabsList className="w-full">
                {TYPES.map((option) => (
                  <TabsTrigger key={option} value={option}>
                    {TRANSACTION_TYPE_LABELS[option]}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          )}
        />
      )}
      <p className="text-sm text-muted-foreground">{DESCRIPTIONS[type]}</p>
      <FormError message={generalError} />
      <FieldGroup>
        <div className="grid gap-4 sm:grid-cols-2">
          <MoneyField control={form.control} name="amount" label="Monto" />
          <FormTextField control={form.control} name="date" label="Fecha" type="date" />
        </div>

        {type === "EXPENSE" && (
          <AccountSelect
            control={form.control}
            name="sourceAccountId"
            label="Producto"
            accounts={withOther}
          />
        )}
        {type === "INCOME" && (
          <AccountSelect
            control={form.control}
            name="destinationAccountId"
            label="Producto"
            accounts={withOther}
          />
        )}
        {type === "TRANSFER" && (
          <div className="grid gap-4 sm:grid-cols-2">
            <AccountSelect
              control={form.control}
              name="sourceAccountId"
              label="Desde"
              accounts={ownAccounts(transaction?.sourceAccountId)}
            />
            <AccountSelect
              control={form.control}
              name="destinationAccountId"
              label="Hacia"
              accounts={ownAccounts(transaction?.destinationAccountId)}
            />
          </div>
        )}
        {type === "ADJUSTMENT" && (
          <div className="grid gap-4 sm:grid-cols-2">
            <AccountSelect
              control={form.control}
              name="accountId"
              label="Producto"
              accounts={ownAccounts(
                transaction?.sourceAccountId ?? transaction?.destinationAccountId,
              )}
            />
            <SimpleSelect
              control={form.control}
              name="direction"
              label="Ajuste"
              options={[
                { value: "INCREASE", label: "Aumentar el saldo" },
                { value: "DECREASE", label: "Disminuir el saldo" },
              ]}
            />
          </div>
        )}

        {(type === "EXPENSE" || type === "INCOME") && (
          <SimpleSelect
            control={form.control}
            name="categoryId"
            label="Categoría"
            options={[
              { value: "", label: "Sin categoría" },
              ...selectableCategories.map((option) => ({ value: option.id, label: option.label })),
            ]}
          />
        )}
        <FormTextField control={form.control} name="description" label="Descripción (opcional)" />
        {(type === "EXPENSE" || type === "INCOME") && (
          <div className="grid gap-4 sm:grid-cols-2">
            <FormTextField
              control={form.control}
              name="merchant"
              label="Comercio (opcional)"
              placeholder={type === "EXPENSE" ? "Por ejemplo, Éxito" : "Por ejemplo, tu empresa"}
            />
            <SimpleSelect
              control={form.control}
              name="channel"
              label="Medio de pago"
              options={[
                { value: "", label: "Sin indicar" },
                ...Object.entries(PAYMENT_CHANNEL_LABELS).map(([value, label]) => ({
                  value,
                  label,
                })),
              ]}
            />
          </div>
        )}
      </FieldGroup>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onDone} disabled={pending}>
          Cancelar
        </Button>
        <Button type="submit" disabled={pending}>
          {pending && <LoaderCircleIcon className="animate-spin" aria-hidden />}
          {transaction ? "Guardar cambios" : "Registrar"}
        </Button>
      </DialogFooter>
    </form>
  )
}

type SelectFieldName =
  "sourceAccountId" | "destinationAccountId" | "accountId" | "direction" | "categoryId" | "channel"

function AccountSelect({
  control,
  name,
  label,
  accounts,
}: {
  control: Control<TransactionFormValues>
  name: "sourceAccountId" | "destinationAccountId" | "accountId"
  label: string
  accounts: Account[]
}) {
  return (
    <SimpleSelect
      control={control}
      name={name}
      label={label}
      options={[
        { value: "", label: "Elige un producto" },
        ...accounts.map((account) => ({
          value: account.id,
          label: account.archived ? `${account.name} (archivado)` : account.name,
        })),
      ]}
    />
  )
}

function SimpleSelect({
  control,
  name,
  label,
  options,
}: {
  control: Control<TransactionFormValues>
  name: SelectFieldName
  label: string
  options: { value: string; label: string }[]
}) {
  const id = useId()
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <Field data-invalid={fieldState.invalid}>
          <FieldLabel htmlFor={id}>{label}</FieldLabel>
          <NativeSelect {...field} id={id} aria-invalid={fieldState.invalid}>
            {options.map((option) => (
              <NativeSelectOption key={option.value} value={option.value}>
                {option.label}
              </NativeSelectOption>
            ))}
          </NativeSelect>
          <FieldError errors={[fieldState.error]} />
        </Field>
      )}
    />
  )
}
