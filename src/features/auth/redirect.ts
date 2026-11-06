/**
 * Destino tras iniciar sesión, tomado del parámetro `redirect`. Solo acepta rutas internas para
 * evitar redirecciones abiertas a otros sitios (por ejemplo, `//sitio-malicioso.com`).
 */
export function safeRedirect(value: string | null): string {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) {
    return "/"
  }
  return value
}

export function loginPathFor(path: string): string {
  return `/iniciar-sesion?redirect=${encodeURIComponent(path)}`
}
