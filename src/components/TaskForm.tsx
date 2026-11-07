"use client";

import { useState } from "react";
import { actions } from "@/lib/store";
import type { Status, Task } from "@/lib/types";
import { Modal } from "./Modal";

type Props = {
  statuses: Status[];
  /** Tarea a editar; si no se pasa, se crea una nueva. */
  task?: Task;
  defaultStatusId?: string;
  onClose: () => void;
};

export function TaskForm({ statuses, task, defaultStatusId, onClose }: Props) {
  const [title, setTitle] = useState(task?.title ?? "");
  const [description, setDescription] = useState(task?.description ?? "");
  const [statusId, setStatusId] = useState(
    task?.statusId ?? defaultStatusId ?? statuses[0]?.id ?? "",
  );

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = title.trim();
    if (!trimmed || !statusId) return;
    if (task) {
      actions.updateTask(task.id, { title: trimmed, description: description.trim(), statusId });
    } else {
      actions.addTask({ title: trimmed, description: description.trim(), statusId });
    }
    onClose();
  };

  return (
    <Modal title={task ? "Editar tarea" : "Nueva tarea"} onClose={onClose}>
      <form onSubmit={submit} className="flex flex-col gap-3">
        <label className="flex flex-col gap-1 text-sm">
          Título
          <input
            autoFocus
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="input"
            placeholder="¿Qué hay que hacer?"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Descripción
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="input resize-none"
            placeholder="Detalles opcionales"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Estado
          <select
            value={statusId}
            onChange={(e) => setStatusId(e.target.value)}
            className="input"
          >
            {statuses.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </label>
        <div className="mt-2 flex justify-end gap-2">
          {task && (
            <button
              type="button"
              onClick={() => {
                actions.deleteTask(task.id);
                onClose();
              }}
              className="btn mr-auto text-red-600 hover:bg-red-50 dark:hover:bg-red-950"
            >
              Eliminar
            </button>
          )}
          <button type="button" onClick={onClose} className="btn">
            Cancelar
          </button>
          <button type="submit" className="btn btn-primary">
            {task ? "Guardar" : "Crear tarea"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
