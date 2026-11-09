import Foundation

var checks = 0
func expect(_ condition: Bool, _ message: String) {
    checks += 1
    if !condition { print("FAILED: \(message)"); exit(1) }
}

let players = [
    SeatPlayer(id: "p3", name: "Cy", seat: 2, isBot: true),
    SeatPlayer(id: "p1", name: "Al", seat: 0, isBot: false),
    SeatPlayer(id: "p2", name: "Bo", seat: 1, isBot: true),
]
let rows = seatRows(players, you: "p1", removable: .computers)
expect(rows.map { $0.id } == ["p1", "p2", "p3"], "rows follow seat order")
expect(rows.map { $0.seatNumber } == [1, 2, 3], "seat numbers start at one")
expect(rows[0].isYou && !rows[1].isYou, "you flag")
expect(rows.map { $0.canRemove } == [false, true, true], "computers removable")
expect(rows.map { $0.firstComputer } == [false, true, false], "first computer marked once")
expect(seatRows(players, you: "p1", removable: .everyone).map { $0.canRemove } == [false, true, true], "everyone but you")
expect(seatRows(players, you: "p1", removable: .none).allSatisfy { !$0.canRemove }, "nobody removable")
expect(seatRows([], you: "p1", removable: .computers).isEmpty, "empty table")
expect(canTakeSeat(names: ["Al"], playerCount: 9, maximum: 9, yourName: "Al", inGame: true), "own seat found again")
expect(!canTakeSeat(names: ["Al"], playerCount: 9, maximum: 9, yourName: "Bo", inGame: false), "full table")
expect(!canTakeSeat(names: ["Al"], playerCount: 2, maximum: 9, yourName: "Bo", inGame: true), "game under way")
expect(canTakeSeat(names: ["Al"], playerCount: 2, maximum: 9, yourName: "Bo", inGame: false), "free seat")
print("\(checks) seat row assertions passed")
