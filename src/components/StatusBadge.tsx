import type { Status } from "@/lib/types";

export function StatusBadge({ status }: { status?: Status }) {
  if (!status) return <span className="text-xs text-zinc-400">—</span>;
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium"
      style={{ backgroundColor: `${status.color}22`, color: status.color }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: status.color }} />
      {status.name}
    </span>
  );
}
