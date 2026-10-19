(()=>{
/* roundRect cho trình duyệt cũ (iOS < 16) */
if(!CanvasRenderingContext2D.prototype.roundRect){
  CanvasRenderingContext2D.prototype.roundRect=function(x,y,w,h,r){
    const [a,b,c,d]=Array.isArray(r)?r:[r,r,r,r];
    this.moveTo(x+a,y);this.arcTo(x+w,y,x+w,y+h,b);this.arcTo(x+w,y+h,x,y+h,c);
    this.arcTo(x,y+h,x,y,d);this.arcTo(x,y,x+w,y,a);this.closePath();
  };
}
const cv=document.getElementById('c'),ctx=cv.getContext('2d');
const $=id=>document.getElementById(id);
const scoreEl=$('score'),comboEl=$('combo'),startEl=$('start'),overEl=$('over');
const BASE_W=200,H=30;
let cw,ch,dpr,S,WW,baseY;
let state='ready',blocks=[],cur,debris=[],fx=[],cam=0,camT=0,combo=0,score=0,hue=210,hueT=210,best=0,overAt=0,muted=false;
try{best=+localStorage.getItem('xepthap-best')||0}catch(e){}

function resize(){
  dpr=Math.min(devicePixelRatio||1,2);
  cw=innerWidth;ch=innerHeight;
  cv.width=cw*dpr;cv.height=ch*dpr;
  S=Math.min(cw/360,1.5);WW=cw/S;baseY=ch/S-110;
}
addEventListener('resize',resize);addEventListener('orientationchange',()=>setTimeout(resize,200));
document.addEventListener('visibilitychange',()=>{last=performance.now()});resize();

/* Âm thanh tạo bằng WebAudio, không cần file */
let ac;
function tone(f,d=.12,type='triangle',v=.18,slide=0){
  if(muted)return;
  try{
    ac=ac||new (window.AudioContext||window.webkitAudioContext)();
    if(ac.state==='suspended')ac.resume();
    const o=ac.createOscillator(),g=ac.createGain(),t=ac.currentTime;
    o.type=type;o.frequency.setValueAtTime(f,t);
    if(slide)o.frequency.exponentialRampToValueAtTime(Math.max(40,f+slide),t+d);
    g.gain.setValueAtTime(v,t);g.gain.exponentialRampToValueAtTime(.001,t+d);
    o.connect(g).connect(ac.destination);o.start(t);o.stop(t+d);
  }catch(e){}
}
const scale=[0,2,4,7,9,12,14,16,19,21];
const note=i=>261.6*Math.pow(2,scale[i%scale.length]/12)*(1+Math.floor(i/scale.length));

function reset(){
  blocks=[{x:(WW-BASE_W)/2,w:BASE_W,h:210}];
  debris=[];fx=[];combo=0;score=0;cam=0;camT=0;hue=hueT=210;
  scoreEl.textContent=0;comboEl.style.opacity=0;
  spawn();
}
function spawn(){
  const n=blocks.length,top=blocks[n-1];
  const dir=n%2?1:-1;
  cur={w:top.w,x:dir>0?-top.w:WW,dir:-dir,speed:110+Math.min(n*5,190),h:(210+n*9)%360};
}
function start(){
  reset();state='play';
  startEl.classList.add('hidden');overEl.classList.add('hidden');
}
function say(t){comboEl.textContent=t;comboEl.style.opacity=1;clearTimeout(say.t);say.t=setTimeout(()=>comboEl.style.opacity=0,700)}

function drop(){
  const top=blocks[blocks.length-1];
  const l=Math.max(top.x,cur.x),r=Math.min(top.x+top.w,cur.x+cur.w),ov=r-l;
  const y=baseY-blocks.length*H;
  if(ov<=0){gameOver(y);return}
  if(Math.abs(cur.x-top.x)<5){
    cur.x=top.x;combo++;
    if(combo>=3)cur.w=Math.min(cur.w+8,BASE_W);
    ring(cur.x+cur.w/2,y+H/2,cur.w,cur.h);
    buzz(25);say(combo>1?'Hoàn hảo! x'+combo:'Hoàn hảo!');
    tone(note(combo+2),.25,'sine',.22);tone(note(combo+4),.3,'sine',.12);
  }else{
    combo=0;
    const cutL=cur.x<top.x,cutW=cur.w-ov;
    debris.push({x:cutL?cur.x:r,y,w:cutW,vy:0,vx:cutL?-30:30,rot:0,vr:cutL?-1.2:1.2,h:cur.h});
    cur.x=l;cur.w=ov;
    tone(note(0)+blocks.length*6,.1,'triangle',.2);
  }
  blocks.push({x:cur.x,w:cur.w,h:cur.h});
  score++;scoreEl.textContent=score;
  hueT=cur.h;camT=Math.max(0,(blocks.length-5)*H);
  spawn();
}
function ring(x,y,w,h){fx.push({x,y,r:w/2,a:1,h})}
function gameOver(y){
  state='over';overAt=performance.now();
  debris.push({x:cur.x,y,w:cur.w,vy:-60,vx:0,rot:0,vr:cur.dir*.8,h:cur.h});
  cur=null;
  buzz(120);tone(220,.5,'sawtooth',.2,-150);
  if(score>best){best=score;try{localStorage.setItem('xepthap-best',best)}catch(e){}}
  $('finalScore').textContent=score;
  $('bestText').textContent=score>=best&&score>0?'Kỷ lục mới!':'Kỷ lục: '+best;
  setTimeout(()=>overEl.classList.remove('hidden'),500);
  comboEl.style.opacity=0;
}

const buzz=ms=>{if(!muted&&navigator.vibrate)try{navigator.vibrate(ms)}catch(e){}};
function press(e){
  if(e&&e.target.closest&&e.target.closest('#mute,#again'))return;
  if(e&&e.cancelable)e.preventDefault();
  if(state==='ready')start();
  else if(state==='play')drop();
  else if(state==='over'&&performance.now()-overAt>700)start();
}
cv.addEventListener('pointerdown',press);
startEl.addEventListener('pointerdown',press);
addEventListener('keydown',e=>{
  if(e.code==='Space'||e.code==='Enter'){
    e.preventDefault();
    if(state==='over'){if(performance.now()-overAt>500)start()}else press();
  }
});
$('again').addEventListener('click',start);
$('mute').addEventListener('click',()=>{muted=!muted;$('mute').textContent=muted?'🔇':'🔊'});

function block(x,y,w,h){
  const px=x,py=y;
  ctx.fillStyle=`hsl(${h},68%,58%)`;
  ctx.beginPath();ctx.roundRect(px,py,w,H-2,5);ctx.fill();
  ctx.fillStyle=`hsl(${h},75%,74%)`;
  ctx.beginPath();ctx.roundRect(px,py,w,7,[5,5,0,0]);ctx.fill();
  ctx.fillStyle=`hsl(${h},60%,42%)`;
  ctx.fillRect(px,py+H-8,w,6);
}

let last=performance.now();
function frame(now){
  const dt=Math.min((now-last)/1000,.04);last=now;
  /* cập nhật */
  hue+=(hueT-hue)*Math.min(1,dt*2);
  cam+=(camT-cam)*Math.min(1,dt*5);
  if(state==='play'&&cur){
    cur.x+=cur.dir*cur.speed*dt;
    if(cur.x<-cur.w*.5){cur.x=-cur.w*.5;cur.dir=1}
    if(cur.x>WW-cur.w*.5){cur.x=WW-cur.w*.5;cur.dir=-1}
  }
  for(const d of debris){d.vy+=900*dt;d.y+=d.vy*dt;d.x+=d.vx*dt;d.rot+=d.vr*dt}
  debris=debris.filter(d=>d.y<baseY+ch/S+cam+200);
  for(const f of fx){f.r+=260*dt;f.a-=dt*2.2}
  fx=fx.filter(f=>f.a>0);

  /* vẽ */
  ctx.setTransform(dpr,0,0,dpr,0,0);
  const g=ctx.createLinearGradient(0,0,0,ch);
  g.addColorStop(0,`hsl(${hue+30},45%,34%)`);
  g.addColorStop(1,`hsl(${hue-10},50%,14%)`);
  ctx.fillStyle=g;ctx.fillRect(0,0,cw,ch);
  /* các ngôi sao nhỏ trôi chậm theo camera */
  ctx.fillStyle='rgba(255,247,232,.35)';
  for(let i=0;i<28;i++){
    const sx=(i*97%100)/100*cw,sy=((i*53%100)/100*ch+cam*S*.15*(1+i%3))%ch;
    ctx.fillRect(sx,sy,2,2);
  }
  ctx.setTransform(dpr*S,0,0,dpr*S,0,dpr*cam*S);
  /* bệ đỡ */
  ctx.fillStyle='rgba(0,0,0,.28)';
  ctx.fillRect(-10,baseY+H-2,WW+20,400);
  blocks.forEach((b,i)=>block(b.x,baseY-i*H+(i===0?0:0),b.w,b.h));
  if(cur)block(cur.x,baseY-blocks.length*H,cur.w,cur.h);
  for(const d of debris){
    ctx.save();ctx.translate(d.x+d.w/2,d.y+H/2);ctx.rotate(d.rot);
    block(-d.w/2,-H/2,d.w,d.h);ctx.restore();
  }
  for(const f of fx){
    ctx.strokeStyle=`hsla(${f.h},90%,80%,${f.a})`;ctx.lineWidth=4;
    ctx.beginPath();ctx.ellipse(f.x,f.y,f.r,f.r*.28,0,0,7);ctx.stroke();
  }
  requestAnimationFrame(frame);
}
reset();
requestAnimationFrame(frame);
})();
