import { useSyncExternalStore } from "react";
import { applyAction, DEFAULT_STATE, isBoardState, type BoardAction } from "./board-ops";
import type { BoardState, Status, Task } from "./types";

// El tablero vive en el servidor (data/board.json). Aquí guardamos una copia local,
// aplicamos los cambios de forma optimista y consultamos periódicamente para ver
// los cambios hechos desde fuera (por ejemplo, desde el servidor MCP).
const API = "/api/board";
const POLL_MS = 2000;
const LEGACY_STORAGE_KEY = "kanban-board-v1";

let state: BoardState = DEFAULT_STATE;
let pending = 0;
let started = false;
const listeners = new Set<() => void>();

function setState(next: BoardState) {
  state = next;
  listeners.forEach((l) => l());
}

async function fetchBoard() {
  if (pending > 0) return; // no pisamos cambios locales que aún no confirmó el servidor
  try {
    const res = await fetch(API, { cache: "no-store" });
    const board: unknown = await res.json();
    if (pending === 0 && isBoardState(board)) setState(board);
  } catch {
    // servidor no disponible: lo intentaremos en la siguiente consulta
  }
}

/** Sube al servidor el tablero que antes se guardaba en localStorage, si lo hay. */
async function migrateLegacyBoard() {
  try {
    const raw = window.localStorage.getItem(LEGACY_STORAGE_KEY);
    if (!raw) return;
    const legacy: unknown = JSON.parse(raw);
    if (isBoardState(legacy) && legacy.tasks.length > 0 && state.tasks.length === 0) {
      await dispatch({ type: "replace", state: legacy });
    }
    window.localStorage.removeItem(LEGACY_STORAGE_KEY);
  } catch {
    // almacenamiento no disponible o datos corruptos: no hay nada que migrar
  }
}

function start() {
  if (started) return;
  started = true;
  fetchBoard().then(migrateLegacyBoard);
  setInterval(fetchBoard, POLL_MS);
}

function getSnapshot(): BoardState {
  return state;
}

function getServerSnapshot(): BoardState {
  return DEFAULT_STATE;
}

function subscribe(listener: () => void) {
  start();
  listeners.add(listener);
  return () => listeners.delete(listener);
}

async function dispatch(action: BoardAction) {
  setState(applyAction(state, action));
  pending++;
  try {
    const res = await fetch(API, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(action),
    });
    const board: unknown = await res.json();
    if (pending === 1 && isBoardState(board)) setState(board);
  } catch {
    // si falla, la siguiente consulta restaurará el estado del servidor
  } finally {
    pending--;
  }
}

const newId = () => crypto.randomUUID();

export const actions = {
  addStatus(name: string, color: string) {
    dispatch({ type: "addStatus", status: { id: newId(), name, color } });
  },

  updateStatus(id: string, changes: Partial<Omit<Status, "id">>) {
    dispatch({ type: "updateStatus", id, changes });
  },

  /** Elimina un estado y mueve sus tareas a `moveTasksTo`. */
  deleteStatus(id: string, moveTasksTo: string) {
    dispatch({ type: "deleteStatus", id, moveTasksTo });
  },

  moveStatus(id: string, direction: -1 | 1) {
    dispatch({ type: "moveStatus", id, direction });
  },

  addTask(data: Pick<Task, "title" | "description" | "statusId">) {
    dispatch({ type: "addTask", task: { ...data, id: newId(), createdAt: Date.now() } });
  },

  updateTask(id: string, changes: Partial<Omit<Task, "id" | "createdAt">>) {
    dispatch({ type: "updateTask", id, changes });
  },

  deleteTask(id: string) {
    dispatch({ type: "deleteTask", id });
  },
};

export function useBoard(): BoardState {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
