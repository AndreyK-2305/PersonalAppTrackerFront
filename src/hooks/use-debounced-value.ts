import { useEffect, useState } from "react"

/**
 * Devuelve `value` cuando lleva `delayMs` sin cambiar. Sirve para no consultar al servidor en cada
 * tecla. Compara por identidad: para objetos, pasa una clave de texto estable.
 */
export function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs)
    return () => clearTimeout(timer)
  }, [value, delayMs])
  return debounced
}
