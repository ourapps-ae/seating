import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { createSeating, checkSettings, shuffled } from "../implementation/server/seating.ts";
import { exportAll, importAll } from "../implementation/server/migrate.ts";
import { canTakeSeat, seatRows } from "../implementation/web/lobby.ts";
import { lobby } from "../examples/consumer.ts";

const names = JSON.parse(readFileSync(new URL("fixtures/names.json", import.meta.url), "utf8"));
// The reference rule: 1 to 20 printable ASCII characters with no padding.
const identity = { validName: (n: unknown) => typeof n === "string" && /^[\x20-\x7E]{1,20}$/.test(n.trim()) && n.trim() === n };
const counter = (values: number[]) => { let i = 0; return () => values[i++ % values.length]; };

function sit(seating: ReturnType<typeof createSeating>, entries: [string, string, boolean?][]) {
  let state = seating.create();
  for (const [id, name, computer] of entries) {
    const r = seating.join(state, id, name, { computer });
    assert.ok(r.ok, `${name}: ${!r.ok && r.code}`);
    state = r.state;
  }
  return state;
}

test("settings are checked", () => {
  assert.deepEqual(checkSettings({}), { minimumPlayers: 2, maximumPlayers: 9, seating: "random", returnToStack: true, hostRemovesPeople: false });
  assert.throws(() => checkSettings({ minimumPlayers: 5, maximumPlayers: 3 }));
  assert.throws(() => checkSettings({ minimumPlayers: 0 }));
  assert.throws(() => checkSettings({ seating: "circle" as "random" }));
  assert.throws(() => checkSettings({ maximumPlayers: 2.5 }));
});

test("names follow the injected identity rule", () => {
  const seating = createSeating({}, identity);
  const s = seating.create();
  for (const n of names.valid.slice(0, 3)) assert.ok(seating.join(s, "x", n).ok, n);
  for (const n of names.invalid) assert.deepEqual(seating.join(s, "x", n), { ok: false, code: "badName" });
});

test("names are checked by the identity's validName", () => {
  const strict = createSeating({}, { validName: (n) => n === "Ada" });
  assert.equal(strict.validName("Ada"), true);
  assert.ok(strict.join(strict.create(), "a", "Ada").ok);
  assert.deepEqual(strict.join(strict.create(), "b", "Bea"), { ok: false, code: "badName" });
});

test("joining takes the lowest free seat, refuses a taken name or id, and stops when full", () => {
  const seating = createSeating({ maximumPlayers: 3 }, identity);
  let s = sit(seating, [["a", "Ada"], ["b", "Bea"], ["c", "Cy"]]);
  assert.deepEqual(seating.list(s).map((p) => [p.name, p.seat]), [["Ada", 0], ["Bea", 1], ["Cy", 2]]);
  assert.deepEqual(seating.join(s, "d", "Di"), { ok: false, code: "roomFull" });
  s = seating.leave(s, "b");
  assert.equal(seating.count(s), 2);
  assert.deepEqual(seating.join(s, "x", "Ada"), { ok: false, code: "badName" });
  assert.deepEqual(seating.join(s, "a", "Other"), { ok: false, code: "badName" });
  const r = seating.join(s, "d", "Di");
  assert.ok(r.ok);
  assert.equal(seating.find(r.state, "d")?.seat, 1);
  assert.equal(seating.count(s), 2, "input state is not changed");
});

