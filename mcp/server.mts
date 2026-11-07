// Servidor MCP (stdio) para gestionar los tickets del tablero Kanban.
// Lee y escribe el mismo archivo que usa la aplicación (data/board.json),
// así que los cambios aparecen en la UI en unos segundos.
import path from "node:path";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { mutateBoard, readBoard } from "../src/lib/board-file";
import type { BoardState, Status, Task } from "../src/lib/types";

process.env.KANBAN_DATA_FILE ??= path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "data",
  "board.json",
);

const server = new McpServer({ name: "kanban", version: "0.1.0" });

type ToolResult = { content: { type: "text"; text: string }[]; isError?: boolean };

const ok = (data: unknown): ToolResult => ({
  content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
});

const fail = (message: string): ToolResult => ({
  content: [{ type: "text", text: message }],
  isError: true,
});

/** Busca un estado por id o por nombre (sin distinguir mayúsculas). */
function findStatus(board: BoardState, ref: string): Status | undefined {
  const needle = ref.trim().toLowerCase();
  return board.statuses.find((s) => s.id === ref || s.name.toLowerCase() === needle);
}

const unknownStatus = (board: BoardState, ref: string) =>
  fail(
    `No existe el estado "${ref}". Estados disponibles: ${board.statuses
      .map((s) => `${s.name} (${s.id})`)
      .join(", ")}`,
  );

const describeTask = (board: BoardState, task: Task) => ({
  ...task,
  status: board.statuses.find((s) => s.id === task.statusId)?.name ?? null,
});

const statusParam = z
  .string()
  .describe('Estado destino: su id o su nombre, por ejemplo "En progreso"');

server.registerTool(
  "listar_tickets",
  {
    title: "Listar tickets",
    description:
      "Devuelve los estados del tablero (en orden) y todos los tickets. Opcionalmente filtra por estado.",
    inputSchema: { estado: statusParam.optional() },
  },
  async ({ estado }) => {
    const board = await readBoard();
    let tasks = board.tasks;
    if (estado) {
      const status = findStatus(board, estado);
      if (!status) return unknownStatus(board, estado);
      tasks = tasks.filter((t) => t.statusId === status.id);
    }
    return ok({ statuses: board.statuses, tickets: tasks.map((t) => describeTask(board, t)) });
  },
);

server.registerTool(
  "crear_ticket",
  {
    title: "Crear ticket",
    description: "Crea un ticket nuevo. Si no se indica estado, va al primero del tablero.",
    inputSchema: {
      titulo: z.string().min(1).describe("Título del ticket"),
      descripcion: z.string().optional().describe("Descripción opcional"),
      estado: statusParam.optional(),
    },
  },
  async ({ titulo, descripcion, estado }) => {
    const board = await readBoard();
    const status = estado ? findStatus(board, estado) : board.statuses[0];
    if (!status) return estado ? unknownStatus(board, estado) : fail("El tablero no tiene estados.");

    const task: Task = {
      id: randomUUID(),
      title: titulo.trim(),
      description: descripcion?.trim() ?? "",
      statusId: status.id,
      createdAt: Date.now(),
    };
    const next = await mutateBoard({ type: "addTask", task });
    return ok(describeTask(next, task));
  },
);

server.registerTool(
  "editar_ticket",
  {
    title: "Editar ticket",
    description: "Cambia el título y/o la descripción de un ticket existente.",
    inputSchema: {
      id: z.string().describe("Id del ticket"),
      titulo: z.string().min(1).optional().describe("Nuevo título"),
      descripcion: z.string().optional().describe("Nueva descripción"),
    },
  },
  async ({ id, titulo, descripcion }) => {
    const board = await readBoard();
    if (!board.tasks.some((t) => t.id === id)) return fail(`No existe el ticket "${id}".`);

    const changes: Partial<Pick<Task, "title" | "description">> = {};
    if (titulo !== undefined) changes.title = titulo.trim();
    if (descripcion !== undefined) changes.description = descripcion.trim();
    if (Object.keys(changes).length === 0) return fail("Indica al menos titulo o descripcion.");

    const next = await mutateBoard({ type: "updateTask", id, changes });
    return ok(describeTask(next, next.tasks.find((t) => t.id === id)!));
  },
);

server.registerTool(
  "mover_ticket",
  {
    title: "Mover ticket",
    description: "Mueve un ticket a otro estado del tablero.",
    inputSchema: { id: z.string().describe("Id del ticket"), estado: statusParam },
  },
  async ({ id, estado }) => {
    const board = await readBoard();
    if (!board.tasks.some((t) => t.id === id)) return fail(`No existe el ticket "${id}".`);
    const status = findStatus(board, estado);
    if (!status) return unknownStatus(board, estado);

    const next = await mutateBoard({ type: "updateTask", id, changes: { statusId: status.id } });
    return ok(describeTask(next, next.tasks.find((t) => t.id === id)!));
  },
);

server.registerTool(
  "eliminar_ticket",
  {
    title: "Eliminar ticket",
    description: "Elimina un ticket del tablero de forma permanente.",
    inputSchema: { id: z.string().describe("Id del ticket") },
    annotations: { destructiveHint: true },
  },
  async ({ id }) => {
    const board = await readBoard();
    const task = board.tasks.find((t) => t.id === id);
    if (!task) return fail(`No existe el ticket "${id}".`);

    await mutateBoard({ type: "deleteTask", id });
    return ok({ deleted: describeTask(board, task) });
  },
);

await server.connect(new StdioServerTransport());
