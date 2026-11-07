import type { BoardState, Status, Task } from "./types";

export const DEFAULT_STATE: BoardState = {
  statuses: [
    { id: "todo", name: "Por hacer", color: "#64748b" },
    { id: "doing", name: "En progreso", color: "#3b82f6" },
    { id: "done", name: "Hecho", color: "#10b981" },
  ],
  tasks: [],
};

/**
 * Cambios posibles sobre el tablero. Los ids y fechas viajan dentro de la acción
 * para que el cliente (optimista) y el servidor produzcan exactamente el mismo estado.
 */
export type BoardAction =
  | { type: "addStatus"; status: Status }
  | { type: "updateStatus"; id: string; changes: Partial<Omit<Status, "id">> }
  | { type: "deleteStatus"; id: string; moveTasksTo: string }
  | { type: "moveStatus"; id: string; direction: -1 | 1 }
  | { type: "addTask"; task: Task }
  | { type: "updateTask"; id: string; changes: Partial<Omit<Task, "id" | "createdAt">> }
  | { type: "deleteTask"; id: string }
  | { type: "replace"; state: BoardState };

export function applyAction(s: BoardState, action: BoardAction): BoardState {
  switch (action.type) {
    case "addStatus":
      return { ...s, statuses: [...s.statuses, action.status] };

    case "updateStatus":
      return {
        ...s,
        statuses: s.statuses.map((st) => (st.id === action.id ? { ...st, ...action.changes } : st)),
      };

    case "deleteStatus":
      return {
        statuses: s.statuses.filter((st) => st.id !== action.id),
        tasks: s.tasks.map((t) =>
          t.statusId === action.id ? { ...t, statusId: action.moveTasksTo } : t,
        ),
      };

    case "moveStatus": {
      const idx = s.statuses.findIndex((st) => st.id === action.id);
      const target = idx + action.direction;
      if (idx < 0 || target < 0 || target >= s.statuses.length) return s;
      const statuses = [...s.statuses];
      [statuses[idx], statuses[target]] = [statuses[target], statuses[idx]];
      return { ...s, statuses };
    }

    case "addTask":
      return { ...s, tasks: [...s.tasks, action.task] };

    case "updateTask":
      return {
        ...s,
        tasks: s.tasks.map((t) => (t.id === action.id ? { ...t, ...action.changes } : t)),
      };

    case "deleteTask":
      return { ...s, tasks: s.tasks.filter((t) => t.id !== action.id) };

    case "replace":
      return action.state;
  }
}

export function isBoardState(value: unknown): value is BoardState {
  const v = value as BoardState | null;
  return !!v && Array.isArray(v.statuses) && Array.isArray(v.tasks);
}
