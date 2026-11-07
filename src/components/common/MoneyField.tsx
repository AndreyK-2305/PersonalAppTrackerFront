import { useId } from "react"
import { Controller, type Control, type FieldValues, type Path } from "react-hook-form"
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { formatMoneyInput, parseMoneyInput } from "@/lib/money"

interface MoneyFieldProps<T extends FieldValues> {
  control: Control<T>
  name: Path<T>
  label: string
  description?: string
  allowNegative?: boolean
}

/**
 * Campo de monto en pesos con formato es-CO: punto para miles y coma para decimales (ADR-0006).
 * El valor del formulario es el texto escrito; el esquema lo convierte a la cadena decimal de la
 * API con `parseMoneyInput`. Al salir del campo se muestra con separadores de miles.
 */
export function MoneyField<T extends FieldValues>({
  control,
  name,
  label,
  description,
  allowNegative = false,
}: MoneyFieldProps<T>) {
  const id = useId()

  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <Field data-invalid={fieldState.invalid}>
          <FieldLabel htmlFor={id}>{label}</FieldLabel>
          <div className="relative">
            <span
              className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm text-muted-foreground"
              aria-hidden
            >
              $
            </span>
            <Input
              {...field}
              id={id}
              inputMode="decimal"
              autoComplete="off"
              placeholder="0"
              className="pl-7 tabular-nums"
              aria-invalid={fieldState.invalid}
              onBlur={() => {
                const decimal = parseMoneyInput(field.value ?? "", { allowNegative })
                if (decimal !== null) {
                  field.onChange(formatMoneyInput(decimal))
                }
                field.onBlur()
              }}
            />
          </div>
          {description && <FieldDescription>{description}</FieldDescription>}
          <FieldError errors={[fieldState.error]} />
        </Field>
      )}
    />
  )
}
