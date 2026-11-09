package ae.seating

// Rows of the seat list shown before a game starts; text stays with the application.
enum class Removable { NONE, COMPUTERS, EVERYONE }

data class SeatPlayer(val id: String, val name: String, val seat: Int, val isBot: Boolean)

data class SeatRow(val id: String, val seatNumber: Int, val name: String, val isYou: Boolean, val isComputer: Boolean, val canRemove: Boolean, val firstComputer: Boolean)

fun seatRows(players: List<SeatPlayer>, you: String, removable: Removable): List<SeatRow> {
    val ordered = players.sortedBy { it.seat }
    val firstComputer = ordered.firstOrNull { it.isBot }?.id
    return ordered.map { p ->
        val can = when (removable) {
            Removable.EVERYONE -> p.id != you
            Removable.COMPUTERS -> p.isBot
            Removable.NONE -> false
        }
        SeatRow(p.id, p.seat + 1, p.name, p.id == you, p.isBot, can, p.id == firstComputer)
    }
}

fun canTakeSeat(names: List<String>, playerCount: Int, maximum: Int, yourName: String, inGame: Boolean): Boolean =
    yourName in names || (!inGame && playerCount < maximum)
