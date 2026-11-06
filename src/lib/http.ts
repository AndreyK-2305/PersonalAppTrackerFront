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

export interface ApiRequestOptions extends Omit<RequestInit, "body"> {
  /** Cuerpo que se envía serializado como JSON. */
  json?: unknown
}

const CORRELATION_HEADER = "X-Correlation-Id"
const CSRF_COOKIE = "XSRF-TOKEN"
const CSRF_HEADER = "X-XSRF-TOKEN"
const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"])

/**
 * Llama a la API del mismo origen (ADR-0007) y devuelve el cuerpo JSON. Toda falla se traduce a
 * {@link ApiError}: errores de red, respuestas ProblemDetail y respuestas inesperadas.
 *
 * Las peticiones que modifican datos llevan el token CSRF de la cookie XSRF-TOKEN (ADR-0004). Si
 * el backend lo rechaza, se reintenta una vez: cada respuesta trae un token vigente.
 */
export async function apiFetch<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
  const response = await send(path, options)
  if (response.ok) {
    return response.status === 204 ? (undefined as T) : ((await response.json()) as T)
  }

  const problem = await readProblem(response)
  if (problem.code === "csrf_invalid" && !SAFE_METHODS.has(methodOf(options))) {
    const retried = await send(path, options)
    if (retried.ok) {
      return retried.status === 204 ? (undefined as T) : ((await retried.json()) as T)
    }
    throw new ApiError(await readProblem(retried))
  }
  throw new ApiError(problem)
}

async function send(path: string, { json, ...init }: ApiRequestOptions): Promise<Response> {
  const method = methodOf(init)
  const headers = new Headers(init.headers)
  if (!headers.has("Accept")) {
    headers.set("Accept", "application/json, application/problem+json")
  }
  if (json !== undefined) {
    headers.set("Content-Type", "application/json")
  }
  const csrfToken = readCookie(CSRF_COOKIE)
  if (!SAFE_METHODS.has(method) && csrfToken) {
    headers.set(CSRF_HEADER, csrfToken)
  }

  try {
    return await fetch(path, {
      ...init,
      method,
      headers,
      body: json === undefined ? undefined : JSON.stringify(json),
      credentials: "same-origin",
    })
  } catch {
    throw new ApiError({
      status: 0,
      code: "network_error",
      detail: "No fue posible conectar con el servidor. Revisa tu conexión e intenta de nuevo.",
    })
  }
}

function methodOf(init: RequestInit): string {
  return (init.method ?? "GET").toUpperCase()
}

function readCookie(name: string): string | undefined {
  const prefix = `${name}=`
  const cookie = document.cookie.split("; ").find((entry) => entry.startsWith(prefix))
  return cookie ? decodeURIComponent(cookie.slice(prefix.length)) : undefined
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
