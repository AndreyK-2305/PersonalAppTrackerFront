# Convenciones del frontend

Complementan las decisiones del sistema, documentadas en el repositorio del backend (`docs/decisions/`), y `PROJECT_CONTEXT.md`.

## Organización por funcionalidades

- Cada funcionalidad vive en `src/features/<feature>/`:
  - `api/`: funciones de acceso a la API y `queryOptions`;
  - `components/`;
  - `hooks/`;
  - `schemas.ts`: esquemas Zod de los formularios;
  - `pages/`.
- Solo se crean las subcarpetas que se usan.
- Lo que comparten varias funcionalidades sube a `components/common`, `hooks` o `lib`. Una funcionalidad no importa componentes internos de otra.
- No hay carpetas `services/` ni `stores/`: las llamadas a la API viven en su funcionalidad y el estado del servidor lo maneja TanStack Query.

## Datos del servidor

- **TanStack Query** gestiona todo dato que venga de la API. No se copian datos del servidor a `useState` ni a un estado global.
- **`queryOptions`:** las consultas se definen con `queryOptions` en `features/<feature>/api/`, con claves jerárquicas que empiezan por el módulo, por ejemplo `["finance", "accounts", filtros]`.
- **Reintentos:** la configuración global (`src/app/query-client.ts`) reintenta una vez los fallos de red o del servidor y nunca los errores 4xx.

## Cliente HTTP

- Toda llamada pasa por `apiFetch` (`src/lib/http.ts`):
  - usa el mismo origen y `credentials: "same-origin"`;
  - convierte cualquier falla en `ApiError`.
- **Cómo decidir qué hacer ante un error:** se usa `error.code` (por ejemplo `validation_error` o `finance.account.not_found`), nunca el texto del mensaje.
- **Qué mostrar al usuario:** `error.message`, que viene en español desde el backend.
- **Valores especiales de `ApiError`:**
  - `status = 0` y `code = "network_error"`: no hubo respuesta.
  - `code = "unexpected_response"`: la respuesta no tenía formato ProblemDetail (por ejemplo, un 502 del proxy).
- **Validación:** `error.fieldErrors` trae los errores de validación por campo, para mostrarlos en los formularios.
- **CSRF:** `apiFetch` envía el token de la cookie `XSRF-TOKEN` en la cabecera `X-XSRF-TOKEN` en `POST`, `PUT`, `PATCH` y `DELETE`. Si el backend responde `csrf_invalid`, reintenta una vez con el token de esa respuesta.
- **JSON:** el cuerpo se envía con la opción `json`, por ejemplo `apiFetch(url, { method: "POST", json: datos })`.
- **Sesión expirada:** un 401 con `code = "unauthorized"` en cualquier consulta o mutación marca la sesión como cerrada (`src/app/query-client.ts`), y `RequireSession` lleva al inicio de sesión.
- **Tipos de la API:** los tipos de peticiones y respuestas salen de `src/types/api.d.ts`, generado con `npm run api:types`. No se escriben a mano.

## Sesión

- **Fuente de verdad:** la consulta `sessionQueryOptions` (`GET /api/v1/me`) devuelve el perfil, o `null` si no hay sesión.
- **Guards:** `RequireSession` protege las rutas y `PublicOnlyRoute` evita mostrar el login con una sesión activa.
- **Perfil actual:** dentro de las rutas protegidas se obtiene con `useCurrentProfile()`.
- **Al cerrar sesión** se vacía toda la caché de TanStack Query, para que no queden datos del usuario anterior.
- **Redirecciones:** el parámetro `redirect` del login solo acepta rutas internas (`safeRedirect`).

## Formularios

- React Hook Form con `zodResolver`; los esquemas Zod viven en la funcionalidad.
- **Validaciones del cliente:** solo adelantan respuesta inmediata. Las reglas definitivas las aplica el backend, sin duplicar lógica de dominio.
- **Campos de texto:** `FormTextField` (`components/common`) une etiqueta, ayuda y error accesibles con `aria-invalid`.
- **Errores del backend:**
  - los que corresponden a un campo se asignan con `form.setError` según `error.code`;
  - el resto se muestra con `FormError`.
- **Avisos de éxito:** `toast.success(...)` de `sonner`.

## Montos y fechas (ADR-0006)

- **Montos:** llegan y se envían como **cadenas decimales**. Nunca se convierten a `number` para hacer operaciones; el frontend solo los formatea con `formatMoney`. Los totales, cuotas e intereses los calcula el backend.
- **Fechas de negocio** (`"2026-11-06"`): se muestran con `formatDate`. No se usa `new Date("2026-11-06")` para mostrarlas, porque en Colombia aparecería el día anterior.
- **Instantes:** se muestran con `formatDateTime`.

## Interfaz

- **Componentes de shadcn/ui:** se agregan con `npx shadcn@latest add <componente>` en `src/components/ui/`. Son código propio y se pueden ajustar, pero conviene minimizar los cambios para facilitar futuras actualizaciones.
- **Estados de toda vista con datos:**
  - **cargando:** `Skeleton` con la forma del contenido;
  - **vacío:** mensaje y acción para crear;
  - **error:** mensaje claro y opción de reintentar.
- **Textos:** en español, con tuteo, como el resto de la interfaz.
- **Rutas y navegación:**
  - Las rutas visibles van en español (`/sistema`, `/finanzas/cuentas`).
  - Una entrada de navegación se agrega solo cuando su página existe.
- **Accesibilidad:**
  - Los botones que solo tienen ícono llevan `aria-label`.
  - Los íconos decorativos llevan `aria-hidden`.
  - Los estados dinámicos usan `role="status"`.
- **Responsive:** el layout se prueba en móvil (375 px), tablet y escritorio. La navegación lateral se convierte en un panel deslizable en móvil.

## Pruebas

- Vitest y Testing Library, con los archivos `*.test.ts(x)` junto al código que prueban.
- **Pantallas completas:** se prueban con `renderAt(ruta)` (`src/test/render.tsx`), que usa las rutas y los providers reales.
- **Respuestas de la API:** se simulan con `stubApi({ "GET /api/v1/me": { body } })`; una ruta no definida responde 404.
- Se prueba el comportamiento visible: se buscan elementos por rol y texto, como lo haría el usuario, y no detalles de implementación.
- `fetch` se sustituye con las utilidades de `src/test/http-stubs.ts`.
- Cada pantalla nueva prueba sus estados de carga, error y éxito.

## Estilo de código

- Prettier: 100 columnas, sin punto y coma y con comillas dobles; el plugin de Tailwind ordena las clases.
- ESLint con las reglas recomendadas de TypeScript y React Hooks.
- Importaciones con el alias `@/` (apunta a `src/`).
- Código e identificadores en inglés; comentarios y documentación en español.

## Seguridad

- No hay secretos en el frontend: todo lo que se compila queda público.
- No se guardan tokens ni datos sensibles en `localStorage` ni `sessionStorage`. La sesión es una cookie `HttpOnly` que el código no puede leer.
- No se usa `dangerouslySetInnerHTML` ni scripts en línea. La CSP de nginx los bloquea (`script-src 'self'`).
- La seguridad real está en el backend. Ocultar un botón no es una medida de seguridad.
