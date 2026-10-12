import librosa, numpy as np, soundfile as sf
y, sr = librosa.load('/home/user/MovingGoalposts/Moving Goalposts.mp3', sr=16000, mono=False)
L,R=y
n_fft=2048; hop=256
M=librosa.stft((L+R)/2,n_fft=n_fft,hop_length=hop); S=librosa.stft((L-R)/2,n_fft=n_fft,hop_length=hop)
mag=np.maximum(np.abs(M)-1.0*np.abs(S),0)
H,P=librosa.decompose.hpss(mag,margin=(1.0,2.0))
freqs=librosa.fft_frequencies(sr=sr,n_fft=n_fft)
band=((freqs>120)&(freqs<6000)).astype(float)[:,None]
v=librosa.istft(H*band*np.exp(1j*np.angle(M)),hop_length=hop,length=len(L))
v/=np.abs(v).max()*1.05
sf.write('vocal16.wav',v,sr)
# vocal activity curve: energy of H in 200-4000
vb=((freqs>200)&(freqs<4000))
e=(H[vb]**2).sum(0); t=librosa.frames_to_time(np.arange(len(e)),sr=sr,hop_length=hop)
np.save('vact.npy',np.stack([t,e]))
