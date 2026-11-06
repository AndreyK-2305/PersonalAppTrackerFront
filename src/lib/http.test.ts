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
