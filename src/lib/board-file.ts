// Persistencia del tablero en disco. Solo se usa en el servidor (route handlers y servidor MCP).
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { applyAction, DEFAULT_STATE, isBoardState, type BoardAction } from "./board-ops";
import type { BoardState } from "./types";

const dataFile = () =>
  process.env.KANBAN_DATA_FILE ?? path.join(process.cwd(), "data", "board.json");

export async function readBoard(): Promise<BoardState> {
  try {
    const parsed: unknown = JSON.parse(await readFile(dataFile(), "utf8"));
    if (isBoardState(parsed)) return parsed;
  } catch {
    // el archivo aún no existe o está corrupto: usamos el estado por defecto
  }
  return DEFAULT_STATE;
}

async function writeBoard(state: BoardState) {
  const file = dataFile();
  await mkdir(path.dirname(file), { recursive: true });
  // escribimos en un temporal y renombramos para que nadie lea un archivo a medias
  const tmp = `${file}.${process.pid}.tmp`;
  await writeFile(tmp, JSON.stringify(state, null, 2));
  await rename(tmp, file);
}

// Serializa las escrituras de este proceso para no perder cambios concurrentes.
let queue: Promise<unknown> = Promise.resolve();

export function mutateBoard(action: BoardAction): Promise<BoardState> {
  const run = async () => {
    const next = applyAction(await readBoard(), action);
    await writeBoard(next);
    return next;
  };
  const result = queue.then(run, run);
  queue = result.catch(() => {});
  return result;
}
