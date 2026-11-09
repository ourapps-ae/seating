// Rows of the seat list shown before a game starts; text stays with the application.
public enum Removable { case none, computers, everyone }

public struct SeatPlayer {
    public let id: String
    public let name: String
    public let seat: Int
    public let isBot: Bool
    public init(id: String, name: String, seat: Int, isBot: Bool) { self.id = id; self.name = name; self.seat = seat; self.isBot = isBot }
}

public struct SeatRow: Equatable {
    public let id: String
    public let seatNumber: Int
    public let name: String
    public let isYou: Bool
    public let isComputer: Bool
    public let canRemove: Bool
    public let firstComputer: Bool
}

public func seatRows(_ players: [SeatPlayer], you: String, removable: Removable) -> [SeatRow] {
    let ordered = players.sorted { $0.seat < $1.seat }
    let firstComputer = ordered.first { $0.isBot }?.id
    return ordered.map { p in
        let can: Bool
        switch removable {
        case .everyone: can = p.id != you
        case .computers: can = p.isBot
        case .none: can = false
        }
        return SeatRow(id: p.id, seatNumber: p.seat + 1, name: p.name, isYou: p.id == you, isComputer: p.isBot, canRemove: can, firstComputer: p.id == firstComputer)
    }
}

public func canTakeSeat(names: [String], playerCount: Int, maximum: Int, yourName: String, inGame: Bool) -> Bool {
    names.contains(yourName) || (!inGame && playerCount < maximum)
}
