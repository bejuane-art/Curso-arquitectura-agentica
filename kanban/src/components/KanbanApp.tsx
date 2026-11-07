"use client";

import { useState } from "react";
import { useBoard } from "@/lib/store";
import type { Task } from "@/lib/types";
import { Board } from "./Board";
import { StatusManager } from "./StatusManager";
import { TaskForm } from "./TaskForm";
import { TaskList } from "./TaskList";

type View = "board" | "list";
type Dialog =
  | { kind: "none" }
  | { kind: "create"; statusId?: string }
  | { kind: "edit"; task: Task }
  | { kind: "statuses" };

export function KanbanApp() {
  const board = useBoard();
  const [view, setView] = useState<View>("board");
  const [dialog, setDialog] = useState<Dialog>({ kind: "none" });
  const close = () => setDialog({ kind: "none" });

  return (
    <main className="mx-auto w-full max-w-7xl flex-1 p-6">
      <header className="mb-6 flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-bold">Tablero Kanban</h1>

        <div className="ml-auto flex rounded-lg bg-zinc-100 p-1 dark:bg-zinc-900" role="tablist">
          {(["board", "list"] as const).map((v) => (
            <button
              key={v}
              role="tab"
              aria-selected={view === v}
              onClick={() => setView(v)}
              className={`rounded-md px-3 py-1 text-sm ${
                view === v ? "bg-white shadow-sm dark:bg-zinc-700" : "text-zinc-500"
              }`}
            >
              {v === "board" ? "Tablero" : "Lista"}
            </button>
          ))}
        </div>

        <button onClick={() => setDialog({ kind: "statuses" })} className="btn">
          Estados
        </button>
        <button onClick={() => setDialog({ kind: "create" })} className="btn btn-primary">
          + Nueva tarea
        </button>
      </header>

      {view === "board" ? (
        <Board
          board={board}
          onEdit={(task) => setDialog({ kind: "edit", task })}
          onCreate={(statusId) => setDialog({ kind: "create", statusId })}
        />
      ) : (
        <TaskList board={board} onEdit={(task) => setDialog({ kind: "edit", task })} />
      )}

      {dialog.kind === "create" && (
        <TaskForm statuses={board.statuses} defaultStatusId={dialog.statusId} onClose={close} />
      )}
      {dialog.kind === "edit" && (
        <TaskForm statuses={board.statuses} task={dialog.task} onClose={close} />
      )}
      {dialog.kind === "statuses" && <StatusManager board={board} onClose={close} />}
    </main>
  );
}
