import type { FieldValues, Path, UseFormSetError } from "react-hook-form"
import { ApiError } from "./http"

/**
 * Asigna a los campos del formulario los errores del backend que les corresponden: los de
 * `validation_error` por nombre de campo y los de dominio según `fieldByCode`. Devuelve `true` si
 * asignó alguno; si no, el error debe mostrarse como error general del formulario.
 */
export function setServerErrors<T extends FieldValues>(
  error: unknown,
  setError: UseFormSetError<T>,
  fields: readonly Path<T>[],
  fieldByCode: Record<string, Path<T>> = {},
): boolean {
  if (!(error instanceof ApiError)) {
    return false
  }
  const byCode = fieldByCode[error.code]
  if (byCode) {
    setError(byCode, { message: error.message })
    return true
  }
  let assigned = false
  for (const violation of error.fieldErrors) {
    const field = fields.find((name) => name === violation.field)
    if (field) {
      setError(field, { message: capitalize(violation.message) })
      assigned = true
    }
  }
  return assigned
}

/** Los mensajes de Bean Validation empiezan en minúscula ("no debe estar vacío"). */
function capitalize(message: string): string {
  return message.charAt(0).toUpperCase() + message.slice(1) + (message.endsWith(".") ? "" : ".")
}
