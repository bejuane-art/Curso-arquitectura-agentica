import { useSyncExternalStore } from "react";
import type { BoardState, Status, Task } from "./types";

const STORAGE_KEY = "kanban-board-v1";

const DEFAULT_STATE: BoardState = {
  statuses: [
    { id: "todo", name: "Por hacer", color: "#64748b" },
    { id: "doing", name: "En progreso", color: "#3b82f6" },
    { id: "done", name: "Hecho", color: "#10b981" },
  ],
  tasks: [],
};

let state: BoardState | null = null;
const listeners = new Set<() => void>();

function load(): BoardState {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as BoardState;
      if (Array.isArray(parsed.statuses) && Array.isArray(parsed.tasks)) {
        return parsed;
      }
    }
  } catch {
    // almacenamiento no disponible o datos corruptos: usamos el estado por defecto
  }
  return DEFAULT_STATE;
}

function getSnapshot(): BoardState {
  if (!state) state = load();
  return state;
}

function getServerSnapshot(): BoardState {
  return DEFAULT_STATE;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function update(updater: (prev: BoardState) => BoardState) {
  state = updater(getSnapshot());
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignoramos errores de escritura
  }
  listeners.forEach((l) => l());
}

const newId = () => crypto.randomUUID();

export const actions = {
  addStatus(name: string, color: string) {
    update((s) => ({
      ...s,
      statuses: [...s.statuses, { id: newId(), name, color }],
    }));
  },

  updateStatus(id: string, changes: Partial<Omit<Status, "id">>) {
    update((s) => ({
      ...s,
      statuses: s.statuses.map((st) => (st.id === id ? { ...st, ...changes } : st)),
    }));
  },

  /** Elimina un estado y mueve sus tareas a `moveTasksTo`. */
  deleteStatus(id: string, moveTasksTo: string) {
    update((s) => ({
      statuses: s.statuses.filter((st) => st.id !== id),
      tasks: s.tasks.map((t) => (t.statusId === id ? { ...t, statusId: moveTasksTo } : t)),
    }));
  },

  moveStatus(id: string, direction: -1 | 1) {
    update((s) => {
      const idx = s.statuses.findIndex((st) => st.id === id);
      const target = idx + direction;
      if (idx < 0 || target < 0 || target >= s.statuses.length) return s;
      const statuses = [...s.statuses];
      [statuses[idx], statuses[target]] = [statuses[target], statuses[idx]];
      return { ...s, statuses };
    });
  },

  addTask(data: Pick<Task, "title" | "description" | "statusId">) {
    update((s) => ({
      ...s,
      tasks: [...s.tasks, { ...data, id: newId(), createdAt: Date.now() }],
    }));
  },

  updateTask(id: string, changes: Partial<Omit<Task, "id" | "createdAt">>) {
    update((s) => ({
      ...s,
      tasks: s.tasks.map((t) => (t.id === id ? { ...t, ...changes } : t)),
    }));
  },

  deleteTask(id: string) {
    update((s) => ({ ...s, tasks: s.tasks.filter((t) => t.id !== id) }));
  },
};

export function useBoard(): BoardState {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
