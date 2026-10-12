import json,re,subprocess,sys
wav=sys.argv[1]; outp=sys.argv[2]
lines=[l for l in open('lyrics.txt').read().splitlines() if l.strip()]
s=json.load(open('al_mono.json'))
# sections by line index ranges
secs=[(0,2),(2,10),(10,12),(12,20),(20,28),(28,30),(30,38),(38,42),(42,50),(50,52)]
idx=0; starts=[]
for l in lines:
    n=len(re.findall(r"[a-z']+",l.lower().replace('’',"'"))); starts.append((idx,idx+n)); idx+=n
res=[]
for a,b in secs:
    w0=s[starts[a][0]][1]-1.2; w1=s[starts[b-1][1]-1][2]+1.2
    open('tmp.txt','w').write('\n'.join(lines[a:b]))
    subprocess.run(['python3','align.py',wav,'tmp.json',str(max(0,w0)),str(w1),'tmp.txt'],capture_output=True)
    try: r=json.load(open('tmp.json'))
    except Exception: r=[]
    print(a,b,len(r)); res+=r
    import os; os.path.exists('tmp.json') and os.remove('tmp.json')
json.dump(res,open(outp,'w'))
