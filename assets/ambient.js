/* Decorative multi-route floor plan; independent of the native ABM and brand intro. */
(() => {
  'use strict';
  const flowCanvas=document.getElementById('swarm');
  const ctx=flowCanvas.getContext('2d');
  if (!ctx) return;
  const toggle=document.querySelector('.motion-toggle');
  const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)');
  const persian=document.documentElement.lang === 'fa';
  let paused=reducedMotion.matches, elapsed=0, lastTime=0, lastPaint=0, frameId=null;
  let visible=true, width=0, height=0, seed=42;
  const random=() => { seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296; };

  // Shared junctions make every route part of the same connected floor plan.
  const nodes={
    W:[.025,.52], A:[.25,.52], B:[.50,.52], C:[.75,.52], E:[.975,.52],
    D:[.25,.27], F:[.50,.27], G:[.75,.27],
    H:[.25,.77], I:[.50,.77], J:[.75,.77],
    N1:[.25,.045], N2:[.50,.045], N3:[.75,.045],
    S1:[.25,.955], S2:[.50,.955], S3:[.75,.955]
  };
  const itineraries=[
    ['W','A','B','C','E'], ['W','A','D','F','G','C','E'],
    ['W','A','H','I','J','C','E'], ['N1','D','A','B','I','S2'],
    ['N2','F','B','C','J','S3'], ['N3','G','F','D','A','W'],
    ['S1','H','I','B','F','N2'], ['S3','J','I','H','A','W'],
    ['N1','D','F','G','N3'], ['S1','H','A','B','C','G','N3'],
    ['N2','F','B','I','S2'], ['E','C','J','I','H','S1']
  ];
  function roundedRoute(keys) {
    const input=keys.map(key=>nodes[key]);
    const points=[input[0]];
    for (let i=1;i<input.length-1;i++) {
      const a=input[i-1], b=input[i], c=input[i+1];
      const before=Math.hypot(b[0]-a[0],b[1]-a[1]);
      const after=Math.hypot(c[0]-b[0],c[1]-b[1]);
      const r=Math.min(.035,before/3,after/3);
      const p=[b[0]+(a[0]-b[0])*r/before,b[1]+(a[1]-b[1])*r/before];
      const q=[b[0]+(c[0]-b[0])*r/after,b[1]+(c[1]-b[1])*r/after];
      points.push(p);
      for (let j=1;j<=6;j++) {
        const t=j/6,u=1-t;
        points.push([u*u*p[0]+2*u*t*b[0]+t*t*q[0],u*u*p[1]+2*u*t*b[1]+t*t*q[1]]);
      }
    }
    points.push(input[input.length-1]);
    const distances=[0];
    for (let i=1;i<points.length;i++) distances.push(distances[i-1]+Math.hypot((points[i][0]-points[i-1][0])*2,points[i][1]-points[i-1][1]));
    return {points,distances,length:distances[distances.length-1]};
  }
  const routes=itineraries.map(roundedRoute);
  const agents=Array.from({length:620},(_,i)=>({
    route:routes[i%routes.length],phase:random(),reverse:i%3===0,
    lane:(random()+random()+random()-1.5)/1.5,speed:.8+random()*.4,
    radius:.7+random()*.8,offsetX:0,offsetY:0
  }));
  function routePoint(route,t) {
    const target=Math.max(0,Math.min(1,t))*route.length;
    let i=1;
    while (i<route.distances.length-1 && route.distances[i]<target) i++;
    const a=route.points[i-1],b=route.points[i];
    const fraction=(target-route.distances[i-1])/(route.distances[i]-route.distances[i-1] || 1);
    return {x:a[0]+(b[0]-a[0])*fraction,y:a[1]+(b[1]-a[1])*fraction,dx:b[0]-a[0],dy:b[1]-a[1]};
  }
  const pointer = { x: 0, y: 0, active: false, held: false };
  function resetPointer() {
    pointer.active = false;
    pointer.held = false;
    flowCanvas.dataset.pointerMode = 'idle';
  }
  function trackPointer(event) {
    const bounds = flowCanvas.getBoundingClientRect();
    pointer.x = event.clientX - bounds.left;
    pointer.y = event.clientY - bounds.top;
    pointer.active = true;
    pointer.held = (event.buttons & 1) !== 0;
    flowCanvas.dataset.pointerMode = pointer.held ? 'gather' : 'steer';
  }
  flowCanvas.setAttribute('aria-describedby', 'field-hint');
  flowCanvas.addEventListener('pointermove', trackPointer);
  flowCanvas.addEventListener('pointerdown', (event) => { if (event.button === 0) trackPointer(event); });
  flowCanvas.addEventListener('pointerleave', resetPointer);
  flowCanvas.addEventListener('pointercancel', resetPointer);
  window.addEventListener('pointerup', (event) => {
    if (event.pointerType === 'touch') resetPointer();
    else { pointer.held = false; flowCanvas.dataset.pointerMode = pointer.active ? 'steer' : 'idle'; }
  });
  window.addEventListener('blur', resetPointer);
  resetPointer();

  function drawFloor(w,h) {
    const line=(points,color='#19477955',size=.85)=>{
      ctx.beginPath();points.forEach(([x,y],i)=>{if(i)ctx.lineTo(x*w,y*h);else ctx.moveTo(x*w,y*h);});
      ctx.strokeStyle=color;ctx.lineWidth=size;ctx.stroke();
    };
    // Soft circulation surfaces join at the shared intersections.
    ctx.lineCap='round';ctx.lineJoin='round';
    for (const keys of [['W','A','B','C','E'],['N1','D','A','H','S1'],['N2','F','B','I','S2'],['N3','G','C','J','S3'],['D','F','G'],['H','I','J']]) {
      line(keys.map(key=>nodes[key]),'#19477907',h*.13);
    }
    // Building perimeter with open portals rather than closed walls across routes.
    for (const y of [.08,.92]) {
      for(const [x1,x2] of [[.065,.215],[.285,.465],[.535,.715],[.785,.935]]) line([[x1,y],[x2,y]]);
    }
    for(const x of [.065,.935]) {line([[x,.08],[x,.465]]);line([[x,.575],[x,.92]]);}
    const rooms=[
      [.115,.15,.085,.28],[.30,.35,.14,.095],[.56,.35,.14,.095],
      [.30,.60,.14,.095],[.56,.60,.14,.095],[.80,.61,.085,.23]
    ];
    rooms.forEach(([x,y,rw,rh],i)=>{
      ctx.fillStyle='#f4f0e7';ctx.fillRect(x*w,y*h,rw*w,rh*h);
      ctx.strokeStyle='#19477955';ctx.lineWidth=.8;ctx.strokeRect(x*w,y*h,rw*w,rh*h);
      ctx.fillStyle='#19477970';ctx.font=`${Math.max(7,w*.013)}px Vazirmatn, sans-serif`;ctx.textAlign='center';
      if (i>0 && i<5) ctx.fillText(String(i).padStart(2,'0'),(x+rw/2)*w,(y+rh/2)*h+3);
    });
    // Room partitions, door swings and stairs add architectural scale.
    line([[.115,.29],[.20,.29]],'#19477935');
    for(let i=1;i<8;i++) line([[.805,.63+i*.024],[.88,.63+i*.024]],'#19477935',.6);
    for(const x of [.30,.56]) {
      line([[x+.03,.445],[x+.03,.415],[x+.065,.415]],'#19477945',.6);
      line([[x+.075,.60],[x+.075,.63],[x+.11,.63]],'#19477945',.6);
    }
    // Small entrance ticks at the eight portals keep the plan legible at mobile size.
    for(const key of ['N1','N2','N3','S1','S2','S3']) {
      const [x,y]=nodes[key];line([[x-.015,y],[x+.015,y]],'#19477980',1.1);
    }
    ctx.lineCap='butt';
  }
  function drawFlow(dt) {
    if(!width || !height) return;
    ctx.clearRect(0,0,width,height);
    const px=width*.035,py=height*.055,w=width-px*2,h=height-py*2;
    ctx.save();ctx.translate(px,py);drawFloor(w,h);
    const interactive=pointer.active && !paused && !reducedMotion.matches;
    const radius=Math.min(width,height)*.21,blend=1-Math.exp(-dt/180);
    for(const agent of agents) {
      const cycle=(agent.phase+elapsed*.000035*agent.speed/agent.route.length)%1;
      const p=routePoint(agent.route,agent.reverse?1-cycle:cycle);
      const angle=Math.atan2(p.dy*h,p.dx*w)+(agent.reverse?Math.PI:0);
      const lateral=agent.lane*h*.038;
      const x=p.x*w-Math.sin(angle)*lateral,y=p.y*h+Math.cos(angle)*lateral;
      const dx=x+px-pointer.x,dy=y+py-pointer.y,distance=Math.hypot(dx,dy);
      let tx=0,ty=0;
      if(interactive && distance<radius) {
        const strength=(1-distance/radius)**2*(pointer.held?-1:1);
        const direction=distance>.01?Math.atan2(dy,dx):agent.phase*6.28;
        const displacement=Math.min(radius*.23,distance*.5)*strength;
        tx=Math.cos(direction)*displacement;ty=Math.sin(direction)*displacement;
      }
      if(!paused) {agent.offsetX+=(tx-agent.offsetX)*blend;agent.offsetY+=(ty-agent.offsetY)*blend;}
      const fade=Math.min(1,cycle*24,(1-cycle)*24);
      ctx.fillStyle=`rgba(25,71,121,${fade*(.50+agent.radius*.22)})`;
      ctx.beginPath();ctx.ellipse(x+agent.offsetX,y+agent.offsetY,agent.radius*1.2,agent.radius*.85,angle,0,Math.PI*2);ctx.fill();
    }
    ctx.restore();
  }
  function resize() {
    const bounds=flowCanvas.getBoundingClientRect();width=bounds.width;height=bounds.height;
    const ratio=Math.min(devicePixelRatio||1,2);
    flowCanvas.width=Math.round(width*ratio);flowCanvas.height=Math.round(height*ratio);
    ctx.setTransform(ratio,0,0,ratio,0,0);drawFlow(0);
  }
  function frame(time) {
    frameId=null;
    const dt=lastTime?Math.min(time-lastTime,60):0;lastTime=time;
    if(!paused) elapsed+=dt;
    if(time-lastPaint>=32) {drawFlow(Math.min(60,time-lastPaint));lastPaint=time;}
    if(!paused && visible && !document.hidden) frameId=requestAnimationFrame(frame);
  }
  function syncPlayback() {
    if(frameId!==null) cancelAnimationFrame(frameId);
    frameId=null;lastTime=0;
    toggle.textContent=persian?(paused?'اجرای حرکت':'توقف حرکت'):(paused?'Play motion':'Pause motion');
    toggle.setAttribute('aria-pressed',String(!paused));toggle.dataset.playing=String(!paused);
    if(!document.hidden) {drawFlow(0);if(!paused && visible) frameId=requestAnimationFrame(frame);}
  }
  toggle.addEventListener('click',()=>{paused=!paused;syncPlayback();});
  reducedMotion.addEventListener('change',()=>{paused=reducedMotion.matches;resetPointer();syncPlayback();});
  document.addEventListener('visibilitychange',()=>{resetPointer();syncPlayback();});
  if('IntersectionObserver' in window) new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;syncPlayback();}).observe(flowCanvas);
  if('ResizeObserver' in window) new ResizeObserver(resize).observe(flowCanvas);
  else window.addEventListener('resize',resize);
  resize();syncPlayback();
})();