test("random seating is a permutation fixed by the random source; order keeps the join order", () => {
  const random = createSeating({ seating: "random" }, identity);
  const s = sit(random, [["a", "Ada"], ["b", "Bea"], ["c", "Cy"], ["d", "Di"]]);
  const a = random.assign(s, counter([0.1, 0.9, 0.5]));
  const b = random.assign(s, counter([0.1, 0.9, 0.5]));
  assert.deepEqual(a, b);
  assert.deepEqual(random.list(a).map((p) => p.seat), [0, 1, 2, 3]);
  assert.deepEqual([...a.seats.map((p) => p.id)].sort(), ["a", "b", "c", "d"]);
  assert.notDeepEqual(random.list(a).map((p) => p.id), ["a", "b", "c", "d"]);
  const order = createSeating({ seating: "order" }, identity);
  const o = order.assign(order.leave(sit(order, [["a", "Ada"], ["b", "Bea"], ["c", "Cy"]]), "a"), counter([0.3]));
  assert.deepEqual(order.list(o).map((p) => [p.id, p.seat]), [["b", 0], ["c", 1]]);
  assert.deepEqual(shuffled([1, 2, 3], () => 0), [2, 3, 1]);
});

test("every random seating of three is reachable and never repeats a seat", () => {
  const seating = createSeating({}, identity);
  const s = sit(seating, [["a", "Ada"], ["b", "Bea"], ["c", "Cy"]]);
  const seen = new Set<string>();
  for (let i = 0; i < 200; i++) {
    const t = seating.assign(s, Math.random);
    assert.deepEqual(t.seats.map((p) => p.seat), [0, 1, 2]);
    seen.add(t.seats.map((p) => p.id).join(""));
  }
  assert.equal(seen.size, 6);
});

test("returning to a stack depends on returnToStack", () => {
  for (const returnToStack of [true, false]) {
    const seating = createSeating({ returnToStack }, identity);
    let s = sit(seating, [["a", "Ada"], ["b", "Bea"]]);
    s = seating.leaveRunning(s, "a");
    assert.equal(seating.count(s), 2, "the seat is kept");
    assert.equal(seating.mayReturn(s, "a"), returnToStack);
    assert.equal(seating.mayReturn(s, "b"), true);
    assert.equal(seating.mayReturn(s, "ghost"), false);
    assert.equal(seating.mayReturn(seating.returned(s, "a"), "a"), true);
  }
});

test("removing: anyone removes computers, only the host removes people and only when allowed", () => {
  const plain = createSeating({}, identity);
  let s = plain.setHost(sit(plain, [["a", "Ada"], ["b", "Bea"], ["c", "Cy", true]]), "a");
  assert.deepEqual(plain.remove(s, "b", "a"), { ok: false, code: "badTarget" });
  assert.deepEqual(plain.remove(s, "a", "b"), { ok: false, code: "badTarget" });
  assert.deepEqual(plain.remove(s, "c", "b"), { ok: false, code: "notAllowed" });
  assert.deepEqual(plain.remove(s, "a", "ghost"), { ok: false, code: "badTarget" });
  const r = plain.remove(s, "b", "c");
  assert.ok(r.ok && plain.count(r.state) === 2);
  const strong = createSeating({ hostRemovesPeople: true }, identity);
  s = strong.setHost(sit(strong, [["a", "Ada"], ["b", "Bea"]]), "a");
  assert.deepEqual(strong.remove(s, "b", "a"), { ok: false, code: "badTarget" });
  assert.deepEqual(strong.remove(s, "a", "a"), { ok: false, code: "badTarget" });
  const h = strong.remove(s, "a", "b");
  assert.ok(h.ok && strong.find(h.state, "b") === undefined);
});

test("starting and adding computers need enough or room", () => {
  const seating = createSeating({ minimumPlayers: 2, maximumPlayers: 3 }, identity);
  let s = sit(seating, [["a", "Ada"]]);
  assert.deepEqual(seating.canStart(s, "a"), { ok: false, code: "notEnoughPlayers" });
  s = sit(seating, [["a", "Ada"], ["c", "Cy", true]]);
  assert.ok(seating.canStart(s, "a").ok);
  assert.deepEqual(seating.canStart(s, "c"), { ok: false, code: "notAllowed" });
  assert.ok(seating.canAddComputer(s, "a").ok);
  s = sit(seating, [["a", "Ada"], ["b", "Bea"], ["c", "Cy"]]);
  assert.deepEqual(seating.canAddComputer(s, "a"), { ok: false, code: "roomFull" });
  assert.deepEqual(seating.canAddComputer(s, "ghost"), { ok: false, code: "notAllowed" });
});

