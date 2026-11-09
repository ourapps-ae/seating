// Not packaged. Seating over the real guest-identity component (sibling in components/).
// Run: node --test authoring/integration.test.ts
import assert from "node:assert/strict";
import test from "node:test";
import { existsSync } from "node:fs";
import { createSeating } from "../implementation/server/seating.ts";

const path = new URL("../../guest-identity/implementation/server/identity.ts", import.meta.url);
const present = existsSync(path);

test("seating takes its name rule from the real guest-identity (createIdentityApi)", { skip: present ? false : "guest-identity is not present" }, async () => {
  const identity = await import(path.href);
  assert.equal(typeof identity.createIdentityApi, "function", "guest-identity exposes createIdentityApi");
  const seating = createSeating({}, identity.createIdentityApi({ nameMinLength: 2, nameMaxLength: 6 }));
  assert.equal(seating.validName("Ada"), true);
  assert.equal(seating.validName("A"), false, "shorter than nameMinLength");
  assert.equal(seating.validName("Alexandra"), false, "longer than nameMaxLength");
  assert.equal(seating.validName(" Ada"), false);
  assert.deepEqual(seating.join(seating.create(), "x", "A"), { ok: false, code: "badName" });
  assert.ok(seating.join(seating.create(), "x", "Ada").ok);
});
