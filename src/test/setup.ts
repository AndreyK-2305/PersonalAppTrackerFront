import "@testing-library/jest-dom/vitest"
import { cleanup, configure } from "@testing-library/react"
import { afterEach, vi } from "vitest"

// Varias pruebas renderizan la aplicación completa (rutas, layout, formularios); en jsdom, y con
// varias pruebas en paralelo, encontrar un elemento puede tardar más del segundo por defecto.
configure({ asyncUtilTimeout: 5000 })

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
