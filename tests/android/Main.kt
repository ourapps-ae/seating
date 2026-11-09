import ae.seating.Removable
import ae.seating.SeatPlayer
import ae.seating.canTakeSeat
import ae.seating.seatRows

fun main() {
    val players = listOf(SeatPlayer("p3", "Cy", 2, true), SeatPlayer("p1", "Al", 0, false), SeatPlayer("p2", "Bo", 1, true))
    val rows = seatRows(players, "p1", Removable.COMPUTERS)
    check(rows.map { it.id } == listOf("p1", "p2", "p3"))
    check(rows.map { it.seatNumber } == listOf(1, 2, 3))
    check(rows[0].isYou && !rows[1].isYou)
    check(rows.map { it.canRemove } == listOf(false, true, true))
    check(rows.map { it.firstComputer } == listOf(false, true, false))
    check(seatRows(players, "p1", Removable.EVERYONE).map { it.canRemove } == listOf(false, true, true))
    check(seatRows(players, "p1", Removable.NONE).none { it.canRemove })
    check(seatRows(emptyList(), "p1", Removable.COMPUTERS).isEmpty())
    check(canTakeSeat(listOf("Al"), 9, 9, "Al", true))
    check(!canTakeSeat(listOf("Al"), 9, 9, "Bo", false))
    check(!canTakeSeat(listOf("Al"), 2, 9, "Bo", true))
    check(canTakeSeat(listOf("Al"), 2, 9, "Bo", false))
    println("12 seat row assertions passed")
}
