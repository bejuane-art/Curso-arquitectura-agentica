// Notifica a un webhook externo cada vez que una tarea cambia de estado.
// Solo se usa en el servidor (route handlers y servidor MCP).
import { createHmac } from "node:crypto";
import { z } from "zod";
import type { BoardState, Status } from "./types";

const TIMEOUT_MS = 5000;

const configSchema = z.object({
  url: z.url({ protocol: /^https?$/ }),
  secret: z.string().trim().min(1).optional(),
});

export type TaskMovedEvent = {
  event: "task.moved";
  movedAt: string;
  task: { id: string; title: string; description: string };
  from: Pick<Status, "id" | "name"> | null;
  to: Pick<Status, "id" | "name"> | null;
};

/** Lee la configuración del entorno; devuelve null si el webhook no está configurado o es inválido. */
function readConfig() {
  const url = process.env.KANBAN_WEBHOOK_URL?.trim();
  if (!url) return null;
  const parsed = configSchema.safeParse({ url, secret: process.env.KANBAN_WEBHOOK_SECRET || undefined });
  if (!parsed.success) {
    console.error("[webhook] KANBAN_WEBHOOK_URL no es una URL http(s) válida; no se enviarán notificaciones.");
    return null;
  }
  return parsed.data;
}

/** Compara dos versiones del tablero y devuelve un evento por cada tarea que cambió de estado. */
export function diffMovedTasks(prev: BoardState, next: BoardState): TaskMovedEvent[] {
  const movedAt = new Date().toISOString();
  const statusRef = (board: BoardState, id: string) => {
    const status = board.statuses.find((s) => s.id === id);
    return status ? { id: status.id, name: status.name } : null;
  };

  return next.tasks.flatMap((task) => {
    const before = prev.tasks.find((t) => t.id === task.id);
    if (!before || before.statusId === task.statusId) return [];
    return [
      {
        event: "task.moved" as const,
        movedAt,
        task: { id: task.id, title: task.title, description: task.description },
        // el estado de origen puede haberse borrado (deleteStatus), por eso lo buscamos en `prev`
        from: statusRef(prev, before.statusId),
        to: statusRef(next, task.statusId),
      },
    ];
  });
}

async function send(url: string, secret: string | undefined, event: TaskMovedEvent) {
  const body = JSON.stringify(event);
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (secret) {
    headers["X-Kanban-Signature"] = `sha256=${createHmac("sha256", secret).update(body).digest("hex")}`;
  }
  const res = await fetch(url, { method: "POST", headers, body, signal: AbortSignal.timeout(TIMEOUT_MS) });
  if (!res.ok) throw new Error(`respuesta HTTP ${res.status}`);
}

/**
 * Envía los eventos de tareas movidas entre `prev` y `next`. No lanza errores:
 * un webhook caído no debe impedir que se guarde el tablero.
 */
export async function notifyTaskMoves(prev: BoardState, next: BoardState): Promise<void> {
  const events = diffMovedTasks(prev, next);
  if (events.length === 0) return;
  const config = readConfig();
  if (!config) return;

  await Promise.all(
    events.map((event) =>
      send(config.url, config.secret, event).catch((err: unknown) => {
        const detail = err instanceof Error ? err.message : String(err);
        console.error(`[webhook] No se pudo notificar el movimiento de "${event.task.title}": ${detail}`);
      }),
    ),
  );
}
