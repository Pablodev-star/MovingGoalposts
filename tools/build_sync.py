import json, re, numpy as np, librosa
d=json.load(open('anchors.json')); lyr=d['lyr']; A=d['anchors']
P=json.load(open('al_mono_chunk.json'))
n=len(lyr)
asr=[]
for i in range(n):
    v=[A[k][i] for k in A if A[k][i] is not None]; asr.append(float(np.median(v)) if v else None)
ps=np.array([p[1] for p in P]); pe=np.array([p[2] for p in P])
# fill missing via PS offsets relative to neighbouring anchors
st=[None]*n
idx=[i for i in range(n) if asr[i] is not None]
for i in range(n):
    if asr[i] is not None: st[i]=asr[i]; continue
    prv=max([j for j in idx if j<i],default=None); nxt=min([j for j in idx if j>i],default=None)
    if prv is not None and nxt is not None and ps[nxt]>ps[prv]:
        f=(ps[i]-ps[prv])/(ps[nxt]-ps[prv]); f=min(max(f,0.05),0.95); st[i]=asr[prv]+f*(asr[nxt]-asr[prv])
    elif prv is not None: st[i]=asr[prv]+(ps[i]-ps[prv])
    else: st[i]=asr[nxt]-(ps[nxt]-ps[i])
# enforce monotonic
for i in range(1,n):
    if st[i]<=st[i-1]+0.04: st[i]=st[i-1]+0.04
lines=[l for l in open('lyrics.txt').read().splitlines() if l.strip()]
secs=[('intro',0,2),('verse1',2,10),('pre1',10,12),('chorus1',12,20),('verse2',20,28),('pre2',28,30),('chorus2',30,38),('bridge',38,42),('final',42,50),('outro',50,52)]
secof={}
for s,a,b in secs:
    for k in range(a,b): secof[k]=s
out_lines=[]; i=0
raw_words=[[m for m in re.findall(r"[A-Za-z’'“”\",.;:?!-]+(?:\s*[“”\",.;:?!]+)?",l)] for l in lines]
for li,l in enumerate(lines):
    toks=l.split()
    W=[]
    for tok in toks:
        # each display token corresponds to exactly one lyric word
        W.append({'w':tok,'t':round(st[i],3)}); i+=1
    out_lines.append({'s':secof[li],'w':W})
assert i==n, (i,n)
# ends
flat=[w for L in out_lines for w in L['w']]
k=0
for L in out_lines:
    for j,w in enumerate(L['w']):
        dur_ps=pe[k]-ps[k]
        if j+1<len(L['w']):
            nxt=L['w'][j+1]['t']; w['e']=round(min(nxt, w['t']+max(0.5,dur_ps+0.1)),3)
        else:
            nxt=flat[k+1]['t'] if k+1<len(flat) else 158.8
            w['e']=round(min(nxt-0.05, w['t']+min(max(0.45,dur_ps),1.6)),3)
        k+=1
    L['t']=L['w'][0]['t']; L['e']=L['w'][-1]['e']
for L in out_lines: print(f"{L['t']:7.2f}-{L['e']:7.2f} {L['s']:8s} "+' '.join(w['w'] for w in L['w']))
# envelopes at 30fps
y, sr = librosa.load('/home/user/MovingGoalposts/Moving Goalposts.mp3', sr=22050)
hop=735  # 30fps
S=np.abs(librosa.stft(y,n_fft=2048,hop_length=hop)); f=librosa.fft_frequencies(sr=sr,n_fft=2048)
def bandenv(lo,hi):
    b=S[(f>=lo)&(f<hi)].sum(0); return b
def onset(b):
    o=np.maximum(np.diff(np.log1p(b),prepend=np.log1p(b[0])),0); return o
def norm(x,p=99): x=x/np.percentile(x,p); return np.clip(x,0,1)
rms=norm(librosa.feature.rms(y=y,frame_length=2048,hop_length=hop)[0])
kick=norm(onset(bandenv(30,120)),99.5); snare=norm(onset(bandenv(1500,5000)),99.5); hat=norm(bandenv(7000,11000),99)
bass=norm(bandenv(30,200),99); mid=norm(bandenv(300,3000),99)
q=lambda x:[int(round(v*255)) for v in x]
data={'title':'Moving Goalposts','artist':'nebulaglow','bpm':91.28,'beat0':0.195,'dur':158.8,
 'sections':[{'s':'intro','t':0},{'s':'verse1','t':10.71},{'s':'pre1','t':31.75},{'s':'chorus1','t':37.0},{'s':'verse2','t':58.04},{'s':'pre2','t':79.07},{'s':'chorus2','t':84.33},{'s':'bridge','t':105.37},{'s':'finalA','t':126.4},{'s':'finalB','t':136.92},{'s':'outro','t':147.43},{'s':'end','t':157.95}],
 'lines':out_lines,'env':{'fps':30,'rms':q(rms),'kick':q(kick),'snare':q(snare),'hat':q(hat),'bass':q(bass),'mid':q(mid)}}
json.dump(data,open('sync.json','w'),separators=(',',':'),ensure_ascii=False)
import os; print(os.path.getsize('sync.json'))
