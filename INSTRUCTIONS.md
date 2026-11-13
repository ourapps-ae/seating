# Seating instructions

## For the agent
Select `ourapps-ae/seating` once per recipe. Map the recipe's players question to `minimumPlayers` and `maximumPlayers`. Connect the `guest-identity` requirement to the guest-identity component, then connect the provided `seating` to turn-engine (as `seating`), computer-players (as `seating`) and tournament (as `seating`). Seating is `random` unless the house rules say `order`.

- Select package `ourapps-ae/seating` version `0.5.0`.
- Settings to configure:
  - `minimumPlayers` (integer; optional; default `2`)
  - `maximumPlayers` (integer; optional; default `9`)
  - `seating` (string, identifier; optional; default `random`)
  - `returnToStack` (boolean; optional; default `True`)
  - `hostRemovesPeople` (boolean; optional; default `False`)
- Connect the provided `seating` (ae/seating 1.0.0) to the consumer that needs it.
- Supply `guest-identity` (ae/guest-identity 1.0.0) from the component that provides it.
- No accounts or keys are needed.

## For the developer
Nothing to supply: no accounts or keys. Pass the same name rule your clients use (guest-identity). If you keep a house-rules file, read the four `players` values into the settings. Use `seatRows` in your lobby screen and keep the text and icons in your own language files. To check it works, run the commands below.

## How to check
From the component directory:

- `node --test tests/web.test.ts` (web, required-local; tools: node 26.5)
- `python3 tests/native.py apple` (apple, platform; tools: python3 3.12, swiftc 6.4)
- `python3 tests/native.py android` (android, platform; tools: python3 3.12, kotlinc 2.2, java 26.0)
- `python3 -m aepm review <digest> --store STORE --policy POLICY --trusted --allow-network` checks an archive fetched with `python3 -m aepm fetch ourapps-ae/seating@VERSION --store STORE --from https://ourapps.app` and runs its suites.
