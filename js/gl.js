/* Moving Goalposts — WebGL2 renderer: scene programs, HDR targets, bloom, film finish. */
(function () {
  'use strict';

  const VERT = `#version 300 es
  void main(){ vec2 p = vec2((gl_VertexID<<1)&2, gl_VertexID&2); gl_Position = vec4(p*2.-1., 0., 1.); }`;

  // ---------------------------------------------------------------- common scene header
  const HEADER = `#version 300 es
precision highp float;
precision highp int;
uniform vec2 uRes; uniform float uT, uDur, uP, uSong, uBeat, uVar, uSeed;
uniform float uKick, uSnare, uBass, uMid, uHat, uRms, uKickS, uBassS;
uniform float uEv[12];
uniform sampler2D uEnv; uniform float uEnvN; uniform sampler2D uTex;
out vec4 fragColor;
#define PI 3.14159265359
#define TAU 6.28318530718
#define S(a,b,x) smoothstep(a,b,x)
float sat(float x){return clamp(x,0.,1.);}
mat2 rot(float a){float c=cos(a),s=sin(a);return mat2(c,-s,s,c);}
float h11(float p){p=fract(p*.1031);p*=p+33.33;p*=p+p;return fract(p);}
float h21(vec2 p){vec3 p3=fract(vec3(p.xyx)*.1031);p3+=dot(p3,p3.yzx+33.33);return fract((p3.x+p3.y)*p3.z);}
vec2 h22(vec2 p){vec3 p3=fract(vec3(p.xyx)*vec3(.1031,.1030,.0973));p3+=dot(p3,p3.yzx+33.33);return fract((p3.xx+p3.yz)*p3.zy);}
float h31(vec3 p3){p3=fract(p3*.1031);p3+=dot(p3,p3.zyx+31.32);return fract((p3.x+p3.y)*p3.z);}
float vn(vec2 p){vec2 i=floor(p),f=fract(p);vec2 u=f*f*(3.-2.*f);
  return mix(mix(h21(i),h21(i+vec2(1,0)),u.x),mix(h21(i+vec2(0,1)),h21(i+vec2(1,1)),u.x),u.y);}
float vn3(vec3 p){vec3 i=floor(p),f=fract(p);vec3 u=f*f*(3.-2.*f);
  return mix(mix(mix(h31(i),h31(i+vec3(1,0,0)),u.x),mix(h31(i+vec3(0,1,0)),h31(i+vec3(1,1,0)),u.x),u.y),
             mix(mix(h31(i+vec3(0,0,1)),h31(i+vec3(1,0,1)),u.x),mix(h31(i+vec3(0,1,1)),h31(i+vec3(1,1,1)),u.x),u.y),u.z);}
float fbm(vec2 p){float a=.5,s=0.;mat2 m=mat2(1.6,1.2,-1.2,1.6);for(int i=0;i<5;i++){s+=a*vn(p);p=m*p;a*=.5;}return s;}
float fbm3(vec3 p){float a=.5,s=0.;for(int i=0;i<4;i++){s+=a*vn3(p);p=p*2.03+vec3(1.7,9.2,3.1);a*=.5;}return s;}
float sdBox(vec3 p,vec3 b){vec3 q=abs(p)-b;return length(max(q,0.))+min(max(q.x,max(q.y,q.z)),0.);}
float sdRBox(vec3 p,vec3 b,float r){return sdBox(p,b-r)-r;}
float sdCap(vec3 p,vec3 a,vec3 b,float r){vec3 pa=p-a,ba=b-a;float h=sat(dot(pa,ba)/dot(ba,ba));return length(pa-ba*h)-r;}
float sdTorus(vec3 p,vec2 t){vec2 q=vec2(length(p.xz)-t.x,p.y);return length(q)-t.y;}
float sdCylY(vec3 p,float r,float h){vec2 d=abs(vec2(length(p.xz),p.y))-vec2(r,h);return min(max(d.x,d.y),0.)+length(max(d,0.));}
float sdEll(vec3 p,vec3 r){float k0=length(p/r);float k1=length(p/(r*r));return k0*(k0-1.)/k1;}
float smin(float a,float b,float k){float h=sat(.5+.5*(b-a)/k);return mix(b,a,h)-k*h*(1.-h);}
float sdSeg2(vec2 p,vec2 a,vec2 b){vec2 pa=p-a,ba=b-a;float h=sat(dot(pa,ba)/dot(ba,ba));return length(pa-ba*h);}
mat3 lookAt(vec3 ro,vec3 ta,float roll){vec3 f=normalize(ta-ro);vec3 r=normalize(cross(f,vec3(sin(roll),cos(roll),0.)));vec3 u=cross(r,f);return mat3(r,u,f);}
// song-time envelope lookup: x=kick y=snare z=bass w=mid
vec4 envAt(float t){return texture(uEnv,vec2((t*30.+.5)/uEnvN,.5));}
float ev(int i){return uEv[i];}
// 0 before t0, ramps to 1 over d
float after(float t0,float d){return S(t0,t0+d,uT);}
float bph(){return fract(uBeat);}
float bpulse(float k){return exp(-fract(uBeat)*k);}
vec2 scr(vec2 fc){return (fc-.5*uRes)/uRes.y;}
`;

  // ---------------------------------------------------------------- post shaders
  const MIX = `#version 300 es
precision highp float;
uniform sampler2D uA,uB; uniform float uMix; uniform int uType; uniform vec2 uRes; uniform float uTime;
out vec4 fragColor;
float h(vec2 p){return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453);}
void main(){
  vec2 uv=gl_FragCoord.xy/uRes; float m=uMix;
  if(uType==1){ // whip pan: both images streak sideways
    vec3 a=vec3(0.),b=vec3(0.); float s=sin(m*3.14159);
    for(int i=0;i<12;i++){float o=(float(i)/11.-.5)*.25*s;
      a+=texture(uA,vec2(uv.x+o+m*.6,uv.y)).rgb; b+=texture(uB,vec2(uv.x+o-(1.-m)*.6,uv.y)).rgb;}
    fragColor=vec4(mix(a,b,smoothstep(.35,.65,m))/12.,1.); return; }
  if(uType==2){ // glitch blocks
    vec2 bl=floor(uv*vec2(12.,28.)); float r=h(bl+floor(uTime*24.));
    vec2 o=vec2((h(bl*1.7)-.5)*.12*sin(m*3.14159),0.);
    vec3 a=texture(uA,uv+o).rgb, b=texture(uB,uv-o).rgb;
    fragColor=vec4(r<m?b:a,1.); return; }
  if(uType==3){ // burn: luminance-keyed dissolve through hot white
    vec3 a=texture(uA,uv).rgb,b=texture(uB,uv).rgb; float n=h(floor(uv*uRes/6.))*.15;
    float l=dot(b,vec3(.3,.6,.1));
    float k=smoothstep(m-.25,m+.05,1.-l*.5+n-.3);
    fragColor=vec4(mix(a,b,1.-k)+vec3(1.,.6,.3)*sin(m*3.14159)*1.5,1.); return; }
  fragColor=vec4(mix(texture(uA,uv).rgb,texture(uB,uv).rgb,smoothstep(0.,1.,m)),1.);
}`;

  const PRE = `#version 300 es
precision highp float; uniform sampler2D uSrc; uniform vec2 uTexel; uniform float uThresh; out vec4 fragColor;
void main(){ vec2 uv=gl_FragCoord.xy*uTexel; vec3 c=vec3(0.);
  c+=texture(uSrc,uv+uTexel*vec2(-.5,-.5)).rgb; c+=texture(uSrc,uv+uTexel*vec2(.5,-.5)).rgb;
  c+=texture(uSrc,uv+uTexel*vec2(-.5,.5)).rgb; c+=texture(uSrc,uv+uTexel*vec2(.5,.5)).rgb; c*=.25;
  float l=max(c.r,max(c.g,c.b)); float k=uThresh; float soft=clamp(l-k+.5,0.,1.); soft=soft*soft*.5;
  float w=max(soft,l-k)/max(l,1e-4); fragColor=vec4(c*w,1.); }`;
  const DOWN = `#version 300 es
precision highp float; uniform sampler2D uSrc; uniform vec2 uTexel; out vec4 fragColor;
void main(){ vec2 uv=gl_FragCoord.xy*uTexel; vec2 h=uTexel*.5;
  vec3 c=texture(uSrc,uv).rgb*4.;
  c+=texture(uSrc,uv-h).rgb; c+=texture(uSrc,uv+h).rgb; c+=texture(uSrc,uv+vec2(h.x,-h.y)).rgb; c+=texture(uSrc,uv-vec2(h.x,-h.y)).rgb;
  fragColor=vec4(c/8.,1.); }`;
  const UP = `#version 300 es
precision highp float; uniform sampler2D uSrc; uniform vec2 uTexel; out vec4 fragColor;
void main(){ vec2 uv=gl_FragCoord.xy*uTexel; vec2 h=uTexel*.5; vec3 c=vec3(0.);
  c+=texture(uSrc,uv+vec2(-h.x*2.,0.)).rgb; c+=texture(uSrc,uv+vec2(-h.x,h.y)).rgb*2.;
  c+=texture(uSrc,uv+vec2(0.,h.y*2.)).rgb; c+=texture(uSrc,uv+vec2(h.x,h.y)).rgb*2.;
  c+=texture(uSrc,uv+vec2(h.x*2.,0.)).rgb; c+=texture(uSrc,uv+vec2(h.x,-h.y)).rgb*2.;
  c+=texture(uSrc,uv+vec2(0.,-h.y*2.)).rgb; c+=texture(uSrc,uv+vec2(-h.x,-h.y)).rgb*2.;
  fragColor=vec4(c/12.,1.); }`;

  const FINAL = `#version 300 es
precision highp float;
uniform sampler2D uSrc,uBloom; uniform vec2 uRes; uniform float uTime,uBloomAmt,uExposure,uFlash,uLetter,uCA,uGrain,uVig,uLeak,uSat,uFade,uWeave,uHal;
uniform vec3 uLift,uGain;
out vec4 fragColor;
float h(vec2 p){return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453);}
vec3 aces(vec3 x){const float a=2.51,b=.03,c=2.43,d=.59,e=.14;return clamp((x*(a*x+b))/(x*(c*x+d)+e),0.,1.);}
void main(){
  vec2 fc=gl_FragCoord.xy; vec2 uv=fc/uRes;
  // gate weave
  float fr=floor(uTime*24.);
  uv+=vec2(h(vec2(fr,1.))-.5,h(vec2(fr,2.))-.5)*uWeave/uRes;
  vec2 d=uv-.5;
  float ca=uCA*(.4+dot(d,d)*3.);
  vec3 col;
  col.r=texture(uSrc,uv-d*ca).r; col.g=texture(uSrc,uv).g; col.b=texture(uSrc,uv+d*ca).b;
  vec3 bl=texture(uBloom,uv).rgb;
  col+=bl*uBloomAmt;
  col+=bl*vec3(1.,.35,.15)*uHal; // halation
  col*=uExposure;
  // light leak from the frame edge
  if(uLeak>0.){ float x=uv.x+.15*sin(uTime*.7+uv.y*2.); vec3 lk=vec3(1.,.45,.15)*exp(-x*3.5)+vec3(1.,.2,.1)*exp(-(1.-uv.y)*4.)*.5; col+=lk*uLeak; }
  col=aces(col);
  // grade
  float l=dot(col,vec3(.299,.587,.114));
  col=mix(vec3(l),col,uSat);
  col=col*uGain+uLift*(1.-col);
  // vignette
  col*=mix(1.,smoothstep(1.15,.25,length(d*vec2(1.,.8))),uVig);
  col=mix(col,vec3(1.,.97,.92),clamp(uFlash,0.,1.));
  // grain (luma dependent)
  float g=h(fc+fract(uTime*7.3)*vec2(113.,71.))-.5; col+=g*uGrain*(.6+.4*(1.-l));
  // dust specks
  float sp=h(floor(fc/3.)+fr*.37); if(sp>.99985) col=mix(col,vec3(.9),.7);
  col=pow(max(col,0.),vec3(1./1.06));
  col*=1.-uFade;
  // letterbox
  float lb=uLetter*.5; float y=uv.y; col*=smoothstep(lb-.002,lb+.002,y)*smoothstep(lb-.002,lb+.002,1.-y);
  fragColor=vec4(col,1.);
}`;

  class Renderer {
    constructor(canvas, opts = {}) {
      const gl = canvas.getContext('webgl2', { antialias: false, alpha: false, depth: false, stencil: false, preserveDrawingBuffer: !!opts.preserve, powerPreference: 'high-performance' });
      if (!gl) throw new Error('WebGL2 not available');
      this.gl = gl; this.canvas = canvas;
      this.hdr = !!gl.getExtension('EXT_color_buffer_float');
      gl.getExtension('OES_texture_float_linear');
      this.vao = gl.createVertexArray();
      this.progs = {}; this.sceneTex = {};
      this.post = {
        mix: this.program(MIX, 'mix'), pre: this.program(PRE, 'pre'), down: this.program(DOWN, 'down'), up: this.program(UP, 'up'), final: this.program(FINAL, 'final'),
      };
      this.scale = opts.scale || 1;
      this.envTex = null;
      this.targets = null;
    }
    shader(type, src, name) {
      const gl = this.gl, s = gl.createShader(type);
      gl.shaderSource(s, src); gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
        const log = gl.getShaderInfoLog(s);
        const lines = src.split('\n');
        const m = /ERROR: 0:(\d+)/.exec(log);
        const ctx = m ? lines.slice(Math.max(0, +m[1] - 3), +m[1] + 2).join('\n') : '';
        throw new Error(`[${name}] ${log}\n${ctx}`);
      }
      return s;
    }
    program(fs, name) {
      const gl = this.gl, p = gl.createProgram();
      gl.attachShader(p, this.shader(gl.VERTEX_SHADER, VERT, name));
      gl.attachShader(p, this.shader(gl.FRAGMENT_SHADER, fs, name));
      gl.linkProgram(p);
      if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(`[${name}] link: ${gl.getProgramInfoLog(p)}`);
      const u = {}; const n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
      for (let i = 0; i < n; i++) { const info = gl.getActiveUniform(p, i); const nm = info.name.replace(/\[0\]$/, ''); u[nm] = gl.getUniformLocation(p, info.name); }
      return { p, u, name };
    }
    // compile without blocking on status (KHR_parallel_shader_compile friendly)
    addScene(name, body) { this.progs[name] = this.program(HEADER + body, name); }

    makeTarget(w, h, hdr) {
      const gl = this.gl;
      const tex = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.texImage2D(gl.TEXTURE_2D, 0, hdr ? gl.RGBA16F : gl.RGBA8, w, h, 0, gl.RGBA, hdr ? gl.HALF_FLOAT : gl.UNSIGNED_BYTE, null);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      const fb = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
      return { tex, fb, w, h };
    }
    resize(w, h, scale) {
      const gl = this.gl;
      this.canvas.width = w; this.canvas.height = h; this.scale = scale;
      const sw = Math.max(64, Math.round(w * scale)), sh = Math.max(36, Math.round(h * scale));
      if (this.targets) Object.values(this.targets).flat().forEach((t) => { gl.deleteTexture(t.tex); gl.deleteFramebuffer(t.fb); });
      const T = { a: this.makeTarget(sw, sh, this.hdr), b: this.makeTarget(sw, sh, this.hdr), m: this.makeTarget(sw, sh, this.hdr), bloom: [] };
      let bw = Math.max(8, sw >> 1), bh = Math.max(8, sh >> 1);
      for (let i = 0; i < 6; i++) { T.bloom.push(this.makeTarget(bw, bh, this.hdr)); bw = Math.max(4, bw >> 1); bh = Math.max(4, bh >> 1); }
      this.targets = T; this.sw = sw; this.sh = sh;
    }
    // a per-scene illustration texture (painted once on a 2D canvas)
    setSceneTexture(name, canvas) {
      const gl = this.gl; const tex = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, canvas);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
      gl.generateMipmap(gl.TEXTURE_2D);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      this.sceneTex[name] = tex;
    }
    setEnv(data, n) { // data: Uint8Array n*4
      const gl = this.gl; this.envN = n;
      const tex = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, n, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, data);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      this.envTex = tex;
    }
    draw(prog, target, setU) {
      const gl = this.gl;
      gl.bindFramebuffer(gl.FRAMEBUFFER, target ? target.fb : null);
      gl.viewport(0, 0, target ? target.w : this.canvas.width, target ? target.h : this.canvas.height);
      gl.useProgram(prog.p); gl.bindVertexArray(this.vao);
      setU(prog.u, gl);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }
    tex(unit, t) { const gl = this.gl; gl.activeTexture(gl.TEXTURE0 + unit); gl.bindTexture(gl.TEXTURE_2D, t); }

    renderScene(name, target, U) {
      const prog = this.progs[name]; if (!prog) return;
      const gl = this.gl;
      this.draw(prog, target, (u) => {
        gl.uniform2f(u.uRes, target.w, target.h);
        for (const k in U) {
          const loc = u[k]; if (!loc) continue; const v = U[k];
          if (Array.isArray(v) || v instanceof Float32Array) gl.uniform1fv(loc, v); else gl.uniform1f(loc, v);
        }
        if (u.uEnv) { this.tex(0, this.envTex); gl.uniform1i(u.uEnv, 0); gl.uniform1f(u.uEnvN, this.envN); }
        if (u.uTex && this.sceneTex[name]) { this.tex(1, this.sceneTex[name]); gl.uniform1i(u.uTex, 1); }
      });
    }

    frame(F) {
      // F: {a:{name,U}, b?:{name,U}, mix, type, post:{...}}
      const gl = this.gl, T = this.targets;
      this.renderScene(F.a.name, T.a, F.a.U);
      let src = T.a;
      if (F.b && F.mix > 0) {
        this.renderScene(F.b.name, T.b, F.b.U);
        this.draw(this.post.mix, T.m, (u) => {
          this.tex(0, T.a.tex); gl.uniform1i(u.uA, 0); this.tex(1, T.b.tex); gl.uniform1i(u.uB, 1);
          gl.uniform1f(u.uMix, F.mix); gl.uniform1i(u.uType, F.type || 0); gl.uniform2f(u.uRes, T.m.w, T.m.h); gl.uniform1f(u.uTime, F.time);
        });
        src = T.m;
      }
      // bloom chain
      const B = T.bloom, P = F.post;
      this.draw(this.post.pre, B[0], (u) => { this.tex(0, src.tex); gl.uniform1i(u.uSrc, 0); gl.uniform2f(u.uTexel, 1 / B[0].w, 1 / B[0].h); gl.uniform1f(u.uThresh, P.thresh ?? 0.9); });
      for (let i = 1; i < B.length; i++) this.draw(this.post.down, B[i], (u) => { this.tex(0, B[i - 1].tex); gl.uniform1i(u.uSrc, 0); gl.uniform2f(u.uTexel, 1 / B[i].w, 1 / B[i].h); });
      gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE);
      for (let i = B.length - 2; i >= 0; i--) this.draw(this.post.up, B[i], (u) => { this.tex(0, B[i + 1].tex); gl.uniform1i(u.uSrc, 0); gl.uniform2f(u.uTexel, 1 / B[i].w, 1 / B[i].h); });
      gl.disable(gl.BLEND);
      this.draw(this.post.final, null, (u) => {
        this.tex(0, src.tex); gl.uniform1i(u.uSrc, 0); this.tex(1, B[0].tex); gl.uniform1i(u.uBloom, 1);
        gl.uniform2f(u.uRes, this.canvas.width, this.canvas.height);
        gl.uniform1f(u.uTime, F.time);
        gl.uniform1f(u.uBloomAmt, P.bloom ?? 0.6); gl.uniform1f(u.uExposure, P.exposure ?? 1); gl.uniform1f(u.uFlash, P.flash ?? 0);
        gl.uniform1f(u.uLetter, P.letter ?? 0.12); gl.uniform1f(u.uCA, P.ca ?? 0.004); gl.uniform1f(u.uGrain, P.grain ?? 0.06);
        gl.uniform1f(u.uVig, P.vig ?? 0.8); gl.uniform1f(u.uLeak, P.leak ?? 0); gl.uniform1f(u.uSat, P.sat ?? 1); gl.uniform1f(u.uFade, P.fade ?? 0);
        gl.uniform1f(u.uWeave, P.weave ?? 1.2); gl.uniform1f(u.uHal, P.hal ?? 0.15);
        gl.uniform3fv(u.uLift, P.lift || [0.01, 0.012, 0.02]); gl.uniform3fv(u.uGain, P.gain || [1, 1, 1]);
      });
    }
  }
  window.MGRenderer = Renderer;
  window.MGSH = window.MGSH || {};
})();
