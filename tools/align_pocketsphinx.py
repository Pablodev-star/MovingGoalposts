import sys, re, json, wave, numpy as np
from pocketsphinx import Decoder
wav=sys.argv[1]; out=sys.argv[2]; t0=float(sys.argv[3]) if len(sys.argv)>3 else 0; t1=float(sys.argv[4]) if len(sys.argv)>4 else 1e9
lines=[l for l in open(sys.argv[5] if len(sys.argv)>5 else 'lyrics.txt').read().splitlines() if l.strip()]
txt=' '.join(lines).lower().replace('’',"'").replace('“','').replace('”','')
toks=re.findall(r"[a-z']+",txt)
d=Decoder(samprate=16000, bestpath=False, beam=1e-80, wbeam=1e-60, pbeam=1e-80)
d.add_word('goalposts','G OW L P OW S T S',True)
d.add_word("map's",'M AE P S',True)
w=wave.open(wav); raw=w.readframes(w.getnframes())
a=np.frombuffer(raw,dtype=np.int16) if w.getsampwidth()==2 else None
a=a[int(t0*16000):int(min(t1*16000,len(a)))]
d.set_align_text(' '.join(toks))
d.start_utt(); d.process_raw(a.tobytes(),full_utt=True); d.end_utt()
segs=[(s.word,s.start_frame/100+t0,(s.end_frame+1)/100+t0) for s in d.seg()]
segs=[s for s in segs if s[0] not in ('<s>','</s>','<sil>','(NULL)')]
print(len(segs),'aligned of',len(toks))
json.dump(segs,open(out,'w'))
for s in segs: print(f'{s[1]:7.2f} {s[2]:7.2f} {s[0]}')
