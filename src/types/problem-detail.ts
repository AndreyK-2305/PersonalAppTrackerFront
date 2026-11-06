/**
 * Respuesta de error de la API (RFC 9457). El campo `code` es estable y es el que debe usarse
 * para decidir qué hacer; `detail` está en español y se puede mostrar al usuario.
 * Ver backend/docs/api/conventions.md.
 */
export interface ProblemDetail {
  type?: string
  title?: string
  status: number
  detail?: string
  instance?: string
  code: string
  correlationId?: string
  errors?: FieldViolation[]
}

export interface FieldViolation {
  field: string
  message: string
}
