# Personal Tracker — Frontend

SPA de **Personal Tracker**, una plataforma web de gestión personal enfocada inicialmente en finanzas.
La interfaz está en español y usa COP con formato `es-CO`.

La API vive en otro repositorio: [PersonalAppTrackerBackend](https://github.com/AndreyK-2305/PersonalAppTrackerBackend). Allí están también las decisiones de arquitectura del sistema (ADR).

## Tecnologías

React 19, TypeScript, Vite 8, Tailwind CSS 4, shadcn/ui (Radix, preset Nova), React Router 8, TanStack Query 5, React Hook Form y Zod. Los avisos usan `sonner`. Las pruebas usan Vitest y Testing Library.

Se agregarán en la Etapa 3: Recharts y TanStack Table, para el dashboard y las tablas.

## Requisitos

- Node.js 24 o superior.
- El backend en ejecución (ver su README). Por defecto se espera en `http://localhost:8090`.

## Inicio rápido

```bash
npm ci
npm run dev      # http://localhost:5174
```

El servidor de desarrollo reenvía `/api` y `/actuator/health` al backend, así que el navegador solo habla con un origen ([ADR-0007](https://github.com/AndreyK-2305/PersonalAppTrackerBackend/blob/main/docs/decisions/0007-topologia-mismo-origen-y-cors.md)). Para apuntar a otro backend, crea `.env.local` con `BACKEND_URL` (ver `.env.example`).

## Comandos

| Comando                                   | Qué hace                                                          |
| ----------------------------------------- | ----------------------------------------------------------------- |
| `npm run dev`                             | Servidor de desarrollo en el puerto 5174, con proxy al backend.   |
| `npm run build`                           | Verifica tipos y genera `dist/`.                                  |
| `npm run preview`                         | Sirve `dist/` localmente.                                         |
| `npm run lint`                            | ESLint.                                                           |
| `npm run format` / `npm run format:check` | Aplica o verifica Prettier.                                       |
| `npm test` / `npm run test:watch`         | Vitest en una pasada o en modo observación.                       |
| `npm run api:types`                       | Regenera `src/types/api.d.ts` desde el OpenAPI del backend local. |

## Estructura

```text
src/
├── app/            punto de entrada, providers (TanStack Query, tooltips, avisos) y QueryClient
├── components/
│   ├── ui/         componentes de shadcn/ui (generados con su CLI)
│   └── common/     componentes propios reutilizables (PageHeader, ErrorState, FormTextField…)
├── features/       una carpeta por funcionalidad: api/, components/, hooks/, schemas/, pages/
├── hooks/          hooks genéricos
├── layouts/        AppLayout (navegación lateral y menú de usuario) y AuthLayout
├── lib/            cliente HTTP, formato de montos y fechas, utilidades
├── routes/         definición de rutas, guards de sesión y páginas de error y 404
├── test/           configuración y utilidades de pruebas
└── types/          tipos transversales: ProblemDetail y api.d.ts (generado del OpenAPI)
nginx/              configuración de nginx para la imagen Docker
```

Las convenciones de código están en [docs/conventions.md](docs/conventions.md).

## Sesión y rutas

- **Rutas públicas:** `/iniciar-sesion` y `/registro`. Esta última solo permite registrarse si el backend tiene `REGISTRATION_ENABLED=true`.
- **Rutas protegidas:** todas las demás. Sin sesión llevan al inicio de sesión y recuerdan la página pedida.
- **Sesión expirada:** si expira mientras se usa la aplicación, cualquier respuesta 401 cierra la sesión en el cliente y lleva de nuevo al inicio de sesión.
- **Primera cuenta:** el procedimiento para crearla está en el README del backend (ADR-0012).

## Tipos de la API

`src/types/api.d.ts` se genera desde el OpenAPI del backend y se versiona. Para regenerarlo, con el backend en el perfil `local`:

```bash
npm run api:types
```

El script usa `npx openapi-typescript@7.13.0`, con la versión fijada y fuera de las dependencias del proyecto, porque esa herramienta aún exige TypeScript 5 y el proyecto usa TypeScript 6.

## Docker

La imagen tiene dos etapas:

- **Build:** Node 24 compila la aplicación.
- **Ejecución:** `nginx-unprivileged` sirve la aplicación en el puerto 8080 con un usuario sin privilegios. Además:
  - Reenvía `/api` y `/actuator/health` a `BACKEND_URL`, por defecto `http://backend:8080`.
  - Agrega cabeceras de seguridad, incluida una política CSP.
  - Cachea de forma permanente los archivos con hash y deja sin caché `index.html`.

El stack completo (PostgreSQL, backend y frontend) se levanta desde el repositorio del backend, con los dos repositorios clonados como carpetas hermanas:

```bash
cd ../backend
docker compose --profile full up -d --build --wait   # http://localhost:8091
```

## Pruebas

- **Formato de montos y fechas:** COP sin decimales, precisión de montos grandes y fechas de negocio que no cambian de día por la zona horaria.
- **Cliente HTTP:** errores ProblemDetail, fallos de red y respuestas inesperadas.
- **Página de estado del sistema:** operativo, con fallas, sin conexión y botón de reintento.
- **Rutas:** redirección inicial, navegación activa y página 404.

## Contribución

- Commits con Conventional Commits en español: `feat:`, `fix:`, `chore:`, `docs:`, `test:`, `refactor:`.
- `npm run lint`, `npm run format:check`, `npm test` y `npm run build` deben pasar. CI los ejecuta en cada push y pull request.