test("retain, compact and the ring", () => {
  const seating = createSeating({ maximumPlayers: 5 }, identity);
  let s = seating.setHost(sit(seating, [["a", "Ada"], ["b", "Bea", true], ["c", "Cy"], ["d", "Di"]]), "c");
  s = seating.leave(s, "b");
  assert.deepEqual(seating.list(seating.compact(s)).map((p) => p.seat), [0, 1, 2]);
  const kept = seating.retain(s, (p) => p.id !== "c");
  assert.deepEqual(kept.seats.map((p) => [p.id, p.seat]), [["a", 0], ["d", 1]]);
  assert.equal(kept.hostId, null);
  assert.deepEqual(seating.retain(seating.leaveRunning(s, "a"), () => true).left, []);
  assert.equal(seating.hostOf(s), "c");
  assert.equal(seating.minimumPlayers(), 2);
  assert.equal(seating.maximumPlayers(), 5);
  s = sit(seating, [["a", "Ada"], ["b", "Bea"], ["c", "Cy"]]);
  assert.equal(seating.nextOccupied(s, 2), 0);
  assert.equal(seating.nextOccupied(s, 0, ["c"]), 2);
  assert.equal(seating.nextOccupied(s, 0, []), 0);
  assert.equal(seating.distance(1, 3), 2);
  assert.equal(seating.distance(3, 1), 3);
  assert.equal(seating.distance(2, 2), 5);
});

test("seat rows and room-list seats", () => {
  const view = [{ id: "c", name: "Cy", seat: 2, isBot: true }, { id: "a", name: "Ada", seat: 0, isBot: false }, { id: "b", name: "Bo", seat: 1, isBot: true }];
  const rows = seatRows(view, "a", "computers");
  assert.deepEqual(rows.map((r) => r.id), ["a", "b", "c"]);
  assert.deepEqual(rows.map((r) => r.seatNumber), [1, 2, 3]);
  assert.deepEqual(rows.map((r) => r.canRemove), [false, true, true]);
  assert.deepEqual(rows.map((r) => r.firstComputer), [false, true, false]);
  assert.deepEqual(seatRows(view, "a", "everyone").map((r) => r.canRemove), [false, true, true]);
  assert.ok(seatRows(view, "a", "none").every((r) => !r.canRemove));
  assert.ok(canTakeSeat(["Ada"], 9, 9, "Ada", true));
  assert.ok(!canTakeSeat(["Ada"], 9, 9, "Bo", false));
  assert.ok(!canTakeSeat(["Ada"], 3, 9, "Bo", true));
});

test("the example lobby runs without a game", () => {
  const { state, rows } = lobby(counter([0.2, 0.8]));
  assert.equal(state.hostId, "a");
  assert.equal(rows.length, 3);
  assert.deepEqual(rows.map((r) => r.seatNumber), [1, 2, 3]);
  assert.equal(rows.filter((r) => r.canRemove).length, 1);
});

test("export and import round-trip and refuse tampering", () => {
  const seating = createSeating({}, identity);
  let s = seating.setHost(sit(seating, [["a", "Ada"], ["b", "Bea", true], ["c", "Cy"]]), "a");
  s = seating.assign(s, counter([0.4, 0.6]));
  const text = exportAll({ ...s, left: ["c"] });
  assert.equal(text.trim().split("\n").length, 5);
  assert.deepEqual(importAll(text), { ...s, left: ["c"] });
  assert.throws(() => importAll(text.replace("Ada", "Eve")), /checksum/);
  const bad = text.split("\n");
  assert.throws(() => importAll([bad[0], bad[0], ""].join("\n")), /duplicate/);
  assert.deepEqual(importAll(exportAll(seating.create())), seating.create());
});
