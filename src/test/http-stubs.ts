import { vi } from "vitest"

/** Sustituye `fetch` por una función que responde siempre con el JSON indicado. */
export function stubJsonResponse(body: unknown, init: ResponseInit = {}) {
  const fetchMock = vi.fn(
    async () =>
      new Response(JSON.stringify(body), {
        status: 200,
        ...init,
        headers: { "Content-Type": "application/json", ...init.headers },
      }),
  )
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
