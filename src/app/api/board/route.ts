import { connection } from "next/server";
import { mutateBoard, readBoard } from "@/lib/board-file";
import type { BoardAction } from "@/lib/board-ops";

export async function GET() {
  await connection();
  return Response.json(await readBoard());
}

export async function POST(request: Request) {
  const action = (await request.json()) as BoardAction;
  if (!action || typeof action.type !== "string") {
    return Response.json({ error: "Acción inválida" }, { status: 400 });
  }
  return Response.json(await mutateBoard(action));
}
