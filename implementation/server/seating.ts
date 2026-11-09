// Seats for a table of people and computer players. Pure: every operation takes a state and
// returns a new one. Randomness and name rules are injected.

export type Seat = { id: string; name: string; seat: number; computer: boolean };
export type SeatingState = { seats: Seat[]; hostId: string | null; left: string[] };
export type SeatingSettings = {
  minimumPlayers: number;
  maximumPlayers: number;
  seating: "random" | "order";
  returnToStack: boolean;
  hostRemovesPeople: boolean;
};
export type SeatingCode = "badName" | "roomFull" | "notAllowed" | "badTarget" | "notEnoughPlayers";
export type Outcome = { ok: true; state: SeatingState } | { ok: false; code: SeatingCode };
// The name rule: guest-identity's bound `validName(name)`.
export type Identity = { validName(name: unknown): boolean };

export const DEFAULT_SETTINGS: SeatingSettings = {
  minimumPlayers: 2,
  maximumPlayers: 9,
  seating: "random",
  returnToStack: true,
  hostRemovesPeople: false,
};

export function checkSettings(input: Partial<SeatingSettings> = {}): SeatingSettings {
  const s = { ...DEFAULT_SETTINGS, ...input };
  const whole = (n: unknown) => Number.isInteger(n) && (n as number) >= 1;
  if (!whole(s.minimumPlayers) || !whole(s.maximumPlayers) || s.minimumPlayers > s.maximumPlayers) throw new Error("seating: minimumPlayers and maximumPlayers must be whole numbers with minimum <= maximum");
  if (s.seating !== "random" && s.seating !== "order") throw new Error("seating: seating must be random or order");
  if (typeof s.returnToStack !== "boolean" || typeof s.hostRemovesPeople !== "boolean") throw new Error("seating: returnToStack and hostRemovesPeople must be booleans");
  return s;
}

