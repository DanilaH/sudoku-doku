package doku
import java.io.File
import java.security.MessageDigest
import java.util.Random
fun hash(s:String)=MessageDigest.getInstance("SHA-256").digest(s.toByteArray()).joinToString("") { "%02x".format(it) }
fun canonical(b:List<Int>):String {
    fun norm(xs:List<Int>):String { val map=mutableMapOf(0 to 0); return xs.joinToString("") { map.getOrPut(it) { map.size }.toString() } }
    val forms=mutableListOf<String>(); var a=b
    repeat(4) { forms.add(norm(a)); forms.add(norm((0..80).map { a[it/9*9+8-it%9] })); a=(0..80).map { a[(8-it%9)*9+it/9] } }
    return forms.min()
}
fun main(args:Array<String>) {
    val target=args.firstOrNull()?.toInt() ?: 300
    val root=File(args.getOrNull(1) ?: "."); File(root,"bank").mkdirs(); File(root,"reports").mkdirs()
    val counts=Difficulty.entries.associateWith { 0 }.toMutableMap(); val seen=mutableSetOf<String>(); val rows=mutableListOf<String>()
    val started=System.nanoTime(); var seed=0L; var rejected=0
    while(counts.values.any { it<target }) {
        val rng=Random(seed); val full=solutions(List(81){0},1,rng).single(); val b=full.toMutableList()
        val order=(0..80).toMutableList(); java.util.Collections.shuffle(order,rng)
        for(i in order) { val old=b[i]; b[i]=0; if(solutions(b).size!=1) b[i]=old }
        val level=classify(b)
        if(level!=null && counts.getValue(level)<target && seen.add(canonical(b))) {
            val trace=solveLogic(b,level); check(trace.board==full)
            val p=b.joinToString(""); val s=full.joinToString(""); val id="sdk-"+hash(p).take(20)
            val tech=trace.steps.groupingBy { it.technique }.eachCount().entries.joinToString(",") { "\"${it.key}\":${it.value}" }
            rows.add("{\"puzzle_id\":\"$id\",\"givens\":\"$p\",\"solution\":\"$s\",\"difficulty\":\"$level\",\"technique_version\":1,\"generator_version\":1,\"seed\":$seed,\"checksum\":\"${hash(p+":"+s)}\",\"steps\":${trace.steps.size},\"techniques\":{$tech}}")
            counts[level]=counts.getValue(level)+1
            if(rows.size%30==0) println("accepted=${rows.size} seeds=$seed counts=$counts")
        } else rejected++
        seed++; check(seed<1000000) { "Generation budget exhausted: $counts" }
    }
    File(root,"bank/puzzles-v1.jsonl").writeText(rows.joinToString("\n",postfix="\n"))
    File(root,"reports/generation.json").writeText("{\"accepted\":${rows.size},\"seeds_tried\":$seed,\"rejected\":$rejected,\"seconds\":${(System.nanoTime()-started)/1e9},\"per_level\":$target,\"generator_version\":1,\"technique_version\":1}\n")
    println("DONE $counts")
}
