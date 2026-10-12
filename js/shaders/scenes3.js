/* Moving Goalposts — shots, part 3 (bridge, final chorus, outro, title). */
(function () {
  const SH = (window.MGSH = window.MGSH || {});

  // =====================================================================================
  // MAP — "maybe the map's incomplete": a hand-tinted relief map that runs out into blank paper.
  SH.map = `
float known(vec2 p){
  float th=.38+.12*S(0.,uDur,uT)+.22*after(ev(4),1.2)+.08*after(ev(2),.8);
  return S(th-.04,th+.04,fbm(p*.035+vec2(3.,7.))+.25*S(40.,0.,length(p-vec2(0.,uT*3.))));
}
float terr(vec2 p){
  float h=fbm(p*.025)*1.;
  h+=.6*pow(1.-abs(fbm(p*.012+4.)*2.-1.),3.);
  h=h*14.-6.;
  return h*known(p);
}
void main(){
  vec2 uv=scr(gl_FragCoord.xy);
  vec3 ro=vec3(10.*sin(uT*.08),46.,-30.+uT*3.); vec3 ta=vec3(0.,0.,ro.z+38.);
  vec3 rd=lookAt(ro,ta,.08)*normalize(vec3(uv,1.6));
  float t=0.; vec3 p; bool hit=false;
  for(int i=0;i<120;i++){ p=ro+rd*t; float h=p.y-max(terr(p.xz),0.); if(h<.02){hit=true;break;} t+=h*.6; if(t>260.) break; }
  vec3 paper=vec3(.93,.88,.78);
  vec3 col=paper*.85;
  if(hit){
    float h=max(terr(p.xz),0.);
    vec2 e=vec2(.2,0.);
    vec3 n=normalize(vec3(terr(p.xz-e.xy)-terr(p.xz+e.xy),2.*e.x,terr(p.xz-e.yx)-terr(p.xz+e.yx)));
    float k=known(p.xz);
    // hypsometric tints
    vec3 tint=mix(vec3(.62,.72,.58),vec3(.82,.76,.55),S(0.,4.,h));
    tint=mix(tint,vec3(.7,.55,.4),S(4.,7.,h)); tint=mix(tint,vec3(.97,.95,.92),S(7.,8.5,h));
    // water where the land is low but known
    float sea=S(.2,0.,h)*k;
    tint=mix(tint,vec3(.6,.75,.8),sea*.8);
    float shade=.55+.6*sat(dot(n,normalize(vec3(-.6,.7,.3))));
    vec3 land=tint*shade;
    // contour lines, index every fifth
    float c=h*1.6; float cl=abs(fract(c)-.5); float w=fwidth(c);
    land=mix(land,vec3(.45,.3,.18),S(w*1.2,0.,cl-.5+w)*.0+S(1.5*w,0.,.5-cl)*.55*step(.05,h));
    float ci=abs(fract(c/5.)-.5); land=mix(land,vec3(.4,.25,.12),S(w*.5,0.,.5-ci)*.6*step(.05,h));
    // blank paper with a faint pencil grid where the map is unknown
    vec2 g=abs(fract(p.xz/10.)-.5); float grid=S(.02,0.,min(g.x,g.y));
    vec3 blank=paper*(.92+.08*fbm(p.xz*.5))-vec3(.08)*grid*.4;
    // hatched coastline of the unknown
    float edge=S(.5,.0,abs(k-.5)*6.);
    col=mix(blank,land,k);
    col=mix(col,vec3(.3,.22,.15),edge*.35*step(.5,fract((p.x+p.z)*1.5)));
    // the route: a dotted red line that stops where the map stops
    float rx=sin(p.z*.05)*8.+sin(p.z*.13)*3.;
    float dr=abs(p.x-rx);
    float dots=step(.5,fract(p.z*.35));
    float routeEnd=1.-S(.4,.1,k);
    col=mix(col,vec3(.75,.12,.1),S(.6,.3,dr)*dots*routeEnd*after(ev(0)-.5,.6));
    // you-are-here
    vec2 yah=vec2(sin((ro.z+30.)*.05)*8.+sin((ro.z+30.)*.13)*3.,ro.z+30.);
    float dy=length(p.xz-yah); col=mix(col,vec3(.8,.15,.1),S(1.2,.9,dy)); col=mix(col,vec3(.8,.15,.1),S(.3,0.,abs(dy-2.-fract(uT)*5.))*(1.-fract(uT))*.8);
    col=mix(col,paper*.9,1.-exp(-t*.004));
  }
  // paper grain + vignette like an old print
  col*=.92+.1*fbm(gl_FragCoord.xy*.35);
  col*=1.-.35*length(uv)*length(uv);
  fragColor=vec4(col*1.05,1.);
}`;

  // =====================================================================================
  // UNDER — sinking below the surface: no master switch underneath, only things you make glowing.
  SH.under = `
float jelly(vec2 p,float t,float sz,out float tent){
  p/=sz;
  float pulse=.85+.15*sin(t*3.);
  vec2 q=p*vec2(1./pulse,1.);
  float bell=length(q*vec2(1.,1.25))-.5; bell=max(bell,-q.y-.05);
  float rim=abs(bell)-.02;
  tent=1e3;
  for(int i=0;i<5;i++){ float x=-.36+float(i)*.18; vec2 a=vec2(x*pulse,-.05); float L=.9+.3*h11(float(i));
    float yy=-p.y-.05; if(yy>0.&&yy<L){ float xx=a.x+.08*sin(yy*7.-t*3.+float(i)); tent=min(tent,abs(p.x-xx)*(1.+yy)); } }
  tent*=sz;
  return min(bell,rim)*sz;
}
void main(){
  vec2 uv=scr(gl_FragCoord.xy);
  float depth=S(-.5,ev(2)+.5,uT); // 0 near surface .. 1 abyss
  vec3 deepC=mix(vec3(.02,.25,.35),vec3(.0,.01,.03),depth);
  vec3 col=mix(deepC*.4,deepC*1.4,S(-.6,.6,uv.y));
  // surface + snell window, seen while we are still shallow
  float surfY=.55+depth*1.5;
  float sw=S(.0,.3,uv.y-surfY+.25);
  float caus=pow(abs(sin(fbm(uv*vec2(3.,8.)+vec2(uT*.3,uT*.2))*12.)),8.);
  col+=vec3(.5,.85,.9)*sw*(1.-depth)*(.4+caus*.6);
  // god rays
  float rays=0.; for(int i=0;i<3;i++){ float fi=float(i); rays+=pow(fbm(vec2(uv.x*(3.+fi)+uv.y*.6+uT*.05*(fi+1.),fi*7.)),4.); }
  col+=vec3(.4,.8,.85)*rays*S(-.8,.6,uv.y)*(1.-depth)*.9;
  // marine snow drifting up
  for(int L=0;L<3;L++){ float fl=float(L); vec2 g=uv*(10.+fl*8.)+vec2(sin(uT*.2+fl),-uT*(.15+fl*.1)-uT*depth*.4); vec2 id=floor(g); vec2 f=fract(g)-.5; float r=h21(id+fl);
    col+=vec3(.7,.9,.95)*step(.85,r)*S(.06,.0,length(f))*(.4-fl*.1)*(1.-depth*.6); }
  // faint sparks drifting in the dark, even before anything is made
  { vec2 g=uv*14.+vec2(uT*.05,uT*.1); vec2 id=floor(g); float r=h21(id+9.); col+=vec3(.4,.7,.8)*step(.96,r)*S(.08,0.,length(fract(g)-.5))*.25*(.5+.5*sin(uT*2.+r*40.)); }
  // the master switch is not there: a faint outline that never lights up
  float sk=after(ev(1)-.2,.4)*(1.-after(ev(2),.5));
  vec2 sp=uv-vec2(0.,.0); float sw2=abs(sdRBox(vec3(sp,0.),vec3(.16,.08,1.),.08))-.002;
  col+=vec3(.5,.7,.8)*S(.004,0.,sw2)*sk*.5;
  // the things you keep making: bioluminescent jellies appear on each word
  vec3 jc[4]; jc[0]=vec3(.3,.9,1.); jc[1]=vec3(1.,.55,.25); jc[2]=vec3(.8,.4,1.); jc[3]=vec3(1.,.8,.4);
  vec2 jp[4]; jp[0]=vec2(-.55,.05); jp[1]=vec2(.45,.18); jp[2]=vec2(-.1,-.15); jp[3]=vec2(.25,-.3);
  for(int i=0;i<4;i++){
    float on=after(ev(3+i)-.05,.4);
    if(on<=0.) continue;
    vec2 c=jp[i]+vec2(.03*sin(uT*.7+float(i)),.04*(uT-ev(3+i))+.02*sin(uT*1.1+float(i)));
    float tent; float d=jelly(uv-c,uT+float(i),.16+.03*float(i),tent);
    vec3 cc=jc[i];
    col+=cc*on*(S(.004,0.,d)*1.2+exp(-max(d,0.)*18.)*.35+S(0.,-.08,d)*.25);
    col+=cc*on*S(.006,0.,tent)*.6*S(-.6,.0,uv.y-c.y+.4);
    col+=cc*on*exp(-length(uv-c)*4.)*.15*(1.+uBass);
  }
  // tiny glowing specks begin to fill the dark
  float sp2=after(ev(4),1.);
  vec2 g=uv*24.+vec2(0.,uT*.2); vec2 id=floor(g); float r=h21(id);
  col+=mix(vec3(.3,.9,1.),vec3(1.,.6,.3),h21(id+3.))*step(.97,r)*S(.12,0.,length(fract(g)-.5))*sp2*(.5+.5*sin(uT*3.+r*30.));
  fragColor=vec4(col,1.);
}`;

  // =====================================================================================
  // MEADOW — the same tree at night, a meadow of fireflies rising under the Milky Way.
  SH.meadow = `
void main(){
  vec2 uv=scr(gl_FragCoord.xy);
  vec2 q=uv+vec2(uT*.006,0.);
  vec3 col=mix(vec3(.01,.02,.05),vec3(.04,.07,.15),S(.5,-.3,uv.y));
  // milky way band
  vec2 mw=q*rot(-.5);
  float band=exp(-pow(mw.y*3.2,2.));
  float dust=fbm(mw*vec2(3.,8.)+2.);
  col+=vec3(.55,.5,.7)*band*pow(fbm(mw*5.),2.)*1.1;
  col-=vec3(.08)*band*S(.5,.75,dust);
  col+=vec3(.9,.7,.5)*band*pow(fbm(mw*12.+4.),5.)*1.4;
  // stars
  for(int L=0;L<2;L++){ vec2 g=q*(70.+float(L)*60.); vec2 id=floor(g); float r=h21(id+float(L)); vec2 f=fract(g)-.5;
    col+=vec3(.9,.92,1.)*step(.985-band*.02,r)*S(.25,0.,length(f))*(.5+.5*sin(uSong*3.+r*60.)); }
  // a shooting star
  float ss=fract(uT*.2); vec2 sp=vec2(.8-ss*1.6,.45-ss*.3); float dss=sdSeg2(uv,sp,sp+vec2(.15,.03)); col+=vec3(1.)*S(.003,0.,dss)*S(.1,.0,abs(ss-.4))*1.5;
  // far hills
  float h1=-.08+.05*sin(uv.x*2.+1.)+.02*fbm(vec2(uv.x*6.,0.));
  col=mix(col,vec3(.012,.018,.035),S(.003,0.,uv.y-h1));
  // the tree, as a silhouette
  vec2 tp=(uv-vec2(.42,h1-.02))/.42;
  if(tp.x>-1.&&tp.x<1.&&tp.y>0.&&tp.y<1.){ vec2 tuv=vec2(tp.x*.5+.5+.01*sin(uT)*tp.y*tp.y,tp.y*.92+.03); vec4 tx=texture(uTex,tuv);
    col=mix(col,vec3(.006,.008,.016),sat(S(.25,.6,tx.r)+S(.1,.4,tx.g*1.4))); }
  // meadow + grass silhouettes
  float g0=-.3+.03*sin(uv.x*3.);
  if(uv.y<g0) col=vec3(.006,.01,.012);
  for(int L=0;L<3;L++){ float fl=float(L); float x=uv.x*(60.+fl*40.)+fl*10.; float id=floor(x); float f=fract(x)-.5;
    float hh=g0-.02+(.04+.06*h11(id+fl*5.))*(1.+fl*.6)-fl*.06; float sway=.15*sin(uT*1.2+id*.3+fl);
    float blade=abs(f-sway*(hh-uv.y)*8.)-(.12*(hh-uv.y)/(.1));
    if(uv.y<hh&&blade<0.) col=vec3(.004,.007,.009); }
  // fireflies rising, more with the bass
  float dens=.86-.08*S(0.,uDur,uT)-.04*uBassS;
  for(int L=0;L<4;L++){
    float fl=float(L); float sc=6.+fl*5.;
    vec2 g=uv*sc+vec2(sin(uT*.3+fl)*.6,-uT*(.25+fl*.12));
    vec2 id=floor(g); vec2 f=fract(g)-.5; float r=h21(id+fl*17.);
    vec2 o=(h22(id+fl)-.5)*.6+vec2(sin(uT*2.+r*20.),cos(uT*1.7+r*13.))*.12;
    float d=length(f-o);
    float blink=pow(.5+.5*sin(uT*(2.+r*3.)+r*40.),3.)*(1.+uKick*.8);
    vec3 fc=mix(vec3(1.,.85,.35),vec3(.7,1.,.4),h21(id+5.));
    col+=fc*step(dens,r)*(S(.06,0.,d)*1.5+exp(-d*14.)*.25)*blink*(1.-fl*.15)*S(.6,-.2,uv.y)*2.;
  }
  fragColor=vec4(col,1.);
}`;

  // =====================================================================================
  // RIVER — the feed: a river of light that stalls, while lanterns rise on their own.
  SH.river = `
float flowAt(float t){ float a=.0,b=1.6; float tt=clamp(t,a,b); return t<a?t*5.:tt*5.-(tt*tt/(2.*b))*5.+(t>b?0.:0.); }
void main(){
  vec2 uv=scr(gl_FragCoord.xy);
  float hor=.12;
  vec3 col=mix(vec3(.05,.04,.08),vec3(.01,.01,.03),S(hor,.6,uv.y));
  col+=vec3(.25,.12,.08)*exp(-abs(uv.y-hor)*12.)*.4;
  // stars
  vec2 g=uv*120.; vec2 id=floor(g); col+=vec3(.9)*step(.993,h21(id))*S(.3,0.,length(fract(g)-.5))*S(hor,hor+.2,uv.y);
  // valley sides
  float ridge=hor+.04+.05*fbm(vec2(uv.x*3.,1.))+.15*pow(abs(uv.x),1.5);
  if(uv.y<ridge&&uv.y>hor-.02){ col=vec3(.008,.008,.014); }
  if(uv.y<hor){
    float z=.25/(hor-uv.y); float x=uv.x*z;
    float mean=sin(z*.35)*1.2+sin(z*.11)*2.;
    float w=.55+.02*z;
    float d=abs(x-mean);
    vec3 land=vec3(.01,.012,.015)*(.6+.6*fbm(vec2(x,z)*.8));
    col=land;
    // river of light trails: many thin streaks of colour flowing away
    float fl=flowAt(uT);
    float stall=S(.6,1.8,uT);
    vec3 tr=vec3(0.);
    for(int L=0;L<4;L++){ float fL=float(L); float lane=floor((x-mean)/w*10.+fL*.37); float r=h11(lane*1.3+fL*7.);
      float lx=fract((x-mean)/w*10.+fL*.37);
      float sg=fract(z*.06*(1.+r)-fl*(.25+r*.35)+r*5.);
      float streak=S(.0,.03,sg)*S(.7,.15,sg)*S(.5,.1,abs(lx-.5))*step(.3,r);
      tr+=mix(vec3(.4,.8,1.),mix(vec3(1.,.4,.7),vec3(1.,.8,.4),h11(lane*5.)),step(.6,r))*streak; }
    vec3 rc=mix(vec3(1.),vec3(.25),stall);
    col=mix(col,vec3(.01,.02,.04)+tr*rc*(1.6-stall*1.3),S(w,w*.85,d));
    col+=vec3(.3,.6,.9)*exp(-max(d-w,0.)*4.)*.1*(1.-stall*.7);
    col=mix(col,vec3(.03,.025,.04),1.-exp(-z*.012));
  }
  // lanterns rising from the banks — they carry themselves
  for(int i=0;i<34;i++){
    float fi=float(i);
    float t0=-1.+fi*.15+h11(fi*3.)*.3-(fi>12.?0.:.0);
    if(fi>14.) t0=ev(1)+(fi-14.)*.12;
    float age=uT-t0; if(age<0.) continue;
    float zz=6.+h11(fi*5.)*30.;
    float side=h11(fi*9.)<.5?-1.:1.;
    vec3 P=vec3(side*(1.+h11(fi*13.)*2.)+sin(zz*.35)*1.2,-1.2+age*(.35+h11(fi)*.25),zz-age*.2);
    P.x+=sin(age*.8+fi)*.15;
    vec2 sp=vec2(P.x,P.y)/P.z*.9+vec2(0.,hor-.0);
    sp.y=hor+(P.y+1.2-1.2)/P.z*.9-.25/P.z*0.;
    float size=.12/P.z;
    vec2 dd=(uv-sp)/vec2(size*.75,size);
    float body=length(max(abs(dd)-vec2(.4,.6),0.))-.25;
    float fl2=.85+.15*sin(uSong*8.+fi);
    vec3 lc=vec3(1.,.55,.2)*fl2;
    col+=lc*(S(.05,-.05,body)*1.8+exp(-length(uv-sp)/size*1.2)*.35)*S(0.,.6,age);
  }
  fragColor=vec4(col,1.);
}`;

  // =====================================================================================
  // INK — ink on paper: a goal drawn by hand; the line drawn, then dragged somewhere else.
  SH.ink = `
float stroke(vec2 p,vec2 a,vec2 b,float prog,float w){
  vec2 c=mix(a,b,prog); if(prog<=0.) return 1e3;
  float d=sdSeg2(p,a,c);
  float ww=w*(.7+.5*fbm(p*20.))*(1.-.3*S(.8,1.,dot(p-a,b-a)/dot(b-a,b-a)));
  return d-ww;
}
void main(){
  vec2 uv=scr(gl_FragCoord.xy);
  vec2 q=uv*rot(.04*sin(uT*.2))*(1.-uT*.015)+vec2(.02*uT,0.);
  // paper
  vec3 paper=vec3(.94,.9,.82)*(.93+.07*fbm(q*40.))*(.97+.03*fbm(q*200.));
  vec3 col=paper;
  vec3 inkC=vec3(.06,.07,.12);
  float ink=0.;
  // the goal, drawn in three strokes at the start
  float p1=S(0.,.6,uT), p2=S(.5,1.1,uT), p3=S(1.,1.6,uT);
  float d=min(min(stroke(q,vec2(-.42,-.1),vec2(-.42,.22),p1,.008),stroke(q,vec2(-.42,.22),vec2(.42,.22),p2,.008)),stroke(q,vec2(.42,.22),vec2(.42,-.1),p3,.008));
  ink=max(ink,S(.002,-.002,d));
  // the ink bleeds a little into the fibres
  ink=max(ink,S(.02,0.,d+.003*fbm(q*60.))*.25);
  // blots bloom on "change … change"
  for(int i=0;i<2;i++){ float tb=ev(i); float age=uT-tb; if(age<0.) continue;
    vec2 c=i==0?vec2(-.55,.3):vec2(.6,-.25); float r=.05+.06*(1.-exp(-age*3.));
    float dd=length(q-c)-r*(1.+.25*fbm((q-c)*18.+float(i)));
    ink=max(ink,S(.004,-.004,dd)*.9); ink=max(ink,S(.04,0.,dd)*.15);
    // splatter dots
    for(int k=0;k<8;k++){ vec2 o=(h22(vec2(float(k),float(i)))-.5)*.4; float ds=length(q-c-o)-.006*h11(float(k*3+i)); ink=max(ink,S(.002,-.002,ds)*step(.05,age)); }
  }
  // a watercolour bloom inside the goal: the work
  float wb=after(ev(1)+.2,1.5);
  float dw=length((q-vec2(0.,.03))*vec2(1.,1.2))-.08*wb*(1.+.3*fbm(q*10.+uT*.1));
  vec3 wc=vec3(1.,.55,.2);
  col=mix(col,col*mix(vec3(1.),wc,.65),S(.01,-.02,dw)*wb);
  col=mix(col,col*wc*.85,S(.006,0.,abs(dw))*wb*.6);
  // the line: drawn on "draws a line", then dragged on "moves the line"
  float lineY0=-.22, lineY1=-.36;
  float dl=S(ev(2),ev(3)+.2,uT);
  float mv=S(ev(4),ev(5)+.25,uT);
  float ly=mix(lineY0,lineY1,mv);
  float d2=stroke(q,vec2(-.7,ly),vec2(.7,ly+.01),dl,.006+.004*mv);
  ink=max(ink,S(.002,-.002,d2));
  // the smear left behind
  if(mv>0.){ float sm=step(q.y,lineY0+.01)*step(ly,q.y)*step(abs(q.x),.7)*(.25+.2*fbm(vec2(q.x*30.,q.y*3.))); ink=max(ink,sm*mv); }
  col=mix(col,inkC,ink);
  // soft page shadow + light
  col*=1.-.3*pow(length(uv*vec2(.9,1.2)),2.);
  col+=vec3(1.,.9,.7)*.04*S(.8,0.,length(uv-vec2(-.4,.3)));
  fragColor=vec4(col,1.);
}`;

  // =====================================================================================
  // PLANES — above the clouds at sunrise, paper planes everywhere: "I'll make what I mean"
  SH.planes = `
vec3 skyP(vec2 uv,vec2 sun){
  vec3 c=mix(vec3(1.,.55,.28),vec3(.12,.3,.65),S(-.1,.5,uv.y));
  float sd=length(uv-sun);
  c+=vec3(1.,.75,.45)*(exp(-sd*3.)*.6+exp(-sd*16.)*1.2)+vec3(1.,.95,.85)*S(.05,.04,sd)*4.;
  return c;
}
void main(){
  vec2 uv=scr(gl_FragCoord.xy);
  vec2 sun=vec2(-.25,.0+uT*.012);
  vec3 col=skyP(uv,sun);
  // high cirrus
  float ci=S(.5,.8,fbm(uv*vec2(2.,8.)+vec2(uT*.05,0.)))*S(.0,.4,uv.y);
  col=mix(col,vec3(1.,.85,.7),ci*.35);
  // cloud sea: three layers of lit cumulus tops
  for(int L=0;L<3;L++){
    float fl=float(L); float base=-.05-fl*.12; float sp=uT*(.04+fl*.05);
    float x=uv.x+sp;
    float top=base+.06*fbm(vec2(x*3.+fl*5.,fl))+.04*fbm(vec2(x*9.,fl+2.));
    if(uv.y<top){
      float dd=top-uv.y;
      vec3 cc=mix(vec3(1.,.82,.6),vec3(.55,.5,.6),S(0.,.15,dd));
      cc+=vec3(1.,.7,.4)*exp(-dd*30.)*.6*exp(-abs(x-sun.x-sp)*1.5);
      cc=mix(cc,col,.25-fl*.08);
      cc*=.9+.15*fbm(vec2(x*6.,uv.y*10.)+fl);
      col=cc;
    }
  }
  // paper planes: sprites, far to near
  for(int i=0;i<36;i++){
    float fi=float(i);
    float z=5.5-mod(fi,18.)*.27;      // far to near within each flock
    float launch=fi<18.?-3.+fi*.12:ev(2)+(fi-18.)*.08; // a second flock on "make"
    float age=uT-launch; if(age<0.) continue;
    float spd=.18+.1*h11(fi);
    vec2 p0=vec2(-1.4-h11(fi*3.)*.6,(h11(fi*5.)-.5)*.9);
    vec2 pos=p0+vec2(age*spd*(1.6/z+.4),sin(age*.9+fi)*.05+age*.03*(h11(fi*7.)-.3));
    pos.x=mod(pos.x+1.6,3.4)-1.6;
    float size=.16/z;
    float bank=.25*sin(age*1.1+fi)+.1;
    vec2 d=(uv-pos)*rot(bank)/size;
    vec2 tuv=d*.5+.5;
    if(tuv.x<0.||tuv.x>1.||tuv.y<0.||tuv.y>1.) continue;
    vec4 tx=texture(uTex,tuv);
    vec3 lit=vec3(1.,.9,.75)*1.3, shd=vec3(.32,.3,.42), fold=vec3(.85,.7,.6);
    vec3 pc=lit*tx.r+shd*tx.g+fold*tx.b;
    float a=max(tx.r,max(tx.g,tx.b));
    pc=mix(pc,col,S(1.,6.,z)*.45);
    col=mix(col,pc,a);
  }
  // flare when it "won't call" — and doesn't need to
  col+=vec3(1.,.7,.4)*exp(-length(uv-sun)*2.)*after(ev(4),.3)*exp(-max(uT-ev(4),0.)*.8)*1.2;
  fragColor=vec4(col,1.);
}`;

  // =====================================================================================
  // TITLE — dark, drifting smoke and a faint goal that keeps sliding.
  SH.title = `
void main(){
  vec2 uv=scr(gl_FragCoord.xy);
  vec3 col=vec3(.01,.01,.012);
  float sm=fbm(uv*2.+vec2(uT*.05,-uT*.03)); col+=vec3(.06,.05,.05)*pow(sm,3.)*1.5;
  // a thin goal outline drifting along the bottom
  vec2 g=uv-vec2(sin(uT*.6)*.3,-.33);
  float hw=.12,hh=.08;
  float d=min(min(sdSeg2(g,vec2(-hw,0.),vec2(-hw,hh)),sdSeg2(g,vec2(hw,0.),vec2(hw,hh))),sdSeg2(g,vec2(-hw,hh),vec2(hw,hh)));
  col+=vec3(.9,.85,.75)*S(.0025,0.,d)*.6*S(0.,1.5,uT);
  col+=vec3(1.,.55,.25)*exp(-length(uv-vec2(sin(uT*.6)*.3,-.31))*40.)*.8*S(1.,2.5,uT);
  fragColor=vec4(col,1.);
}`;
})();
