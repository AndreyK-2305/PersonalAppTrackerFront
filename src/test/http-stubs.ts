import { vi } from "vitest"

type JsonReply = { status?: number; body?: unknown; contentType?: string }
type Reply = JsonReply | ((init: RequestInit | undefined) => Response | Promise<Response>)

export function jsonResponse(body: unknown, init: ResponseInit = {}): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    ...init,
    headers: { "Content-Type": "application/json", ...init.headers },
  })
}

/** Respuesta 204 sin cuerpo (una respuesta 204 con cuerpo hace fallar a `Response`). */
export const noContent = () => new Response(null, { status: 204 })

/** Respuesta de error con formato ProblemDetail. */
export function problem(status: number, code: string, detail = "Error de prueba."): JsonReply {
  return { status, body: { status, code, detail }, contentType: "application/problem+json" }
}

/**
 * Sustituye `fetch` por un enrutador de respuestas con claves "MÉTODO /ruta". Una ruta sin
 * respuesta definida devuelve 404, para que una llamada inesperada se note en la prueba.
 */
export function stubApi(routes: Record<string, Reply>) {
  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const reply = routes[`${(init?.method ?? "GET").toUpperCase()} ${String(input)}`]
    if (!reply) {
      return jsonResponse(
        { status: 404, code: "not_found" },
        { status: 404, headers: { "Content-Type": "application/problem+json" } },
      )
    }
    if (typeof reply === "function") {
      return reply(init)
    }
    return jsonResponse(reply.body ?? {}, {
      status: reply.status ?? 200,
      headers: reply.contentType ? { "Content-Type": reply.contentType } : undefined,
    })
  })
  vi.stubGlobal("fetch", fetchMock)
  return fetchMock
}

/** Sustituye `fetch` por una función que responde siempre con el JSON indicado. */
export function stubJsonResponse(body: unknown, init: ResponseInit = {}) {
  const fetchMock = vi.fn(async () => jsonResponse(body, init))
  vi.stubGlobal("fetch", fetchMock)
  return fetchMock
}

/** Sustituye `fetch` por una función que falla como lo hace ante un error de red. */
export function stubNetworkFailure() {
  const fetchMock = vi.fn(async () => {
    throw new TypeError("Failed to fetch")
  })
  vi.stubGlobal("fetch", fetchMock)
  return fetchMock
}

/** Petición enviada a `fetch` con el método indicado (la primera que coincida). */
export function requestWithMethod(
  fetchMock: ReturnType<typeof vi.fn>,
  method: string,
): RequestInit {
  const call = fetchMock.mock.calls.find(
    ([, init]) => (init as RequestInit | undefined)?.method === method,
  )
  if (!call) {
    throw new Error(`No se envió ninguna petición ${method}`)
  }
  return call[1] as RequestInit
}
