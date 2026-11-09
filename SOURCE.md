# Source mapping

Reference revision: `19905b75dbea89fbfd424d67fe26c81aaed0e018`. Extraction source: `OurPoker/recipe/` (read-only).

- `implementation/server/seating.ts` <- `server/src/engine.ts`:
  - `join` 208-221 and `freshPlayer` 223-249 (lowest free seat, name check, full table, taken name): `join`, `find`, `findByName`, `isFull`; the player record's stack, hand and presence fields were left behind (they belong to tournament, the game and presence).
  - `start` 376-379 and 390 (shuffled seat numbers, sorted by seat): `assign`; in join order when `seating` is `order`.
  - `kick` 421-428 (computer players only, lobby only): `remove`; `hostRemovesPeople` (new) lets the host remove a person.
  - `leave` 430-445 (lobby: give up the seat; running: keep seat and stack): `leave` and `leaveRunning`; `returnToStack` (new, from `rules/texas-holdem-house-rules.json` `players.return_to_existing_stack_allowed`, line 11) shuts the way back when false (`mayReturn`, `returned`).
  - `backToLobby` 513-520 and `advance` 497-502 (kept players renumbered `0..n-1`): `retain`, `compact`.
  - `nextInSeat` 612-619 and `dist` 826-828 (ring of nine): `nextOccupied` and `distance`, ring size `maximumPlayers`.
  - `start` 374 and `legalFor` in `view.ts` 184-190 (minimum players, who may start or add a computer): `isEnough`, `canStart`, `canAddComputer`.
  - Minimum, maximum and random seating from `server/src/rules.ts` 4-5 and the house rules `players` block (lines 6-12).
  - Left behind: presence, sitting out, stacks, hands, the lobby drop timer (`LOBBY_DROP_MS`, line 34; it belongs to the engine and presence), bots and their names (computer-players).
- `implementation/server/migrate.ts` <- new (`generated-platform`): ndjson export and import of the seat state with a sha256 per record, for `migration.json`.
- `implementation/web/lobby.ts` <- `web/src/screens.ts` 113-140 (lobby rows: seat number `seat + 1`, computer mark, first computer marked, remove button only for computers) and 86-92 (`enterButton`: seated, full, in game): `seatRows`, `canTakeSeat`. DOM building, icons and text left in the recipe.
- `implementation/apple/Sources/SeatRows.swift` <- `ios/OurPoker/Sources/LobbyScreen.swift` 34-50 (same rows); `SeatScreen.swift` is a video monitor tile, not seat logic, and was left behind.
- `implementation/android/src/main/java/ae/seating/SeatRows.kt` <- `android/.../ui/LobbyScreen.kt` 69-83 (same rows); `SeatScreen.kt` is the video monitor tile and was left behind. Not compiled here (no kotlinc).
- `authoring/integration.test.ts`: new; seating over guest-identity's `createIdentityApi`.
- `interfaces/seating-state.schema.json`, `migration.json`, `examples/consumer.ts`, tests: new.
