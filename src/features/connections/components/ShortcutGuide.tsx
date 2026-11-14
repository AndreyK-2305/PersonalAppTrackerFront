import { CheckIcon, CopyIcon } from "lucide-react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { SHORTCUT_SOURCES, shortcutInstructions, TOKEN_PLACEHOLDER } from "../shortcut-guide"

/**
 * Paso a paso del atajo del iPhone: qué acciones lleva y qué envía cada automatización. Incluye un
 * botón para copiar la descripción completa y pedírsela a Siri.
 */
export function ShortcutGuide({ endpoint }: { endpoint: string }) {
  const [copied, setCopied] = useState(false)
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(shortcutInstructions(endpoint))
      setCopied(true)
    } catch {
      setCopied(false)
    }
  }

  return (
    <section aria-label="Cómo configurar el atajo" className="space-y-4 text-sm">
      <div className="space-y-2">
        <p className="text-muted-foreground">
          Siri puede crearlo por ti: copia las instrucciones, pídeselas y pega tu token donde dice{" "}
          <span className="font-mono text-xs">{TOKEN_PLACEHOLDER}</span>.
        </p>
        <Button type="button" variant="outline" size="sm" onClick={copy}>
          {copied ? <CheckIcon aria-hidden /> : <CopyIcon aria-hidden />}
          {copied ? "Instrucciones copiadas" : "Copiar instrucciones para Siri"}
        </Button>
      </div>

      <div className="space-y-2">
        <h3 className="font-medium">1. Atajo "Enviar a Personal Tracker"</h3>
        <p className="text-muted-foreground">Recibe un diccionario con app, title y body.</p>
        <ol className="list-decimal space-y-2 pl-5">
          <li>
            <span className="font-medium">Formatear fecha:</span> fecha actual, formato ISO 8601,
            con la hora.
          </li>
          <li className="space-y-1">
            <p>
              <span className="font-medium">Obtener contenido de URL:</span>
            </p>
            <dl className="space-y-1">
              <GuideRow label="URL">
                <span className="font-mono text-xs break-all">{endpoint}</span>
              </GuideRow>
              <GuideRow label="Método">POST</GuideRow>
              <GuideRow label="Encabezados">
                <span className="font-mono text-xs break-all">
                  Authorization: Bearer {"<token>"}
                  <br />
                  Content-Type: application/json
                </span>
              </GuideRow>
              <GuideRow label="Cuerpo (JSON)">
                <span className="font-mono text-xs">app, title, body</span> de la entrada y{" "}
                <span className="font-mono text-xs">receivedAt</span> con la fecha formateada.
              </GuideRow>
            </dl>
          </li>
        </ol>
      </div>

      <div className="space-y-2">
        <h3 className="font-medium">2. Una automatización por fuente</h3>
        <p className="text-muted-foreground">
          Ejecutar de inmediato, sin confirmar y sin notificar. Cada una llama al atajo con:
        </p>
        <ul className="space-y-2">
          {SHORTCUT_SOURCES.map((source) => (
            <li key={source.name} className="rounded-lg border p-2">
              <p className="font-medium">{source.name}</p>
              <p className="text-muted-foreground">Disparador: {source.trigger}</p>
              <p>
                <span className="font-mono text-xs">app</span> = "{source.app}",{" "}
                <span className="font-mono text-xs">title</span> = {source.title},{" "}
                <span className="font-mono text-xs">body</span> = {source.body}
              </p>
            </li>
          ))}
        </ul>
      </div>

      <div className="space-y-1">
        <h3 className="font-medium">3. Prueba</h3>
        <p className="text-muted-foreground">
          Haz una compra pequeña. A los 2 minutos aparece en Movimientos como "Captado", y aquí
          cambia el "Último uso" del dispositivo.
        </p>
      </div>
    </section>
  )
}

function GuideRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-muted-foreground">{label}</dt>
      <dd>{children}</dd>
    </div>
  )
}
