import { zodResolver } from "@hookform/resolvers/zod"
import { useQuery } from "@tanstack/react-query"
import { KeyRoundIcon, LoaderCircleIcon, PlusIcon, Trash2Icon } from "lucide-react"
import { useId, useState } from "react"
import { Controller, useForm } from "react-hook-form"
import { toast } from "sonner"
import { FormError } from "@/components/common/FormError"
import { FormTextField } from "@/components/common/FormTextField"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field"
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select"
import { Skeleton } from "@/components/ui/skeleton"
import { accountsQueryOptions, type Account } from "@/features/finance/api/finance"
import { setServerErrors } from "@/lib/form-errors"
import { ownKeysQueryOptions } from "../api/capture"
import { useAddOwnKey, useRemoveOwnKey } from "../hooks/use-capture"
import { ownKeySchema, type OwnKeyValues } from "../schemas"

const DEPOSIT_KINDS = new Set<Account["kind"]>(["SAVINGS", "CHECKING", "DIGITAL_WALLET"])

/**
 * Llaves Bre-B propias (ADR-0017). Una transferencia a una de estas llaves se registra como
 * transferencia hacia la cuenta indicada, no como gasto.
 */
export function OwnKeysCard() {
  const keys = useQuery(ownKeysQueryOptions)
  const accounts = useQuery(accountsQueryOptions)
  const removeKey = useRemoveOwnKey()
  const depositAccounts = (accounts.data?.accounts ?? []).filter(
    (account) => DEPOSIT_KINDS.has(account.kind) && !account.archived,
  )
  const accountName = (id: string) =>
    accounts.data?.accounts.find((account) => account.id === id)?.name ?? "Producto eliminado"

  return (
    <Card>
      <CardHeader>
        <CardTitle>Tus llaves Bre-B</CardTitle>
        <CardDescription>
          Correos, celulares, documentos o llaves como @rp… que llegan a tus propias cuentas. Lo que
          envíes a ellas se registra como transferencia entre tus productos.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {keys.isPending ? (
          <Skeleton className="h-16 w-full" aria-label="Cargando llaves" />
        ) : keys.isError ? (
          <FormError message={keys.error.message} />
        ) : keys.data.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aún no has registrado llaves.</p>
        ) : (
          <ul className="divide-y rounded-md border">
            {keys.data.map((key) => (
              <li key={key.id} className="flex items-center justify-between gap-2 px-3 py-2">
                <div className="flex min-w-0 items-center gap-2">
                  <KeyRoundIcon className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                  <div className="min-w-0">
                    <p className="truncate font-medium">{key.key}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      Llega a {accountName(key.productId)}
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Quitar la llave ${key.key}`}
                  disabled={removeKey.isPending}
                  onClick={() =>
                    removeKey.mutate(key.id, {
                      onSuccess: () => toast.success("Llave quitada."),
                      onError: (error) => toast.error(error.message),
                    })
                  }
                >
                  <Trash2Icon aria-hidden />
                </Button>
              </li>
            ))}
          </ul>
        )}
        {depositAccounts.length === 0 ? (
          accounts.isSuccess && (
            <p className="text-sm text-muted-foreground">
              Para registrar una llave, primero crea en Finanzas la cuenta o billetera a la que
              llega.
            </p>
          )
        ) : (
          <AddOwnKeyForm accounts={depositAccounts} />
        )}
      </CardContent>
    </Card>
  )
}

function AddOwnKeyForm({ accounts }: { accounts: Account[] }) {
  const addKey = useAddOwnKey()
  const productId = useId()
  const form = useForm<OwnKeyValues>({
    resolver: zodResolver(ownKeySchema),
    defaultValues: { key: "", productId: accounts[0]?.id ?? "" },
  })

  // Error que no corresponde a ningún campo; los demás se muestran en su campo.
  const [generalError, setGeneralError] = useState<string>()

  const onSubmit = form.handleSubmit((values) => {
    setGeneralError(undefined)
    addKey.mutate(values, {
      onSuccess: () => {
        toast.success("Llave registrada.")
        form.reset({ key: "", productId: values.productId })
      },
      onError: (error) => {
        const assigned = setServerErrors(error, form.setError, ["key", "productId"], {
          "capture.own_key.taken": "key",
          "capture.own_key.invalid": "key",
          "capture.own_key.product_invalid": "productId",
        })
        if (!assigned) {
          setGeneralError(error.message)
        }
      },
    })
  })

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      <FormError message={generalError} />
      <FieldGroup className="grid gap-4 sm:grid-cols-2">
        <FormTextField control={form.control} name="key" label="Llave" autoComplete="off" />
        <Controller
          control={form.control}
          name="productId"
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor={productId}>Llega a</FieldLabel>
              <NativeSelect {...field} id={productId} aria-invalid={fieldState.invalid}>
                {accounts.map((account) => (
                  <NativeSelectOption key={account.id} value={account.id}>
                    {account.name}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
              <FieldError errors={[fieldState.error]} />
            </Field>
          )}
        />
      </FieldGroup>
      <Button type="submit" variant="outline" disabled={addKey.isPending}>
        {addKey.isPending ? (
          <LoaderCircleIcon className="animate-spin" aria-hidden />
        ) : (
          <PlusIcon aria-hidden />
        )}
        Agregar llave
      </Button>
    </form>
  )
}
