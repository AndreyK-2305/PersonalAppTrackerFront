import { LoaderCircleIcon, WalletIcon } from "lucide-react"
import { useId, useState } from "react"
import { FormError } from "@/components/common/FormError"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Field, FieldContent, FieldDescription, FieldLabel } from "@/components/ui/field"
import { useSetUpFinance } from "../hooks/use-finance"

/** Bienvenida de Finanzas: crea el producto "Otro" y, si el usuario quiere, el catálogo sugerido. */
export function FinanceWelcome() {
  const setUp = useSetUpFinance()
  const [withSuggestedCategories, setWithSuggestedCategories] = useState(true)
  const checkboxId = useId()

  return (
    <div className="mx-auto max-w-xl py-6">
      <Card>
        <CardHeader>
          <div className="mb-2 flex size-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <WalletIcon className="size-5" aria-hidden />
          </div>
          <CardTitle className="text-xl">Te damos la bienvenida a Finanzas</CardTitle>
          <CardDescription>Antes de empezar, preparamos tu espacio.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <ul className="list-disc space-y-2 pl-5 text-sm text-muted-foreground">
            <li>
              Crearemos el producto <strong className="text-foreground">Otro</strong>, que recibe
              los movimientos cuyo producto no se identifica. No lleva saldo y no se puede borrar.
            </li>
            <li>
              Después registras tus productos (efectivo, cuentas, billeteras y tarjetas) y tus
              movimientos.
            </li>
          </ul>
          <Field orientation="horizontal">
            <Checkbox
              id={checkboxId}
              checked={withSuggestedCategories}
              onCheckedChange={(checked) => setWithSuggestedCategories(checked === true)}
            />
            <FieldContent>
              <FieldLabel htmlFor={checkboxId}>Usar las categorías sugeridas</FieldLabel>
              <FieldDescription>
                Vivienda, Alimentación, Transporte, Salud, Servicios financieros (con 4x1000 y cuota
                de manejo), Salario y más. Podrás editarlas cuando quieras.
              </FieldDescription>
            </FieldContent>
          </Field>
          <FormError message={setUp.error?.message} />
          <Button onClick={() => setUp.mutate(withSuggestedCategories)} disabled={setUp.isPending}>
            {setUp.isPending && <LoaderCircleIcon className="animate-spin" aria-hidden />}
            Empezar
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
