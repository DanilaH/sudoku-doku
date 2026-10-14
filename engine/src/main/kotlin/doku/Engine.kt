package doku

const val ALL = 0x3fe
fun bit(d: Int) = 1 shl d
fun digits(mask: Int) = (1..9).filter { mask and bit(it) != 0 }
val units: List<List<Int>> = (0..8).map { r -> (0..8).map { r*9+it } } +
    (0..8).map { c -> (0..8).map { it*9+c } } +
    (0..8).map { b -> (0..8).map { (b/3*3+it/3)*9+b%3*3+it%3 } }
val peers = (0..80).map { i -> units.filter { i in it }.flatten().distinct().filter { it != i } }
fun parse(text: String): List<Int> {
    require(text.length == 81 && text.all { it in '0'..'9' })
    return text.map { it-'0' }
}
fun valid(board: List<Int>): Boolean = board.size == 81 && board.all { it in 0..9 } &&
    units.all { u -> val ds = u.map { board[it] }.filter { it != 0 }; ds.distinct().size == ds.size }

/** Bounded MRV search. Used by generator, never as a human difficulty classifier. */
fun solutions(input: List<Int>, limit: Int = 2, random: java.util.Random? = null): List<List<Int>> {
    require(limit > 0)
    if (!valid(input)) return emptyList()
    val b = input.toMutableList(); val out = mutableListOf<List<Int>>()
    val row=IntArray(9); val col=IntArray(9); val box=IntArray(9)
    fun boxOf(i:Int)=i/27*3+i%9/3
    for(i in 0..80) if(b[i]!=0) { val m=bit(b[i]); row[i/9]=row[i/9] or m; col[i%9]=col[i%9] or m; box[boxOf(i)]=box[boxOf(i)] or m }
    fun visit() {
        if (out.size >= limit) return
        var cell = -1; var mask=0; var best=10
        for (i in 0..80) if (b[i] == 0) {
            val m=ALL and (row[i/9] or col[i%9] or box[boxOf(i)]).inv()
            val n=Integer.bitCount(m); if(n==0) return
            if(n<best) { cell=i; mask=m; best=n; if(n==1) break }
        }
        if (cell == -1) { out.add(b.toList()); return }
        val order=digits(mask).toMutableList(); if(random!=null) java.util.Collections.shuffle(order,random)
        val r=cell/9; val c=cell%9; val k=boxOf(cell)
        for(d in order) {
            val m=bit(d); b[cell]=d; row[r]=row[r] or m; col[c]=col[c] or m; box[k]=box[k] or m
            visit()
            row[r]=row[r] and m.inv(); col[c]=col[c] and m.inv(); box[k]=box[k] and m.inv()
            if(out.size>=limit) break
        }
        b[cell]=0
    }
    visit(); return out
}

