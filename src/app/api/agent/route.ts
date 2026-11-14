import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { z } from "zod";
import { readBoard } from "@/lib/board-file";
import type { Task } from "@/lib/types";

const run = promisify(execFile);

const bodySchema = z.object({ taskId: z.string().trim().min(1) });

function buildPrompt(task: Task) {
  return [
    `Trabaja el ticket "${task.title}" (id: ${task.id}) del tablero kanban.`,
    task.description && `Descripción:\n${task.description}`,
    "Usa el MCP del tablero (kanban) para mover el ticket a \"En progreso\" al empezar y a \"Hecho\" al terminar.",
    "Sigue las reglas de validación de CLAUDE.md antes de dar el trabajo por terminado.",
  ]
    .filter(Boolean)
    .join("\n\n");
}

export async function POST(request: Request) {
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ error: "Se requiere taskId" }, { status: 400 });
  }

  const board = await readBoard();
  const task = board.tasks.find((t) => t.id === parsed.data.taskId);
  if (!task) {
    return Response.json({ error: "La tarea no existe" }, { status: 404 });
  }

  // Lanzamos el agente en este mismo worktree: el tablero (data/) no está en git,
  // así que un worktree nuevo no vería los tickets.
  const args = [
    "agent", "launch",
    "--agent", "claude",
    "--worktree", `path:${process.cwd()}`,
    "--prompt", buildPrompt(task),
    "--focus",
    "--json",
  ];
  try {
    await run(process.env.ORCA_BIN ?? "orca", args, { timeout: 60_000 });
    return Response.json({ ok: true });
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    return Response.json({ error: `No se pudo lanzar el agente en Orca: ${detail}` }, { status: 502 });
  }
}
