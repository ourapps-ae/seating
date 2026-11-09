// A lobby without any game: people and a computer player sit, seats are fixed, rows are listed.
import { createSeating } from "../implementation/server/seating.ts";
import { seatRows } from "../implementation/web/lobby.ts";

const identity = { validName: (name: unknown) => typeof name === "string" && /^[A-Za-z]{1,20}$/.test(name) };

export function lobby(rng: () => number) {
  const seating = createSeating({ minimumPlayers: 2, maximumPlayers: 4 }, identity);
  let state = seating.create();
  for (const [id, name, computer] of [["a", "Ada", false], ["b", "Bea", false], ["c", "Computer", true]] as const) {
    const r = seating.join(state, id, name, { computer });
    if (!r.ok) throw new Error(r.code);
    state = r.state;
  }
  state = seating.setHost(state, "a");
  const started = seating.canStart(state, "a");
  if (!started.ok) throw new Error(started.code);
  state = seating.assign(state, rng);
  const rows = seatRows(seating.list(state).map((s) => ({ id: s.id, name: s.name, seat: s.seat, isBot: s.computer })), "a", "computers");
  return { state, rows };
}
