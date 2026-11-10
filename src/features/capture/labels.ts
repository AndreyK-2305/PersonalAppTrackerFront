import type { ReviewReason } from "./api/capture"

/** Por qué una notificación quedó "Por revisar" y qué se espera del usuario. */
export const REVIEW_REASON_LABELS: Record<ReviewReason, { title: string; description: string }> = {
  POSSIBLE_OWN_TRANSFER: {
    title: "¿Transferencia a ti mismo?",
    description:
      "El destinatario tiene tu nombre. Si el dinero fue a otra cuenta tuya, elige cuál; si no, déjalo como gasto.",
  },
  AMBIGUOUS_PRODUCT: {
    title: "Producto sin identificar",
    description:
      "Varios productos coinciden con la entidad y los dígitos. Quedó en «Otro»: confírmalo y edítalo para asignar el producto.",
  },
  MISSING_EXCHANGE_RATE: {
    title: "Compra en dólares sin TRM",
    description:
      "No se pudo consultar la tasa del día. Escribe el valor en pesos del extracto para registrarla.",
  },
  UNRECOGNIZED_TEXT: {
    title: "Notificación no reconocida",
    description:
      "El texto no coincide con ningún formato conocido. Si era un movimiento, regístralo a mano y descarta esta notificación.",
  },
}
