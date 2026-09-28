(function(W){
const OLG='#17251B',OLO='#2B2536';
let OL=OLG,OLW=10,LX=-.55,LY=-.83,MODE=null,seed=7;
const rnd=()=>{seed=(seed*16807)%2147483647;return seed/2147483647;};
const rgb=h=>[1,3,5].map(i=>parseInt(h.slice(i,i+2),16));
const hx=a=>'#'+a.map(v=>Math.max(0,Math.min(255,Math.round(v))).toString(16).padStart(2,'0')).join('');
const mixc=(h,t,k)=>hx(rgb(h).map((v,i)=>v+(t[i]-v)*k));
const grey=()=>MODE==='ombre';
const sh=(h,a)=>a>=0?mixc(h,grey()?[238,234,248]:[255,248,222],Math.min(a,.9)):mixc(h,grey()?[34,28,46]:[16,28,32],Math.min(-a,.9));
const T=h=>{if(!MODE||typeof h!=='string'||h.length!==7||h[0]!=='#')return h;if(MODE==='pale')return mixc(h,[238,240,234],.4);const[r,g,b]=rgb(h),L=.3*r+.59*g+.11*b,L2=56+L*.66;return hx([L2*.9+8,L2*.86+6,L2*.97+24]);};
const P=pts=>pts.map(p=>p[0].toFixed(1)+','+p[1].toFixed(1)).join(' ');
const add=(a,b)=>[a[0]+b[0],a[1]+b[1]],sub=(a,b)=>[a[0]-b[0],a[1]-b[1]],mul=(a,k)=>[a[0]*k,a[1]*k];
const nrm=a=>{const l=Math.hypot(a[0],a[1])||1;return[a[0]/l,a[1]/l];},perp=a=>[-a[1],a[0]],mid=(a,b)=>[(a[0]+b[0])/2,(a[1]+b[1])/2];
const ngon=(cx,cy,rx,ry,n,rot=0)=>Array.from({length:n},(_,i)=>{const t=rot+i*2*Math.PI/n;return[cx+Math.cos(t)*rx,cy+Math.sin(t)*ry];});
const limb=(a,b,wa,wb)=>{const n=perp(nrm(sub(b,a)));return[add(a,mul(n,wa/2)),add(b,mul(n,wb/2)),sub(b,mul(n,wb/2)),sub(a,mul(n,wa/2))];};
const R=(x,y,r,a)=>a.map(([u,v])=>[x+u*r,y+v*r]);
const mir=a=>a.map(([u,v])=>[-u,v]).reverse();
const rrect=(cx,cy,w,h,a)=>{const c=Math.cos(a),s=Math.sin(a);return[[-w/2,-h/2],[w/2,-h/2],[w/2,h/2],[-w/2,h/2]].map(([u,v])=>[cx+u*c-v*s,cy+u*s+v*c]);};
const pg=(pts,f,sw=3,op)=>`<polygon points="${P(pts)}" fill="${f}"${sw?` stroke="${OL}" stroke-width="${sw}" stroke-linejoin="round"`:''}${op!=null?` opacity="${op}"`:''}/>`;
const pl=(pts,w,c)=>`<polyline points="${P(pts)}" fill="none" stroke="${c||OL}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`;
const tri=(pts,f)=>`<polygon points="${P(pts)}" fill="${f}" stroke="${f}" stroke-width="0.8" stroke-linejoin="round"/>`;
function facets(pts,col){let cx=0,cy=0;pts.forEach(p=>{cx+=p[0];cy+=p[1];});cx/=pts.length;cy/=pts.length;
 const xs=pts.map(p=>p[0]),ys=pts.map(p=>p[1]);const m=Math.min(Math.max(...xs)-Math.min(...xs),Math.max(...ys)-Math.min(...ys))*.16;
 const c=[cx+LX*m,cy+LY*m];let s='';
 for(let i=0;i<pts.length;i++){const a=pts[i],b=pts[(i+1)%pts.length];const mx=(a[0]+b[0])/2-cx,my=(a[1]+b[1])/2-cy,l=Math.hypot(mx,my)||1;const d=(LX*mx+LY*my)/l;s+=tri([c,a,b],sh(col,(d>0?d*.2:d*.32)+(rnd()-.5)*.08));}
 return s;}
function parts(S){let sil='',body='';for(const q of S){if(q.raw!==undefined){body+=q.raw;continue;}const pp=P(q.p),c=T(q.c);
 if(q.sil!==false)sil+=`<polygon points="${pp}" fill="${OL}" stroke="${OL}" stroke-width="${OLW}" stroke-linejoin="round"/>`;
 body+=`<g${q.o!=null?` opacity="${q.o}"`:''}><polygon points="${pp}" fill="${c}" stroke="${q.sw===0?'none':OL}" stroke-width="${q.sw??4}" stroke-linejoin="round"/>${facets(q.p,c)}</g>`;}
 return sil+body;}
const wrap=(w,h,inner,op)=>`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}">${op?`<g opacity="${op}">`:''}${inner}${op?'</g>':''}</svg>`;
const glow=(S,x,y,r,c,op)=>S.push({p:ngon(x,y,r,r,12,.2),c,o:op,sil:false,sw:0});
const spark=(S,x,y,s,c)=>S.push({p:[[x,y-s],[x+s*.45,y],[x,y+s],[x-s*.45,y]],c,sw:3,sil:false});
const wisp=(S,x,y,s)=>S.push({p:[[x,y-s*1.6],[x+s*.55,y-s*.3],[x+s*.35,y+s*.5],[x-s*.35,y+s*.5],[x-s*.55,y-s*.3]],c:'#9A8FB4',o:.5,sil:false,sw:0});
const arm=(S,s,e,h,a)=>{const w=a.w;S.push({p:limb(s,e,w,w*.92),c:a.u});S.push({p:ngon(e[0],e[1],w*.5,w*.5,6),c:a.u});S.push({p:limb(e,h,w*.9,w*.8),c:a.l||a.u});S.push({p:ngon(h[0],h[1],a.hr,a.hr*1.05,7,.3),c:a.hand});};

// ---------- face ----------
const EXP={neutre:{e:'normal',b:'calm',m:'soft'},joie:{e:'happy',b:'joy',m:'open',bl:1},colere:{e:'narrow',b:'angry',m:'shout'},tristesse:{e:'normal',b:'sad',m:'frown',tear:1},surprise:{e:'wide',b:'high',m:'o'},determine:{e:'narrow',b:'stern',m:'firm'},vide:{e:'empty',b:'flat',m:'flat'},apaise:{e:'closed',b:'calm',m:'soft',bl:1},malin:{e:'half',b:'sly',m:'smirk'}};
const BR={calm:[[-.2,.02],[.18,-.04],[-.18,-.04],[.2,.02]],joy:[[-.2,-.04],[.16,-.11],[-.16,-.11],[.2,-.04]],angry:[[-.2,-.1],[.16,.08],[-.16,.08],[.2,-.1]],sad:[[-.2,.07],[.16,-.09],[-.16,-.09],[.2,.07]],high:[[-.2,-.13],[.16,-.18],[-.16,-.18],[.2,-.13]],stern:[[-.21,-.03],[.17,.06],[-.17,.06],[.21,-.03]],flat:[[-.2,.03],[.17,.03],[-.17,.03],[.2,.03]],sly:[[-.2,-.08],[.16,.07],[-.16,-.07],[.21,-.13]]};
function face(x,y,r,C,ex){
 const X=EXP[ex]||EXP.neutre,off=C.off??.06,fx=x+r*off,ey=y+r*(C.eyeY??.06),sp=C.eyeDX??.33,e1=fx-r*sp,e2=fx+r*sp;
 const skin=T(C.skin),lid=T(C.mask||C.skin),dk=T('#5B1E22'),wh=T('#FFFDF6'),iris=T(C.iris||'#3A2E28');let s='';
 if(!C.noNose)s+=C.nose==='big'?pg([[fx+r*.02,y+r*.1],[fx+r*.2,y+r*.36],[fx-r*.16,y+r*.38]],sh(skin,-.18),2.5):pg([[fx+r*.02,y+r*.18],[fx+r*.14,y+r*.34],[fx-r*.06,y+r*.35]],sh(skin,-.22),0);
 if(X.bl||C.blush)s+=pg(ngon(e1-r*.04,ey+r*.3,r*.13,r*.07,6),T('#FF5A3C'),0,.4)+pg(ngon(e2+r*.06,ey+r*.3,r*.13,r*.07,6),T('#FF5A3C'),0,.4);
 if(C.freckles)[[-.1,0],[.05,.05],[-.02,.1]].forEach(([u,v])=>{s+=pg(ngon(e1+u*r,ey+r*.3+v*r,r*.03,r*.03,5),sh(skin,-.4),0)+pg(ngon(e2-u*r,ey+r*.3+v*r,r*.03,r*.03,5),sh(skin,-.4),0);});
 const rx=r*.15,ry=r*.2;
 const eye=(q,k)=>{
  if(k==='happy')return pl([[q-rx,ey+ry*.3],[q,ey-ry*.45],[q+rx,ey+ry*.3]],r*.1);
  if(k==='closed')return pl([[q-rx,ey],[q,ey+ry*.4],[q+rx,ey]],r*.09);
  const kv=k==='narrow'?.6:k==='wide'?1.22:1,kh=k==='wide'?1.15:1;
  let t=pg(ngon(q,ey,rx*kh,ry*kv,8,Math.PI/2),k==='empty'?T('#E4DEEE'):wh,3);
  if(k==='empty'){t+=pg(ngon(q,ey+ry*.2,rx*.5,ry*.4,7),T('#B6ACCB'),0);t+=pg([[q-rx-2,ey-ry-3],[q+rx+2,ey-ry-3],[q+rx+2,ey-ry*.15],[q-rx-2,ey-ry*.15]],lid,0)+pl([[q-rx-1,ey-ry*.15],[q+rx+1,ey-ry*.15]],3.5);return t;}
  const pr=Math.min(rx*kh,ry*kv)*(k==='wide'?.55:.74),px=q+r*.03*(off>0?1:0),py=ey+ry*kv*.05;
  t+=pg(ngon(px,py,pr,pr*1.1,6,Math.PI/6),iris,0)+pg(ngon(px,py,pr*.5,pr*.55,6),OL,0)+pg(ngon(px+pr*.35,py-pr*.4,pr*.32,pr*.32,5),'#FFFFFF',0);
  if(k==='half')t+=pg([[q-rx-2,ey-ry-3],[q+rx+2,ey-ry-3],[q+rx+2,ey-ry*.15],[q-rx-2,ey+ry*.05]],lid,0)+pl([[q-rx-2,ey+ry*.05],[q+rx+2,ey-ry*.15]],3.5);
  return t;};
 s+=eye(e1,X.e)+eye(e2,X.e);
 if(C.old){const wc=sh(skin,-.3);[[[e1-r*.22,ey+r*.02],[e1-r*.32,ey-r*.04]],[[e1-r*.22,ey+r*.1],[e1-r*.31,ey+r*.15]],[[e2+r*.22,ey+r*.02],[e2+r*.32,ey-r*.04]],[[e2+r*.22,ey+r*.1],[e2+r*.31,ey+r*.15]],[[fx-r*.22,y-r*.5],[fx+r*.2,y-r*.52]],[[fx-r*.14,y-r*.62],[fx+r*.12,y-r*.63]],[[fx-r*.2,y+r*.36],[fx-r*.3,y+r*.54]],[[fx+r*.22,y+r*.36],[fx+r*.32,y+r*.54]]].forEach(l=>s+=pl(l,2.2,wc));}
 const B=BR[X.b],by=ey-r*.34,bw=C.old?r*.2:r*.13,bc=T(C.browCol||'#2A2320');
 const brow=(a,b)=>pg(limb(a,b,bw,bw*.75),bc,2.5);
 s+=brow([e1+B[0][0]*r,by+B[0][1]*r],[e1+B[1][0]*r,by+B[1][1]*r])+brow([e2+B[2][0]*r,by+B[2][1]*r],[e2+B[3][0]*r,by+B[3][1]*r]);
 if(X.tear)s+=pg([[e2+r*.12,ey+r*.2],[e2+r*.19,ey+r*.34],[e2+r*.12,ey+r*.41],[e2+r*.05,ey+r*.34]],T('#8FD3F4'),2.5);
 if(C.glasses){s+=[e1,e2].map(e=>`<polygon points="${P(ngon(e,ey,r*.25,r*.25,10))}" fill="#FFFFFF" fill-opacity=".22" stroke="${OL}" stroke-width="${r*.065}" stroke-linejoin="round"/>`).join('')+pl([[e1+r*.25,ey],[e2-r*.25,ey]],r*.055)+pl([[e1-r*.25,ey],[x-r*.94,ey-r*.04]],r*.05)+pl([[e2+r*.25,ey],[x+r*.96,ey-r*.04]],r*.05);}
 const mx=fx,my=y+r*(C.mouthY??.54);let m='';const lw=r*.085;
 switch(X.m){
  case'soft':m=pl([[mx-r*.2,my-r*.02],[mx,my+r*.08],[mx+r*.2,my-r*.03]],lw);break;
  case'flat':m=pl([[mx-r*.15,my+r*.05],[mx,my+r*.035],[mx+r*.15,my+r*.06]],r*.07);break;
  case'frown':m=pl([[mx-r*.18,my+r*.09],[mx,my],[mx+r*.18,my+r*.08]],lw);break;
  case'o':m=pg(ngon(mx,my+r*.06,r*.1,r*.13,7),dk,3.5);break;
  case'open':m=pg([[mx-r*.3,my-r*.1],[mx+r*.3,my-r*.12],[mx+r*.22,my+r*.16],[mx,my+r*.27],[mx-r*.22,my+r*.17]],dk,3.5)+pg(ngon(mx+r*.01,my+r*.15,r*.14,r*.08,6),T('#FF7A62'),0)+pg([[mx-r*.26,my-r*.09],[mx+r*.27,my-r*.11],[mx+r*.24,my-r*.02],[mx-r*.24,my]],wh,0);break;
  case'shout':m=pg([[mx-r*.28,my-r*.06],[mx+r*.28,my-r*.08],[mx+r*.2,my+r*.2],[mx-r*.2,my+r*.21]],dk,3.5)+pg([[mx-r*.25,my-r*.05],[mx+r*.25,my-r*.07],[mx+r*.24,my+r*.02],[mx-r*.24,my+r*.03]],wh,0)+pg([[mx-r*.12,my+r*.2],[mx+r*.12,my+r*.19],[mx+r*.1,my+r*.13],[mx-r*.1,my+r*.14]],T('#FF7A62'),0);break;
  case'firm':m=pl([[mx-r*.2,my+r*.06],[mx,my+r*.02],[mx+r*.2,my+r*.04],[mx+r*.26,my-r*.02]],lw);break;
  case'smirk':m=pl([[mx-r*.2,my+r*.04],[mx+r*.06,my+r*.05],[mx+r*.27,my-r*.09]],lw);break;}
 return{up:s,mouth:m};}

// ---------- head ----------
const HB={long:[[-1.05,-.2],[-.92,-.86],[0,-1.14],[.92,-.86],[1.05,-.2],[1.14,1.3],[.62,1.48],[-.62,1.48],[-1.14,1.3]],longlow:[[-1.02,-.35],[-.8,-.7],[.8,-.7],[1.02,-.35],[1.14,1.3],[.62,1.48],[-.62,1.48],[-1.14,1.3]],mid:[[-1.05,-.2],[-.92,-.86],[0,-1.14],[.92,-.86],[1.05,-.2],[1.1,.85],[.6,.98],[-.6,.98],[-1.1,.85]],midlow:[[-1.02,-.35],[-.8,-.7],[.8,-.7],[1.02,-.35],[1.1,.85],[.6,.98],[-.6,.98],[-1.1,.85]],short:[[-1.04,.25],[-1.0,-.6],[-.5,-1.08],[.3,-1.12],[.92,-.8],[1.06,-.1],[1.03,.3],[-1.03,.3]]};
const HF={side:[[-.98,-.02],[-.92,-.7],[-.3,-1.1],[.5,-1.04],[.98,-.5],[.99,-.02],[.74,-.42],[.2,-.52],[-.3,-.38],[-.72,-.22]],fringe:[[-.99,.05],[-.95,-.65],[-.4,-1.1],[.4,-1.1],[.95,-.65],[.99,.05],[.8,-.28],[.5,-.36],[.35,-.22],[.05,-.38],[-.2,-.24],[-.45,-.38],[-.8,-.28]],messy:[[-1.0,0],[-1.08,-.6],[-.8,-.72],[-.8,-1.04],[-.4,-.95],[-.22,-1.24],[.12,-1.0],[.46,-1.2],[.6,-.9],[1.0,-.9],[.9,-.6],[1.08,-.3],[.99,0],[.8,-.34],[.4,-.5],[.1,-.36],[-.3,-.5],[-.7,-.32]],crop:[[-.98,-.1],[-.9,-.72],[-.3,-1.08],[.4,-1.06],[.92,-.7],[.98,-.1],[.86,-.5],[.2,-.62],[-.5,-.6],[-.86,-.46]],strand:[[-.72,-.55],[-.1,-.76],[.35,-.62],[-.15,-.36],[-.62,.05]]};
const HOODB=[[-1.28,.75],[-1.22,-.55],[-.55,-1.3],[.45,-1.34],[1.18,-.68],[1.28,.75],[1.55,1.6],[-1.55,1.6]];
const HOODF=[[-1.04,.3],[-.98,-.58],[-.3,-1.1],[.4,-1.1],[1.0,-.54],[1.04,.3],[.86,-.26],[.3,-.62],[-.4,-.6],[-.86,-.28]];
const isHood=h=>h==='hood'||h==='nurse'||h==='cathood';
function headBack(S,x,y,r,C){const h=C.hair||{},hat=C.hat;
 if(hat==='cathood'){const e=[[-.98,-.62],[-.92,-1.66],[-.3,-1.12]];S.push({p:R(x,y,r,e),c:C.hatC});S.push({p:R(x,y,r,mir(e)),c:C.hatC});}
 if(isHood(hat))S.push({p:R(x,y,r,HOODB),c:C.hatC});
 if(hat==='helmet')S.push({p:R(x,y,r,[[-.14,-1.05],[-.26,-1.52],[.3,-1.72],[.95,-1.45],[1.22,-.9],[.7,-1.05]]),c:C.hatC2});
 if(!h.back||h.back==='none')return;
 S.push({p:R(x,y,r,HB[h.back]||HB.short),c:h.c});
 if(h.back==='bun')S.push({p:ngon(x+r*.05,y-r*1.14,r*.42,r*.36,8),c:h.c});
 if(h.back==='pony')S.push({p:R(x,y,r,[[-.7,-.7],[-1.25,-.55],[-1.55,-.05],[-1.4,.55],[-1.2,.1],[-.9,-.25]]),c:h.c});
 if(h.back==='buns2'){S.push({p:ngon(x-r*.78,y-r*.88,r*.34,r*.34,7),c:h.c});S.push({p:ngon(x+r*.84,y-r*.9,r*.34,r*.34,7),c:h.c});}}
function headFront(S,x,y,r,C,ex){const hat=C.hat,off=C.off??.06,h=C.hair||{};
 if(!isHood(hat)&&hat!=='helmet'){S.push({p:ngon(x-r*.95,y+r*.12,r*.19,r*.26,6),c:C.skin});S.push({p:ngon(x+r*.97,y+r*.12,r*.19,r*.26,6),c:C.skin});}
 const hp=ngon(x,y,r,r*1.02,10,Math.PI/2);hp[0]=[x+r*off*.5,y+r*1.1];S.push({p:hp,c:C.skin});
 if(C.mask)S.push({p:R(x+r*off,y,r,[[-.94,-.16],[-.5,-.3],[0,-.16],[.5,-.3],[.94,-.16],[.88,.22],[.42,.3],[.12,.18],[-.12,.18],[-.42,.3],[-.88,.22]]),c:C.mask,sw:3});
 const f=face(x,y,r,C,ex);S.push({raw:f.up});
 const bx=x+r*off,bc=C.beardC||h.c;
 if(C.beard==='long')S.push({p:R(bx,y,r,[[-.94,.05],[-.7,.44],[-.3,.7],[.3,.7],[.7,.44],[.94,.05],[.9,.7],[.6,1.3],[.2,1.75],[0,1.95],[-.25,1.7],[-.6,1.3],[-.9,.7]]),c:bc});
 if(C.beard==='full')S.push({p:R(bx,y,r,[[-.97,0],[-.8,.46],[-.3,.72],[.3,.72],[.8,.46],[.97,0],[.95,.6],[.6,1.06],[0,1.26],[-.6,1.06],[-.95,.6]]),c:bc});
 S.push({raw:f.mouth});
 if(C.mustache){const L=[[.02,.35],[-.1,.3],[-.42,.36],[-.62,.62],[-.32,.54],[.02,.48]];S.push({p:R(bx,y,r,L),c:bc,sw:3});S.push({p:R(bx,y,r,mir(L)),c:bc,sw:3});}
 if(h.back==='braids')[-1,1].forEach(sg=>{for(let i=0;i<4;i++)S.push({p:ngon(x+sg*(1.0+i*.05)*r,y+(.35+i*.3)*r,r*.2,r*.17,6),c:h.c});const bxx=x+sg*1.15*r,byy=y+1.55*r;S.push({p:[[bxx-r*.2,byy-r*.12],[bxx,byy],[bxx-r*.2,byy+r*.12]],c:C.ribbon||'#FF5A3C',sw:3});S.push({p:[[bxx+r*.2,byy-r*.12],[bxx,byy],[bxx+r*.2,byy+r*.12]],c:C.ribbon||'#FF5A3C',sw:3});});
 if(h.front==='receding'){const L=[[-1.03,.18],[-1.07,-.4],[-.84,-.74],[-.6,-.7],[-.8,-.34],[-.86,.1]];S.push({p:R(x,y,r,L),c:h.c});S.push({p:R(x,y,r,mir(L)),c:h.c});}
 else if(HF[h.front])S.push({p:R(x,y,r,HF[h.front]),c:h.c});
 if(isHood(hat)){S.push({p:R(x,y,r,HOODF),c:C.hatC});if(hat==='nurse'){const cx=x+r*.05,cy=y-r*.86,k=r*.07;S.push({p:[[cx-k,cy-3*k],[cx+k,cy-3*k],[cx+k,cy-k],[cx+3*k,cy-k],[cx+3*k,cy+k],[cx+k,cy+k],[cx+k,cy+3*k],[cx-k,cy+3*k],[cx-k,cy+k],[cx-3*k,cy+k],[cx-3*k,cy-k],[cx-k,cy-k]],c:C.cross||'#FF5A3C',sw:3});}}
 if(hat==='straw'||hat==='wide'){const bw=hat==='wide'?1.8:1.55,cy=y-r*.6,brim=ngon(x,cy,r*bw,r*.34,14);S.push({p:brim,c:C.hatC});S.push({p:R(x,y,r,[[-.72,-.6],[-.62,-1.3],[-.1,-1.42],[.62,-1.34],[.74,-.6]]),c:C.hatC});S.push({p:R(x,y,r,[[-.7,-.84],[.72,-.84],[.74,-.64],[-.72,-.64]]),c:C.hatC2,sw:3});S.push({p:brim.slice(0,8),c:C.hatC});if(C.hatDeco)C.hatDeco(S,x,y,r);}
 if(hat==='band'){S.push({p:limb([x-r*1.0,y-r*.5],[x+r*1.0,y-r*.58],r*.17,r*.17),c:C.hatC,sw:3});S.push({p:R(x,y,r,[[-.96,-.5],[-1.36,-.32],[-1.3,-.16]]),c:C.hatC,sw:3});S.push({p:R(x,y,r,[[-.96,-.46],[-1.28,-.04],[-1.12,.04]]),c:C.hatC,sw:3});}
 if(hat==='witch'){const cy=y-r*.62,brim=ngon(x,cy,r*1.6,r*.3,14);S.push({p:brim,c:C.hatC});S.push({p:R(x,y,r,[[-.68,-.64],[-.36,-1.28],[.2,-1.56],[1.05,-1.66],[.44,-1.2],[.7,-.64]]),c:C.hatC});S.push({p:R(x,y,r,[[-.68,-.84],[.7,-.84],[.7,-.64],[-.68,-.64]]),c:C.hatC2,sw:3});S.push({p:brim.slice(0,8),c:C.hatC});}
 if(hat==='cap'){S.push({p:R(x,y,r,[[-.99,-.3],[-.92,-.84],[-.3,-1.16],[.4,-1.14],[.93,-.8],[1.0,-.3]]),c:C.hatC});S.push({p:R(x,y,r,[[.1,-.36],[1.0,-.34],[1.52,-.22],[1.44,-.06],[.3,-.2]]),c:C.hatC});S.push({p:ngon(x-r*.1,y-r*.72,r*.14,r*.12,6),c:C.hatC2||'#FFD23F',sw:3});}
 if(hat==='helmet'){S.push({p:R(x,y,r,[[-1.08,.38],[-1.06,-.5],[-.55,-1.14],[.55,-1.14],[1.06,-.5],[1.08,.38],[.86,.38],[.82,-.3],[.3,-.5],[-.3,-.5],[-.82,-.3],[-.86,.38]]),c:C.hatC});S.push({p:R(x,y,r,[[-.94,-.62],[.94,-.62],[.9,-.46],[-.9,-.46]]),c:C.hatC3||'#D9A62A',sw:3});}}

// ---------- bust ----------
function bust(S,C){const bw=C.bw||1,X=u=>128+(u-128)*bw,top=C.hunch?190:180,o=C.outfit,oc=C.outC;
 if(C.hunch)S.push({p:[[X(66),top+14],[X(90),top-30],[128,top-40],[X(166),top-30],[X(190),top+14]],c:C.top});
 S.push({p:limb([128,150],[128,top+6],38*(C.neck||1),40*(C.neck||1)),c:C.skin});
 S.push({p:[[X(28),264],[X(38),214],[X(76),top+2],[128,top-4],[X(180),top+2],[X(218),214],[X(228),264]],c:C.top});
 const sign=(k,x,y)=>{if(k===0)S.push({p:[[x,y-7],[x+7,y+5],[x-7,y+5]],c:'#FF8C32',sw:2.5});else if(k===1)S.push({p:ngon(x,y,6.5,6.5,8),c:'#3DDC5B',sw:2.5});else S.push({p:ngon(x,y,3.6,3.6,6),c:'#FF5A3C',sw:2});};
 if(o==='robe'){S.push({p:limb([X(100),top+2],[128,246],15,13),c:oc});S.push({p:limb([X(156),top+2],[128,246],15,13),c:oc});S.push({p:limb([X(30),250],[X(226),250],18,18),c:oc});for(let i=0;i<9;i++)sign(i%3,X(44+i*21),250);sign(0,X(64),222);sign(1,X(192),222);}
 if(o==='robe2')S.push({p:[[X(100),top],[128,top+26],[X(156),top],[128,top+10]],c:oc});
 if(o==='apron'){S.push({p:limb([X(104),204],[X(86),top+4],9,9),c:oc});S.push({p:limb([X(152),204],[X(170),top+4],9,9),c:oc});S.push({p:[[X(98),204],[X(158),204],[X(164),264],[X(92),264]],c:oc});[[X(104),212],[X(152),212]].forEach(([x,y])=>S.push({p:ngon(x,y,4,4,6),c:'#D9A62A',sw:2}));}
 if(o==='armor'){S.push({p:[[X(90),200],[X(166),200],[X(172),264],[X(84),264]],c:'#B7C3CE'});S.push({p:limb([128,206],[128,262],7,7),c:oc,sw:3});S.push({p:ngon(X(56),210,32,24,8),c:C.top});S.push({p:ngon(X(200),210,32,24,8),c:C.top});S.push({p:ngon(128,top+2,34,12,8),c:oc});}
 if(o==='overalls'){S.push({p:limb([X(106),210],[X(90),top+4],10,10),c:oc});S.push({p:limb([X(150),210],[X(166),top+4],10,10),c:oc});S.push({p:[[X(100),208],[X(156),208],[X(160),264],[X(96),264]],c:oc});[[X(106),216],[X(150),216]].forEach(([x,y])=>S.push({p:ngon(x,y,5,5,6),c:'#FFD23F',sw:2}));S.push({p:[[X(116),228],[X(140),228],[X(138),246],[X(118),246]],c:oc,sw:3});}
 if(o==='coat'){S.push({p:[[X(84),top+4],[X(88),top-24],[X(112),top-10],[128,top+6],[X(144),top-10],[X(168),top-24],[X(172),top+4]],c:C.top});S.push({p:[[128,252],[X(104),top],[X(88),top+10],[X(102),216]],c:oc});S.push({p:[[128,252],[X(152),top],[X(168),top+10],[X(154),216]],c:oc});S.push({p:ngon(X(142),240,5,5,6),c:'#D9A62A',sw:2});}
 if(o==='cloak'){S.push({p:[[128,top+14],[X(64),264],[X(98),264]],c:C.top,sw:3});S.push({p:[[128,top+14],[X(158),264],[X(192),264]],c:C.top,sw:3});S.push({p:ngon(128,top+14,11,11,6),c:oc});}
 if(o==='shawl'){S.push({p:[[X(32),244],[X(42),208],[X(80),top],[128,top+10],[X(176),top],[X(214),208],[X(224),244],[X(160),236],[128,254],[X(96),236]],c:oc});S.push({p:ngon(128,top+34,12,10,6),c:oc});}
 if(o==='vest'){const L=[[X(34),264],[X(42),214],[X(78),top+4],[X(112),204],[X(110),264]];S.push({p:L,c:oc});S.push({p:L.map(([x,y])=>[256-x,y]),c:oc});S.push({p:[[X(58),234],[X(80),232],[X(82),250],[X(60),252]],c:C.patch||'#FF8C32',sw:3});}
 if(o==='scarf'){S.push({p:[[X(150),top+10],[X(182),top+32],[X(174),252],[X(156),252],[X(154),top+30]],c:oc});S.push({p:ngon(128,top+4,48,16,8),c:oc});}
 if(o==='cardigan'){S.push({p:[[X(106),top-2],[X(150),top-2],[128,246]],c:oc});S.push({p:[[X(112),top+2],[128,top+10],[X(112),top+18]],c:C.accent||'#1F7A3D',sw:3});S.push({p:[[X(144),top+2],[128,top+10],[X(144),top+18]],c:C.accent||'#1F7A3D',sw:3});}}

// ---------- items ----------
function sword(S,h,tip,a){const d=nrm(sub(tip,h)),n=perp(d),b=add(h,mul(d,12)),t0=sub(tip,mul(d,a.bw*1.4)),g=a.grip||18;
 S.push({p:limb(add(h,mul(d,10)),sub(h,mul(d,g)),8,8),c:'#5C3A22'});
 S.push({p:[add(b,mul(n,a.bw/2)),add(t0,mul(n,a.bw*.42)),tip,sub(t0,mul(n,a.bw*.42)),sub(b,mul(n,a.bw/2))],c:a.col||'#DCE5EC'});
 S.push({raw:pg([add(b,mul(n,a.bw*.12)),add(t0,mul(n,a.bw*.1)),sub(t0,mul(n,a.bw*.05)),sub(b,mul(n,a.bw*.05))],T('#FFFFFF'),0,.6)});
 if(a.crack){const L=(t,o)=>add(add(b,mul(sub(t0,b),t)),mul(n,o*a.bw));S.push({raw:pl([L(.08,.05),L(.22,-.22),L(.36,.16),L(.5,-.12),L(.64,.22),L(.78,-.06),L(.92,.12)],3.2)+pl([L(.22,-.22),L(.28,-.44)],2.2)+pl([L(.5,-.12),L(.57,.4)],2.2)+pl([L(.64,.22),L(.7,-.38)],2.2)+pl([L(.36,.16),L(.4,.44)],2)});}
 if(a.guard)S.push({p:limb(sub(b,mul(n,a.guard)),add(b,mul(n,a.guard)),9,9),c:a.gc||'#D9A62A'});
 const pm=sub(h,mul(d,g+4));S.push({p:ngon(pm[0],pm[1],7,7,6),c:a.gc||'#D9A62A'});}
function hammer(S,hand,head,hw,hh){const d=nrm(sub(head,hand)),n=perp(d);S.push({p:limb(sub(hand,mul(d,16)),head,12,14),c:'#5C3A22'});
 const q=(u,v)=>add(add(head,mul(n,u)),mul(d,v)),k=.28;
 S.push({p:[q(-hw,-hh*(1-k)),q(-hw*(1-k),-hh),q(hw*(1-k),-hh),q(hw,-hh*(1-k)),q(hw,hh*(1-k)),q(hw*(1-k),hh),q(-hw*(1-k),hh),q(-hw,hh*(1-k))],c:'#8E8A80'});
 S.push({p:[q(-hw*.18,-hh),q(hw*.18,-hh),q(hw*.18,hh),q(-hw*.18,hh)],c:'#6E6A62',sw:3});}
function pitchfork(S,a,top){const d=nrm(sub(top,a)),n=perp(d);S.push({p:limb(a,top,8,8),c:'#8A5530'});S.push({p:limb(add(top,mul(n,-22)),add(top,mul(n,22)),8,8),c:'#8E97A0'});
 [-18,0,18].forEach(o=>{const b=add(top,mul(n,o));S.push({p:[add(b,mul(n,-5)),add(b,mul(d,40)),add(b,mul(n,5))],c:'#AEB6BE',sw:3});});}
function bow(S,cx,cy,h,bulge,col){const p=[];for(let i=0;i<=6;i++){const t=-Math.PI/2+i*Math.PI/6;p.push([cx+bulge*Math.cos(t),cy+h/2*Math.sin(t)]);}
 for(let i=0;i<6;i++)S.push({p:limb(p[i],p[i+1],10,10),c:col});S.push({raw:pl([p[0],p[6]],2.4,T('#F8EED6'))});}
function lantern(S,x,y,s){glow(S,x,y+s*.3,s*1.7,'#FFE9A8',.35);S.push({raw:pl([[x-s*.3,y-s*.6],[x,y-s*.95],[x+s*.3,y-s*.6]],3)});
 S.push({p:[[x-s*.45,y-s*.3],[x,y-s*.65],[x+s*.45,y-s*.3]],c:'#6E6A62'});S.push({p:[[x-s*.38,y-s*.3],[x+s*.38,y-s*.3],[x+s*.42,y+s*.7],[x-s*.42,y+s*.7]],c:'#FFF1B8'});
 S.push({raw:pg(ngon(x,y+s*.22,s*.14,s*.22,6),T('#FFD23F'),0)});S.push({p:limb([x-s*.5,y+s*.76],[x+s*.5,y+s*.76],s*.18,s*.18),c:'#6E6A62'});}
function book(S,cx,cy,w,h,a,cov){S.push({p:rrect(cx,cy,w,h,a),c:cov});S.push({p:rrect(cx+Math.cos(a)*w*.06,cy+Math.sin(a)*w*.06,w*.84,h*.55,a),c:'#FFFDF6',sw:2.5});}
function openBook(S,x,y,w){S.push({p:[[x-w/2-5,y-w*.02],[x,y+w*.1],[x+w/2+5,y-w*.02],[x+w/2+5,y+w*.08],[x,y+w*.2],[x-w/2-5,y+w*.08]],c:'#8A5530'});S.push({p:[[x,y+w*.1],[x-w/2,y],[x-w/2,y-w*.3],[x,y-w*.2]],c:'#FFFDF6',sw:3});S.push({p:[[x,y+w*.1],[x+w/2,y],[x+w/2,y-w*.3],[x,y-w*.2]],c:'#FFFDF6',sw:3});}
function page(S,x,y,w,h,a){S.push({p:rrect(x,y,w,h,a),c:'#F4F1EA',sw:3});const c=Math.cos(a),s=Math.sin(a),rt=(u,v)=>[x+u*c-v*s,y+u*s+v*c];let t='';[-.25,0,.25].forEach(v=>t+=pl([rt(-w*.3,v*h),rt(w*.3,v*h)],2,T('#B8B0A0')));S.push({raw:t});}
function quill(S,base,tip,c){const d=nrm(sub(tip,base)),n=perp(d),L=Math.hypot(...sub(tip,base)),q=(t,o)=>add(add(base,mul(d,L*t)),mul(n,o));
 S.push({p:[q(.18,0),q(.3,16),q(.55,22),q(.8,16),q(1,0),q(.75,-10),q(.45,-13),q(.22,-6)],c:c||'#FFFDF6'});
 S.push({raw:pl([q(.02,0),q(.98,0)],3.2)+pl([q(.4,0),q(.48,18)],2)+pl([q(.62,0),q(.7,16)],2)+pl([q(.5,0),q(.56,-11)],2)});
 S.push({p:[q(-.06,0),q(.07,-5),q(.07,5)],c:'#FFD23F',sw:3});}
function flower(S,x,y,s,c,ctr){for(let i=0;i<5;i++){const t=i*2*Math.PI/5-Math.PI/2;S.push({p:ngon(x+Math.cos(t)*s*.6,y+Math.sin(t)*s*.6,s*.45,s*.45,5),c,sw:2.5});}S.push({p:ngon(x,y,s*.35,s*.35,6),c:ctr||'#FFD23F',sw:2.5});}
function basket(S,x,y,w){const h=w*.6,hp=[];for(let i=0;i<=6;i++){const t=Math.PI+i*Math.PI/6;hp.push([x+Math.cos(t)*w*.4,y+Math.sin(t)*w*.6]);}
 for(let i=0;i<6;i++)S.push({p:limb(hp[i],hp[i+1],6,6),c:'#8A5A2E'});
 [[-.3,-.36,-.3],[0,-.48,0],[.28,-.34,.3],[-.1,-.3,-.1]].forEach(([u,v,a])=>S.push({p:[[x+u*w-6,y+2],[x+(u+a*.2)*w,y+v*w],[x+u*w+6,y+2]],c:'#3DDC5B',sw:3}));
 flower(S,x-w*.18,y-w*.24,w*.14,'#FFD23F','#FF8C32');flower(S,x+w*.2,y-w*.18,w*.12,'#FF5A3C');
 S.push({p:[[x-w/2,y],[x+w/2,y],[x+w*.4,y+h],[x-w*.4,y+h]],c:'#B98A4A'});S.push({raw:pl([[x-w*.46,y+h*.35],[x+w*.46,y+h*.35]],2.2)+pl([[x-w*.43,y+h*.68],[x+w*.43,y+h*.68]],2.2)});
 S.push({p:limb([x-w/2-3,y],[x+w/2+3,y],9,9),c:'#8A5A2E'});}
function spyglass(S,a,b){const d=nrm(sub(b,a));[[0,.42,16],[.38,.74,12],[.7,1,9]].forEach(([t0,t1,w])=>S.push({p:limb(add(a,mul(sub(b,a),t0)),add(a,mul(sub(b,a),t1)),w,w),c:'#D9A62A'}));
 [[0,19],[.38,15],[.7,11]].forEach(([t,w])=>{const p=add(a,mul(sub(b,a),t));S.push({p:limb(add(p,mul(d,-2)),add(p,mul(d,5)),w,w),c:'#6B4A22',sw:3});});}
function compass(S,x,y,r){S.push({p:ngon(x,y-r*1.1,r*.26,r*.2,6),c:'#D9A62A',sw:3});S.push({p:ngon(x,y,r,r,10),c:'#D9A62A'});S.push({p:ngon(x,y,r*.72,r*.72,10),c:'#F8EED6',sw:3});S.push({raw:pg([[x,y-r*.6],[x+r*.16,y],[x-r*.16,y]],T('#FF5A3C'),2)+pg([[x,y+r*.6],[x+r*.16,y],[x-r*.16,y]],T('#6E6A62'),2)});}
function badge(S,x,y,r){S.push({p:ngon(x,y,r,r,8,Math.PI/8),c:'#D9A62A'});S.push({p:ngon(x,y,r*.74,r*.74,8,Math.PI/8),c:'#1F7A3D',sw:3});S.push({raw:pg([[x-r*.55,y+r*.35],[x-r*.2,y-r*.4],[x,y-r*.05],[x+r*.22,y-r*.48],[x+r*.55,y+r*.35]],T('#F4F1EA'),2.5)});}

// ---------- portrait / sprite ----------
function bullHead(S,x,y,r,C,ex){const horn=[[-.62,-.7],[-1.1,-.92],[-1.6,-.98],[-1.95,-1.48],[-1.76,-.7],[-1.22,-.46],[-.7,-.4]];
 S.push({p:R(x,y,r,horn),c:C.horn});S.push({p:R(x,y,r,mir(horn)),c:C.horn});
 const ear=[[-.84,-.42],[-1.46,-.3],[-1.36,.02],[-.86,-.04]];S.push({p:R(x,y,r,ear),c:C.skin});S.push({p:R(x,y,r,mir(ear)),c:C.skin});
 S.push({p:R(x,y,r,[[-.74,-.84],[.74,-.84],[.92,-.2],[.74,.5],[.62,.96],[-.62,.96],[-.74,.5],[-.92,-.2]]),c:C.skin});
 S.push({p:R(x,y,r,[[-.36,-.86],[-.16,-1.08],[.04,-.9],[.26,-1.08],[.42,-.84],[.2,-.62],[-.2,-.62]]),c:C.skin2});
 S.push({p:R(x,y,r,[[-.6,.36],[.6,.36],[.72,.8],[.5,1.14],[-.5,1.14],[-.72,.8]]),c:C.muzzle});
 S.push({raw:pg(ngon(x-r*.28,y+r*.72,r*.1,r*.07,6),T('#3B2418'),0)+pg(ngon(x+r*.28,y+r*.72,r*.1,r*.07,6),T('#3B2418'),0)});
 if(C.stone)S.push({raw:[1,-1].map(sg=>pl(R(x,y,r,[[sg*-1.3,-.52],[sg*-1.42,-.9],[sg*-1.7,-1.0]]),2.4)).join('')});
 const f=face(x,y,r,{...C,off:0,eyeDX:.5,eyeY:-.14,noNose:1,mouthY:.98},ex);S.push({raw:f.up+f.mouth});
 if(C.flower)flower(S,x-r*1.12,y-r*.28,r*.3,'#FFFDF6');}
function portrait(C,ex,op){seed=C.seed||11;OLW=10;LX=-.55;const S=[];
 if(C.bull){bust(S,C);S.push({p:[[104,168],[152,168],[146,214],[128,226],[110,214]],c:C.skin});bullHead(S,128,100,50,C,ex);return wrap(256,256,parts(S),op);}
 const x=128,y=C.hunch?122:106,r=C.r||58;
 if(C.pBack)C.pBack(S);headBack(S,x,y,r,C);bust(S,C);if(C.pOver)C.pOver(S);headFront(S,x,y,r,C,ex);if(C.pFront)C.pFront(S);
 return wrap(256,256,parts(S),op);}
function sprite(C0,B,op,ex='vide'){seed=(C0.seed||5)+3;OLW=B.olw||9;LX=-.55;
 const C={...C0,off:0},S=[],Wd=B.W||200,Ht=B.H||300,cx=Wd/2,r=B.r||36,hyH=B.headY||74;
 const sy=B.hunch?hyH+r*.72:hyH+r*.98,hy=B.hipY||sy+86,fy=Ht-10,sw=B.sw||34,hw=B.hw||28,lw=B.legW||20,aw=B.armW||15,ctx={cx,sy,hy,fy,sw,hw,r,hyH};
 if(MODE==='ombre'&&!B.noWisp)[[cx-sw-20,fy-26,9],[cx+sw+22,fy-44,11],[cx-sw-12,sy+14,7],[cx+sw+16,sy-12,8]].forEach(w=>wisp(S,...w));
 S.push({raw:pg(ngon(cx,fy+1,sw*1.3,9,12),OL,0,.22)});
 if(B.back)B.back(S,ctx);
 headBack(S,cx,hyH,r,C);
 const bootC=B.boots||'#3B2A1E',legC=B.legs||'#4B3A2C';
 if(!B.robe)[-1,1].forEach(sg=>{const x=cx+sg*(hw*.6+2);S.push({p:limb([cx+sg*hw*.5,hy],[x,fy-20],lw,lw*.85),c:legC});S.push({p:[[x-lw*.6,fy-24],[x+lw*.6,fy-24],[x+lw*.6+(sg>0?8:0),fy],[x-lw*.6-(sg<0?8:0),fy]],c:bootC});});
 else[-1,1].forEach(sg=>{const x=cx+sg*hw*.55;S.push({p:[[x-lw*.55,fy-14],[x+lw*.55,fy-14],[x+lw*.6+(sg>0?7:0),fy],[x-lw*.6-(sg<0?7:0),fy]],c:bootC});});
 S.push({p:limb([cx,hyH+r*.5],[cx,sy+8],r*.62,r*.66),c:C.skin});
 const fl=B.flare??20;let tor;
 if(B.robe){tor=[[cx-sw,sy],[cx-sw*.3,sy-6],[cx+sw*.3,sy-6],[cx+sw,sy],[cx+hw+fl,fy-8]];if(B.hem){const n=8;for(let i=1;i<n;i++)tor.push([cx+hw+fl-(2*(hw+fl))*i/n,fy-8-(i%2?18:0)]);}tor.push([cx-hw-fl,fy-8]);}
 else tor=[[cx-sw,sy],[cx-sw*.3,sy-6],[cx+sw*.3,sy-6],[cx+sw,sy],[cx+hw,hy+10],[cx-hw,hy+10]];
 S.push({p:tor,c:B.top||C.top});
 if(B.hunch)S.push({p:[[cx-sw*.95,sy+12],[cx-sw*.6,sy-r*.75],[cx+sw*.6,sy-r*.75],[cx+sw*.95,sy+12]],c:B.top||C.top});
 if(B.belt)S.push({p:limb([cx-hw-3,hy],[cx+hw+3,hy],10,10),c:B.belt});
 if(B.over)B.over(S,ctx);if(B.mid)B.mid(S,ctx);
 const sL=[cx-sw+aw*.35,sy+aw*.45],sR=[cx+sw-aw*.35,sy+aw*.45],hL=B.hL||[cx-sw-10,hy-2],hR=B.hR||[cx+sw+10,hy-2];
 const el=(s,h,sg)=>add(mid(s,h),[sg*(B.elbow??8),0]);const ao={u:B.sleeve||B.top||C.top,l:B.sleeve2,hand:B.hand||C.skin,w:aw,hr:aw*.72};
 arm(S,sL,el(sL,hL,-1),hL,ao);arm(S,sR,el(sR,hR,1),hR,ao);
 headFront(S,cx,hyH,r,C,ex);if(B.front)B.front(S,ctx);
 return wrap(Wd,Ht,parts(S),op);}
function bullSprite(C,op){seed=41;OLW=9;LX=-.55;const S=[],cx=120,fy=290;
 [[40,262,10],[204,246,12],[34,150,8],[210,130,9]].forEach(w=>wisp(S,...w));
 S.push({raw:pg(ngon(cx,fy+1,100,10,12),OL,0,.22)});
 S.push({p:ngon(cx,172,94,64,10),c:C.skin});
 [[62,178],[178,178]].forEach(([x,y])=>{S.push({p:limb([x,y+10],[x+(x<cx?2:-2),fy-16],26,22),c:C.skin2});S.push({p:[[x-13,fy-18],[x+13,fy-18],[x+15,fy],[x-15,fy]],c:'#3B2A1E'});});
 [[94,200],[146,200]].forEach(([x,y])=>{S.push({p:limb([x,y],[x+(x<cx?-2:2),fy-16],34,28),c:C.skin});S.push({p:[[x-17,fy-20],[x+17,fy-20],[x+19,fy],[x-19,fy]],c:'#3B2A1E'});S.push({raw:pl([[x,fy-18],[x,fy-2]],2.5)});});
 S.push({p:[[70,122],[170,122],[184,208],[150,238],[90,238],[56,208]],c:C.skin});
 bullHead(S,cx,106,42,C,'vide');return wrap(240,300,parts(S),op);}

// ---------- characters ----------
const ELDAN={seed:21,skin:'#F2C6A0',hair:{c:'#F4F1EA',back:'longlow',front:'receding'},beard:'long',mustache:1,beardC:'#F7F4EE',browCol:'#F7F4EE',iris:'#4A7A9A',old:1,mouthY:.64,top:'#F3E9D2',outfit:'robe',outC:'#E3A93B'};
const pagesAt=list=>S=>list.forEach(([x,y,a,s=1])=>page(S,x,y,30*s,38*s,a));
const ELDAN_O={...ELDAN,seed:22,top:'#B5AEA6',outC:'#9A928A',pBack:pagesAt([[34,64,-.35],[222,70,.4],[196,20,.15,.8],[58,20,-.1,.7]]),
 pOver:S=>{S.push({p:[[64,226],[84,222],[88,244],[66,248]],c:'#8E867E',sw:3});S.push({p:[[176,214],[194,218],[190,236],[172,232]],c:'#8E867E',sw:3});},
 pFront:pagesAt([[30,176,.3],[228,168,-.3],[214,236,.2,.8]])};
ELDAN_O.sprite={W:280,H:400,r:44,headY:94,sw:44,hw:34,robe:1,hem:1,flare:40,armW:22,hL:[34,150],hR:[246,150],elbow:0,boots:'#6E6A62',
 back:(S)=>{pagesAt([[30,64,-.3],[250,54,.35],[208,18,.1,.8],[80,14,-.15,.8]])(S);},
 over:(S,c)=>{for(let i=0;i<5;i++){const x=c.cx-60+i*30,y=c.fy-44;if(i%2)S.push({p:ngon(x,y,7,7,8),c:'#A8A09A',sw:2.5});else S.push({p:[[x,y-8],[x+8,y+6],[x-8,y+6]],c:'#A8A09A',sw:2.5});}S.push({p:[[112,220],[132,216],[134,238],[114,240]],c:'#8E867E',sw:3});},
 front:pagesAt([[24,232,.3],[256,226,-.3],[40,312,-.2,.8],[244,318,.25,.8],[140,24,0,.7]])};

const NYRA={seed:61,skin:'#E8AE82',hair:{c:'#2A2F38',back:'none',front:'strand'},hat:'hood',hatC:'#3E4B58',iris:'#1F7A3D',browCol:'#2A2F38',top:'#2F3A44',outfit:'scarf',outC:'#3DDC5B',bw:.9};
const SEC={
 maud:{seed:71,skin:'#E9B58E',hair:{c:'#DAD5CC',back:'bun',front:'side'},old:1,browCol:'#BDB6AA',iris:'#5A7A3A',top:'#5E7F4A',outfit:'shawl',outC:'#C0532F',blush:1},
 pip:{seed:72,skin:'#D9A077',hair:{c:'#5A3A24',back:'short',front:'messy'},hat:'cap',hatC:'#1F7A3D',hatC2:'#FFD23F',freckles:1,iris:'#6B4A22',browCol:'#5A3A24',top:'#F3E6C8',outfit:'vest',outC:'#8A5A34',bw:.8,r:60},
 lili:{seed:73,skin:'#F6C9A0',hair:{c:'#E8A13A',back:'braids',front:'fringe'},ribbon:'#FF5A3C',iris:'#3F7A3A',browCol:'#B8741E',blush:1,freckles:1,top:'#FFE3B0',outfit:'overalls',outC:'#4F86C6',bw:.76,r:60},
 aubin:{seed:74,skin:'#F0C6A2',hair:{c:'#E4E0D8',back:'none',front:'receding'},mustache:1,beardC:'#E8E4DC',old:1,glasses:1,browCol:'#E8E4DC',iris:'#6B5A3A',mouthY:.68,top:'#A0522D',outfit:'cardigan',outC:'#F3E6C8',accent:'#1F7A3D',
  pFront:S=>{S.push({p:limb([60,96],[34,140],8,8),c:'#FFD23F'});S.push({p:[[34,140],[30,152],[38,146]],c:'#3B2A1E',sw:2.5});}},
 fabre:{seed:75,skin:'#E4AE84',hair:{c:'#CFCAC2',back:'none',front:'receding'},mustache:1,beardC:'#D8D3CB',old:1,browCol:'#D8D3CB',iris:'#5A6A3A',mouthY:.68,top:'#D9A13B',outfit:'vest',outC:'#2E6B3E',patch:'#C0532F',hunch:1,nose:'big'}};

const BOSS={
 bram:{seed:31,skin:'#C98657',hair:{c:'#3B2A1E',back:'short',front:'crop'},beard:'full',beardC:'#3B2A1E',browCol:'#3B2A1E',iris:'#4A3020',nose:'big',bw:1.2,neck:1.3,top:'#D9C9A8',outfit:'apron',outC:'#7A4A2A',mouthY:.56,
  pBack:S=>hammer(S,[232,262],[214,128],34,22),
  sprite:{sw:46,hw:38,legW:28,armW:22,r:38,top:'#D9C9A8',sleeve2:'#C98657',legs:'#4B3A2C',boots:'#2E241C',hR:[160,190],hL:[46,196],
   over:(S,c)=>{S.push({p:[[c.cx-30,c.sy+22],[c.cx+30,c.sy+22],[c.cx+34,c.hy+44],[c.cx-34,c.hy+44]],c:'#7A4A2A'});S.push({p:limb([c.cx-26,c.sy+24],[c.cx-36,c.sy+2],8,8),c:'#7A4A2A'});S.push({p:limb([c.cx+26,c.sy+24],[c.cx+36,c.sy+2],8,8),c:'#7A4A2A'});},
   mid:S=>hammer(S,[160,184],[170,256],30,22)}},
 corvin:{seed:32,skin:'#F0C6A2',hair:{c:'#6B3E22',back:'none'},hat:'helmet',hatC:'#9AA8B5',hatC2:'#FF5A3C',iris:'#3A5A8A',browCol:'#6B3E22',top:'#9AA8B5',outfit:'armor',outC:'#D9A62A',bw:.95,
  pBack:S=>sword(S,[206,262],[234,22],{bw:28,guard:22,crack:1,col:'#CFE3EE'}),
  sprite:{sw:36,hw:28,legW:20,armW:16,r:36,top:'#9AA8B5',legs:'#8A97A4',boots:'#5A6470',hL:[92,196],hR:[108,196],elbow:14,belt:'#D9A62A',
   over:(S,c)=>{S.push({p:ngon(c.cx-c.sw+4,c.sy+6,17,13,8),c:'#B7C3CE'});S.push({p:ngon(c.cx+c.sw-4,c.sy+6,17,13,8),c:'#B7C3CE'});S.push({p:[[c.cx-18,c.sy+14],[c.cx+18,c.sy+14],[c.cx,c.sy+46]],c:'#D9A62A',sw:3});},
   mid:S=>sword(S,[100,194],[100,290],{bw:24,guard:22,crack:1,col:'#CFE3EE',grip:14})}},
 sorel:{seed:33,skin:'#E4B08A',hair:{c:'#CFCAC2',back:'none',front:'strand'},hat:'cathood',hatC:'#2F5A4E',mask:'#2A2A30',old:1,iris:'#C9A23A',browCol:'#CFCAC2',top:'#2F5A4E',outfit:'cloak',outC:'#D9A62A',
  pBack:S=>{sword(S,[70,236],[26,128],{bw:13,guard:10});sword(S,[186,236],[230,128],{bw:13,guard:10});},
  sprite:{sw:30,hw:24,legW:17,armW:13,r:36,robe:1,flare:16,hunch:1,top:'#2F5A4E',boots:'#2A2A30',hL:[46,194],hR:[154,194],
   front:S=>{sword(S,[46,194],[18,150],{bw:11,guard:9,grip:12});sword(S,[154,194],[182,150],{bw:11,guard:9,grip:12});}}},
 reflet:{...NYRA,seed:34,op:.74,humMode:'pale',
  sprite:{sw:30,hw:24,legW:17,armW:13,r:36,top:'#2F3A44',legs:'#2F3A44',boots:'#1E252C',hR:[150,194],belt:'#3DDC5B',
   back:(S,c)=>S.push({p:[[c.cx-c.sw,c.sy],[c.cx+c.sw,c.sy],[c.cx+c.sw+16,c.hy+46],[c.cx-c.sw-16,c.hy+46]],c:'#3E4B58'}),
   over:(S,c)=>{S.push({p:ngon(c.cx,c.sy+2,32,11,8),c:'#3DDC5B'});S.push({p:[[c.cx+14,c.sy+6],[c.cx+30,c.sy+16],[c.cx+24,c.sy+52],[c.cx+14,c.sy+52]],c:'#3DDC5B'});},
   front:S=>sword(S,[150,194],[176,236],{bw:12,guard:9,grip:12,col:'#CFF5D6'})}},
 tonnerre:{seed:35,bull:1,skin:'#8A5530',skin2:'#5C3A22',muzzle:'#D9A77A',horn:'#EDE0C4',iris:'#3A2418',browCol:'#3B2418',top:'#8A5530',bw:1.4,neck:1.8},
 oren:{seed:36,skin:'#C98657',hair:{c:'#6B3E22',back:'short',front:'side'},hat:'straw',hatC:'#E8C25A',hatC2:'#FF5A3C',nose:'big',iris:'#4A3020',browCol:'#6B3E22',top:'#F3E6C8',outfit:'overalls',outC:'#4E6E8E',bw:.9,
  pBack:S=>pitchfork(S,[44,262],[38,56]),pOver:S=>S.push({p:[[104,178],[152,178],[128,204]],c:'#1F7A3D',sw:3}),
  sprite:{sw:32,hw:26,legW:18,armW:14,r:36,top:'#F3E6C8',legs:'#4E6E8E',boots:'#5C3A22',hR:[150,178],
   over:(S,c)=>{S.push({p:[[c.cx-20,c.sy+26],[c.cx+20,c.sy+26],[c.cx+c.hw,c.hy+10],[c.cx-c.hw,c.hy+10]],c:'#4E6E8E'});S.push({p:[[c.cx-18,c.sy-4],[c.cx+18,c.sy-4],[c.cx,c.sy+16]],c:'#1F7A3D',sw:3});},
   mid:S=>pitchfork(S,[152,288],[154,62])}},
 archiviste:{seed:37,skin:'#EAC2A0',hair:{c:'#EDEAE3',back:'midlow',front:'receding'},old:1,glasses:1,browCol:'#EDEAE3',iris:'#5A4A3A',top:'#5E4A3A',outfit:'robe2',outC:'#D9C9A8',hunch:1,
  pFront:S=>{book(S,128,250,120,20,0,'#8A5530');book(S,124,232,112,18,-.03,'#3E6B5A');book(S,132,216,100,17,.04,'#B8862E');},
  sprite:{sw:34,hw:30,legW:18,armW:15,r:36,headY:80,robe:1,flare:14,hunch:1,top:'#5E4A3A',boots:'#3B2A1E',hL:[70,178],hR:[130,178],
   front:S=>{book(S,100,196,70,15,0,'#8A5530');book(S,98,182,64,13,-.04,'#3E6B5A');book(S,102,169,56,12,.05,'#B8862E');openBook(S,100,156,50);}}},
 selena:{seed:38,skin:'#F6D2B4',hair:{c:'#2E2A3A',back:'bun',front:'fringe'},iris:'#2E6E73',browCol:'#2E2A3A',top:'#2E6E73',outfit:'coat',outC:'#F3E6C8',bw:.9,
  pBack:S=>quill(S,[204,262],[240,34]),pFront:S=>{book(S,36,70,40,30,-.3,'#FFFDF6');book(S,28,176,36,28,.25,'#FFFDF6');book(S,222,196,34,26,-.2,'#FFFDF6');},
  sprite:{sw:30,hw:24,legW:16,armW:13,r:36,robe:1,flare:12,top:'#2E6E73',boots:'#2E2A3A',hR:[150,180],
   mid:S=>quill(S,[146,240],[178,50]),front:S=>{book(S,34,120,32,24,-.3,'#FFFDF6');book(S,30,200,30,22,.25,'#FFFDF6');book(S,176,262,28,20,-.2,'#FFFDF6');}}},
 traqueur:{seed:39,skin:'#D9A077',hair:{c:'#3B2A1E',back:'none',front:'strand'},hat:'hood',hatC:'#4E6B3A',iris:'#5A4A22',browCol:'#3B2A1E',top:'#6E5A3A',outfit:'cloak',outC:'#8A5530',
  pBack:S=>bow(S,214,150,200,28,'#8A5530'),pFront:S=>{S.push({raw:pl([[108,190],[128,218],[148,190]],2.5,T('#3B2A1E'))});badge(S,128,226,15);},
  sprite:{sw:32,hw:26,legW:18,armW:14,r:36,top:'#6E5A3A',legs:'#4B3A2C',boots:'#3B2A1E',hL:[46,190],belt:'#8A5530',
   back:(S,c)=>S.push({p:[[c.cx-c.sw,c.sy],[c.cx+c.sw,c.sy],[c.cx+c.sw+14,c.hy+50],[c.cx-c.sw-14,c.hy+50]],c:'#4E6B3A'}),
   front:(S,c)=>{bow(S,46,190,160,-18,'#8A5530');badge(S,c.cx,c.sy+26,11);}}},
 hardel:{seed:40,skin:'#D29A70',hair:{c:'#8C8A86',back:'short',front:'crop'},beard:'full',beardC:'#7A6E62',browCol:'#6E665E',iris:'#3A5A6A',bw:1.15,top:'#6B5A2E',outfit:'coat',outC:'#8A7A4A',mouthY:.56,
  pFront:S=>{spyglass(S,[150,254],[232,196]);compass(S,92,232,14);},
  sprite:{sw:42,hw:34,legW:24,armW:19,r:37,top:'#6B5A2E',legs:'#3B3A30',boots:'#2E241C',hR:[160,150],belt:'#3B2A1E',
   over:(S,c)=>{S.push({p:[[c.cx-c.hw,c.hy],[c.cx+c.hw,c.hy],[c.cx+c.hw+10,c.hy+44],[c.cx-c.hw-10,c.hy+44]],c:'#6B5A2E'});S.push({p:[[c.cx,c.sy+60],[c.cx-16,c.sy-2],[c.cx-26,c.sy+6]],c:'#8A7A4A',sw:3});S.push({p:[[c.cx,c.sy+60],[c.cx+16,c.sy-2],[c.cx+26,c.sy+6]],c:'#8A7A4A',sw:3});compass(S,c.cx-22,c.hy+20,10);},
   front:S=>spyglass(S,[156,158],[190,104])}},
 helo:{seed:42,skin:'#E9B58E',hair:{c:'#CFCAC2',back:'midlow',front:'side'},hat:'wide',hatC:'#6B8A3A',hatC2:'#B85C38',old:1,browCol:'#CFCAC2',iris:'#5A7A3A',top:'#7A5A3A',outfit:'shawl',outC:'#B85C38',
  hatDeco:(S,x,y,r)=>{flower(S,x+r*.5,y-r*.74,r*.18,'#FFD23F','#FF8C32');S.push({p:[[x+r*.66,y-r*.7],[x+r*.98,y-r*.92],[x+r*.8,y-r*.6]],c:'#3DDC5B',sw:3});},
  pFront:S=>basket(S,62,224,86),
  sprite:{sw:32,hw:28,legW:18,armW:14,r:36,robe:1,flare:22,top:'#7A5A3A',boots:'#5C3A22',hL:[52,188],
   over:(S,c)=>S.push({p:[[c.cx-c.sw-4,c.sy+22],[c.cx-c.sw+6,c.sy-4],[c.cx+c.sw-6,c.sy-4],[c.cx+c.sw+4,c.sy+22],[c.cx,c.sy+44]],c:'#B85C38'}),
   front:S=>basket(S,52,200,52)}},
 veilleuse:{seed:43,skin:'#F2C6A0',hair:{c:'#8A5A3A',back:'none',front:'strand'},hat:'nurse',hatC:'#E8E0D0',cross:'#FF5A3C',iris:'#6A5A8A',browCol:'#8A5A3A',top:'#E8E0D0',outfit:'cloak',outC:'#FF5A3C',
  pFront:S=>lantern(S,212,210,34),
  sprite:{sw:30,hw:26,legW:16,armW:13,r:36,robe:1,flare:18,top:'#E8E0D0',boots:'#5C3A22',hR:[150,176],
   over:(S,c)=>S.push({p:ngon(c.cx,c.sy+10,8,8,6),c:'#FF5A3C'}),front:S=>lantern(S,150,204,24)}}};

function build(){const out={};
 const set=m=>{MODE=m||null;OL=MODE==='ombre'?OLO:OLG;};
 const pr=(n,C,ex,m,op)=>{set(m);out['assets/portraits/'+n+'.svg']=portrait(C,ex,op);set();};
 const sp=(n,svg)=>{out['assets/ennemis/'+n+'.svg']=svg;};
 ['neutre','joie','colere','tristesse','surprise','determine'].forEach(e=>pr('eldan_'+e,ELDAN,e));
 pr('eldan_oublie_ombrace',ELDAN_O,'vide','ombre');set('ombre');sp('eldan_oublie',sprite(ELDAN_O,ELDAN_O.sprite));set();
 pr('maud_neutre',SEC.maud,'neutre');pr('pip_neutre',SEC.pip,'malin');
 pr('lili_neutre',SEC.lili,'neutre');pr('lili_joie',SEC.lili,'joie');pr('lili_surprise',SEC.lili,'surprise');
 pr('aubin_neutre',SEC.aubin,'neutre');pr('aubin_joie',SEC.aubin,'joie');
 pr('fabre_neutre',SEC.fabre,'neutre');pr('fabre_surprise',SEC.fabre,'surprise');pr('fabre_ombrace',SEC.fabre,'vide','ombre');
 Object.keys(BOSS).forEach(id=>{const C=BOSS[id];
  if(id==='tonnerre'){pr(id+'_ombrace',{...C,horn:'#8A8494',stone:1},'vide','ombre');pr(id+'_humain',{...C,flower:1},'apaise');set('ombre');sp(id,bullSprite({...C,horn:'#8A8494',stone:1}));set();return;}
  pr(id+'_ombrace',C,'vide','ombre',C.op);pr(id+'_humain',C,'apaise',C.humMode);set('ombre');sp(id,sprite(C,C.sprite,C.op));set();});
 return out;}
const HEROES={
 aldric:{seed:81,skin:'#F4BE8E',hair:{c:'#6B3E22',back:'short',front:'side'},iris:'#2F5D8A',browCol:'#4A2A16',top:'#B7C3CE',bw:1.02,
  pBack:S=>{S.push({p:[[20,264],[40,200],[128,186],[216,200],[236,264]],c:'#E0662A'});},
  pOver:S=>{S.push({p:[[98,198],[158,198],[164,264],[92,264]],c:'#FF8C32'});S.push({p:[[128,214],[142,240],[114,240]],c:'#FFD23F',sw:3});S.push({p:ngon(58,210,32,24,8),c:'#B7C3CE'});S.push({p:ngon(198,210,32,24,8),c:'#B7C3CE'});S.push({p:ngon(128,184,34,12,8),c:'#98A5B2'});}},
 nyra:{...NYRA,seed:82,neutre:'malin'},
 boran:{seed:83,skin:'#C98657',hair:{c:'#6B3E22',back:'none'},beard:'full',beardC:'#6B3E22',browCol:'#6B3E22',iris:'#4A3020',nose:'big',bw:1.28,neck:1.35,top:'#8A5A34',mouthY:.56,
  pOver:S=>{S.push({p:[[108,176],[148,176],[128,218]],c:'#C98657',sw:3});S.push({p:ngon(52,204,34,24,7),c:'#1F7A3D'});S.push({p:ngon(204,204,34,24,7),c:'#1F7A3D'});},
  pFront:S=>S.push({raw:pg(ngon(106,62,9,5,5),'#FFFFFF',0,.5)})},
 ilwen:{seed:84,skin:'#F7D2B4',hair:{c:'#E6E0F0',back:'long',front:'side'},hat:'witch',hatC:'#5B3B6E',hatC2:'#FFD23F',iris:'#6B3FA0',browCol:'#9A8AB0',top:'#5B3B6E',outfit:'robe2',outC:'#FFD23F',
  pFront:S=>{spark(S,30,70,10,'#FFD23F');spark(S,224,150,8,'#FFD23F');spark(S,212,190,6,'#FF8C32');}},
 kestrel:{seed:85,skin:'#F6C9A0',hair:{c:'#D9622B',back:'pony',front:'side'},hat:'band',hatC:'#9ACD32',iris:'#6B4A22',browCol:'#9A3E18',top:'#6E4A2E',
  pBack:S=>{[[178,170],[192,160],[206,170]].forEach(([x,y])=>S.push({p:[[x-6,y+10],[x,y-14],[x+6,y+10]],c:'#FF5A3C',sw:3}));S.push({p:limb([192,180],[200,230],16,16),c:'#5C3A22'});},
  pOver:S=>{S.push({p:[[28,264],[38,214],[76,182],[104,188],[82,264]],c:'#2E7A3E'});S.push({p:limb([176,186],[96,264],12,12),c:'#5C3A22'});}},
 mira:{seed:86,skin:'#F2B48C',hair:{c:'#8A4A2E',back:'buns2',front:'side'},iris:'#7A3E2A',browCol:'#6B3420',blush:1,top:'#F3E6C8',
  pOver:S=>{S.push({p:limb([30,252],[226,252],16,16),c:'#FF5A3C'});S.push({raw:pl([[106,186],[128,224],[150,186]],2.6,'#D9A62A')});glow(S,128,232,30,'#FFD23F',.4);S.push({p:ngon(128,232,14,17,6,Math.PI/2),c:'#FFD23F'});S.push({p:ngon(128,232,8,10,6,Math.PI/2),c:'#FF5A3C',sw:3});}}};
function heroes(){const out={};MODE=null;OL=OLG;Object.keys(HEROES).forEach(id=>{const C=HEROES[id];['neutre','joie','colere','tristesse','surprise','determine'].forEach(e=>{out['assets/portraits/'+id+'_'+e+'.svg']=portrait(C,e==='neutre'&&C.neutre?C.neutre:e);});});return out;}
W.TSStory={build,heroes};
})(typeof window!=='undefined'?window:globalThis);
