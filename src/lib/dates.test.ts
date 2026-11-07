import { describe, expect, it } from "vitest"
import { addDays, todayIn } from "./dates"

describe("todayIn", () => {
  it("usa la zona horaria indicada y no la del navegador", () => {
    // 03:00 UTC del 7 de noviembre: en Bogotá todavía es 6 y en Madrid ya es 7.
    const instant = new Date("2026-11-07T03:00:00Z")

    expect(todayIn("America/Bogota", instant)).toBe("2026-11-06")
    expect(todayIn("Europe/Madrid", instant)).toBe("2026-11-07")
  })
})

describe("addDays", () => {
  it("cruza meses y años", () => {
    expect(addDays("2026-11-30", 1)).toBe("2026-12-01")
    expect(addDays("2026-01-01", -1)).toBe("2025-12-31")
    expect(addDays("2028-02-28", 1)).toBe("2028-02-29")
  })
})
