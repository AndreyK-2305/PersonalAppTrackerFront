/**
 * Guía del atajo del iPhone que envía las notificaciones bancarias a la captura (ADR-0017).
 *
 * Los nombres de app que se envían deben coincidir con los que reconocen los analizadores del
 * backend: "Mensajes" (o "Messages"), algo que contenga "Rappi" y "Wallet" (o "Cartera").
 */

/** Texto que reemplaza al token en las instrucciones copiadas: el secreto no viaja en ellas. */
export const TOKEN_PLACEHOLDER = "<pega aquí tu token>"

export type ShortcutSource = {
  name: string
  trigger: string
  app: string
  title: string
  body: string
}

/** Las tres automatizaciones, una por fuente (ADR-0017). */
export const SHORTCUT_SOURCES: ShortcutSource[] = [
  {
    name: "SMS de Bancolombia",
    trigger: "Mensaje, con remitente 85540",
    app: "Mensajes",
    title: "el remitente (85540)",
    body: "el contenido del mensaje",
  },
  {
    name: "Rappi",
    trigger: "Notificación de la app Rappi",
    app: "Rappi",
    title: "el título de la notificación",
    body: "el texto de la notificación",
  },
  {
    name: "Apple Wallet",
    trigger: "Notificación de la app Wallet",
    app: "Wallet",
    title: "el título de la notificación (el banco)",
    body: "el texto de la notificación",
  },
]

/**
 * Descripción completa del atajo para pedírsela a Siri o seguirla a mano. Lleva la dirección real
 * de la app y un marcador en lugar del token.
 */
export function shortcutInstructions(endpoint: string): string {
  const automations = SHORTCUT_SOURCES.map(
    (source, index) =>
      `${index + 1}. ${source.name}: disparador "${source.trigger}". Envía al atajo app = "${source.app}", title = ${source.title} y body = ${source.body}.`,
  ).join("\n")

  return `Crea en Atajos un atajo llamado "Enviar a Personal Tracker" que reciba como entrada un diccionario con las claves app, title y body, y haga esto:

1. Formatear fecha: la fecha actual, en formato ISO 8601 e incluyendo la hora.
2. Obtener contenido de URL:
   - URL: ${endpoint}
   - Método: POST
   - Encabezados:
     - Authorization: Bearer ${TOKEN_PLACEHOLDER}
     - Content-Type: application/json
   - Cuerpo de la solicitud: JSON, con estos cuatro campos de texto:
     - app: el valor app de la entrada
     - title: el valor title de la entrada
     - body: el valor body de la entrada
     - receivedAt: la fecha formateada del paso 1

Después crea tres automatizaciones personales. Cada una debe ejecutarse de inmediato, sin pedir confirmación y sin notificar al ejecutarse, y llamar al atajo "Enviar a Personal Tracker" con un diccionario:
${automations}

Escribe app exactamente como aparece entre comillas.`
}
