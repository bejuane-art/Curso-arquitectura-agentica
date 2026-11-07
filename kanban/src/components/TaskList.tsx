"use client";

import { useState } from "react";
import { actions } from "@/lib/store";
import type { BoardState, Task } from "@/lib/types";
import { StatusBadge } from "./StatusBadge";

type Props = {
  board: BoardState;
  onEdit: (task: Task) => void;
};

export function TaskList({ board, onEdit }: Props) {
  const [filter, setFilter] = useState("all");
  const statusById = new Map(board.statuses.map((s) => [s.id, s]));
  const order = new Map(board.statuses.map((s, i) => [s.id, i]));

  const tasks = board.tasks
    .filter((t) => filter === "all" || t.statusId === filter)
    .sort(
      (a, b) =>
        (order.get(a.statusId) ?? 0) - (order.get(b.statusId) ?? 0) || b.createdAt - a.createdAt,
    );

  return (
    <div className="rounded-xl border border-zinc-200 dark:border-zinc-800">
      <div className="flex items-center gap-2 border-b border-zinc-200 p-3 dark:border-zinc-800">
        <label className="text-sm text-zinc-500" htmlFor="filter">
          Filtrar:
        </label>
        <select id="filter" value={filter} onChange={(e) => setFilter(e.target.value)} className="input w-auto">
          <option value="all">Todos los estados</option>
          {board.statuses.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
        <span className="ml-auto text-sm text-zinc-500">{tasks.length} tarea(s)</span>
      </div>

      {tasks.length === 0 ? (
        <p className="p-8 text-center text-sm text-zinc-400">No hay tareas.</p>
      ) : (
        <ul className="divide-y divide-zinc-200 dark:divide-zinc-800">
          {tasks.map((task) => (
            <li key={task.id} className="flex items-center gap-3 p-3 hover:bg-zinc-50 dark:hover:bg-zinc-900">
              <button onClick={() => onEdit(task)} className="min-w-0 flex-1 text-left">
                <p className="truncate text-sm font-medium">{task.title}</p>
                {task.description && <p className="truncate text-xs text-zinc-500">{task.description}</p>}
              </button>
              <StatusBadge status={statusById.get(task.statusId)} />
              <select
                value={task.statusId}
                onChange={(e) => actions.updateTask(task.id, { statusId: e.target.value })}
                className="input w-36 py-1 text-xs"
                aria-label="Cambiar estado"
              >
                {board.statuses.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
              <button
                onClick={() => actions.deleteTask(task.id)}
                className="btn px-2 text-red-600"
                aria-label="Eliminar tarea"
              >
                🗑
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