// Fisher-Yates with the caller's random source.
export function shuffled<T>(items: readonly T[], rng: () => number): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function createSeating(input: Partial<SeatingSettings>, identity: Identity) {
  const settings = checkSettings(input);
  const nameOk = (name: unknown): boolean => identity.validName(name);
  const ring = settings.maximumPlayers;
  const fail = (code: SeatingCode): Outcome => ({ ok: false, code });
  const done = (state: SeatingState): Outcome => ({ ok: true, state });
  const copy = (s: SeatingState): SeatingState => structuredClone(s);
  const bySeat = (a: Seat, b: Seat) => a.seat - b.seat;

  const api = {
    settings,
    create(): SeatingState {
      return { seats: [], hostId: null, left: [] };
    },
    validName(name: unknown): boolean {
      return nameOk(name);
    },
    list(s: SeatingState): Seat[] {
      return [...s.seats].sort(bySeat);
    },
    find(s: SeatingState, id: string): Seat | undefined {
      return s.seats.find((p) => p.id === id);
    },
    findByName(s: SeatingState, name: string): Seat | undefined {
      return s.seats.find((p) => p.name === name);
    },
    count(s: SeatingState): number {
      return s.seats.length;
    },
    people(s: SeatingState): Seat[] {
      return s.seats.filter((p) => !p.computer);
    },
    computers(s: SeatingState): Seat[] {
      return s.seats.filter((p) => p.computer);
    },
    isFull(s: SeatingState): boolean {
      return s.seats.length >= settings.maximumPlayers;
    },
    isEnough(s: SeatingState): boolean {
      return s.seats.length >= settings.minimumPlayers;
    },
    // Sit down on the lowest free seat. A name already taken, or invalid, is badName.
    join(s: SeatingState, id: string, name: string, options: { computer?: boolean } = {}): Outcome {
      if (!nameOk(name)) return fail("badName");
      if (s.seats.length >= settings.maximumPlayers) return fail("roomFull");
      if (api.findByName(s, name) || api.find(s, id)) return fail("badName");
      const g = copy(s);
      const taken = new Set(g.seats.map((p) => p.seat));
      let seat = 0;
      while (taken.has(seat)) seat++;
      g.seats.push({ id, name, seat, computer: options.computer === true });
      return done(g);
    },
    // The first person to sit becomes the host unless one is named.
    setHost(s: SeatingState, id: string | null): SeatingState {
      const g = copy(s);
      g.hostId = id;
      return g;
    },
    hostOf(s: SeatingState): string | null {
      return s.hostId;
    },
    minimumPlayers(): number {
      return settings.minimumPlayers;
    },
    maximumPlayers(): number {
      return settings.maximumPlayers;
    },
    isHost(s: SeatingState, id: string): boolean {
      return s.hostId !== null && s.hostId === id;
    },
    // Give the seat up (before the game starts, or after it ends).
    leave(s: SeatingState, id: string): SeatingState {
      const g = copy(s);
      g.seats = g.seats.filter((p) => p.id !== id);
      g.left = g.left.filter((x) => x !== id);
      if (g.hostId === id) g.hostId = null;
      return g;
    },
    // Leave a game under way. The seat and stack stay; without returnToStack the way back is shut.
    leaveRunning(s: SeatingState, id: string): SeatingState {
      if (settings.returnToStack || !api.find(s, id) || s.left.includes(id)) return s;
      const g = copy(s);
      g.left.push(id);
      return g;
    },
    mayReturn(s: SeatingState, id: string): boolean {
      return api.find(s, id) !== undefined && (settings.returnToStack || !s.left.includes(id));
    },
    returned(s: SeatingState, id: string): SeatingState {
      if (!s.left.includes(id)) return s;
      const g = copy(s);
      g.left = g.left.filter((x) => x !== id);
      return g;
    },
    // Take a player off the table. Anyone may remove a computer player; the host, with
    // hostRemovesPeople, may remove a person too (never themselves).
    remove(s: SeatingState, byId: string, targetId: string): Outcome {
      const by = api.find(s, byId);
      if (!by || by.computer) return fail("notAllowed");
      const target = api.find(s, targetId);
      if (!target) return fail("badTarget");
      const hostMayRemove = settings.hostRemovesPeople && api.isHost(s, byId) && targetId !== byId;
      if (!target.computer && !hostMayRemove) return fail("badTarget");
      return done(api.leave(s, targetId));
    },
    // May this person start the game now?
    canStart(s: SeatingState, byId: string): Outcome {
      const by = api.find(s, byId);
      if (!by || by.computer) return fail("notAllowed");
      if (!api.isEnough(s)) return fail("notEnoughPlayers");
      return done(s);
    },
    canAddComputer(s: SeatingState, byId: string): Outcome {
      const by = api.find(s, byId);
      if (!by || by.computer) return fail("notAllowed");
      if (api.isFull(s)) return fail("roomFull");
      return done(s);
    },
    // Fix the seat numbers when the game starts: shuffled, or in the order people sat down.
    assign(s: SeatingState, rng: () => number): SeatingState {
      const g = copy(s);
      const order = [...g.seats].sort(bySeat);
      const seats = settings.seating === "random" ? shuffled(order.map((_, i) => i), rng) : order.map((_, i) => i);
      order.forEach((p, i) => (p.seat = seats[i]));
      g.seats.sort(bySeat);
      return g;
    },
    // Close the gaps: seat numbers become 0..n-1 in seat order.
    compact(s: SeatingState): SeatingState {
      const g = copy(s);
      g.seats.sort(bySeat).forEach((p, i) => (p.seat = i));
      return g;
    },
    // A new lobby keeping only these players, seated afresh in their old order; no host, nobody left.
    retain(s: SeatingState, keep: (seat: Seat) => boolean): SeatingState {
      const g = copy(s);
      g.seats = g.seats.filter(keep).sort(bySeat);
      g.seats.forEach((p, i) => (p.seat = i));
      g.left = [];
      g.hostId = null;
      return g;
    },
    // The next occupied seat clockwise from a seat number, among the given players (default all).
    nextOccupied(s: SeatingState, fromSeat: number, among?: readonly string[]): number {
      const seats = s.seats.filter((p) => !among || among.includes(p.id)).map((p) => p.seat);
      for (let i = 1; i <= ring; i++) {
        const seat = (fromSeat + i) % ring;
        if (seats.includes(seat)) return seat;
      }
      return fromSeat;
    },
    // Steps clockwise from one seat to another; the same seat is a full circle.
    distance(from: number, to: number): number {
      return ((((to - from) % ring) + ring) % ring) || ring;
    },
  };
  return api;
}

export type Seating = ReturnType<typeof createSeating>;
