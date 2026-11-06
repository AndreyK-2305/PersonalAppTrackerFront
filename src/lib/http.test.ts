import { describe, expect, it, vi } from "vitest"
import { stubJsonResponse, stubNetworkFailure } from "@/test/http-stubs"
import { ApiError, apiFetch } from "./http"

describe("apiFetch", () => {
  it("devuelve el cuerpo JSON de una respuesta exitosa", async () => {
    stubJsonResponse({ status: "UP" })

    await expect(apiFetch("/actuator/health")).resolves.toEqual({ status: "UP" })
  })

  it("pide JSON y envía cookies solo al mismo origen", async () => {
    const fetchMock = stubJsonResponse({})

    await apiFetch("/api/v1/example")

    const [, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit]
    expect(init.credentials).toBe("same-origin")
    expect(new Headers(init.headers).get("Accept")).toContain("application/json")
  })

  it("convierte una respuesta ProblemDetail en ApiError", async () => {
    stubJsonResponse(
      {
        status: 400,
        code: "validation_error",
        detail: "La solicitud contiene datos inválidos.",
        correlationId: "abc-123",
        errors: [{ field: "name", message: "no debe estar vacío" }],
      },
      { status: 400, headers: { "Content-Type": "application/problem+json" } },
    )

    const error = await apiFetch("/api/v1/example").catch((e: unknown) => e)

    expect(error).toBeInstanceOf(ApiError)
    expect(error).toMatchObject({
      status: 400,
      code: "validation_error",
      message: "La solicitud contiene datos inválidos.",
      correlationId: "abc-123",
      fieldErrors: [{ field: "name", message: "no debe estar vacío" }],
    })
  })

  it("envía el token CSRF y el JSON solo en las peticiones que modifican datos", async () => {
    document.cookie = "XSRF-TOKEN=token-123"
    const fetchMock = stubJsonResponse({})

    await apiFetch("/api/v1/example", { method: "POST", json: { name: "Kevin" } })
    await apiFetch("/api/v1/example")

    const [, post] = fetchMock.mock.calls[0] as unknown as [string, RequestInit]
    const [, get] = fetchMock.mock.calls[1] as unknown as [string, RequestInit]
    expect(new Headers(post.headers).get("X-XSRF-TOKEN")).toBe("token-123")
    expect(new Headers(post.headers).get("Content-Type")).toBe("application/json")
    expect(post.body).toBe('{"name":"Kevin"}')
    expect(new Headers(get.headers).has("X-XSRF-TOKEN")).toBe(false)
    document.cookie = "XSRF-TOKEN=; max-age=0"
  })

  it("reintenta una vez si el backend rechaza el token CSRF", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ status: 403, code: "csrf_invalid" }), {
          status: 403,
          headers: { "Content-Type": "application/problem+json" },
        }),
      )
      .mockResolvedValueOnce(new Response(JSON.stringify({ ok: true }), { status: 200 }))
    vi.stubGlobal("fetch", fetchMock)

    await expect(apiFetch("/api/v1/example", { method: "POST" })).resolves.toEqual({ ok: true })
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it("traduce un fallo de red a ApiError con status 0", async () => {
    stubNetworkFailure()

    await expect(apiFetch("/api/v1/example")).rejects.toMatchObject({
      status: 0,
      code: "network_error",
    })
  })

  it("traduce una respuesta que no es ProblemDetail a un error genérico", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response("<html>Bad Gateway</html>", {
            status: 502,
            headers: { "Content-Type": "text/html", "X-Correlation-Id": "proxy-1" },
          }),
      ),
    )

    await expect(apiFetch("/api/v1/example")).rejects.toMatchObject({
      status: 502,
      code: "unexpected_response",
      correlationId: "proxy-1",
    })
  })
})
