"use client";

import { useState } from "react";
import { actions } from "@/lib/store";
import type { BoardState, Task } from "@/lib/types";

type Props = {
  board: BoardState;
  onEdit: (task: Task) => void;
  onCreate: (statusId: string) => void;
};

export function Board({ board, onEdit, onCreate }: Props) {
  const [dragOver, setDragOver] = useState<string | null>(null);

  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {board.statuses.map((status) => {
        const tasks = board.tasks.filter((t) => t.statusId === status.id);
        return (
          <section
            key={status.id}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(status.id);
            }}
            onDragLeave={() => setDragOver((cur) => (cur === status.id ? null : cur))}
            onDrop={(e) => {
              e.preventDefault();
              const id = e.dataTransfer.getData("text/plain");
              if (id) actions.updateTask(id, { statusId: status.id });
              setDragOver(null);
            }}
            className={`flex w-72 shrink-0 flex-col rounded-xl bg-zinc-100 p-3 transition-colors dark:bg-zinc-900 ${
              dragOver === status.id ? "ring-2 ring-blue-400" : ""
            }`}
          >
            <header className="mb-3 flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: status.color }} />
              <h2 className="text-sm font-semibold">{status.name}</h2>
              <span className="text-xs text-zinc-500">{tasks.length}</span>
              <button
                onClick={() => onCreate(status.id)}
                className="ml-auto rounded px-1.5 text-zinc-500 hover:bg-zinc-200 dark:hover:bg-zinc-800"
                aria-label={`Nueva tarea en ${status.name}`}
              >
                +
              </button>
            </header>

            <div className="flex min-h-16 flex-col gap-2">
              {tasks.map((task) => (
                <article
                  key={task.id}
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData("text/plain", task.id);
                    e.dataTransfer.effectAllowed = "move";
                  }}
                  onClick={() => onEdit(task)}
                  className="cursor-grab rounded-lg border-l-4 bg-white p-3 shadow-sm hover:shadow active:cursor-grabbing dark:bg-zinc-800"
                  style={{ borderLeftColor: status.color }}
                >
                  <p className="text-sm font-medium">{task.title}</p>
                  {task.description && (
                    <p className="mt-1 line-clamp-2 text-xs text-zinc-500">{task.description}</p>
                  )}
                </article>
              ))}
              {tasks.length === 0 && (
                <p className="py-4 text-center text-xs text-zinc-400">Arrastra tareas aquí</p>
              )}
            </div>
          </section>
        );
      })}
    </div>
  );
}
