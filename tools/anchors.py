import json, re, difflib, numpy as np
def words_of(win, W):
    ws=[]; cur=None
    for tok,t in zip(win['tokens'],win['ts']):
        if tok.startswith(' ') or tok.startswith('▁') or cur is None:
            if cur: ws.append(cur)
            cur=[tok.strip(' ▁'),t]
        else: cur[0]+=tok
    if cur: ws.append(cur)
    return [(re.sub(r"[^a-z']","",w.lower()),t) for w,t in ws if re.sub(r"[^a-z']","",w.lower())]
def merged(fn,W):
    A=json.load(open(fn)); seq=[]
    for i,win in enumerate(A):
        lo=win['t0']+(0 if i==0 else W/4); hi=win['t0']+(1e9 if i==len(A)-1 else 3*W/4)
        seq+=[w for w in words_of(win,W) if lo<=w[1]<hi]
    return seq
lines=[l for l in open('lyrics.txt').read().splitlines() if l.strip()]
lyr=[]
for li,l in enumerate(lines):
    for w in re.findall(r"[A-Za-z’']+",l): lyr.append((re.sub(r"[^a-z']","",w.lower().replace('’',"'")),li))
def anchor(seq):
    sm=difflib.SequenceMatcher(None,[w for w,_ in lyr],[w for w,_ in seq],autojunk=False)
    T=[None]*len(lyr)
    for a,b,n in sm.get_matching_blocks():
        for k in range(n): T[a+k]=seq[b+k][1]
    return T
import sys
res={}
for fn,W in [('asr_mono.json',20),('asr_mono_b.json',20),('asr_mono_c.json',16)]:
    try: res[fn]=anchor(merged(fn,W))
    except FileNotFoundError: pass
for k,v in res.items(): print(k, sum(x is not None for x in v),'/',len(lyr))
json.dump({'lyr':lyr,'anchors':res},open('anchors.json','w'))
