export type Status = {
  id: string;
  name: string;
  color: string;
};

export type Task = {
  id: string;
  title: string;
  description: string;
  statusId: string;
  createdAt: number;
};

export type BoardState = {
  statuses: Status[];
  tasks: Task[];
};

export const STATUS_COLORS = [
  "#64748b", // gris
  "#3b82f6", // azul
  "#f59e0b", // ámbar
  "#10b981", // verde
  "#ef4444", // rojo
  "#8b5cf6", // violeta
  "#ec4899", // rosa
  "#14b8a6", // turquesa
];
