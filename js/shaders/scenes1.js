/* Moving Goalposts — shots, part 1. Each entry is the body of a fragment shader (header in gl.js). */
(function () {
  const SH = (window.MGSH = window.MGSH || {});

  // =====================================================================================
  // ROOM — the night desk from the cover: laptop glow, a worn sneaker, a window of rain.
  // v0 intro (night), v1 dawn (final chorus, stripped), v2 outro (night, pushing into the screen)
  SH.room = `
vec3 bgCity(vec3 rd, float dawn){
  float y=rd.y;
  vec3 sky=mix(vec3(.03,.04,.09),vec3(.08,.1,.2),S(-.1,.5,y));
  sky=mix(sky,mix(vec3(.9,.45,.25),vec3(.35,.4,.6),S(0.,.45,y)),dawn);
  // skyline with lit windows
  float x=atan(rd.x,rd.z)*6.;
  float bh=.05+.18*h11(floor(x*3.))+.08*h11(floor(x*7.)+3.);
  if(y<bh-.08){
    vec2 g=vec2(x*40.,y*60.); vec2 id=floor(g);
    float lit=step(.72,h21(id))*S(.3,.5,fract(g.x))*S(.3,.5,fract(g.y))*S(.7,.5,fract(g.x))*S(.7,.5,fract(g.y));
    vec3 wc=mix(vec3(1.,.7,.35),vec3(.6,.8,1.),h21(id+7.));
    sky=mix(vec3(.01,.012,.02),vec3(.08,.06,.07),dawn)+wc*lit*(1.-dawn*.7)*1.8;
  }
  // distant bokeh
  vec2 q=vec2(x,y*6.);
  for(int i=0;i<3;i++){ vec2 c=floor(q*2.+float(i)*13.); vec2 f=fract(q*2.+float(i)*13.)-.5; float r=h21(c);
    if(r>.8) sky+=mix(vec3(1.,.55,.2),vec3(.4,.6,1.),h21(c+1.))*S(.25,.1,length(f))*.6*(1.-dawn*.6); }
  return sky;
}
vec3 screenTex(vec2 uv){
  vec3 c=vec3(.015,.02,.035);
  // UI chrome
  c+=vec3(.06,.08,.12)*step(.9,uv.y);
  c+=vec3(.05)*step(uv.x,.08)*step(uv.y,.9);
  for(int i=0;i<4;i++) c+=vec3(.12,.15,.2)*S(.004,0.,abs(uv.y-.93))*step(.12+float(i)*.12,uv.x)*step(uv.x,.2+float(i)*.12);
  vec2 g=fract(uv*vec2(10.,8.)); c+=vec3(.025,.03,.045)*(S(.02,0.,g.x)+S(.02,0.,g.y))*step(.1,uv.x)*step(uv.y,.88);
  // the graph: rises, peaks, falls — then the goalposts shift
  float sh=after(ev(3),.4);
  float x=(uv.x-.12)/.82;
  float yv=.25+.12*x+.3*exp(-pow((x-mix(.62,.3,sh))*7.,2.))+.03*sin(x*40.)*(1.-sh);
  yv=mix(yv,.22+.05*sin(x*9.)-.12*x,sh*uVar<.5?sh*.0:0.);
  float draw=uVar>1.5?S(0.,4.5,uT):S(0.,3.,uT+2.);
  if(uVar>1.5){ yv=.2+.55*pow(x,1.4)+.02*sin(x*30.+uT); }
  float d=abs(uv.y-yv);
  vec3 lc=uVar>1.5?vec3(1.,.62,.28):vec3(.55,.8,1.);
  float on=step(0.,x)*step(x,draw);
  c+=lc*(S(.006,.0,d)*1.6+S(.08,0.,d)*.18)*on;
  // a little vertical line marking "the goal" that keeps moving
  float gx=.12+.82*mix(.8,.45,sh);
  c+=vec3(1.,.35,.3)*S(.003,0.,abs(uv.x-gx))*step(.1,uv.y)*step(uv.y,.85)*.8*(uVar>1.5?0.:1.);
  return c;
}
vec2 sneaker(vec3 p){
  p-=vec3(.62,.752,.18); p.xz*=rot(.5);
  float sole=sdRBox(p-vec3(0.,.016,0.),vec3(.16,.016,.055),.014);
  float up=sdEll(p-vec3(.07,.045,0.),vec3(.095,.045,.05));
  up=smin(up,sdEll(p-vec3(-.03,.07,0.),vec3(.11,.065,.055)),.03);
  up=smin(up,sdEll(p-vec3(-.11,.085,0.),vec3(.06,.07,.05)),.02);
  up=max(up,-sdEll(p-vec3(-.08,.15,0.),vec3(.065,.04,.038)));
  up=max(up,-p.y+.02);
  float lace=1e3; for(int i=0;i<4;i++){ float u=-.04+float(i)*.035; lace=min(lace,sdCap(p,vec3(u,.115-float(i)*.012,-.035),vec3(u+.012,.118-float(i)*.012,.035),.004)); }
  float d=min(sole,up); vec2 r=vec2(d,6.); if(sole<up) r.y=7.; if(lace<r.x) r=vec2(lace,8.);
  return r;
}
float hingeA(){ return uVar>.5&&uVar<1.5? 1.75 : 1.85; }
vec2 map(vec3 p){
  vec2 r=vec2(p.y,1.); // floor
  float walls=min(min(2.5+p.x,2.5-p.x),min(2.7-p.y,1.35-p.z+0.));
  float win=sdBox(p-vec3(.55,1.55,1.4),vec3(.75,.55,.4));
  walls=max(walls,-win);
  // window frame + mullion
  float fr=max(sdBox(p-vec3(.55,1.55,1.38),vec3(.78,.58,.04)),-sdBox(p-vec3(.55,1.55,1.38),vec3(.72,.52,.1)));
  fr=min(fr,sdBox(p-vec3(.55,1.55,1.38),vec3(.015,.55,.03)));
  fr=min(fr,sdBox(p-vec3(.55,1.5,1.38),vec3(.75,.012,.03)));
  if(walls<r.x) r=vec2(walls,2.); if(fr<r.x) r=vec2(fr,9.);
  float desk=sdBox(p-vec3(0.,.73,.6),vec3(1.05,.022,.5));
  desk=min(desk,sdBox(vec3(abs(p.x),p.y,p.z)-vec3(.98,.36,.6),vec3(.025,.36,.46)));
  if(desk<r.x) r=vec2(desk,3.);
  float base=sdRBox(p-vec3(0.,.758,.38),vec3(.3,.007,.2),.005);
  vec3 q=p-vec3(0.,.765,.58); q.yz*=rot(-(hingeA()-1.5708));
  float scr=sdRBox(q-vec3(0.,.2,0.),vec3(.3,.2,.006),.005);
  float lap=min(base,scr); if(lap<r.x) r=vec2(lap,4.);
  if(scr<base && q.z<-.0045 && abs(q.x)<.285 && abs(q.y-.2)<.185) r.y=5.;
  vec2 sn=sneaker(p); if(sn.x<r.x) r=sn;
  // mug + books
  vec3 m=p-vec3(-.62,.85,.3); float mug=max(sdCylY(m,.045,.07),-sdCylY(m-vec3(0.,.02,0.),.038,.07));
  mug=min(mug,sdTorus((m-vec3(.055,0.,0.)).yxz,vec2(.025,.007)));
  if(mug<r.x) r=vec2(mug,10.);
  float bk=sdRBox(p-vec3(-.75,.78,.75),vec3(.17,.025,.12),.004); bk=min(bk,sdRBox(p-vec3(-.74,.83,.74),vec3(.15,.022,.11),.004));
  if(bk<r.x) r=vec2(bk,11.);
  return r;
}
vec3 nrm(vec3 p){vec2 e=vec2(.0007,0.);return normalize(vec3(map(p+e.xyy).x-map(p-e.xyy).x,map(p+e.yxy).x-map(p-e.yxy).x,map(p+e.yyx).x-map(p-e.yyx).x));}
float shadow(vec3 ro,vec3 rd){float res=1.,t=.01;for(int i=0;i<28;i++){float h=map(ro+rd*t).x;res=min(res,10.*h/t);t+=clamp(h,.01,.2);if(res<.001||t>4.)break;}return sat(res);}
void main(){
  vec2 uv=scr(gl_FragCoord.xy);
  float dawn=uVar>.5&&uVar<1.5?1.:0.;
  // ---- camera
  vec3 ro,ta; float fov=1.6;
  if(uVar<.5){
    if(uT<4.25){ float k=uT/4.25; ro=vec3(-1.5+.5*k,1.3-.1*k,-1.7+.5*k); ta=vec3(.05,.86,.5); fov=1.5; }
    else if(uT<6.55){ float k=(uT-4.25)/2.3; ro=vec3(-.12+.06*k,.98,-.12+.04*k); ta=vec3(0.,.93,.55); fov=1.9; }
    else { float k=(uT-6.55)/4.2; ro=mix(vec3(1.25,1.12,-.55),vec3(-.6,1.25,-1.45),S(0.,1.,k)); ta=mix(vec3(.45,.82,.3),vec3(.15,.9,.5),S(0.,1.,k)); fov=mix(1.8,1.5,S(0.,1.,k)); }
  } else if(uVar<1.5){ float k=uT/uDur; ro=vec3(1.2-1.*k,1.1,-.9+.15*k); ta=vec3(.3,.8,.4); fov=1.55; }
  else { float k=uT/uDur; ro=mix(vec3(-.6,1.1,-.8),vec3(-.04,.97,.0),S(0.,1.,k)); ta=vec3(0.,.93,.58); fov=mix(1.5,2.1,k); }
  ro+=vec3(sin(uT*.7),sin(uT*.9+1.),0.)*.006;
  vec3 rd=lookAt(ro,ta,0.)*normalize(vec3(uv,fov));
  // ---- lights
  vec3 Ld=normalize(dawn>.5?vec3(-.35,.32,1.):vec3(-.2,.55,1.));
  vec3 Lc=dawn>.5?vec3(2.6,1.45,.75):vec3(.32,.42,.75);
  vec3 scrP=vec3(0.,.94,.53); vec3 scrN=normalize(vec3(0.,.25,-1.));
  float flick=1.+.25*S(.15,0.,abs(uT-ev(3)))+.15*uKick;
  vec3 scrC=(dawn>.5?vec3(.05,.06,.08):vec3(.45,.6,1.))*flick;
  if(uVar>1.5) scrC=vec3(.9,.65,.45);
  // ---- march
  float t=.0; vec2 h; vec3 p;
  for(int i=0;i<96;i++){ p=ro+rd*t; h=map(p); if(abs(h.x)<.0008*t||t>9.) break; t+=h.x*.95; }
  vec3 col;
  bool hit=t<9.;
  if(!hit){ col=bgCity(rd,dawn); }
  else {
    vec3 n=nrm(p); float id=h.y;
    vec3 alb=vec3(.12); float spec=.1, rough=32.;
    if(id<1.5){ float g=fbm(p.xz*vec2(2.,14.)); alb=vec3(.09,.06,.045)*(.7+.6*g); spec=.25; }
    else if(id<2.5){ alb=vec3(.11,.115,.13)*(.8+.4*fbm(p.xy*3.+p.z)); }
    else if(id<3.5){ float g=fbm(vec2(p.x*3.,p.z*40.+fbm(p.xz*4.)*6.)); alb=vec3(.22,.13,.07)*(.6+.7*g); spec=.5; rough=60.; }
    else if(id<4.5){ alb=vec3(.42,.43,.46); spec=1.2; rough=90.; }
    else if(id<5.5){
      vec3 q=p-vec3(0.,.765,.58); q.yz*=rot(-(hingeA()-1.5708));
      vec2 su=vec2((q.x+.285)/.57,(q.y-.015)/.37);
      col=screenTex(su)*(dawn>.5?.25:1.6);
      col+=pow(sat(dot(reflect(rd,n),Ld)),20.)*Lc*.3;
    }
    else if(id<6.5){ alb=vec3(.62,.6,.55)*(.75+.35*fbm(p.xy*90.))-vec3(.05,.06,.07)*fbm(p.xz*30.); spec=.15; }
    else if(id<7.5){ alb=vec3(.7,.68,.62); }
    else if(id<8.5){ alb=vec3(.75); }
    else if(id<9.5){ alb=vec3(.05); }
    else if(id<10.5){ alb=vec3(.35,.08,.06); spec=.8; rough=80.; }
    else { alb=mix(vec3(.08,.12,.2),vec3(.3,.1,.08),step(.81,p.y)); }
    if(id<4.5||id>5.5){
      // window light
      float sh=shadow(p+n*.003,Ld);
      float dif=sat(dot(n,Ld))*sh;
      vec3 hv=normalize(Ld-rd);
      col=alb*Lc*dif+Lc*spec*pow(sat(dot(n,hv)),rough)*dif*.6;
      // screen light (one-sided, inverse square)
      vec3 sl=scrP-p; float sd=length(sl); sl/=sd;
      float facing=sat(dot(-sl,scrN)*1.2+.2);
      float sdif=sat(dot(n,sl))*facing/(1.+sd*sd*9.);
      col+=alb*scrC*sdif*2.2+scrC*spec*pow(sat(dot(n,normalize(sl-rd))),rough)*facing/(1.+sd*sd*9.)*1.5;
      // warm desk lamp (off-frame left), soft shadows
      vec3 lp=vec3(-.75,1.35,.35); vec3 ll=lp-p; float ld=length(ll); ll/=ld;
      float lsh=shadow(p+n*.003,ll);
      float lamp=(dawn>.5?.0:1.)*(1.+.04*sin(uSong*9.));
      col+=alb*vec3(1.,.55,.25)*2.4*sat(dot(n,ll))*lsh/(1.+ld*ld*1.2)*lamp+vec3(1.,.6,.3)*spec*pow(sat(dot(n,normalize(ll-rd))),rough)*lsh*.4/(1.+ld*ld)*lamp;
      // ambient + bounce
      col+=alb*(dawn>.5?vec3(.16,.12,.1):vec3(.035,.045,.08))*(.5+.5*n.y);
      // contact darkening
      col*=.6+.4*sat(map(p+n*.03).x/.03);
    }
    // glimpse of outside through glass: faint reflections
  }
  // volumetric light shafts through the window
  float vol=0.;
  float tm=min(t,7.);
  for(int i=0;i<24;i++){
    float s=(float(i)+h21(gl_FragCoord.xy+uT))/24.*tm; vec3 q=ro+rd*s;
    float k=(1.4-q.z)/Ld.z; vec3 w=q+Ld*k;
    float inWin=step(abs(w.x-.55),.72)*step(abs(w.y-1.55),.52)*step(q.z,1.35);
    vol+=inWin*(.4+.6*vn3(q*3.+vec3(0.,uT*.1,0.)));
  }
  col+=Lc*vol/24.*(dawn>.5?.13:.4)*tm*.25;
  // floating dust motes catching the light
  for(int i=0;i<60;i++){
    float fi=float(i);
    vec3 mp=vec3(h11(fi*1.3)*1.8-.7,.75+h11(fi*2.7)*1.1,h11(fi*3.9)*1.4-.3);
    mp+=vec3(sin(uT*.3+fi),sin(uT*.21+fi*1.7)*.6+uT*.015,cos(uT*.25+fi*.7))*.08;
    vec3 v=mp-ro; float z=dot(v,rd); if(z<.05||z>t) continue;
    float dd=length(v-rd*z);
    float rad=.0018*z+.0008;
    float k=(1.4-mp.z)/Ld.z; vec3 w=mp+Ld*k;
    float lit=step(abs(w.x-.55),.72)*step(abs(w.y-1.55),.52)*1.5+.6/(1.+length(mp-scrP)*6.);
    col+=(Lc*1.5+scrC*.4)*lit*S(rad,0.,dd)*.9;
  }
  // rain on the window glass in the night versions
  if(dawn<.5 && hit && h.y<1.5){}
  col*=1.-.15*S(.0,1.,length(uv));
  fragColor=vec4(col,1.);
}`;

  // =====================================================================================
  // CITY — rooftops time-lapse. v0: dawn → night ("I post at dawn, then I post at night")
  // v1: night → sunrise with a glowing goal frame on the roof (final chorus)
  SH.city = `
vec3 skyCol(vec2 uv,float tod,vec2 sun){
  // tod: 0 night, 1 golden, 2 day
  vec3 top=mix(vec3(.01,.015,.04),vec3(.12,.12,.35),S(0.,1.,tod)); top=mix(top,vec3(.18,.35,.7),S(1.,2.,tod));
  vec3 hor=mix(vec3(.03,.04,.09),vec3(1.,.42,.18),S(0.,1.,tod)); hor=mix(hor,vec3(.85,.75,.7),S(1.,2.,tod));
  vec3 c=mix(hor,top,pow(sat(uv.y*1.3+.25),.7));
  float sd=length(uv-sun);
  vec3 sc=mix(vec3(1.,.35,.1),vec3(1.,.85,.6),S(.6,2.,tod));
  c+=sc*(exp(-sd*5.)*.6+exp(-sd*22.)*.9)*S(-.05,.4,tod);
  c+=sc*S(.045,.035,sd)*3.*S(-.05,.3,tod);
  // stars
  vec2 st=uv*90.; vec2 id=floor(st); float s=h21(id); vec2 f=fract(st)-.5;
  c+=vec3(.9,.9,1.)*step(.985,s)*S(.08,0.,length(f))*S(.6,0.,tod)*(.6+.4*sin(uSong*3.+s*40.));
  return c;
}
float clouds(vec2 uv,float t){ vec2 q=uv*vec2(1.2,3.)+vec2(t*.6,0.); return S(.45,.8,fbm(q+fbm(q*1.3+t*.1)*1.5)); }
void main(){
  vec2 uv=scr(gl_FragCoord.xy);
  float pan=uT*.035;
  float tod; vec2 sun;
  if(uVar<.5){
    // quick time-lapse: dawn on "dawn", night on "night"
    float a=S(-1.,ev(0)+.2,uT), b=S(ev(1)-.3,ev(1)+.9,uT);
    tod=mix(.15,1.25,a); tod=mix(tod,-.15,b);
    sun=vec2(.25,mix(-.25,.05,a)-.5*b);
  } else {
    tod=mix(-.1,1.1,S(.5,uDur-.5,uT)); sun=vec2(-.15,mix(-.3,.08,S(.5,uDur,uT)));
  }
  float tl=uVar<.5?uT*6.:uT*2.;
  vec3 col=skyCol(uv,tod,sun);
  // fast clouds (time-lapse)
  float cl=clouds(uv+vec2(pan,0.),tl*.15)*S(-.05,.3,uv.y);
  vec3 cc=mix(vec3(.03,.035,.06),mix(vec3(1.,.55,.35),vec3(.9,.9,.95),S(1.2,2.,tod)),S(-.1,1.,tod));
  col=mix(col,cc*(1.+.6*exp(-length(uv-sun)*3.)*S(0.,1.,tod)),cl*.75);
  // building layers, back to front
  float nightK=S(.7,-.1,tod);
  for(int L=0;L<4;L++){
    float fl=float(L); float sc=1.+fl*.9; float par=pan*(1.+fl*1.6);
    float x=(uv.x+par)*sc*3.+fl*17.;
    float w=1.; float bx=floor(x); float bf=fract(x);
    float hgt=-.12+.10*fl*-.6+.22*h11(bx+fl*31.)+.12*step(.8,h11(bx*3.+fl))+(L==3?-.18:0.);
    hgt-=fl*.07;
    float edge=step(.06,bf)*step(bf,.94);
    float isB=step(uv.y,hgt)*edge+step(uv.y,hgt-.04);
    // antennas / water towers
    if(h11(bx+fl*7.)>.75) isB=max(isB,step(abs(bf-.5),.015)*step(uv.y,hgt+.08));
    if(L==3&&h11(bx+2.)>.6){ vec2 wt=vec2(bf-.5,uv.y-hgt-.05); isB=max(isB,step(length(wt*vec2(1.,1.6)),.06)*step(-.03,wt.y)); isB=max(isB,step(abs(wt.x)-.04,0.)*step(abs(wt.x+.0),.045)*step(wt.y,0.)*step(-.06,wt.y)*step(.3,fract(wt.x*30.))); }
    if(isB>.5){
      vec3 bc=mix(vec3(.03,.035,.06),vec3(.35,.2,.18),S(0.,1.2,tod)*(1.-fl*.2));
      bc=mix(bc,vec3(.25,.27,.3),S(1.4,2.,tod));
      // haze by depth
      bc=mix(bc,mix(vec3(.04,.05,.1),vec3(.8,.45,.3),S(0.,1.,tod)),(.55-fl*.17)*1.);
      // windows
      vec2 g=vec2(bf*8.,uv.y*sc*26.); vec2 id=floor(g); vec2 f=fract(g);
      float win=step(.25,f.x)*step(f.x,.75)*step(.3,f.y)*step(f.y,.7)*step(uv.y,hgt-.02)*step(.06,bf)*step(bf,.94);
      float on=step(.55,h21(id+bx*13.+fl*7.+floor(uBeat*.5)*step(.93,h21(id+bx))));
      // trimming: rows of windows switch off on the cut words
      if(uVar<.5){ float tr=after(ev(2),.05)*step(.5,h21(id.yy+3.))+after(ev(3),.05)*step(.6,h21(id+9.))+after(ev(4),.05)*step(.5,h21(id.xx+bx)); on*=1.-sat(tr)*(1.-after(ev(5),.6)); }
      vec3 wc=mix(vec3(1.,.72,.38),vec3(.7,.85,1.),step(.7,h21(id+bx)));
      bc+=wc*win*on*nightK*(1.3-fl*.25)*(.9+.2*uKick);
      col=bc;
    }
  }
  // rooftop foreground with a glowing goal frame (v1) / rooftop edge (v0)
  float roofY=-.36+.02*sin(uv.x*2.);
  if(uv.y<roofY){ col=vec3(.012,.012,.018)+vec3(.12,.07,.05)*S(.5,1.5,tod)*.5; col+=vec3(.6,.35,.2)*S(.0,-.08,uv.y-roofY)*0.; }
  // ledge highlight
  col+=mix(vec3(.4,.5,.8),vec3(1.,.6,.3),S(0.,1.,tod))*S(.006,0.,abs(uv.y-roofY))*.6;
  if(uVar>.5){
    vec2 g=uv-vec2(-.15+uT*.01,roofY);
    float fw=.24,fh=.16,th=.006;
    float d=min(min(abs(g.x+fw)-th,abs(g.x-fw)-th),abs(g.y-fh)-th);
    float frame=step(d,0.)*step(g.y,fh+th)*step(0.,g.y)*step(abs(g.x),fw+th);
    float glow=exp(-max(min(min(abs(g.x+fw),abs(g.x-fw)),abs(g.y-fh)),0.)*40.)*step(-.01,g.y)*step(g.y,fh+.04)*step(abs(g.x),fw+.04);
    vec3 fc=vec3(1.,.8,.55)*(1.+after(ev(4),.5)*2.);
    col=mix(col,fc*1.4,frame); col+=fc*glow*.5*(.6+.4*after(ev(2),1.));
    // a small light inside the frame: the work, finally framed
    float orb=length(uv-vec2(-.15+uT*.01,roofY+.06+.01*sin(uT*2.)));
    col+=vec3(1.,.7,.4)*(exp(-orb*60.)*2.+exp(-orb*12.)*.4)*after(ev(2)-.3,.8);
    // lens flare from the sun
    vec2 fd=uv-sun; for(int i=1;i<5;i++){ vec2 fp=sun-fd*(float(i)*.45); col+=vec3(1.,.6,.3)*S(.04*float(i),.0,length(uv-fp))*.06*S(.2,1.,tod); }
    col+=vec3(1.,.7,.4)*S(.012,0.,abs(uv.y-sun.y))*exp(-abs(uv.x-sun.x)*1.5)*.25*S(.3,1.,tod);
  }
  fragColor=vec4(col,1.);
}`;

  // =====================================================================================
  // NEBULA — "read every thread, every secret chart": a chart drawn in constellations.
  SH.nebula = `
vec3 neb(vec2 p,float t){
  vec2 q=p+vec2(fbm(p*1.5+t*.03),fbm(p*1.5+5.2-t*.02));
  float a=fbm(q*2.+3.), b=fbm(q*3.5-t*.05);
  vec3 c=vec3(.02,.01,.04);
  c+=vec3(.05,.35,.45)*pow(a,3.)*2.2;
  c+=vec3(.6,.12,.35)*pow(b,4.)*2.5;
  c+=vec3(1.,.55,.25)*pow(a*b,5.)*6.;
  return c;
}
vec2 node(int i){ float fi=float(i); float x=-.78+fi*.12;
  float y=-.22+.035*fi+.36*exp(-pow((fi-6.5)*.5,2.))-.05*max(fi-8.,0.)+.05*(h11(fi*7.3)-.5);
  return vec2(x,y); }
void main(){
  vec2 uv=scr(gl_FragCoord.xy);
  float z=1.+uT*.06; vec2 p=uv/z+vec2(uT*.01,0.);
  p*=rot(uT*.01);
  vec3 col=neb(p*1.2,uT)*1.1;
  col+=neb(p*2.3+7.,uT)*.35;
  // stars, three layers parallax
  for(int L=0;L<3;L++){
    float fl=float(L); vec2 sp=uv*(40.+fl*30.)/(1.+uT*.04*(fl+1.))+fl*11.;
    vec2 id=floor(sp); vec2 f=fract(sp)-.5; float r=h21(id);
    vec2 o=(h22(id)-.5)*.6; float d=length(f-o);
    float tw=.6+.4*sin(uSong*(2.+r*4.)+r*60.);
    col+=mix(vec3(.6,.75,1.),vec3(1.,.8,.6),h21(id+3.))*step(.92,r)*(exp(-d*30.)*1.5)*tw*(1.-fl*.25);
  }
  // the threads: nodes appear one per beat from "read", the chart completes on "chart"
  float t0=ev(0)-.2; float per=.22;
  vec2 shift=vec2(0.,0.)*uv; vec2 q=uv/z; q*=rot(uT*.01);
  float lines=0., dots=0.; vec3 lcol=vec3(.6,.85,1.);
  for(int i=0;i<13;i++){
    float ti=t0+float(i)*per; float k=after(ti,.25);
    vec2 a=node(i), b=node(i+1);
    float kn=sat((uT-ti)/.3);
    vec2 bb=mix(a,b,kn);
    float d=sdSeg2(q,a,bb);
    if(i<12) lines+=S(.004,.0,d)*step(.001,kn)+exp(-d*90.)*.25*step(.001,kn);
    float dn=length(q-a); dots+=k*(exp(-dn*220.)*2.+exp(-dn*35.)*.35);
  }
  // a pulse travels along the finished chart ("secret chart"), then the hook at the start
  float pt=(uT-ev(3))/1.2;
  if(pt>0.&&pt<1.){ float fi=pt*12.; int i=int(fi); vec2 pp=mix(node(i),node(i+1),fract(fi)); col+=vec3(1.,.8,.5)*exp(-length(q-pp)*60.)*3.; }
  float hk=after(ev(4),.5);
  vec2 h0=node(0)+vec2(0.,.08); float dh=abs(length(q-h0-vec2(.04,0.))-.04); dh=max(dh,-(q.y-h0.y)); dh=min(dh,sdSeg2(q,h0+vec2(.08,0.),h0+vec2(.08,.18*hk)));
  col+=vec3(1.,.6,.3)*S(.004,0.,dh)*hk*1.5+vec3(1.,.6,.3)*exp(-dh*60.)*.3*hk;
  col+=vec3(1.,.7,.4)*exp(-length(q-node(0))*20.)*after(ev(5),.1)*exp(-max(uT-ev(5),0.)*2.)*2.;
  col+=lcol*lines*.8+vec3(1.,.95,.9)*dots;
  col*=1.+.25*uKick;
  fragColor=vec4(col,1.);
}`;

  // =====================================================================================
  // TREE — one tree on a hill, seasons rushing past ("keep pace with the season").
  SH.tree = `
vec4 treeTex(vec2 p,float sway){
  // p: tree space, base at (0,0), height ~1
  vec2 q=p; q.x+=sway*q.y*q.y;
  vec2 tuv=vec2(q.x*.5+.5,q.y*.92+.03);
  if(tuv.x<0.||tuv.x>1.||tuv.y<0.||tuv.y>1.) return vec4(0.);
  return texture(uTex,tuv);
}
void main(){
  vec2 uv=scr(gl_FragCoord.xy);
  // season clock: slow at first, then racing through the year on "pace"/"season"
  float s=.15+uT*.22;
  s+=after(ev(5)-.1,1.)*1.3+after(ev(6),1.4)*2.;
  if(uT>ev(3)) s+=.35; // "cut out the pause": a jump cut
  float se=fract(s); int si=int(mod(floor(s),4.)); int sn=int(mod(float(si)+1.,4.));
  float blend=S(.7,1.,se);
  vec3 skyA[4]; skyA[0]=vec3(.42,.58,.85); skyA[1]=vec3(.2,.45,.85); skyA[2]=vec3(.55,.35,.45); skyA[3]=vec3(.3,.36,.48);
  vec3 skyB[4]; skyB[0]=vec3(1.,.82,.8); skyB[1]=vec3(.85,.9,.95); skyB[2]=vec3(1.,.62,.35); skyB[3]=vec3(.82,.84,.9);
  vec3 lfA[4]; lfA[0]=vec3(1.,.66,.78); lfA[1]=vec3(.2,.42,.14); lfA[2]=vec3(.95,.4,.1); lfA[3]=vec3(.9,.93,1.);
  vec3 grA[4]; grA[0]=vec3(.32,.5,.2); grA[1]=vec3(.22,.42,.12); grA[2]=vec3(.45,.33,.15); grA[3]=vec3(.85,.88,.95);
  vec3 skyTop=mix(skyA[si],skyA[sn],blend), skyHor=mix(skyB[si],skyB[sn],blend), leaf=mix(lfA[si],lfA[sn],blend), grass=mix(grA[si],grA[sn],blend);
  float winter=mix(float(si==3),float(sn==3),blend);
  float cover=si==0?mix(.55,1.,se):si==1?1.:si==2?1.-se*.95:mix(0.,.3,blend);
  if(si==3) cover=mix(0.,.45,blend);
  float day=.62+.38*sin(s*TAU*2.5+1.);
  vec2 sp=vec2(.7-fract(s*2.5)*1.4,.05+.3*sin(fract(s*2.5)*PI));
  vec3 col=mix(skyHor,skyTop,S(-.25,.55,uv.y))*mix(.25,1.,day);
  col+=vec3(1.,.8,.55)*(exp(-length(uv-sp)*6.)*.45*day+S(.028,.022,length(uv-sp))*1.5*day);
  // time-lapse clouds
  float cl=S(.48,.82,fbm(uv*vec2(1.3,3.5)+vec2(uT*1.2,0.)));
  col=mix(col,mix(vec3(1.),skyHor,.35)*mix(.3,1.05,day)*(.8+.4*exp(-length(uv-sp)*2.)),cl*.65*S(-.15,.3,uv.y));
  // far hills (two bands, aerial perspective)
  float h1=-.12+.05*sin(uv.x*2.3+1.)+.025*sin(uv.x*6.1);
  col=mix(col,mix(skyHor,grass*.8,.35)*mix(.35,.95,day),S(.004,0.,uv.y-h1));
  float h2=-.22+.06*sin(uv.x*1.7+3.)+.02*sin(uv.x*9.);
  col=mix(col,mix(skyHor,grass,.65)*mix(.3,.9,day),S(.004,0.,uv.y-h2));
  // main hill with grass texture and blades
  float hill=-.36+.07*cos(uv.x*1.4-.3);
  if(uv.y<hill+.01){
    vec3 g=grass*mix(.3,1.,day)*(.75+.4*fbm(uv*vec2(20.,60.)));
    float blade=S(.0,.02,hill-uv.y+.012*vn(vec2(uv.x*400.,uT*2.)));
    col=mix(col,g,S(hill+.004,hill-.002,uv.y+.008*vn(vec2(uv.x*300.+uT*3.,0.))));
  }
  // the tree
  vec2 tp=(uv-vec2(.08,hill-.006))/.62;
  float sway=.025*sin(uT*1.6)+.015*sin(uT*3.1)+.02*uKick;
  vec4 tx=treeTex(tp,sway);
  float bark=S(.25,.6,tx.r);
  float lf=S(1.-cover,1.-cover+.15,tx.g*1.6)*step(.05,tx.g);
  vec3 barkC=vec3(.07,.045,.035)*mix(.4,1.,day);
  col=mix(col,barkC,bark);
  // snow on branches
  if(winter>.1){ vec4 above=treeTex(tp+vec2(0.,.004),sway); col=mix(col,vec3(.95)*mix(.5,1.,day),bark*(1.-S(.25,.6,above.r))*winter); }
  vec3 lc=leaf*mix(.45,1.2,tx.b)*mix(.35,1.1,day);
  col=mix(col,lc,lf*.95);
  // falling petals / leaves / snow
  for(int L=0;L<3;L++){
    float fl=float(L); float sc=7.+fl*6.;
    vec2 g=uv*sc+vec2(uT*(.6+fl*.4),uT*(1.2+fl*.5)); vec2 id=floor(g); vec2 f=fract(g)-.5;
    f+=vec2(sin(uT*2.+id.y*3.),cos(uT*1.7+id.x*2.))*.18; float r=h21(id+fl*9.);
    vec2 ff=f*rot(uT*2.+r*6.);
    float dd=length(ff*vec2(1.,winter>.5?1.:2.2));
    vec3 pc=winter>.5?vec3(1.):(si==2?vec3(.9,.35,.08):lfA[si]);
    float amt=si==1?0.:1.;
    col=mix(col,pc*mix(.5,1.15,day),step(.8,r)*S(.1,.06,dd)*amt*(1.-fl*.15));
  }
  col*=1.+.12*uKick;
  col+=vec3(1.)*exp(-max(uT-ev(3),0.)*10.)*step(ev(3),uT)*.5;
  fragColor=vec4(col,1.);
}`;

  // =====================================================================================
  // RAIN — the night train window. The train slows on "canceled", then the windowpanes.
  SH.rain = `
vec3 N13(float p){vec3 p3=fract(vec3(p)*vec3(.1031,.11369,.13787));p3+=dot(p3,p3.yzx+19.19);return fract(vec3((p3.x+p3.y)*p3.z,(p3.x+p3.z)*p3.y,(p3.y+p3.z)*p3.x));}
float N(float t){return fract(sin(t*12345.564)*7658.76);}
float Saw(float b,float t){return S(0.,b,t)*S(1.,b,t);}
vec2 DropLayer2(vec2 uv,float t){
  vec2 UV=uv; uv.y+=t*.75; vec2 a=vec2(6.,1.); vec2 grid=a*2.; vec2 id=floor(uv*grid);
  float colShift=N(id.x); uv.y+=colShift; id=floor(uv*grid); vec3 n=N13(id.x*35.2+id.y*2376.1); vec2 st=fract(uv*grid)-vec2(.5,0.);
  float x=n.x-.5; float y=UV.y*20.; float wiggle=sin(y+sin(y)); x+=wiggle*(.5-abs(x))*(n.z-.5); x*=.7;
  float ti=fract(t+n.z); y=(Saw(.85,ti)-.5)*.9+.5; vec2 p=vec2(x,y);
  float d=length((st-p)*a.yx); float mainDrop=S(.4,.0,d);
  float r=sqrt(S(1.,y,st.y)); float cd=abs(st.x-x); float trail=S(.23*r,.15*r*r,cd); float trailFront=S(-.02,.02,st.y-y); trail*=trailFront*r*r;
  y=UV.y; float trail2=S(.2*r,.0,cd); float droplets=max(0.,(sin(y*(1.-y)*120.)-st.y))*trail2*trailFront*n.z;
  y=fract(y*10.)+(st.y-.5); float dd=length(st-vec2(x,y)); droplets=S(.3,0.,dd);
  float m=mainDrop+droplets*r*trailFront;
  return vec2(m,trail);
}
float StaticDrops(vec2 uv,float t){uv*=40.;vec2 id=floor(uv);uv=fract(uv)-.5;vec3 n=N13(id.x*107.45+id.y*3543.654);vec2 p=(n.xy-.5)*.7;float d=length(uv-p);float fade=Saw(.025,fract(t+n.z));return S(.3,0.,d)*fract(n.z*10.)*fade;}
vec2 Drops(vec2 uv,float t,float l0,float l1,float l2){float s=StaticDrops(uv,t)*l0;vec2 m1=DropLayer2(uv,t)*l1;vec2 m2=DropLayer2(uv*1.85,t)*l2;float c=s+m1.x+m2.x;c=S(.3,1.,c);return vec2(c,max(m1.y*l0,m2.y*l1));}
float speedAt(float t){ return mix(1.,0.,S(ev(2)-.6,ev(3)+.4,t)); }
float travel(float t){ // integral of speed
  float a=ev(2)-.6, b=ev(3)+.4; float tt=min(t,a); float s=tt;
  if(t>a){ float k=min(t,b)-a; float L=b-a; s+=k-(k*k*k/(L*L))*.5+ (k*k*k*k/(L*L*L))*.25*0.; }
  return s; }
vec3 bokeh(vec2 uv,float blur){
  vec3 c=vec3(.008,.01,.02)+vec3(.03,.02,.05)*S(-.5,.5,uv.y);
  float x0=travel(uT)*1.4;
  for(int L=0;L<3;L++){
    float fl=float(L); float sp=1.+fl*1.4;
    vec2 q=vec2(uv.x+x0*sp*.5,uv.y+.1*fl)*(3.+fl*2.); vec2 id=floor(q); vec2 f=fract(q);
    for(int j=-1;j<=1;j++) for(int k=-1;k<=1;k++){
      vec2 idd=id+vec2(j,k); float r=h21(idd+fl*7.); if(r<.78) continue;
      vec2 o=vec2(j,k)+h22(idd+fl)*.8+.1;
      float rad=(.07+.11*h21(idd*3.))*(1.+blur*.8);
      vec3 lc=mix(vec3(1.,.55,.18),vec3(.35,.6,1.),step(.6,h21(idd+5.))); lc=mix(lc,vec3(1.,.2,.15),step(.92,h21(idd+9.)));
      float st=speedAt(uT)*(.5+fl*.6);
      vec2 dv=f-o; float dd=length(vec2(max(abs(dv.x)-st*.18,0.),dv.y));
      float ring=1.+.35*S(rad*.6,rad,dd);
      c+=lc*S(rad,rad*.6,dd)*ring*(.12+.3*(r-.78)*4.)/(1.+blur*.8)*(1.-fl*.25);
    }
  }
  return c;
}
void main(){
  vec2 uv=scr(gl_FragCoord.xy);
  float T=uT+uSong*0.;
  float rainAmt=.7;
  float t=T*.2;
  float staticDrops=S(-.5,1.,rainAmt)*2.; float l1=S(.25,.75,rainAmt); float l2=S(0.,.5,rainAmt);
  vec2 c=Drops(uv,t,staticDrops,l1,l2);
  vec2 e=vec2(.001,0.); float cx=Drops(uv+e,t,staticDrops,l1,l2).x; float cy=Drops(uv+e.yx,t,staticDrops,l1,l2).x;
  vec2 n=vec2(cx-c.x,cy-c.x);
  float focus=mix(1.,.15,sat(c.x+c.y*.5));
  vec3 col=bokeh(uv+n*1.2,focus);
  // window frame, and more panes on "same / same / different windowpane"
  float panes=1.+step(ev(4),uT)+2.*step(ev(5),uT)+5.*step(ev(6),uT);
  vec2 g=uv*vec2(1.,1.)*panes*.5; vec2 gf=abs(fract(g+.5)-.5);
  float mull=step(1.5,panes)*S(.012*panes,.006*panes,min(gf.x,gf.y)*1.);
  vec2 cell=floor(g+.5); float tint=h21(cell+panes);
  col*=mix(vec3(1.),mix(vec3(1.,.8,.6),vec3(.6,.8,1.),tint),step(2.5,panes)*.5);
  // inner window edge
  vec2 ed=abs(uv)-vec2(.82,.44); float frame=S(0.,.015,max(ed.x,ed.y));
  col=mix(col,vec3(.015,.012,.012)+vec3(.05,.04,.03)*S(.1,0.,max(ed.x,ed.y)),frame);
  col=mix(col,vec3(.01),mull);
  // reflection of the compartment light
  col+=vec3(.25,.18,.12)*.05*(1.-length(uv*vec2(.8,1.2)));
  col*=1.+.2*uSnare*speedAt(uT);
  fragColor=vec4(col,1.);
}`;

  // =====================================================================================
  // SCOPE — a green CRT oscilloscope: one more tweak, one more test (pre-chorus)
  SH.scope = `
vec2 curve(float s,float k){
  // lissajous whose ratio changes on each word
  float a=1.+floor(k), b=2.+mod(floor(k*1.7),3.); float ph=uT*.8+k;
  vec2 p=vec2(sin(a*s*TAU+ph),sin(b*s*TAU));
  // blend in the actual song envelope as a waveform on the trace
  float w=envAt(uSong-(1.-s)*.6).w-.4; p.y+=w*.5*S(.5,1.,fract(k*.5)+.4)*.0;
  return p*(.33+.05*uKick);
}
void main(){
  vec2 fc=gl_FragCoord.xy; vec2 uv=scr(fc);
  // barrel distortion of the tube
  vec2 c=uv*1.04; float r2=dot(c,c); c*=1.+r2*.12;
  float k=0.; for(int i=0;i<8;i++) k+=after(ev(i),.08);
  vec3 col=vec3(.0);
  // graticule
  vec2 g=abs(fract(c*vec2(5.,5.)+.5)-.5); float gr=S(.012,.0,min(g.x,g.y))*.25;
  vec2 tk=abs(fract(c*25.+.5)-.5); gr+=S(.03,0.,tk.x)*S(.03,0.,abs(c.y))*.3+S(.03,0.,tk.y)*S(.03,0.,abs(c.x))*.3;
  col+=vec3(.12,.35,.2)*gr;
  // trace with persistence: distance to polyline
  float d=1e3; vec2 prev=curve(0.,k);
  for(int i=1;i<=90;i++){ float s=float(i)/90.; vec2 cur=curve(s,k); d=min(d,sdSeg2(c,prev,cur)); prev=cur; }
  float beam=S(.006,.0,d)*1.5+exp(-d*60.)*.5+exp(-d*12.)*.12;
  // waveform line along the bottom from real envelope
  float wy=-.36+(envAt(uSong+c.x*.8).w-.3)*.25; float dw=abs(c.y-wy);
  beam+=(S(.004,0.,dw)+exp(-dw*80.)*.3)*.6;
  col+=vec3(.35,1.,.55)*beam*(1.+.6*uKick);
  // scanlines + phosphor mask
  col*=.82+.18*sin(fc.y*3.14159*.75);
  col*=.9+.1*sin(fc.x*3.14159*.66);
  // glass glare
  col+=vec3(.6,.8,.7)*.05*S(.6,0.,length(c-vec2(-.35,.25)));
  // tube edge
  vec2 e=abs(c)-vec2(.8,.47); float ed=max(e.x,e.y);
  col*=S(.02,-.02,ed);
  col+=vec3(.05,.06,.05)*S(.0,.03,ed)*S(.12,.03,ed);
  // building tension: flicker and brightness ramp into the chorus
  col*=1.+S(uDur-1.2,uDur,uT)*3.;
  col*=.94+.06*h11(floor(uSong*30.));
  fragColor=vec4(col,1.);
}`;

  // =====================================================================================
  // RINGS — the machine's little dance: a gyroscope of brass rings stepping on every beat.
  // v0 warm brass (chorus 1), v1 crimson (chorus 2)
  SH.rings = `
float stepAng(float beat,float off){ float b=beat+off; float i=floor(b); float f=fract(b); return (i+S(0.,.35,f))*1.5708; }
mat3 rx(float a){float c=cos(a),s=sin(a);return mat3(1,0,0,0,c,-s,0,s,c);}
mat3 ry(float a){float c=cos(a),s=sin(a);return mat3(c,0,s,0,1,0,-s,0,c);}
mat3 rz(float a){float c=cos(a),s=sin(a);return mat3(c,-s,0,s,c,0,0,0,1);}
vec2 map(vec3 p){
  vec2 r=vec2(1e3,0.);
  float bt=uBeat;
  for(int i=0;i<5;i++){
    float fi=float(i);
    float R=2.6-fi*.48;
    mat3 m=rx(stepAng(bt*.5,fi*.13)*(mod(fi,2.)*2.-1.)+fi)*ry(stepAng(bt*.25,fi*.37)+fi*.7)*rz(stepAng(bt*.5,.5+fi*.21)*.5);
    vec3 q=m*p;
    float d=sdTorus(q,vec2(R,.055+.012*fi));
    // engraved ticks
    float a=atan(q.z,q.x); d+=.008*S(.6,1.,abs(sin(a*36.)))*step(abs(q.y),.03);
    if(d<r.x) r=vec2(d,1.+fi);
  }
  // core
  float core=length(p)-.32-.04*uKick;
  if(core<r.x) r=vec2(core,10.);
  // ceiling (glass) appears for the second line
  return r;
}
vec3 nrm(vec3 p){vec2 e=vec2(.001,0.);return normalize(vec3(map(p+e.xyy).x-map(p-e.xyy).x,map(p+e.yxy).x-map(p-e.yxy).x,map(p+e.yyx).x-map(p-e.yyx).x));}
vec3 env(vec3 rd,vec3 warm){ return mix(vec3(.01,.01,.015),warm*.25,S(-.2,.8,rd.y))+warm*pow(sat(dot(rd,normalize(vec3(.3,1.,.2)))),18.)*2.; }
void main(){
  vec2 uv=scr(gl_FragCoord.xy);
  bool red=uVar>.5;
  vec3 warm=red?vec3(1.,.18,.12):vec3(1.,.62,.3);
  vec3 coreC=red?vec3(1.,.3,.25):vec3(1.,.75,.45);
  // camera: line 1 orbit; line 2 ("still hit a ceiling") looks up through the rings
  float l2=step(ev(2)-.2,uT);
  float a=uT*.25+uVar*1.3;
  vec3 ro=mix(vec3(sin(a)*6.5,1.2+.5*sin(uT*.3),cos(a)*6.5),vec3(sin(a)*1.6,-4.5,cos(a)*1.6),l2);
  vec3 ta=mix(vec3(0.),vec3(0.,4.,0.),l2);
  vec3 rd=lookAt(ro,ta,.05*sin(uT*.4))*normalize(vec3(uv,mix(1.8,1.3,l2)));
  float t=0.; vec2 h; vec3 p;
  for(int i=0;i<90;i++){ p=ro+rd*t; h=map(p); if(h.x<.001||t>20.) break; t+=h.x*.85; }
  vec3 col=env(rd,warm)*.5;
  // ceiling: a glass plane above, struck on "ceiling"
  float cy=3.2; float tc=(cy-ro.y)/rd.y;
  if(l2>.5&&tc>0.&&tc<t){
    vec3 cp=ro+rd*tc; vec2 g=abs(fract(cp.xz*.5)-.5);
    float grid=S(.02,.0,min(g.x,g.y));
    float hit=after(ev(3),.05); float cr=0.;
    float ang=atan(cp.z,cp.x); float rr=length(cp.xz);
    cr=S(.03,0.,abs(sin(ang*7.+fbm(vec2(rr*3.,ang))*3.)))*S(3.*hit+.01,0.,rr)*hit;
    col+=vec3(.6,.8,1.)*(grid*.25+cr*1.5)+vec3(.1,.15,.2)*.15;
    col+=coreC*exp(-rr*1.5)*hit*exp(-max(uT-ev(3),0.)*1.5)*3.;
  }
  if(t<20.){
    vec3 n=nrm(p);
    if(h.y>9.5){ col=coreC*3.5*(1.+uKick); }
    else{
      vec3 L=normalize(-p); float dl=length(p);
      vec3 base=red?vec3(.55,.2,.18):vec3(.8,.55,.3);
      if(mod(h.y,2.)<.5) base=red?vec3(.35,.35,.4):vec3(.7,.7,.72);
      float dif=sat(dot(n,L))/(1.+dl*dl*.15);
      vec3 rf=reflect(rd,n);
      float fr=pow(1.-sat(dot(-rd,n)),4.);
      col=base*coreC*dif*3.5+env(rf,warm)*base*1.2+fr*warm*.4;
      col+=coreC*pow(sat(dot(rf,L)),60.)*3./(1.+dl*.5);
      // rim light from behind
      col+=warm*pow(sat(dot(n,normalize(vec3(-.5,.6,-1.)))),4.)*.6;
    }
  }
  // volumetric glow around the core + god rays through the rings
  float glow=0.; vec3 gs=vec3(0.);
  float tm=min(t,14.);
  for(int i=0;i<24;i++){ float s=(float(i)+h21(gl_FragCoord.xy+uT))/24.*tm; vec3 q=ro+rd*s; float d=length(q);
    glow+=exp(-d*1.1)*(.5+.5*vn3(q*1.5+uT*.2)); }
  col+=coreC*glow/24.*tm*.25*(1.+uBass*.6);
  // dust sparkle
  col+=warm*step(.997,h21(floor(gl_FragCoord.xy*.5)+floor(uT*20.)))*.6*(1.-l2*.5);
  fragColor=vec4(col,1.);
}`;
})();
