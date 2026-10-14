package doku
import java.io.File
fun main(args:Array<String>) {
 val signatures=File("bank/puzzles-v1.jsonl").readLines().map { line ->
 fun field(k:String)=Regex("\"$k\":\"([^\"]+)\"").find(line)!!.groupValues[1]
 val t=solveLogic(parse(field("givens")),Difficulty.valueOf(field("difficulty")))
 val signature=t.steps.joinToString("\n") { s -> listOf(s.technique.name,s.sourceCells.joinToString(","),s.digits.joinToString(","),s.unitIndex?.toString() ?: "-",s.placement?.let { "${it.first},${it.second}" } ?: "-",s.removals.joinToString(";") { "${it.cell},${it.digit}" }).joinToString("|") }
 "${field("puzzle_id")} ${hash(signature)}"
 }
 File(args.firstOrNull() ?: "bank/kotlin-traces.sha256").writeText(signatures.joinToString("\n",postfix="\n"))
}
