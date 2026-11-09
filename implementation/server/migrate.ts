// Portable export and import of a seating state as newline-delimited JSON, one record per line,
// each with a sha256 of its content so an import can check what it read.
import { createHash } from "node:crypto";
import type { SeatingState } from "./seating.ts";

type Body = { kind: "seat"; id: string; name: string; seat: number; computer: boolean } | { kind: "host"; id: string | null } | { kind: "left"; id: string };

const hash = (body: Body) => createHash("sha256").update(JSON.stringify(body)).digest("hex");

export function exportAll(state: SeatingState): string {
  const bodies: Body[] = [
    ...state.seats.map((s): Body => ({ kind: "seat", id: s.id, name: s.name, seat: s.seat, computer: s.computer })),
    { kind: "host", id: state.hostId },
    ...state.left.map((id): Body => ({ kind: "left", id })),
  ];
  return bodies.map((b) => JSON.stringify({ ...b, sha256: hash(b) })).join("\n") + "\n";
}

export function importAll(text: string): SeatingState {
  const state: SeatingState = { seats: [], hostId: null, left: [] };
  const lines = text.split("\n").filter((l) => l.trim() !== "");
  for (const line of lines) {
    const { sha256, ...body } = JSON.parse(line) as Body & { sha256: string };
    if (sha256 !== hash(body as Body)) throw new Error("seating import: checksum mismatch");
    if (body.kind === "seat") {
      if (typeof body.id !== "string" || typeof body.name !== "string" || !Number.isInteger(body.seat) || body.seat < 0 || typeof body.computer !== "boolean") throw new Error("seating import: bad seat record");
      if (state.seats.some((s) => s.id === body.id || s.seat === body.seat)) throw new Error("seating import: duplicate seat or id");
      state.seats.push({ id: body.id, name: body.name, seat: body.seat, computer: body.computer });
    } else if (body.kind === "host") state.hostId = body.id;
    else if (body.kind === "left") state.left.push(body.id);
    else throw new Error("seating import: unknown record");
  }
  if (state.hostId !== null && !state.seats.some((s) => s.id === state.hostId)) throw new Error("seating import: host has no seat");
  return state;
}
