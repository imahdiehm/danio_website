/* A finite, optional brand entrance. The masthead itself is always a static image. */
(() => {
  'use strict';
  const wordmark = document.querySelector('.brand-masthead');
  const image = wordmark.querySelector('img');
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const sessionKey = 'danio-intro-seen';
  const pageStarted = performance.now();
  let seen = false;
  try { seen = sessionStorage.getItem(sessionKey) === 'yes'; } catch { /* Storage is optional. */ }
  if (seen || reducedMotion.matches || location.hash || scrollY > 10) return;
  function prepareWordmark() {
    if (!image.naturalWidth) return;
    try {
      const source = document.createElement('canvas');
      source.width = Math.min(1100, image.naturalWidth);
      source.height = Math.round(source.width * image.naturalHeight / image.naturalWidth);
      const ctx = source.getContext('2d', { willReadFrequently: true });
      if (!ctx) return;
      ctx.drawImage(image, 0, 0, source.width, source.height);
      const { data } = ctx.getImageData(0, 0, source.width, source.height);
      const { width, height } = source;
      const visited = new Uint8Array(width * height);
      const queue = new Int32Array(width * height);
      const parts = [];
      for (let start = 0; start < visited.length; start++) {
        if (visited[start] || data[start * 4 + 3] < 32) continue;
        let head = 0, tail = 1;
        queue[0] = start;
        visited[start] = 1;
        let left = width, right = 0, top = height, bottom = 0;
        while (head < tail) {
          const id = queue[head++];
          const x = id % width, y = Math.floor(id / width);
          left = Math.min(left, x); right = Math.max(right, x);
          top = Math.min(top, y); bottom = Math.max(bottom, y);
          for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
              const nx = x + dx, ny = y + dy;
              if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;
              const next = ny * width + nx;
              if (visited[next] || data[next * 4 + 3] < 32) continue;
              visited[next] = 1;
              queue[tail++] = next;
            }
          }
        }
        if (tail < 2) continue;
        left = Math.max(0, left - 1); top = Math.max(0, top - 1);
        right = Math.min(width - 1, right + 1); bottom = Math.min(height - 1, bottom + 1);
        const pw=right-left+1, ph=bottom-top+1;
        const mask=ctx.createImageData(pw,ph);
        for(let i=0;i<tail;i++) {
          const id=queue[i], x=id%width-left, y=Math.floor(id/width)-top;
          const pixel=(y*pw+x)*4;
          for(let channel=0;channel<4;channel++) mask.data[pixel+channel]=data[id*4+channel];
        }
        parts.push({ x:left, y:top, w:pw, h:ph, mask });
      }
      if (!parts.length) return;
      // Isolate each island in one packed texture so neighbouring dots are not
      // accidentally redrawn as cropped rectangles when a particle darts away.
      const atlas=document.createElement('canvas');
      atlas.width=width;
      let ax=0, ay=0, rowHeight=0;
      for(const part of parts) {
        if(ax+part.w>width) {ax=0;ay+=rowHeight+2;rowHeight=0;}
        part.sx=ax;part.sy=ay;ax+=part.w+2;rowHeight=Math.max(rowHeight,part.h);
      }
      atlas.height=ay+rowHeight;
      const atlasContext=atlas.getContext('2d');
      if(!atlasContext) return;
      for(const part of parts) {atlasContext.putImageData(part.mask,part.sx,part.sy);delete part.mask;}
      startIntro(source, parts, atlas);
    } catch {
      // The original image remains visible when pixel access is unavailable.
    }
  }

  function startIntro(source, parts, atlas) {
    // Never cover a page the visitor has already started using while an asset loaded.
    if (performance.now()-pageStarted > 1500 || scrollY > 10 || document.hidden) return;
    const overlay = document.createElement('div');
    overlay.className = 'brand-intro';
    overlay.setAttribute('role','dialog');
    overlay.setAttribute('aria-modal','true');
    overlay.setAttribute('aria-label', document.documentElement.lang === 'fa' ? 'معرفی دانیو' : 'Introducing Danio');
    const canvas = document.createElement('canvas');
    canvas.setAttribute('aria-hidden','true');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const skip = document.createElement('button');
    skip.className = 'intro-skip';
    skip.type = 'button';
    skip.textContent = document.documentElement.lang === 'fa' ? 'ورود به سایت' : 'Enter the site';
    overlay.append(canvas,skip);
    const previousFocus = document.activeElement;
    const previousInert = Array.from(document.body.children, element => [element,element.inert]);
    previousInert.forEach(([element]) => { element.inert = true; });
    document.body.append(overlay);
    document.body.classList.add('intro-running');
    wordmark.classList.add('intro-active');
    skip.focus({preventScroll:true});
    const w = innerWidth, h = innerHeight;
    const ratio = Math.min(devicePixelRatio || 1,2);
    canvas.width = Math.round(w*ratio); canvas.height = Math.round(h*ratio);
    ctx.setTransform(ratio,0,0,ratio,0,0);
    const target = image.getBoundingClientRect();
    const start = performance.now();
    let frameId = null;
    let done = false;
    const smooth = x => { const t=Math.max(0,Math.min(1,x)); return t*t*(3-2*t); };
    const mix = (a,b,t) => a+(b-a)*t;
    const finish = () => {
      if (done) return;
      done = true;
      cancelAnimationFrame(frameId);
      clearTimeout(failsafe);
      overlay.remove();
      wordmark.classList.remove('intro-active');
      document.body.classList.remove('intro-running');
      previousInert.forEach(([element,value]) => { element.inert = value; });
      window.removeEventListener('resize',finish);
      window.removeEventListener('pagehide',finish);
      document.removeEventListener('visibilitychange',onVisibility);
      reducedMotion.removeEventListener('change',onMotion);
      if (document.activeElement === document.body && previousFocus?.isConnected) previousFocus.focus({preventScroll:true});
      try { sessionStorage.setItem(sessionKey,'yes'); } catch { /* Storage is optional. */ }
    };
    const onVisibility = () => { if (document.hidden) finish(); };
    const onMotion = () => { if (reducedMotion.matches) finish(); };
    const failsafe = setTimeout(finish,4000);
    skip.addEventListener('click',finish);
    overlay.addEventListener('keydown',event => {
      if (event.key === 'Escape') { event.preventDefault(); finish(); }
      if (event.key === 'Tab') { event.preventDefault(); skip.focus(); }
    });
    window.addEventListener('resize',finish);
    window.addEventListener('pagehide',finish);
    document.addEventListener('visibilitychange',onVisibility);
    reducedMotion.addEventListener('change',onMotion);
    function frame(now) {
      if (done) return;
      const ms = now-start;
      if (ms >= 2750) { finish(); return; }
      const dock = smooth((ms-1750)/1000);
      const activity = 1-smooth((ms-700)/1200);
      overlay.style.backgroundColor = `rgba(243,239,229,${1-dock})`;
      skip.style.opacity = String(1-dock);
      const box = { x:mix(w*.035,target.x,dock), y:mix(h*.12,target.y,dock),
        width:mix(w*.93,target.width,dock), height:mix(h*.76,target.height,dock) };
      const scale = Math.min(box.width/source.width,box.height/source.height);
      const ox=box.x+(box.width-source.width*scale)/2;
      const oy=box.y+(box.height-source.height*scale)/2;
      ctx.clearRect(0,0,w,h);
      parts.forEach((part,i) => {
        // Independent, short dart-and-settle paths; no shared wave across the type.
        const phase = ((i*137.508)%360)*Math.PI/180;
        const dart = Math.exp(-ms/(430+(i%7)*65));
        const dx = activity*(Math.cos(phase)*8*dart+Math.sin(ms*.006+phase)*1.4)*Math.min(1,scale);
        const dy = activity*(Math.sin(phase)*6*dart+Math.cos(ms*.005+phase*3)*1.0)*Math.min(1,scale);
        const x=ox+(part.x+part.w/2)*scale+dx;
        const y=oy+(part.y+part.h/2)*scale+dy;
        const tiny = part.w < 11 && part.h < 11;
        if (tiny && activity > .025) {
          const r=Math.max(.7,Math.min(part.w,part.h)*scale*.40);
          ctx.save();ctx.translate(x,y);ctx.rotate(phase+Math.sin(ms*.012+phase)*.15*activity);
          ctx.fillStyle='#194779';ctx.beginPath();
          ctx.ellipse(0,0,r*(1+activity*.65),r*(1-activity*.15),0,0,Math.PI*2);ctx.fill();
          ctx.globalAlpha=activity*.65;ctx.beginPath();
          ctx.moveTo(-r*.8,0);ctx.lineTo(-r*(1+activity),-r*.55);
          ctx.lineTo(-r*(1+activity),r*.55);ctx.closePath();ctx.fill();ctx.restore();
        } else {
          ctx.drawImage(atlas,part.sx,part.sy,part.w,part.h,x-part.w*scale/2,y-part.h*scale/2,part.w*scale,part.h*scale);
        }
      });
      frameId=requestAnimationFrame(frame);
    }
    frameId=requestAnimationFrame(frame);
  }
  if (image.complete) prepareWordmark();
  else image.addEventListener('load',prepareWordmark,{once:true});
})();
