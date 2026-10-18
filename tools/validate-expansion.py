import json,time,hashlib,importlib.util
from pathlib import Path
spec=importlib.util.spec_from_file_location("validator",Path(__file__).with_name("validate-bank.py"));v=importlib.util.module_from_spec(spec);spec.loader.exec_module(v)
root=Path(__file__).resolve().parents[1];start=time.monotonic()
normal=[json.loads(l) for l in (root/'bank/puzzles-v1.jsonl').read_text().splitlines()]
normal += [json.loads(l) for l in (root/'bank/daily-v2.jsonl').read_text().splitlines()]
seen={v.canonical(p['givens']) for p in normal};counts={}
rows=[json.loads(l) for l in (root/'bank/puzzles-v2-extra.jsonl').read_text().splitlines()]
for p in rows:
 assert p['checksum']==hashlib.sha256((p['givens']+':'+p['solution']).encode()).hexdigest()
 assert v.exact_cover(p['givens'])==[p['solution']],p['puzzle_id']
 form=v.canonical(p['givens']);assert form not in seen,p['puzzle_id'];seen.add(form)
 counts[p['difficulty']]=counts.get(p['difficulty'],0)+1
assert counts=={'EASY':300,'MEDIUM':300,'HARD':300}
report={'validated':len(rows),'independent_validator':'Algorithm X','counts':counts,'duplicates_or_normal_bank_overlap':0,'seconds':round(time.monotonic()-start,2)}
(root/'reports/expansion-validation.json').write_text(json.dumps(report,indent=2)+'\n');print(report)