enum class Difficulty { EASY, MEDIUM, HARD }
enum class Technique { NAKED_SINGLE, HIDDEN_SINGLE, LOCKED_CANDIDATES, NAKED_PAIR, HIDDEN_PAIR }
data class Removal(val cell: Int, val digit: Int)
data class Step(val technique: Technique, val sourceCells: List<Int>, val digits: List<Int>,
                val unitIndex: Int?, val placement: Pair<Int,Int>? = null, val removals: List<Removal> = emptyList()) {
    fun explanationRu(): String {
        val coords = sourceCells.joinToString { "строка ${it/9+1}, столбец ${it%9+1}" }
        val nums = digits.joinToString()
        return when(technique) {
            Technique.NAKED_SINGLE -> "В клетке ($coords) возможна только цифра $nums."
            Technique.HIDDEN_SINGLE -> "В выделенной группе цифра $nums возможна только в клетке ($coords)."
            Technique.LOCKED_CANDIDATES -> "В выделенной группе цифра $nums ограничена пересечением ($coords). Уберите её из отмеченных клеток другой группы."
            Technique.NAKED_PAIR -> "Две клетки ($coords) содержат только кандидатов $nums. Эти цифры исключаются из остальных клеток выделенной группы."
            Technique.HIDDEN_PAIR -> "Цифры $nums встречаются в выделенной группе только в двух клетках ($coords). Уберите другие кандидаты из этих клеток."
        }
    }
}
data class Trace(val solved: Boolean, val board: List<Int>, val steps: List<Step>)
/** Candidate eliminations persist across steps; handwritten notes are deliberately not an input. */
class LogicalSession(input: List<Int>) {
    private val board = input.toMutableList()
    private val masks = IntArray(81)
    init { require(valid(input)); for(i in 0..80) masks[i]=if(board[i]==0) ALL and peers[i].fold(0) { m,p -> m or bit(board[p]) }.inv() else 0 }
    fun snapshot() = board.toList()
    fun candidates() = masks.toList()
    fun next(level: Difficulty): Step? {
        for(i in 0..80) if(board[i]==0 && Integer.bitCount(masks[i])==1)
            return Step(Technique.NAKED_SINGLE,listOf(i),digits(masks[i]),null,i to digits(masks[i]).single())
        for((ui,u) in units.withIndex()) for(d in 1..9) {
            val cells=u.filter { masks[it] and bit(d)!=0 }
            if(cells.size==1) return Step(Technique.HIDDEN_SINGLE,cells,listOf(d),ui,cells.single() to d)
        }
        if(level==Difficulty.EASY) return null
        for((ai,a) in units.withIndex()) for(d in 1..9) {
            val src=a.filter { masks[it] and bit(d)!=0 }; if(src.size<2) continue
            for((bi,b) in units.withIndex()) if(ai!=bi && src.all { it in b }) {
                val rem=b.filter { it !in a && masks[it] and bit(d)!=0 }.map { Removal(it,d) }
                if(rem.isNotEmpty()) return Step(Technique.LOCKED_CANDIDATES,src,listOf(d),ai,removals=rem)
            }
        }
        if(level==Difficulty.MEDIUM) return null
        for((ui,u) in units.withIndex()) {
            val pairs=u.filter { Integer.bitCount(masks[it])==2 }.groupBy { masks[it] }
            for((mask,src) in pairs) if(src.size==2) {
                val rem=u.filter { it !in src }.flatMap { c -> digits(masks[c] and mask).map { Removal(c,it) } }
                if(rem.isNotEmpty()) return Step(Technique.NAKED_PAIR,src,digits(mask),ui,removals=rem)
            }
            for(d1 in 1..8) for(d2 in d1+1..9) {
                val s1=u.filter { masks[it] and bit(d1)!=0 }; val s2=u.filter { masks[it] and bit(d2)!=0 }
                if(s1.size==2 && s1==s2) {
                    val mask=bit(d1) or bit(d2)
                    val rem=s1.flatMap { c -> digits(masks[c] and mask.inv()).map { Removal(c,it) } }
                    if(rem.isNotEmpty()) return Step(Technique.HIDDEN_PAIR,s1,listOf(d1,d2),ui,removals=rem)
                }
            }
        }
        return null
    }
    fun apply(step: Step, level: Difficulty) {
        require(step == next(level)) { "Stale or foreign step" }
        step.placement?.let { (c,d) -> board[c]=d; masks[c]=0; for(p in peers[c]) masks[p]=masks[p] and bit(d).inv() }
        for(r in step.removals) masks[r.cell]=masks[r.cell] and bit(r.digit).inv()
        check(board.indices.none { board[it]==0 && masks[it]==0 }) { "Contradictory candidates" }
    }
}
fun solveLogic(board: List<Int>, level: Difficulty): Trace {
    val s=LogicalSession(board); val steps=mutableListOf<Step>()
    while(true) { val step=s.next(level) ?: break; s.apply(step,level); steps.add(step); check(steps.size<1000) }
    return Trace(s.snapshot().none { it==0 },s.snapshot(),steps)
}
fun classify(board: List<Int>): Difficulty? = Difficulty.entries.firstOrNull { solveLogic(board,it).solved }
sealed interface HintResult {
    data class IncorrectEntries(val cells: List<Int>): HintResult
    data class Logical(val prerequisiteSteps: List<Step>, val next: Step): HintResult
    data object Complete: HintResult
    data object Unsupported: HintResult
}
/** Replays elimination deductions from current values, so the UI can show prerequisite steps rather than invent candidates. */
fun hint(givens: List<Int>, entries: List<Int>, solution: List<Int>, level: Difficulty): HintResult {
    require(valid(givens) && valid(solution) && solution.none { it==0 })
    require(entries.size==81 && entries.all { it in 0..9 })
    require(givens.indices.all { givens[it]==0 || givens[it]==solution[it] })
    val incorrect=entries.indices.filter { entries[it]!=0 && entries[it]!=solution[it] }
    if(incorrect.isNotEmpty()) return HintResult.IncorrectEntries(incorrect)
    val board=givens.indices.map { if(givens[it]!=0) givens[it] else entries[it] }
    if(board.none { it==0 }) return HintResult.Complete
    val s=LogicalSession(board); val prerequisites=mutableListOf<Step>()
    while(true) {
        val step=s.next(level) ?: return HintResult.Unsupported
        if(step.placement!=null) return HintResult.Logical(prerequisites,step)
        prerequisites.add(step); s.apply(step,level)
    }
}
