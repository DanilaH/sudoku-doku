"""Independent Algorithm X validator. Does not import generator, peers, masks or solver."""
import json, hashlib, pathlib, collections, time
ROOT = pathlib.Path(__file__).resolve().parents[1]

def exact_cover(puzzle):
    columns = {i:set() for i in range(324)}
    rows = {}
    for r in range(9):
        for c in range(9):
            given = int(puzzle[9*r+c])
            for d in range(9):
                if given and d+1 != given: continue
                key=(r,c,d)
                cs=(9*r+c,81+9*r+d,162+9*c+d,243+9*(3*(r//3)+c//3)+d)
                rows[key]=cs
                for col in cs: columns[col].add(key)
    found=[]
    def select(key):
        removed=[]
        for col in rows[key]:
            for other in list(columns[col]):
                for oc in rows[other]:
                    if oc!=col: columns[oc].remove(other)
            removed.append(columns.pop(col))
        return removed
    def restore(key,removed):
        for col in reversed(rows[key]):
            columns[col]=removed.pop()
            for other in columns[col]:
                for oc in rows[other]:
                    if oc!=col: columns[oc].add(other)
    def walk(chosen):
        if not columns:
            result=['0']*81
            for r,c,d in chosen: result[9*r+c]=str(d+1)
            found.append(''.join(result)); return
        col=min(columns,key=lambda x:len(columns[x]))
        for key in list(columns[col]):
            removed=select(key); walk(chosen+[key]); restore(key,removed)
            if len(found)>=2:return
    walk([]); return found

def canonical(s):
    forms=[]
    def normal(s):
        mapping={'0':'0'}
        return ''.join(mapping.setdefault(d,str(len(mapping))) for d in s)
    for _ in range(4):
        forms += [normal(s),normal(''.join(s[r*9+8-c] for r in range(9) for c in range(9)))]
        s=''.join(s[(8-c)*9+r] for r in range(9) for c in range(9))
    return min(forms)

def main():
    start=time.monotonic(); counts=collections.Counter(); ids=set(); forms=set(); steps=collections.defaultdict(list); tech=collections.Counter()
    assert exact_cover('11'+'0'*79)==[]
    assert len(exact_cover('0'*81))==2
    for line in (ROOT/'bank/puzzles-v1.jsonl').read_text().splitlines():
        p=json.loads(line); g=p['givens']; s=p['solution']
        assert len(g)==len(s)==81 and all(d in '0123456789' for d in g)
        assert p['checksum']==hashlib.sha256((g+':'+s).encode()).hexdigest()
        assert exact_cover(g)==[s],p['puzzle_id']
        assert p['puzzle_id'] not in ids; ids.add(p['puzzle_id'])
        form=canonical(g); assert form not in forms; forms.add(form)
        counts[p['difficulty']]+=1; steps[p['difficulty']].append(p['steps']); tech.update(p['techniques'])
    assert counts=={'EASY':300,'MEDIUM':300,'HARD':300},counts
    report={'validator':'independent Algorithm X exact cover','validated':sum(counts.values()),'counts':dict(counts),'zero_or_multiple_solutions':0,'canonical_duplicates':0,'seconds':round(time.monotonic()-start,2),'steps':{k:{'min':min(v),'max':max(v),'mean':round(sum(v)/len(v),2)} for k,v in steps.items()},'technique_steps':dict(tech)}
    (ROOT/'reports/validation.json').write_text(json.dumps(report,indent=2)+'\n'); print(json.dumps(report,indent=2))
if __name__=='__main__':main()
