// Rows of the seat list shown before a game starts. Text (the "you" suffix, labels) stays with the
// application's language files; this decides who is listed, in which order, and who can be removed.

export type SeatPlayer = { id: string; name: string; seat: number; isBot: boolean };
export type Removable = "none" | "computers" | "everyone";
export type SeatRow = { id: string; seatNumber: number; name: string; isYou: boolean; isComputer: boolean; canRemove: boolean; firstComputer: boolean };

export function seatRows(players: readonly SeatPlayer[], you: string, removable: Removable): SeatRow[] {
  const ordered = [...players].sort((a, b) => a.seat - b.seat);
  const firstComputer = ordered.find((p) => p.isBot)?.id ?? null;
  return ordered.map((p) => ({
    id: p.id,
    seatNumber: p.seat + 1,
    name: p.name,
    isYou: p.id === you,
    isComputer: p.isBot,
    canRemove: removable === "everyone" ? p.id !== you : removable === "computers" && p.isBot,
    firstComputer: p.id === firstComputer,
  }));
}

// Whether the room list can offer a seat: not full, or the name already holds one.
export function canTakeSeat(names: readonly string[], playerCount: number, maximum: number, yourName: string, inGame: boolean): boolean {
  return names.includes(yourName) || (!inGame && playerCount < maximum);
}
