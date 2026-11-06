import type { FieldViolation, ProblemDetail } from "@/types/problem-detail"

/** Error de la API con el formato ProblemDetail. `status` es 0 cuando no hubo respuesta. */
export class ApiError extends Error {
  readonly status: number
  readonly code: string
  readonly correlationId?: string
  readonly fieldErrors: FieldViolation[]

  constructor(problem: ProblemDetail) {
    super(problem.detail ?? "No fue posible procesar la solicitud.")
    this.name = "ApiError"
    this.status = problem.status
    this.code = problem.code
    this.correlationId = problem.correlationId
    this.fieldErrors = problem.errors ?? []
  }
}

const CORRELATION_HEADER = "X-Correlation-Id"

/**
 * Llama a la API del mismo origen (ADR-0007) y devuelve el cuerpo JSON. Toda falla se traduce a
 * {@link ApiError}: errores de red, respuestas ProblemDetail y respuestas inesperadas.
 */
export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers)
  if (!headers.has("Accept")) {
    headers.set("Accept", "application/json, application/problem+json")
  }

  let response: Response
  try {
    response = await fetch(path, { ...init, headers, credentials: "same-origin" })
  } catch {
    throw new ApiError({
      status: 0,
      code: "network_error",
      detail: "No fue posible conectar con el servidor. Revisa tu conexión e intenta de nuevo.",
    })
  }

  if (!response.ok) {
    throw new ApiError(await readProblem(response))
  }
  if (response.status === 204) {
    return undefined as T
  }
  return (await response.json()) as T
}

async function readProblem(response: Response): Promise<ProblemDetail> {
  const contentType = response.headers.get("Content-Type") ?? ""
  if (contentType.includes("application/problem+json")) {
    try {
      return (await response.json()) as ProblemDetail
    } catch {
      // Cuerpo ilegible: se responde con el error genérico de abajo.
    }
  }
  return {
    status: response.status,
    code: "unexpected_response",
    detail: "El servidor respondió de forma inesperada. Intenta de nuevo más tarde.",
    correlationId: response.headers.get(CORRELATION_HEADER) ?? undefined,
  }
}
