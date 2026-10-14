package doku
import java.io.File
fun verifyMain(root:String) {
    check(solutions(List(81){0}).size==2)
    check(solutions(parse("11"+"0".repeat(79))).isEmpty())
    var records=0; var deductions=0; val coverage=mutableSetOf<Technique>()
    for(line in File(root,"bank/puzzles-v1.jsonl").readLines()) {
        fun field(key:String)=Regex("\"$key\":\"([^\"]+)\"").find(line)!!.groupValues[1]
        val g=parse(field("givens")); val sol=parse(field("solution")); val level=Difficulty.valueOf(field("difficulty"))
        check(classify(g)==level); check(solutions(g).single()==sol)
        val session=LogicalSession(g)
        while(true) {
            val step=session.next(level) ?: break
            coverage.add(step.technique)
            check(step.explanationRu().isNotBlank())
            step.placement?.let { (c,d) -> check(sol[c]==d) }
            for(rem in step.removals) check(sol[rem.cell]!=rem.digit)
            session.apply(step,level); deductions++
        }
        check(session.snapshot()==sol)
        if(records<30) {
            for(fraction in listOf(3,5,7)) {
                val partial=sol.indices.map { if(g[it]==0 && it%fraction==0) sol[it] else 0 }
                check(hint(g,partial,sol,level) is HintResult.Logical)
            }
            val fresh=LogicalSession(g); val first=fresh.next(level)!!
            fresh.apply(first,level)
            check(runCatching { fresh.apply(first,level) }.isFailure)
        }
        check(hint(g,List(81){0},sol,level) is HintResult.Logical)
        val empty=g.indexOf(0); val wrong=MutableList(81){0}; wrong[empty]=sol[empty]%9+1
        check((hint(g,wrong,sol,level) as HintResult.IncorrectEntries).cells==listOf(empty))
        check(hint(g,sol,sol,level)==HintResult.Complete)
        records++
    }
    check(coverage==Technique.entries.toSet()) { "Technique coverage: $coverage" }
    println("PASS records=$records sound_deductions=$deductions techniques=$coverage")
}
fun main(args:Array<String>)=verifyMain(args.firstOrNull() ?: ".")
