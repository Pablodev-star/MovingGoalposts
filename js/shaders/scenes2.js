/* Moving Goalposts — shots, part 2. */
(function () {
  const SH = (window.MGSH = window.MGSH || {});

  // =====================================================================================
  // DESERT — the goalposts stand in an endless salt desert. "It draws a line, then it moves the line."
  // v0 golden hour (chorus 1), v1 moonlit with a row of goals drifting (chorus 2), v2 twilight crane-up (outro)
  SH.desert = `
float dune(vec2 p){
  float h=0.;
  h+=.9*sin(p.x*.06+sin(p.y*.05)*1.5)*sin(p.y*.045+.5);
  h+=.35*(1.-abs(sin(p.x*.11+p.y*.07+vn(p*.03)*2.)));
  h+=.15*(vn(p*.15)*.65+vn(p*.31)*.35);
  return h*1.2-.6;
}
vec3 GP[5]; float FIGY;
float lineZ0(){ return 14.; }
float moveK(){ return S(ev(4)-.05,ev(4)+.6,uT); }
float goalZ(){ return 32.+moveK()*22.+(uVar>1.5?uT*1.5:0.); }
float goalX(int i){ if(uVar>.5&&uVar<1.5) return sin(uT*.6+float(i)*1.7)*9.+float(i%2)*4.-2.; if(uVar>1.5) return 6.*sin(floor(uBeat)*1.3)*after(ev(1),.1); return 2.; }
float sdGoal(vec3 p){
  float hw=3.66,hh=2.44,r=.07;
  float d=sdCap(p,vec3(-hw,0.,0.),vec3(-hw,hh,0.),r);
  d=min(d,sdCap(p,vec3(hw,0.,0.),vec3(hw,hh,0.),r));
  d=min(d,sdCap(p,vec3(-hw,hh,0.),vec3(hw,hh,0.),r));
  // back stays (net frame)
  d=min(d,sdCap(p,vec3(-hw,hh,0.),vec3(-hw,0.,1.6),r*.5)); d=min(d,sdCap(p,vec3(hw,hh,0.),vec3(hw,0.,1.6),r*.5));
  return d;
}
float sdFigure(vec3 p){
  float d=sdCap(p,vec3(0.,.9,0.),vec3(0.,1.45,0.),.17);
  d=smin(d,length(p-vec3(0.,1.7,0.))-.12,.05);
  d=min(d,sdCap(p,vec3(-.09,0.,0.),vec3(-.08,.9,0.),.075)); d=min(d,sdCap(p,vec3(.09,0.,0.),vec3(.08,.9,0.),.075));
  d=min(d,sdCap(p,vec3(-.22,1.42,0.),vec3(-.26,.85,.05),.055)); d=min(d,sdCap(p,vec3(.22,1.42,0.),vec3(.26,.85,.05),.055));
  return d;
}
vec2 objs(vec3 p){
  vec2 r=vec2(1e3,0.);
  int n=uVar>.5&&uVar<1.5?5:1;
  for(int i=0;i<5;i++){ if(i>=n) break; vec3 q=p-GP[i];
    float bb=sdBox(q-vec3(0.,1.25,.8),vec3(3.9,1.4,1.));
    float d=bb>.5?bb:sdGoal(q); if(d<r.x) r=vec2(d,2.); }
  vec3 fp=p-vec3(0.,FIGY,0.); float fb=sdBox(fp-vec3(0.,.95,0.),vec3(.4,1.,.25)); float f=fb>.4?fb:sdFigure(fp); if(f<r.x) r=vec2(f,3.);
  return r;
}
vec3 sunDir(){
  vec3 a=normalize(vec3(-.6,.08,1.));
  if(uVar>.5&&uVar<1.5) return normalize(vec3(.3,.35,1.));
  if(uVar>1.5) return normalize(vec3(.95,.05,.35));
  vec3 b=normalize(vec3(.7,-.03,1.)), c=normalize(vec3(.95,.14,.25));
  vec3 d=a; if(uT>ev(0)) d=b; if(uT>ev(1)) d=c; return d;
}
vec3 skyC(vec3 rd,vec3 L){
  float night=uVar>.5&&uVar<1.5?1.:0.; float tw=uVar>1.5?1.:0.;
  float dusk=(uVar<.5&&uT>ev(0)&&uT<ev(1))?1.:0.; float morning=(uVar<.5&&uT>ev(1))?1.:0.;
  vec3 zen=vec3(.12,.25,.55), hor=vec3(1.,.55,.28);
  if(dusk>.5){ zen=vec3(.1,.08,.3); hor=vec3(.95,.35,.45); }
  if(morning>.5){ zen=vec3(.12,.3,.65); hor=vec3(.95,.7,.5); }
  if(night>.5){ zen=vec3(.005,.01,.03); hor=vec3(.03,.05,.1); }
  if(tw>.5){ zen=vec3(.06,.05,.2); hor=vec3(.95,.45,.4); }
  float y=max(rd.y,0.);
  vec3 c=mix(hor,zen,pow(y,.45));
  float sd=max(dot(rd,L),0.);
  vec3 sc=night>.5?vec3(.8,.85,1.):(dusk>.5?vec3(1.,.4,.3):vec3(1.,.7,.4));
  c+=sc*(pow(sd,8.)*.35+pow(sd,60.)*.6)*(night>.5?.4:1.);
  c+=sc*S(.9994,.9997,sd)*(night>.5?3.:12.);
  // stars
  if(night>.5||tw>.5){ vec2 sp=vec2(atan(rd.x,rd.z),rd.y)*180.; vec2 id=floor(sp); float r=h21(id);
    c+=vec3(.9,.92,1.)*step(.993,r)*S(.25,0.,length(fract(sp)-.5))*S(0.,.2,rd.y)*(.6+.4*sin(uSong*3.+r*50.))*(tw>.5?S(.4,1.,uP):1.)*2.; }
  return c;
}
float shadowG(vec3 ro,vec3 rd){ float res=1.,t=.05; for(int i=0;i<24;i++){ float h=objs(ro+rd*t).x; res=min(res,12.*h/t); t+=clamp(h,.05,1.5); if(res<.001||t>60.) break; } return sat(res); }
void main(){
  vec2 uv=scr(gl_FragCoord.xy);
  for(int i=0;i<5;i++){ float z=goalZ()+float(i)*28.; float x=goalX(i); GP[i]=vec3(x,dune(vec2(x,z)),z); }
  FIGY=dune(vec2(0.));
  vec3 L=sunDir();
  // camera
  vec3 ro,ta; float fov=1.7;
  float l2=step(ev(2)-.25,uT);
  if(uVar<.5){
    if(l2<.5){ ro=vec3(-3.2+uT*.12,1.5,-10.+uT*.3); ta=vec3(1.2,1.6,goalZ()); }
    else { float k=(uT-ev(2))/3.; ro=vec3(-14.+k*2.,7.5,6.); ta=vec3(1.,0.,20.); fov=1.6; }
  } else if(uVar<1.5){ ro=vec3(sin(uT*.15)*3.,1.6+uT*.15,-6.+uT*.8); ta=vec3(0.,2.,40.); if(l2>.5){ ro=vec3(-10.,5.,4.); ta=vec3(0.,0.,24.); } }
  else { float k=S(0.,uDur,uT); ro=vec3(-3.5,1.6+k*k*22.,-9.-k*8.); ta=vec3(1.,1.5+k*k*30.,40.); fov=1.6; }
  ro.y+=max(dune(ro.xz)+.6,0.)*0.; ro.y=max(ro.y,dune(ro.xz)+.6);
  vec3 rd=lookAt(ro,ta,0.)*normalize(vec3(uv,fov));
  // march terrain + objects
  float t=.1; float id=0.; vec3 p;
  for(int i=0;i<110;i++){
    p=ro+rd*t;
    float ht=p.y-dune(p.xz); vec2 o=objs(p);
    float d=min(ht*.55,o.x);
    if(d<.002*t){ id=o.x<ht*.55?o.y:1.; break; }
    t+=d; if(t>220.){ id=0.; break; }
  }
  vec3 col=skyC(rd,L);
  float night=uVar>.5&&uVar<1.5?1.:0.;
  vec3 sunC=night>.5?vec3(.25,.3,.45):(uVar>1.5?vec3(1.6,.6,.45):vec3(2.2,1.45,.85));
  if(uVar<.5&&uT>ev(0)&&uT<ev(1)) sunC=vec3(1.2,.5,.55);
  if(uVar<.5&&uT>ev(1)) sunC=vec3(2.4,1.7,1.1);
  if(id>0.){
    vec3 n;
    if(id<1.5){ vec2 e=vec2(.05,0.); n=normalize(vec3(dune(p.xz-e.xy)-dune(p.xz+e.xy),2.*e.x,dune(p.xz-e.yx)-dune(p.xz+e.yx)));
      // wind ripples
      n.xz+=.12*vec2(sin(p.x*3.+p.z*1.3+vn(p.xz)*3.),0.)*S(30.,5.,t); n=normalize(n); }
    else { vec2 e=vec2(.001,0.); n=normalize(vec3(objs(p+e.xyy).x-objs(p-e.xyy).x,objs(p+e.yxy).x-objs(p-e.yxy).x,objs(p+e.yyx).x-objs(p-e.yyx).x)); }
    vec3 alb=id<1.5?vec3(.85,.62,.42):(id<2.5?vec3(.95):vec3(.04));
    if(night>.5&&id<1.5) alb=vec3(.55,.6,.7);
    float sh=shadowG(p+n*.02,L);
    float dif=sat(dot(n,L))*sh;
    vec3 sky=skyC(vec3(0.,1.,0.),L);
    col=alb*(sunC*dif+sky*.22*(.6+.4*n.y));
    if(id>1.5&&id<2.5) col+=vec3(1.,.95,.9)*(.25+.6*after(ev(5),.3)*(uVar<.5?1.:0.))*(night>.5?1.6:1.);
    col+=sunC*pow(sat(dot(reflect(rd,n),L)),40.)*.3*sh*(id<1.5?.4:1.);
    // sand sparkle
    if(id<1.5) col+=sunC*step(.996,h21(floor(p.xz*60.)))*sh*S(25.,5.,t)*.8;
    // the line drawn in the sand
    if(id<1.5){
      float lz=lineZ0()+moveK()*15.+(uVar>1.5?999.:0.);
      float draw=S(ev(2),ev(3)+.25,uT);
      float lx=mix(-60.,60.,draw);
      float dl=abs(p.z-lz);
      float on=step(p.x,lx)*step(ev(2),uT);
      vec3 lc=uVar>.5?vec3(.6,.8,1.):vec3(1.,.55,.25);
      col+=lc*(S(.12,.0,dl)*3.+exp(-dl*1.5)*.25)*on;
      // the old line's scar after it moves
      col+=lc*S(.08,.0,abs(p.z-lineZ0()))*after(ev(4),.05)*exp(-max(uT-ev(4),0.)*1.2)*1.2;
    }
    // haze
    float fog=1.-exp(-t*(night>.5?.01:(uVar>1.5?.0025:.0045)));
    col=mix(col,skyC(normalize(vec3(rd.x,.02,rd.z)),L)*.9,fog);
  }
  // blowing sand near the ground
  float sand=fbm(vec2(uv.x*3.-uT*1.5,uv.y*12.))*S(.1,-.3,uv.y);
  col+=sunC*.06*sand*(1.-night);
  fragColor=vec4(col,1.);
}`;

  // =====================================================================================
  // GALLERY — an empty frame under a spotlight. The work finally gets "a fair little frame".
  // v0 one frame at the end of a hall, v1 an endless corridor of empty frames
  SH.gallery = `
float sdFrame(vec3 p){ // ornate frame facing -z, centred at origin
  vec2 b=vec2(1.05,.78);
  float outer=sdRBox(p,vec3(b+.16,.06),.02);
  float inner=sdBox(p,vec3(b,.2));
  float f=max(outer,-inner);
  // moulding grooves
  vec2 q=abs(p.xy)-b-.08; float g=abs(max(q.x,q.y))-.01; f+=.012*S(.02,0.,g)*0.;
  f=max(f,-(sdRBox(p-vec3(0.,0.,-.07),vec3(b+.08,.03),.01))+.0);
  return f;
}
float corridorZ(float z){ return z-6.*floor(z/6.+.5); }
vec2 map(vec3 p){
  vec2 r=vec2(p.y,1.);
  float walls=min(4.-abs(p.x),5.-p.y);
  if(uVar<.5) walls=min(walls,16.-p.z);
  if(walls<r.x) r=vec2(walls,2.);
  if(uVar<.5){
    vec3 q=p-vec3(0.,2.2,15.9); float f=sdFrame(q); if(f<r.x) r=vec2(f,3.);
    float canvas=sdBox(q-vec3(0.,0.,.04),vec3(1.05,.78,.02)); if(canvas<r.x) r=vec2(canvas,4.);
    float plaque=sdRBox(p-vec3(0.,1.05,15.95),vec3(.18,.05,.01),.005); if(plaque<r.x) r=vec2(plaque,5.);
  } else {
    vec3 q=p; q.z=corridorZ(q.z); q.x=abs(q.x)-3.9; q=q.zyx*vec3(1.,1.,-1.);
    q-=vec3(0.,2.2,0.); float f=sdFrame(q); if(f<r.x) r=vec2(f,3.);
    float canvas=sdBox(q-vec3(0.,0.,.04),vec3(1.05,.78,.02)); if(canvas<r.x) r=vec2(canvas,4.);
  }
  // bench
  if(uVar<.5){ float bench=sdRBox(p-vec3(0.,.25,9.),vec3(1.,.05,.3),.02); bench=min(bench,sdBox(vec3(abs(p.x)-.8,p.y-.12,p.z-9.),vec3(.04,.12,.25))); if(bench<r.x) r=vec2(bench,6.); }
  return r;
}
vec3 nrm(vec3 p){vec2 e=vec2(.002,0.);return normalize(vec3(map(p+e.xyy).x-map(p-e.xyy).x,map(p+e.yxy).x-map(p-e.yxy).x,map(p+e.yyx).x-map(p-e.yyx).x));}
vec3 orbPos(){ float k=S(ev(2)-.6,ev(4)+.2,uT); return mix(vec3(-.6,1.6,5.),vec3(0.,2.2,15.8),k)+vec3(0.,.05*sin(uT*2.),0.); }
float orbOn(){ return uVar<.5?S(ev(2)-1.,ev(2)-.3,uT):0.; }
// spot lights
vec3 spotPos(vec3 p){ if(uVar<.5) return vec3(0.,4.9,12.5); float z=floor(p.z/6.+.5)*6.; return vec3(sign(p.x)*2.6,4.9,z); }
vec3 spotTgt(vec3 p){ if(uVar<.5) return vec3(0.,2.2,15.9); float z=floor(p.z/6.+.5)*6.; return vec3(sign(p.x)*3.9,2.2,z); }
float spotI(vec3 p){
  float base=1.+1.5*S(.15,0.,abs(uT-ev(0)));
  if(uVar>.5){ float z=floor(p.z/6.+.5); float on=step(h11(z*3.+sign(p.x)),.6+after(ev(4),.3)*.4); return on*base*(.8+.5*after(ev(4),.3)); }
  return base;
}
vec3 light(vec3 p,vec3 n,vec3 rd,vec3 alb,float spec){
  vec3 sp=spotPos(p); vec3 ld=sp-p; float dl=length(ld); ld/=dl;
  float cone=S(.86,.95,dot(-ld,normalize(spotTgt(p)-sp)));
  vec3 lc=vec3(1.,.85,.65)*spotI(p);
  vec3 c=alb*lc*sat(dot(n,ld))*cone*14./(dl*dl)+lc*spec*pow(sat(dot(n,normalize(ld-rd))),60.)*cone*6./(dl*dl);
  // the orb lights its surroundings
  vec3 op=orbPos(); vec3 ol=op-p; float od=length(ol); ol/=od;
  c+=alb*vec3(1.,.6,.3)*sat(dot(n,ol))*orbOn()*1.2/(1.+od*od*2.);
  c+=alb*vec3(.05,.055,.07)*(uVar>.5?2.:1.);
  return c;
}
void main(){
  vec2 uv=scr(gl_FragCoord.xy);
  vec3 ro,ta; float fov=1.6;
  if(uVar<.5){ float k=uT/uDur; ro=vec3(.4*sin(uT*.3),1.65,1.+k*6.); ta=vec3(0.,2.,16.); if(uT>ev(2)-.3){ ro=vec3(2.4-k,1.4,6.+k*4.); ta=orbPos()*.5+vec3(0.,2.1,15.9)*.5; fov=1.5; } }
  else { ro=vec3(0.,1.7,uT*2.4); ta=vec3(-1.2,1.9,uT*2.4+6.); if(uT>ev(2)-.3){ ro=vec3(1.5,1.6,uT*2.4); ta=vec3(4.,1.9,uT*2.4+2.5); } }
  vec3 rd=lookAt(ro,ta,0.)*normalize(vec3(uv,fov));
  float t=0.; vec2 h; vec3 p;
  for(int i=0;i<110;i++){ p=ro+rd*t; h=map(p); if(h.x<.001||t>60.) break; t+=h.x; }
  vec3 col=vec3(0.);
  if(t<60.){
    vec3 n=nrm(p); float id=h.y;
    vec3 alb=vec3(.3); float spec=.2;
    if(id<1.5){ alb=vec3(.05,.04,.035)*(.8+.4*fbm(p.xz*2.)); spec=1.; }
    else if(id<2.5){ alb=vec3(.42,.4,.38)*(.9+.1*fbm(p.yz*3.)); if(p.y>4.95) alb=vec3(.2); }
    else if(id<3.5){ alb=vec3(.75,.55,.25); spec=2.; }
    else if(id<4.5){ alb=vec3(.06,.055,.05); }
    else if(id<5.5){ alb=vec3(.6,.45,.2); spec=2.; }
    else { alb=vec3(.12,.08,.05); }
    col=light(p,n,rd,alb,spec);
    if(id>2.5&&id<3.5) col+=vec3(1.,.7,.35)*pow(1.-sat(dot(-rd,n)),3.)*.15;
    // the canvas glows once the work is framed
    if(id>3.5&&id<4.5&&uVar<.5){ float k=after(ev(4),.6); col+=vec3(1.,.62,.32)*k*(1.2+.4*uKick)*(1.-.5*length((p.xy-vec2(0.,2.2))/vec2(1.05,.78))); }
    if(id>3.5&&id<4.5&&uVar>.5){ float z=floor(p.z/6.+.5); float k=after(ev(4)+h11(z)*.4,.3)*step(h11(z*7.+sign(p.x)),.7); col+=vec3(1.,.62,.32)*k*.8; }
    // polished floor reflection
    if(id<1.5){
      vec3 rr=reflect(rd,n); rr.xz+=(vec2(fbm(p.xz*4.),fbm(p.xz*4.+5.))-.5)*.03;
      float t2=.02; vec2 h2; vec3 q;
      for(int i=0;i<40;i++){ q=p+rr*t2; h2=map(q); if(h2.x<.002||t2>40.) break; t2+=h2.x; }
      if(t2<40.){ vec3 n2=nrm(q); vec3 a2=h2.y<2.5?vec3(.4):(h2.y<3.5?vec3(.75,.55,.25):vec3(.06)); vec3 rc=light(q,n2,rr,a2,.5);
        if(h2.y>3.5&&h2.y<4.5&&uVar<.5) rc+=vec3(1.,.62,.32)*after(ev(4),.6);
        col+=rc*.35*(1.-t2/40.); }
    }
    col=mix(col,vec3(.01,.01,.015),1.-exp(-t*.04));
  }
  // volumetric spot cone + dust
  float vol=0.;
  float tm=min(t,30.);
  for(int i=0;i<28;i++){
    float s=(float(i)+h21(gl_FragCoord.xy+uT))/28.*tm; vec3 q=ro+rd*s;
    vec3 sp=spotPos(q); vec3 ld=normalize(sp-q); float dl=length(sp-q);
    float cone=S(.88,.97,dot(-ld,normalize(spotTgt(q)-sp)));
    vol+=cone*spotI(q)/(1.+dl*dl*.08)*(.5+vn3(q*2.5+vec3(0.,uT*.15,0.)));
  }
  col+=vec3(1.,.85,.65)*vol/28.*tm*.05;
  // the orb (the work)
  if(uVar<.5){ vec3 op=orbPos(); float on=orbOn(); vec3 v=op-ro; float z=dot(v,rd); if(z>0.&&z<t+.5){ float d=length(v-rd*z); col+=vec3(1.,.7,.4)*on*(S(.09,.0,d)*3.+exp(-d*8.)*.6); } }
  fragColor=vec4(col,1.);
}`;

  // =====================================================================================
  // WALL — a colossal wall, a tiny figure knocking. "a wall that moves when I call"
  // v0 hazy dusk, v1 storm with lightning on the snares
  SH.wall = `
float wallZ(){ return 14.+S(ev(4)-.1,ev(4)+.9,uT)*40.+S(ev(5),ev(5)+1.4,uT)*60.; }
float sdFig(vec3 p){
  float d=sdCap(p,vec3(0.,.9,0.),vec3(0.,1.45,0.),.17);
  d=smin(d,length(p-vec3(0.,1.7,0.))-.12,.05);
  d=min(d,sdCap(p,vec3(-.09,0.,0.),vec3(-.08,.9,0.),.075)); d=min(d,sdCap(p,vec3(.09,0.,0.),vec3(.08,.9,0.),.075));
  float knock=uT<ev(3)?S(.6,0.,fract(uBeat))*after(ev(0)-1.5,.1):0.;
  d=min(d,sdCap(p,vec3(-.22,1.42,0.),vec3(-.26,.85,.05),.055));
  d=min(d,sdCap(p,vec3(.22,1.42,0.),mix(vec3(.26,.85,.05),vec3(.3,1.5,.6),knock),.055));
  return d;
}
vec2 map(vec3 p){
  vec2 r=vec2(p.y-.02*fbm(p.xz*.5),1.);
  float wz=wallZ();
  float w=sdBox(p-vec3(0.,40.,wz+4.),vec3(120.,40.,4.));
  // formwork seams / tie holes
  vec2 g=fract(vec2(p.x/3.,p.y/1.5))-.5;
  w+=.03*S(.48,.5,abs(g.x))+.02*S(.47,.5,abs(g.y));
  if(w<r.x) r=vec2(w,2.);
  float f=sdFig(p-vec3(0.,0.,min(11.,wz-1.2)*0.+11.)); if(f<r.x) r=vec2(f,3.);
  return r;
}
vec3 nrm(vec3 p){vec2 e=vec2(.004,0.);return normalize(vec3(map(p+e.xyy).x-map(p-e.xyy).x,map(p+e.yxy).x-map(p-e.yxy).x,map(p+e.yyx).x-map(p-e.yyx).x));}
void main(){
  vec2 uv=scr(gl_FragCoord.xy);
  bool storm=uVar>.5;
  vec3 ro,ta; float fov=1.6;
  float l2=step(ev(3)-.3,uT);
  if(l2<.5){ ro=vec3(-1.5+uT*.1,1.,-6.+uT*.3); ta=vec3(0.,9.,30.); fov=1.4; }
  else { float k=uT-ev(3); ro=vec3(-22.,3.,6.+k*.5); ta=vec3(0.,5.,22.); fov=1.7; }
  vec3 rd=lookAt(ro,ta,0.)*normalize(vec3(uv,fov));
  vec3 skyTop=storm?vec3(.03,.035,.05):vec3(.12,.15,.25), skyHor=storm?vec3(.09,.1,.13):vec3(.85,.5,.32);
  float flash=storm?pow(uSnare,3.)*1.5+step(.97,h11(floor(uSong*12.)))*.8:0.;
  float t=0.; vec2 h; vec3 p;
  for(int i=0;i<120;i++){ p=ro+rd*t; h=map(p); if(h.x<.002*t||t>300.) break; t+=h.x*.9; }
  vec3 sky=mix(skyHor,skyTop,pow(max(rd.y,0.),.5));
  // light behind the wall top
  sky+=(storm?vec3(.3,.35,.5):vec3(1.,.6,.35))*exp(-abs(rd.y-.12)*8.)*.5;
  vec3 col=sky*(1.+flash*3.);
  if(t<300.){
    vec3 n=nrm(p); float id=h.y;
    vec3 alb=id<1.5?vec3(.35,.32,.3):(id<2.5?vec3(.5,.48,.45)*(.7+.5*fbm(p.xy*.3))*(1.-.25*fbm(p.xy*2.+3.)):vec3(.02));
    // streaks down the concrete
    if(id>1.5&&id<2.5) alb*=1.-.3*S(.4,.9,fbm(vec2(p.x*2.,p.y*.15)));
    vec3 amb=mix(skyHor,skyTop,.5)*(.45+.55*n.y)*(storm?1.6:.9);
    col=alb*amb;
    if(storm) col+=alb*vec3(.25,.3,.42)*sat(dot(n,normalize(vec3(-.6,.5,-.6))))*1.2;
    // knocks: rings of light spreading over the wall from the fist
    if(id>1.5&&id<2.5){
      float wz=wallZ();
      for(int k=0;k<4;k++){
        float kt=ev(0)-1.2+float(k)*.6575; float age=uT-kt;
        if(age>0.&&age<1.5&&kt<ev(3)){ float rr=length(p.xy-vec2(.3,1.5)); float ring=S(.12,0.,abs(rr-age*4.5))*exp(-age*3.); col+=vec3(1.,.75,.5)*ring*1.8; }
      }
      // tiny numbers glowing on the wall near the figure ("the numbers stay small")
      vec2 g=(p.xy-vec2(-1.,2.))*vec2(3.,3.); vec2 id2=floor(g);
      float dig=step(.85,h21(id2+floor(uBeat)))*step(abs(id2.x),3.)*step(abs(id2.y),1.)*S(.35,.2,length(fract(g)-.5));
      col+=vec3(1.,.6,.3)*dig*after(ev(1),.2)*.6*(1.-after(ev(3),.3));
    }
    col*=1.+flash*4.;
    float fog=1.-exp(-t*(storm?.012:.008));
    col=mix(col,mix(skyHor,skyTop,.3)*(1.+flash),fog);
  }
  // dust thrown up as the wall moves
  float dm=after(ev(4)-.1,.2)*exp(-max(uT-ev(4),0.)*.4);
  col+=vec3(.6,.5,.4)*dm*S(.0,.6,fbm(vec2(uv.x*2.+uT*.3,uv.y*3.-uT*.2)))*S(.1,-.4,uv.y)*.6;
  // god rays over the top
  if(!storm) col+=vec3(1.,.6,.35)*pow(sat(1.-abs(uv.y-.22)*2.),6.)*(.6+.4*fbm(vec2(uv.x*6.,uT*.2)))*.15;
  // rain streaks
  if(storm){ vec2 rq=uv*vec2(60.,4.)+vec2(uv.y*8.,uT*30.); float rn=step(.93,h21(floor(rq)))*S(.5,.0,abs(fract(rq.x)-.5)); col+=vec3(.5,.55,.65)*rn*.35*(1.+flash); }
  fragColor=vec4(col,1.);
}`;

  // =====================================================================================
  // TV — channel surfing on an old CRT: new format, new cut, new caption…
  SH.tv = `
float seg7(vec2 p,int d){
  // segments a..g as boxes
  int m[10]; m[0]=0x3F;m[1]=0x06;m[2]=0x5B;m[3]=0x4F;m[4]=0x66;m[5]=0x6D;m[6]=0x7D;m[7]=0x07;m[8]=0x7F;m[9]=0x6F;
  int b=m[d]; float r=1.;
  vec2 hs=vec2(.3,.05), vs=vec2(.05,.25);
  if((b&1)!=0) r=min(r,length(max(abs(p-vec2(0.,.55))-hs,0.)));
  if((b&2)!=0) r=min(r,length(max(abs(p-vec2(.32,.28))-vs,0.)));
  if((b&4)!=0) r=min(r,length(max(abs(p-vec2(.32,-.28))-vs,0.)));
  if((b&8)!=0) r=min(r,length(max(abs(p-vec2(0.,-.55))-hs,0.)));
  if((b&16)!=0) r=min(r,length(max(abs(p-vec2(-.32,-.28))-vs,0.)));
  if((b&32)!=0) r=min(r,length(max(abs(p-vec2(-.32,.28))-vs,0.)));
  if((b&64)!=0) r=min(r,length(max(abs(p)-hs,0.)));
  return r;
}
vec3 channel(vec2 u,int c,float tt){
  // u in [-1,1] screen space
  if(c==0){ // colour bars
    float x=floor((u.x*.5+.5)*7.); vec3 b[7]; b[0]=vec3(.75);b[1]=vec3(.75,.75,0.);b[2]=vec3(0.,.75,.75);b[3]=vec3(0.,.75,0.);b[4]=vec3(.75,0.,.75);b[5]=vec3(.75,0.,0.);b[6]=vec3(0.,0.,.75);
    vec3 col=b[int(x)]; if(u.y<-.5) col=mix(vec3(.05),vec3(.9),step(.5,fract(u.x*2.))*.3); return col; }
  if(c==1){ return vec3(h21(floor(u*vec2(160.,120.))+floor(tt*30.)))*.9; }
  if(c==2){ // retro sun over a grid
    vec3 col=mix(vec3(.9,.25,.5),vec3(.15,.05,.3),u.y*.5+.5);
    float sd=length(u-vec2(0.,.15)); float bands=step(.5,fract(u.y*12.-tt))*step(u.y,.1)+step(.1,u.y);
    col=mix(col,mix(vec3(1.,.85,.3),vec3(1.,.3,.4),.5-u.y),S(.46,.44,sd)*bands);
    if(u.y<-.1){ vec2 g=vec2(u.x/(-u.y+.05),1./(-u.y+.05)+tt*2.); vec2 f=abs(fract(g)-.5); col=mix(vec3(.08,.0,.12),vec3(1.,.3,.8),S(.08,0.,min(f.x,f.y*2.))); }
    return col; }
  if(c==3){ // tunnel of frames (thumbnail of goalposts receding)
    vec3 col=vec3(.02,.03,.06); for(int i=0;i<8;i++){ float z=fract(float(i)/8.-tt*.4); float s=.1+z*1.4; vec2 q=abs(u)-vec2(s,s*.66); float d=abs(max(q.x,q.y)); col+=mix(vec3(1.,.5,.2),vec3(.3,.6,1.),float(i%2))*S(.02,0.,d)*z; } return col; }
  if(c==4){ // test card
    float r=length(u*vec2(1.33,1.)); vec3 col=vec3(.45); col=mix(col,vec3(.1),step(.5,fract(atan(u.y,u.x)*4./3.14159)))*step(.6,r)+vec3(.5)*step(r,.6);
    col=mix(col,vec3(.9,.2,.2),step(abs(u.y),.05)*step(r,.6)); col=mix(col,vec3(.1),S(.01,0.,abs(r-.6))); return col; }
  if(c==5){ return vec3(1.2,1.15,1.05)*(1.-.3*length(u)); }
  if(c==6){ // fast-forward: tracking noise over a smeared image
    vec3 col=channel2(u+vec2(sin(u.y*40.+tt*40.)*.03,0.),tt*3.); float tr=step(.9,fract(u.y*.7+tt*2.)); col=mix(col,vec3(h21(u*300.+tt)),tr*.8); return col; }
  if(c==7){ // format change: pillarbox
    vec3 col=channel2(u*vec2(2.,1.),tt); return col*step(abs(u.x),.33); }
  // captions over a scene
  vec3 col=channel2(u,tt); if(u.y<-.55&&u.y>-.8&&abs(u.x)<.7){ col=mix(col,vec3(0.),.6); col+=vec3(.9)*step(.5,fract(u.x*9.+.2))*step(abs(u.y+.675),.04); }
  return col;
}
void main(){
  vec2 uv=scr(gl_FragCoord.xy);
  // over-the-shoulder push-in
  float push=1.+uT*.012; vec2 q=uv/push+vec2(.05,.02);
  // TV body
  vec2 tb=q-vec2(.05,.03);
  vec2 scrSz=vec2(.52,.38);
  float body=sdRBox(vec3(tb,0.),vec3(.78,.5,1.),.05);
  vec2 su=tb-vec2(-.12,0.); su*=1.+.08*dot(su,su);
  float scrD=length(max(abs(su)-scrSz+.06,0.))-.06;
  // channel logic: flips on beats, specific channels on the words
  int ch=int(mod(floor(uBeat),5.));
  float tt=uT;
  if(uT>ev(0)-.05&&uT<ev(1)) ch=7;
  if(uT>ev(1)-.05&&uT<ev(1)+.25) ch=1;
  if(uT>ev(2)-.05&&uT<ev(3)) ch=8;
  if(uT>ev(3)-.05&&uT<ev(4)) ch=5;
  if(uT>ev(4)-.05&&uT<ev(5)) ch=3;
  if(uT>ev(5)-.05&&uT<ev(6)+.5) ch=6;
  vec3 col=vec3(.004,.004,.006);
  vec2 cu=su/scrSz;
  vec3 img=channel(cu,ch,tt);
  // CRT: scanlines, mask, bloom of the phosphor
  img*=.85+.15*sin(gl_FragCoord.y*2.2);
  img*=.92+.08*sin(gl_FragCoord.x*2.1+vec3(0.,2.,4.));
  // channel number OSD
  vec2 op=(cu-vec2(.62,.68))*vec2(1.,1.)*9.;
  float o1=seg7(op+vec2(.5,0.),0), o2=seg7(op-vec2(.5,0.),(ch+1)%10);
  float osd=min(o1,o2); img+=vec3(.2,1.,.3)*S(.06,0.,osd)*step(fract(uT*.0),.5)*1.2*S(.6,0.,fract(uBeat));
  // the glass
  float inScr=S(.003,-.003,scrD);
  vec3 tvc=vec3(.06,.045,.035)*(.6+.4*fbm(tb*30.))+vec3(.25,.2,.15)*S(.0,-.02,body)*.0;
  col=mix(col,tvc,S(.003,-.003,body));
  col=mix(col,img*1.6,inScr);
  col+=vec3(.6,.7,.8)*.05*inScr*S(.4,0.,length(su-vec2(-.25,.22)));
  // knobs
  for(int i=0;i<2;i++){ vec2 kp=tb-vec2(.6,.18-float(i)*.22); col=mix(col,vec3(.12,.1,.08)+vec3(.15)*S(.03,0.,abs(kp.x+kp.y*.3)),S(.055,.05,length(kp))); }
  // speaker grille
  vec2 gp=tb-vec2(.6,-.25); if(abs(gp.x)<.1&&abs(gp.y)<.12) col*=.6+.4*step(.5,fract(gp.y*60.));
  // spill light on the room
  vec3 avg=channel(vec2(0.),ch,tt);
  col+=avg*.06*exp(-length(tb)*1.5)*(1.-S(.003,-.003,body));
  // the viewer's silhouette in the foreground
  vec2 sp=uv-vec2(-.62,-.62);
  float head=length(sp*vec2(1.,.85)-vec2(0.,.28))-.16;
  float sh=sdRBox(vec3(sp-vec2(0.,-.15),0.),vec3(.42,.25,1.),.2);
  float sil=min(head,sh);
  col=mix(col,vec3(.004)+avg*.03*S(.0,-.01,sil+.008),S(.004,-.004,sil));
  col*=1.+.4*uKick*inScr;
  fragColor=vec4(col,1.);
}`;
  // channel2 is the same as channel for nested channels (GLSL has no recursion)
  SH.tv = SH.tv.replace('vec3 channel(vec2 u,int c,float tt){', `vec3 channel2(vec2 u,float tt){ int c=int(mod(floor(tt*1.3),3.)); if(c==0){ float x=floor((u.x*.5+.5)*7.); return vec3(.75)*vec3(step(.5,mod(x,2.)),step(.5,mod(floor(x/2.),2.)),step(.5,mod(floor(x/4.),2.)))+.05; }
  if(c==1){ vec3 col=mix(vec3(.9,.25,.5),vec3(.15,.05,.3),u.y*.5+.5); col=mix(col,vec3(1.,.8,.3),S(.42,.4,length(u-vec2(0.,.15)))); return col; }
  vec3 col=vec3(.02,.03,.06); for(int i=0;i<6;i++){ float z=fract(float(i)/6.-tt*.4); vec2 q=abs(u)-vec2(.1+z*1.4,(.1+z*1.4)*.66); col+=vec3(1.,.5,.2)*S(.02,0.,abs(max(q.x,q.y)))*z; } return col; }
vec3 channel(vec2 u,int c,float tt){`);

  // =====================================================================================
  // OCEAN — a night sea, a few paper lanterns drifting: "the same few eyes come drifting through"
  SH.ocean = `
float wave(vec2 p){
  float h=0.; float a=.35; vec2 d=vec2(1.,.3); float f=.18;
  for(int i=0;i<6;i++){ float ph=dot(d,p)*f+uT*(1.1+float(i)*.3);
    h+=a*(1.-abs(sin(ph)))*.8+a*.2*sin(ph*2.); d=rot(1.1)*d; f*=1.75; a*=.45; }
  return h-.25;
}
vec3 lanternP(int i){
  float fi=float(i);
  vec3 p=vec3(-9.+fi*4.5+uT*(.5+.15*fi),0.,7.+fi*5.+h11(fi)*6.);
  p.y=wave(p.xz)+.15;
  return p;
}
float lanternOn(int i){ float t0=i==0?-9.:(i==1?ev(0):(i==2?ev(1):(i==3?ev(2):ev(3)+.4))); return S(t0-.1,t0+.3,uT); }
vec3 skyN(vec3 rd){
  vec3 c=mix(vec3(.02,.03,.06),vec3(.0,.005,.02),pow(max(rd.y,0.),.4));
  vec3 M=normalize(vec3(.15,.12,1.)); float md=dot(rd,M);
  c+=vec3(.6,.7,.9)*(pow(max(md,0.),300.)*1.5+S(.9993,.9995,md)*4.+pow(max(md,0.),12.)*.15);
  vec2 sp=vec2(atan(rd.x,rd.z),rd.y)*200.; vec2 id=floor(sp); float r=h21(id);
  c+=vec3(.9,.92,1.)*step(.994,r)*S(.3,0.,length(fract(sp)-.5))*S(0.,.15,rd.y)*1.5*(.6+.4*sin(uSong*2.+r*40.));
  // clouds
  float cl=S(.5,.8,fbm(rd.xz/max(rd.y,.05)*.6+uT*.02))*S(0.,.3,rd.y);
  c=mix(c,vec3(.05,.06,.09)+vec3(.15,.17,.22)*pow(max(md,0.),4.),cl*.8);
  return c;
}
vec3 lanternGlow(vec3 ro,vec3 rd,float tmax){
  vec3 c=vec3(0.);
  for(int i=0;i<5;i++){
    vec3 lp=lanternP(i); vec3 v=lp+vec3(0.,.25,0.)-ro; float z=dot(v,rd); if(z<0.||z>tmax) continue;
    float d=length(v-rd*z); float on=lanternOn(i);
    float flare=1.+2.*S(.2,0.,abs(uT-ev(2)))*float(i==3);
    c+=vec3(1.,.55,.2)*on*(S(.28,.2,d/(1.+z*.002))*3.+exp(-d*2.)*.35)*flare;
  }
  return c;
}
void main(){
  vec2 uv=scr(gl_FragCoord.xy);
  vec3 ro=vec3(uT*.6,1.2+.15*sin(uT*.8),0.); ro.y=max(ro.y,wave(ro.xz)+.6);
  vec3 ta=vec3(uT*.6+2.,.6,20.);
  if(uT>ev(3)-.3){ ro=vec3(-6.+uT*.4,3.,4.); ta=vec3(4.,0.,30.); }
  vec3 rd=lookAt(ro,ta,.03*sin(uT*.6))*normalize(vec3(uv,1.7));
  vec3 col=skyN(rd);
  float t=.1; bool hit=false; vec3 p;
  if(rd.y<.05){
    for(int i=0;i<120;i++){ p=ro+rd*t; float h=p.y-wave(p.xz); if(h<.01*t){hit=true;break;} t+=h*.6; if(t>200.) break; }
  }
  if(hit){
    vec2 e=vec2(.05,0.);
    vec3 n=normalize(vec3(wave(p.xz-e.xy)-wave(p.xz+e.xy),2.*e.x,wave(p.xz-e.yx)-wave(p.xz+e.yx)));
    vec3 rr=reflect(rd,n);
    float fr=.03+.97*pow(1.-sat(dot(-rd,n)),5.);
    vec3 refl=skyN(rr)+lanternGlow(p,rr,80.)*.8;
    vec3 water=vec3(.0,.012,.02);
    col=mix(water,refl,fr);
    // lanterns light the water around them
    for(int i=0;i<5;i++){ vec3 lp=lanternP(i); float d=length(p.xz-lp.xz); col+=vec3(1.,.5,.18)*lanternOn(i)*.6/(1.+d*d*.8)*(.5+.5*n.y); }
    col=mix(col,vec3(.02,.03,.06),1.-exp(-t*.006));
  }
  // lantern bodies
  for(int i=0;i<5;i++){
    vec3 lp=lanternP(i); vec3 v=lp+vec3(0.,.2,0.)-ro; float z=dot(v,rd); if(z<0.||(hit&&z>t+.3)) continue;
    vec2 d2=vec2(dot(v-rd*z,lookAt(ro,ta,0.)[0]),dot(v-rd*z,lookAt(ro,ta,0.)[1]));
    float on=lanternOn(i);
    float body=sdRBox(vec3(d2,0.),vec3(.16,.22,1.),.06);
    vec3 lc=mix(vec3(.08,.05,.03),vec3(2.,1.,.4)*(1.+.2*sin(uSong*7.+float(i))),on);
    col=mix(col,lc*(1.-.4*S(.05,.2,abs(d2.y))),S(.01,-.01,body));
  }
  col+=lanternGlow(ro,rd,hit?t:500.)*.6;
  fragColor=vec4(col,1.);
}`;

  // =====================================================================================
  // FOREST — misty pines at blue hour; red laser limits appear and close in.
  SH.forest = `
vec2 cellOf(vec2 p){ return floor(p/4.); }
float tree(vec3 p,vec2 id){
  vec2 o=(h22(id)-.5)*2.4; vec3 q=p-vec3(id.x*4.+2.+o.x,0.,id.y*4.+2.+o.y);
  float s=.8+.6*h21(id+3.);
  float trunk=sdCylY(q-vec3(0.,4.*s,0.),.15*s,4.*s);
  float r=length(q.xz);
  float cones=1e3;
  for(int i=0;i<4;i++){ float fi=float(i); float y0=(2.5+fi*1.7)*s; float hgt=(3.-fi*.45)*s; float rad=(1.7-fi*.32)*s;
    float yy=q.y-y0; float c=max(r-rad*(1.-sat(yy/hgt)),max(-yy,yy-hgt)); cones=min(cones,c*.7); }
  return min(trunk,cones);
}
vec2 map(vec3 p){
  vec2 r=vec2(p.y+.1*fbm(p.xz*.3),1.);
  vec2 id=cellOf(p.xz); vec2 fq=fract(p.xz/4.); vec2 o=vec2(fq.x<.5?-1.:0.,fq.y<.5?-1.:0.);
  float d=1e3;
  for(int i=0;i<2;i++) for(int j=0;j<2;j++){ vec2 c=id+o+vec2(i,j); if(abs(c.x+.5)<1.&&c.y>-3.&&c.y<6.) continue; d=min(d,tree(p,c)); }
  if(d<r.x) r=vec2(d,2.);
  return r;
}
float beamY(int i){ return .9+float(i)*.55; }
float beamOn(int i){ return S(ev(0)+float(i)*.12-.1,ev(0)+float(i)*.12+.25,uT)*(i<2?1.:after(ev(4)+float(i-2)*.1,.2)); }
float beamZ(int i){ return 22.-float(i)*3.5-after(ev(4),1.2)*6.*float(i>1); }
vec3 beams(vec3 ro,vec3 rd,float tmax){
  vec3 c=vec3(0.);
  for(int i=0;i<6;i++){
    float on=beamOn(i); if(on<=0.) continue;
    // beam along x at height y, depth z (with mismatch jitter)
    float jit=after(ev(5),.1)*(h11(floor(uSong*20.)+float(i))-.5)*.4;
    vec3 a=vec3(0.,beamY(i)+jit,beamZ(i)); vec3 dir=normalize(vec3(1.,.04*sin(float(i)*1.3),.12*float(i%2)-.06));
    // closest approach between view ray and beam line
    vec3 w=ro-a; float b=dot(rd,dir); float dd=dot(rd,w), e=dot(dir,w); float den=1.-b*b;
    float sr=(b*e-dd)/den; if(sr<0.||sr>tmax) continue;
    vec3 pr=ro+rd*sr, pb=a+dir*((e-b*dd)/den);
    float dist=length(pr-pb);
    // sweep in from the left
    float reach=mix(-80.,80.,S(ev(0)+float(i)*.12-.1,ev(0)+float(i)*.12+.6,uT));
    float inB=step(pb.x,reach);
    c+=vec3(1.,.08,.06)*on*inB*(S(.03,0.,dist)*4.+exp(-dist*6.)*.35)/(1.+sr*.04);
  }
  return c;
}
void main(){
  vec2 uv=scr(gl_FragCoord.xy);
  vec3 ro=vec3(.3*sin(uT*.3),1.6,-4.+uT*.9); vec3 ta=ro+vec3(.2*sin(uT*.2),.15,6.);
  if(uT>ev(3)-.2){ ro=vec3(-3.+uT*.1,.9,12.); ta=vec3(2.,1.6,22.); }
  vec3 rd=lookAt(ro,ta,0.)*normalize(vec3(uv,1.6));
  float t=0.; vec2 h; vec3 p;
  for(int i=0;i<100;i++){ p=ro+rd*t; h=map(p); if(h.x<.004*t||t>90.) break; t+=h.x*.85; }
  vec3 fogC=vec3(.12,.17,.26);
  vec3 col=mix(vec3(.18,.24,.36),vec3(.04,.06,.12),pow(max(rd.y,0.),.6));
  if(t<90.){
    vec2 e=vec2(.01,0.); vec3 n=normalize(vec3(map(p+e.xyy).x-map(p-e.xyy).x,map(p+e.yxy).x-map(p-e.yxy).x,map(p+e.yyx).x-map(p-e.yyx).x));
    vec3 alb=h.y<1.5?vec3(.06,.07,.08):vec3(.02,.04,.035);
    vec3 L=normalize(vec3(.2,.8,.6));
    col=alb*(vec3(.3,.4,.6)*sat(dot(n,L))+vec3(.1,.13,.2));
    // red spill from the beams
    for(int i=0;i<6;i++){ float on=beamOn(i); float d=abs(p.y-beamY(i))+abs(p.z-beamZ(i))*.5; col+=vec3(1.,.08,.05)*on*exp(-d*1.5)*.25; }
  }
  // height fog with drifting volume
  float fd=1.-exp(-t*.06);
  float fn=fbm(vec2(uv.x*2.+uT*.1,uv.y*3.))*.4+.6;
  col=mix(col,fogC*fn,fd);
  // moon shafts through the canopy
  col+=vec3(.25,.32,.45)*pow(sat(1.-abs(uv.x*.6-uv.y*.3+.2+.1*sin(uv.y*3.))*1.6),8.)*.12*fbm(vec2(uv.x*10.,uT*.1));
  col+=beams(ro,rd,t);
  // falling specks
  col+=vec3(.6,.7,.9)*step(.998,h21(floor(gl_FragCoord.xy/2.)+floor(uT*10.)))*.4;
  fragColor=vec4(col,1.);
}`;

  // =====================================================================================
  // BOOTH — snow, a street lamp, a phone booth with no one on the line. The lamp dies on "why".
  SH.booth = `
float lampK(){ float k=1.-S(ev(6)-.2,ev(7)+.5,uT); float fl=step(.5,h11(floor(uSong*18.))); k*=mix(1.,fl,S(ev(4),ev(6),uT)); return k; }
float boothK(){ float k=1.; k*=mix(1.,step(.3,h11(floor(uSong*25.))),S(.3,0.,abs(uT-ev(1)))); k*=1.-.7*S(ev(4),ev(5)+.5,uT); return k; }
vec2 map(vec3 p){
  vec2 r=vec2(p.y-.05*fbm(p.xz*.8),1.);
  // lamp post
  float post=sdCap(p,vec3(-2.,0.,6.),vec3(-2.,4.2,6.),.06); post=min(post,sdCap(p,vec3(-2.,4.2,6.),vec3(-1.2,4.4,6.),.05));
  float head=sdRBox(p-vec3(-1.15,4.33,6.),vec3(.25,.06,.14),.03);
  if(min(post,head)<r.x) r=vec2(min(post,head),2.);
  // booth: frame posts + roof + glass panels
  vec3 b=p-vec3(1.2,0.,7.);
  float fr=1e3;
  for(int i=0;i<4;i++){ vec2 c=vec2(i<2?-.5:.5,mod(float(i),2.)<.5?-.5:.5); fr=min(fr,sdBox(b-vec3(c.x,1.15,c.y),vec3(.05,1.15,.05))); }
  fr=min(fr,sdBox(b-vec3(0.,2.35,0.),vec3(.58,.08,.58)));
  fr=min(fr,sdBox(b-vec3(0.,.05,0.),vec3(.55,.05,.55)));
  // horizontal glazing bars
  for(int k=0;k<3;k++){ float y=.6+float(k)*.6; fr=min(fr,sdBox(b-vec3(0.,y,-.5),vec3(.5,.02,.02))); fr=min(fr,sdBox(b-vec3(-.5,y,0.),vec3(.02,.02,.5))); }
  if(fr<r.x) r=vec2(fr,3.);
  // phone + hanging receiver
  float ph=sdBox(b-vec3(0.,1.45,.42),vec3(.13,.2,.06));
  float sw=sin(uT*1.3)*.15*after(ev(2),.3);
  float rec=sdCap(b,vec3(.0+sw,.95,.38),vec3(.04+sw,.7,.38),.03);
  if(min(ph,rec)<r.x) r=vec2(min(ph,rec),4.);
  return r;
}
vec3 nrm(vec3 p){vec2 e=vec2(.002,0.);return normalize(vec3(map(p+e.xyy).x-map(p-e.xyy).x,map(p+e.yxy).x-map(p-e.yxy).x,map(p+e.yyx).x-map(p-e.yyx).x));}
float shadowB(vec3 ro,vec3 rd,float maxt){float res=1.,t=.02;for(int i=0;i<30;i++){float h=map(ro+rd*t).x;res=min(res,8.*h/t);t+=clamp(h,.02,.3);if(res<.001||t>maxt)break;}return sat(res);}
void main(){
  vec2 uv=scr(gl_FragCoord.xy);
  vec3 ro=vec3(-.6+uT*.05,1.5,-1.5+uT*.12), ta=vec3(.2,1.6,7.);
  if(uT>ev(4)-.25){ ro=vec3(4.5,1.3,3.5); ta=vec3(0.,1.6,7.); }
  vec3 rd=lookAt(ro,ta,0.)*normalize(vec3(uv,1.7));
  float t=0.; vec2 h; vec3 p;
  for(int i=0;i<100;i++){ p=ro+rd*t; h=map(p); if(h.x<.001||t>60.) break; t+=h.x; }
  vec3 lampP=vec3(-1.15,4.2,6.); float lk=lampK(); float bk=boothK();
  vec3 boothL=vec3(1.2,2.1,7.);
  vec3 col=vec3(.01,.012,.025)+vec3(.02,.025,.05)*pow(max(rd.y,0.),.3);
  if(t<60.){
    vec3 n=nrm(p);
    vec3 alb=h.y<1.5?vec3(.8,.82,.88):(h.y<2.5?vec3(.05):(h.y<3.5?vec3(.35,.05,.04):vec3(.03)));
    vec3 ll=lampP-p; float ld=length(ll); ll/=ld;
    float cone=S(.35,.75,dot(-ll,vec3(0.,-1.,0.)));
    vec3 c=alb*vec3(1.,.65,.35)*sat(dot(n,ll))*cone*lk*9./(ld*ld)*shadowB(p+n*.01,ll,ld);
    vec3 bl=boothL-p; float bd=length(bl); bl/=bd;
    c+=alb*vec3(.85,.9,1.)*sat(dot(n,bl))*bk*1.2/(1.+bd*bd*.8);
    c+=alb*vec3(.03,.04,.07);
    // snow sparkle
    if(h.y<1.5) c+=vec3(1.)*step(.997,h21(floor(p.xz*80.)))*(cone*lk+.2)*.8;
    col=c;
    col=mix(col,vec3(.03,.035,.06),1.-exp(-t*.05));
  }
  // booth glass glow
  vec3 bc=vec3(1.2,0.,7.)-ro;
  // volumetric lamp cone
  float vol=0.; float tm=min(t,20.);
  for(int i=0;i<24;i++){ float s=(float(i)+h21(gl_FragCoord.xy+uT))/24.*tm; vec3 q=ro+rd*s; vec3 ll=lampP-q; float d=length(ll);
    float cone=S(.45,.8,dot(-ll/d,vec3(0.,-1.,0.))); vol+=cone/(1.+d*d*.3); }
  col+=vec3(1.,.65,.35)*vol/24.*tm*.25*lk;
  // booth interior glow seen through the glass
  { vec3 v=boothL-vec3(0.,.8,0.)-ro; float z=dot(v,rd); float d=length(v-rd*z); col+=vec3(.7,.8,1.)*bk*exp(-d*1.6)*.25; }
  // falling snow, three depths
  for(int L=0;L<3;L++){
    float fl=float(L); vec2 g=uv*(6.+fl*5.)+vec2(sin(uT*.5+fl)*.5,uT*(.6+fl*.3)); vec2 id=floor(g); vec2 f=fract(g)-.5;
    f.x+=sin(uT*1.5+id.y*2.)*.2; float r=h21(id+fl*13.);
    float d=length(f); float sz=.05+.04*(2.-fl);
    float light=.25+lk*1.2*exp(-length(uv-vec2(-.35,.2))*2.);
    col+=vec3(.9,.92,1.)*step(.6,r)*S(sz,sz*.3,d)*light*(L==0?.5:1.);
  }
  fragColor=vec4(col,1.);
}`;

  // =====================================================================================
  // NIXIE — six glowing tubes counting attempts: "one more tweak, one more test"
  SH.nixie = `
float seg(vec2 p,vec2 a,vec2 b){ return sdSeg2(p,a,b); }
float digitD(vec2 p,int d){
  // nixie-ish digit from strokes: rounded 7-seg with curved corners
  int m[10]; m[0]=0x3F;m[1]=0x06;m[2]=0x5B;m[3]=0x4F;m[4]=0x66;m[5]=0x6D;m[6]=0x7D;m[7]=0x07;m[8]=0x7F;m[9]=0x6F;
  int b=m[d]; float r=1e3; float w=.28, hh=.5;
  if((b&1)!=0) r=min(r,seg(p,vec2(-w,hh),vec2(w,hh)));
  if((b&2)!=0) r=min(r,seg(p,vec2(w,hh),vec2(w,0.)));
  if((b&4)!=0) r=min(r,seg(p,vec2(w,0.),vec2(w,-hh)));
  if((b&8)!=0) r=min(r,seg(p,vec2(-w,-hh),vec2(w,-hh)));
  if((b&16)!=0) r=min(r,seg(p,vec2(-w,0.),vec2(-w,-hh)));
  if((b&32)!=0) r=min(r,seg(p,vec2(-w,hh),vec2(-w,0.)));
  if((b&64)!=0) r=min(r,seg(p,vec2(-w,0.),vec2(w,0.)));
  return r;
}
void main(){
  vec2 uv=scr(gl_FragCoord.xy);
  float k=0.; for(int i=0;i<8;i++) k+=after(ev(i),.06);
  // slow dolly across the tubes
  vec2 q=uv*(1.15-uT*.02)+vec2(-.1+uT*.04,0.);
  vec3 col=vec3(.008,.005,.004);
  // warm bokeh behind
  for(int i=0;i<14;i++){ vec2 c=vec2(h11(float(i)*3.1)*2.4-1.2,h11(float(i)*7.7)*1.2-.6); float r=.06+.08*h11(float(i)); col+=vec3(1.,.45,.15)*S(r,r*.85,length(q*.7-c))*.05; }
  // six tubes
  float tw=.3;
  for(int i=0;i<6;i++){
    float fi=float(i);
    vec2 c=vec2((fi-2.5)*tw,0.);
    vec2 tp=q-c;
    // glass envelope
    float env=sdRBox(vec3(tp,0.),vec3(.12,.27,1.),.11);
    float inside=S(.004,-.004,env);
    col=mix(col,col*.8+vec3(.02,.015,.01),inside*.5);
    col+=vec3(.9,.7,.5)*S(.012,0.,abs(env))*.12+vec3(1.)*S(.02,0.,abs(tp.x+.07))*inside*S(.2,-.1,tp.y)*.05;
    // mesh anode
    vec2 mg=abs(fract(tp*vec2(60.,60.))-.5); col+=vec3(.15,.08,.04)*inside*S(.1,0.,min(mg.x,mg.y))*.25;
    // counter value: digits roll on each word
    float val=fi<3.?floor(k)+fi*3.:floor(k*1.7+uBeat*.5*(fi-2.))+fi;
    float roll=fract(uBeat*(fi>3.?2.:0.));
    int d=int(mod(val,10.));
    vec2 dp=tp/vec2(.19,.38);
    // ghost stacked cathodes
    float ghost=1e3; for(int g=0;g<10;g++){ if(g==d) continue; ghost=min(ghost,digitD(dp+vec2(0.,0.)*float(g),g)); }
    col+=vec3(.25,.12,.05)*S(.03,0.,ghost)*.12*inside;
    float dd=digitD(dp,d);
    float on=1.-.3*S(.2,0.,fract(k))*0.;
    float flick=.9+.1*h11(floor(uSong*40.)+fi);
    vec3 glow=vec3(1.,.42,.1);
    col+=glow*inside*(S(.045,.02,dd)*2.4+exp(-dd*9.)*.6)*flick*(1.+.4*uKick);
    col+=glow*exp(-length(tp)*5.)*.08;
  }
  // tension into chorus 2
  col*=1.+S(uDur-1.,uDur,uT)*2.5;
  fragColor=vec4(col,1.);
}`;
})();
