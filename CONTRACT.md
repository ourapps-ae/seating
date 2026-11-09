# Seating component

## Purpose and facilities
`seating` decides who sits where. It holds the seat list of a table (people and computer players), joins a person under a name the guest-identity rule accepts, gives the lowest free seat, refuses a full table or a taken name, lets people leave, lets a person who leaves a running game return to the same seat and stack, removes players, tells who may start the game or add a computer, and fixes seat numbers when a game starts (shuffled, or in the order people sat). It knows nothing about the game played at the table.

Facilities: `seats` (Join, leave, lowest free seat, full-table and minimum checks); `seat-assignment` (Random or ordered seat numbers fixed when a game starts); `return-to-stack` (A person who leaves a running game may return to the same seat and stack, or not); `host-controls` (Host, who may remove whom, who may start, who may add a computer); `seat-rows` (Lobby seat list rows for web, Apple and Android clients).

## User inputs
Settings (all optional): `minimumPlayers` (default 2), `maximumPlayers` (default 9, also the number of seats round the table), `seating` (`random` or `order`, default `random`), `returnToStack` (default true) and `hostRemovesPeople` (default false: only computer players can be removed). They map to the house-rules file entries `players.minimum`, `players.maximum`, `players.seating` and `players.return_to_existing_stack_allowed`.

- `minimumPlayers` (integer; optional; default `2`)
- `maximumPlayers` (integer; optional; default `9`)
- `seating` (string, identifier; optional; default `random`)
- `returnToStack` (boolean; optional; default `True`)
- `hostRemovesPeople` (boolean; optional; default `False`)

## Artefacts and dependencies
`component.json` maps every `implementation/` source into `components/seating/`:

- `implementation/android/src/main/java/ae/seating/SeatRows.kt` -> `components/seating/android/src/main/java/ae/seating/SeatRows.kt`
- `implementation/apple/Sources/SeatRows.swift` -> `components/seating/apple/Sources/SeatRows.swift`
- `implementation/server/migrate.ts` -> `components/seating/server/migrate.ts`
- `implementation/server/seating.ts` -> `components/seating/server/seating.ts`
- `implementation/web/lobby.ts` -> `components/seating/web/lobby.ts`

Dependencies: none.
`tools.lock.json` pins verification tools: node 26.5.0, python3 3.12.8, swiftc 6.4.2, kotlinc 2.2.0, java 26.0.1. Licence wording remains deferred.

## Provided interfaces
- `interfaces/seating.json` defines `seating` (ae/seating) version 1.0.0.

## Required interfaces
- `guest-identity` (ae/guest-identity) version 1.0.0, supplied by the recipe or application.

## Integration
Build it once with `createSeating(settings, identity)` from `implementation/server/seating.ts`; `identity` is guest-identity's `createIdentityApi(settings)`, an object with `validName(name)` that has `nameMinLength` and `nameMaxLength` bound. Every operation takes a state and returns a new one. The turn engine keeps the seat state inside the game state and calls `join`, `leave`, `leaveRunning`, `mayReturn`, `remove`, `canStart`, `canAddComputer`, `assign` and `retain`; computer-players calls `join`, `find`, `findByName`, `isFull` and `canAddComputer`; tournament calls `list`, `find` and `people`. Clients use `seatRows` (web `implementation/web/lobby.ts`, Apple `SeatRows.swift`, Android `SeatRows.kt`) to turn a view's players into lobby rows; screens, icons and language text stay with the recipe.

## Visual definition and connected examples
`visual/definition.json` maps its ports to the provided and required interfaces. `visual/examples/connected.json` connects the component to an illustrative application consumer. Both image formats and a text description are retained under `visual/output/`.

## Infrastructure
No service is deployed. The seat state is part of the game state the room stores; nothing else is kept. No accounts or keys.

## Verification
`node --test tests/web.test.ts` checks settings, joining, names checked by the identity's `validName`, full tables, random and ordered seating (every permutation reachable), returning to a stack, removal rules, start and add-computer checks, retain/compact/ring helpers, seat rows, the runnable consumer and export/import with checksums. `python3 tests/native.py apple` compiles and runs the Swift seat-row checks. `python3 tests/native.py android` is written for Kotlin 2.2.0 but was not run on the extraction machine (no kotlinc). `authoring/integration.test.ts` (not packaged) runs seating over the real guest-identity sibling.

- `node --test tests/web.test.ts` (web, required-local; tools: node 26.5.0)
- `python3 tests/native.py apple` (apple, platform; tools: python3 3.12.8, swiftc 6.4.2)
- `python3 tests/native.py android` (android, platform; tools: python3 3.12.8, kotlinc 2.2.0, java 26.0.1)

## Scenarios and presentation
Three people and a computer sit in a nine-seat room: numbers 1 to 4 are given in join order, then fixed at random when the host starts. A person leaves a running game and later returns to the same seat and stack; with `returnToStack` off the way back is shut. The host removes a computer player; with `hostRemovesPeople` on, a person too.

## Updates and removal
Patch updates replace files; the seat state shape is `interfaces/seating-state.schema.json` version 1.0.0 and `migration.json` describes export and import of seat assignments as newline-delimited JSON with a checksum per record. Removal deletes the owned sources and the application's imports; the application's stored seat assignments stay in the room's own storage.
