"use client";

import { useState } from "react";
import { actions } from "@/lib/store";
import { STATUS_COLORS, type BoardState } from "@/lib/types";
import { Modal } from "./Modal";

type Props = {
  board: BoardState;
  onClose: () => void;
};

export function StatusManager({ board, onClose }: Props) {
  const [name, setName] = useState("");
  const [color, setColor] = useState(STATUS_COLORS[1]);

  const add = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    actions.addStatus(trimmed, color);
    setName("");
  };

  const remove = (id: string) => {
    const others = board.statuses.filter((s) => s.id !== id);
    if (others.length === 0) return;
    const count = board.tasks.filter((t) => t.statusId === id).length;
    if (
      count > 0 &&
      !window.confirm(`Este estado tiene ${count} tarea(s). Se moverán a "${others[0].name}". ¿Continuar?`)
    ) {
      return;
    }
    actions.deleteStatus(id, others[0].id);
  };

  return (
    <Modal title="Estados" onClose={onClose}>
      <ul className="mb-4 flex flex-col gap-2">
        {board.statuses.map((s, i) => (
          <li key={s.id} className="flex items-center gap-2">
            <ColorPicker value={s.color} onChange={(c) => actions.updateStatus(s.id, { color: c })} />
            <input
              value={s.name}
              onChange={(e) => actions.updateStatus(s.id, { name: e.target.value })}
              onBlur={(e) => !e.target.value.trim() && actions.updateStatus(s.id, { name: "Sin nombre" })}
              className="input flex-1"
              aria-label="Nombre del estado"
            />
            <button
              onClick={() => actions.moveStatus(s.id, -1)}
              disabled={i === 0}
              className="btn px-2"
              aria-label="Mover a la izquierda"
            >
              ↑
            </button>
            <button
              onClick={() => actions.moveStatus(s.id, 1)}
              disabled={i === board.statuses.length - 1}
              className="btn px-2"
              aria-label="Mover a la derecha"
            >
              ↓
            </button>
            <button
              onClick={() => remove(s.id)}
              disabled={board.statuses.length === 1}
              className="btn px-2 text-red-600"
              aria-label="Eliminar estado"
            >
              🗑
            </button>
          </li>
        ))}
      </ul>

      <form onSubmit={add} className="flex items-center gap-2 border-t border-zinc-200 pt-4 dark:border-zinc-700">
        <ColorPicker value={color} onChange={setColor} />
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nuevo estado (ej. En revisión)"
          className="input flex-1"
        />
        <button type="submit" className="btn btn-primary">
          Agregar
        </button>
      </form>
    </Modal>
  );
}

function ColorPicker({ value, onChange }: { value: string; onChange: (c: string) => void }) {
  const next = () => {
    const idx = STATUS_COLORS.indexOf(value);
    onChange(STATUS_COLORS[(idx + 1) % STATUS_COLORS.length]);
  };
  return (
    <button
      type="button"
      onClick={next}
      title="Cambiar color"
      aria-label="Cambiar color"
      className="h-6 w-6 shrink-0 rounded-full ring-2 ring-white ring-offset-1 ring-offset-zinc-300 dark:ring-zinc-900"
      style={{ backgroundColor: value }}
    />
  );
}
