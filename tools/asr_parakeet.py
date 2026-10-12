import sherpa_onnx, soundfile as sf, json, sys
M='/tmp/claude-0/models/sherpa-onnx-nemo-parakeet-tdt-0.6b-v2-int8/'
rec=sherpa_onnx.OfflineRecognizer.from_transducer(encoder=M+'encoder.int8.onnx',decoder=M+'decoder.int8.onnx',joiner=M+'joiner.int8.onnx',tokens=M+'tokens.txt',model_type='nemo_transducer',num_threads=4)
a,sr=sf.read(sys.argv[1],dtype='float32'); W=float(sys.argv[3]); off=float(sys.argv[4]); H=W/2
out=[]; ts=[0.0]+[off+k*H for k in range(100) if off+k*H<len(a)/sr]
for t in ts:
    seg=a[int(t*sr):int((t+W)*sr)]; s=rec.create_stream(); s.accept_waveform(sr,seg); rec.decode_stream(s); r=s.result
    out.append({'t0':t,'text':r.text,'tokens':list(r.tokens),'ts':[x+t for x in r.timestamps]})
json.dump(out,open(sys.argv[2],'w'))
