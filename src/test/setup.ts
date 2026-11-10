import "@testing-library/jest-dom/vitest"
import { cleanup, configure } from "@testing-library/react"
import { afterEach, vi } from "vitest"

// Varias pruebas renderizan la aplicación completa (rutas, layout, formularios). Las páginas se
// cargan en diferido y la primera visita transforma su módulo (el resumen incluye Recharts); en
// jsdom, y con varias pruebas en paralelo, encontrar un elemento puede tardar varios segundos.
// Con 16 archivos en paralelo, la primera carga del resumen llegó a superar 10 s.
configure({ asyncUtilTimeout: 20_000 })

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

// jsdom no implementa matchMedia; la barra lateral lo usa para detectar pantallas móviles.
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query: string): MediaQueryList =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    }) as MediaQueryList,
})

// jsdom tampoco implementa ResizeObserver; las gráficas (Recharts) lo usan para medir su tamaño y,
// sin mediciones, dibujan con el tamaño inicial que les da ChartContainer.
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
globalThis.ResizeObserver ??= ResizeObserverStub as unknown as typeof ResizeObserver
