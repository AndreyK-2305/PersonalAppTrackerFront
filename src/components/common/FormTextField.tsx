import { useId } from "react"
import { Controller, type Control, type FieldValues, type Path } from "react-hook-form"
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"

interface FormTextFieldProps<T extends FieldValues> {
  control: Control<T>
  name: Path<T>
  label: string
  type?: "text" | "email" | "password" | "date"
  autoComplete?: string
  description?: string
  placeholder?: string
  inputMode?: "text" | "numeric"
  /** Sugerencias que el navegador ofrece mientras se escribe (`<datalist>`); se puede escribir otro valor. */
  suggestions?: readonly string[]
}

/** Campo de texto de React Hook Form con etiqueta, ayuda y mensaje de error accesibles. */
export function FormTextField<T extends FieldValues>({
  control,
  name,
  label,
  type = "text",
  autoComplete,
  description,
  placeholder,
  inputMode,
  suggestions,
}: FormTextFieldProps<T>) {
  const id = useId()
  const listId = `${id}-suggestions`

  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <Field data-invalid={fieldState.invalid}>
          <FieldLabel htmlFor={id}>{label}</FieldLabel>
          <Input
            {...field}
            id={id}
            type={type}
            autoComplete={autoComplete}
            placeholder={placeholder}
            inputMode={inputMode}
            list={suggestions ? listId : undefined}
            aria-invalid={fieldState.invalid}
          />
          {suggestions && (
            <datalist id={listId}>
              {suggestions.map((suggestion) => (
                <option key={suggestion} value={suggestion} />
              ))}
            </datalist>
          )}
          {description && <FieldDescription>{description}</FieldDescription>}
          <FieldError errors={[fieldState.error]} />
        </Field>
      )}
    />
  )
}
