/* Presentation demo only. This does not implement the native simulation policy. */
(() => {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const language = document.documentElement.lang;
  const labels = document.body.dataset;
  const locale = language === 'fa' ? 'fa-IR' : 'en-US';
  const numberFormat = new Intl.NumberFormat(locale, { useGrouping: false });
  const stepFormat = new Intl.NumberFormat(locale, { minimumIntegerDigits: 3, useGrouping: false });
  const percentFormat = new Intl.NumberFormat(locale, { style: 'percent', maximumFractionDigits: 0 });
  document.querySelectorAll('a[lang]').forEach((link) => {
    const base = link.getAttribute('href');
    link.addEventListener('click', () => {
      const hash = window.location.hash;
      if (hash && document.getElementById(hash.slice(1))) link.setAttribute('href', base + hash);
    });
  });

  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const menu = document.querySelector('.menu-toggle');
  const nav = $('navigation');
  function closeMenu() {
    nav.classList.remove('open');
    menu.setAttribute('aria-expanded', 'false');
  }
  menu.addEventListener('click', () => {
    const open = nav.classList.toggle('open');
    menu.setAttribute('aria-expanded', String(open));
  });
  nav.addEventListener('click', (event) => {
    if (event.target.closest('a')) closeMenu();
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && nav.classList.contains('open')) {
      closeMenu();
      menu.focus();
    }
  });
  // Content remains visible if observers or canvas are unavailable.
  if ('IntersectionObserver' in window) {
    document.documentElement.classList.add('js');
    const reveals = new IntersectionObserver((entries) => {
      for (const entry of entries) if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        reveals.unobserve(entry.target);
      }
    }, { threshold: 0.08 });
    document.querySelectorAll('.reveal').forEach((element) => reveals.observe(element));
  }
  function randomSequence(seed) {
    return () => {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      return seed / 4294967296;
    };
  }
  function canvasSurface(canvas) {
    const context = canvas.getContext('2d');
    if (!context) return null;
    let width = 0;
    let height = 0;
    function resize() {
      const bounds = canvas.getBoundingClientRect();
      width = bounds.width;
      height = bounds.height;
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round(height * ratio);
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
    }
    if ('ResizeObserver' in window) new ResizeObserver(resize).observe(canvas);
    else window.addEventListener('resize', resize);
    resize();
    return { context, get width() { return width; }, get height() { return height; } };
  }
  const stage = canvasSurface($('simulation'));
  if (!stage) return;
  const COLS = 48;
  const ROWS = 26;
  const defaultObstacles = [
    { x: 10, y: 5, width: 8, height: 6 },
    { x: 10, y: 16, width: 8, height: 6 },
    { x: 27, y: 7, width: 7, height: 12 }
  ];
  let obstacles = defaultObstacles.map((block) => ({ ...block }));
  let selectedObstacle = 0;
  let obstacleDrag = null;
  const stageCanvas = $('simulation');
  const layoutText = language === 'fa' ? {
    help: 'مانع‌ها را بکش و جابه‌جا کن؛ با کلیدهای ۱ تا ۳ انتخاب و با کلیدهای جهت حرکت بده.',
    restore: 'چیدمان اولیه', changed: 'چیدمان تغییر کرد؛ دمو از ابتدا شروع شد.',
    blocked: 'بین مانع‌ها و مرز، یک خانه فاصله نگه دار.',
    selected: 'مانع', cancelled: 'جابه‌جایی لغو شد.'
  } : {
    help: 'Drag obstacles to move. Keys 1–3 select; arrow keys move.',
    restore: 'Reset layout', changed: 'Layout updated. Demo restarted.',
    blocked: 'Keep a clear cell between obstacles and the boundary.',
    selected: 'Obstacle', cancelled: 'Move cancelled.'
  };
  const layoutTools = document.createElement('div');
  layoutTools.className = 'layout-tools';
  const layoutHelp = document.createElement('span');
  layoutHelp.id = 'layout-help';
  layoutHelp.textContent = layoutText.help;
  const restoreLayout = document.createElement('button');
  restoreLayout.type = 'button';
  restoreLayout.textContent = layoutText.restore;
  const layoutStatus = document.createElement('span');
  layoutStatus.className = 'layout-status';
  layoutStatus.setAttribute('role', 'status');
  layoutTools.append(layoutHelp, restoreLayout, layoutStatus);
  document.querySelector('.lab').insertBefore(layoutTools, document.querySelector('.lab-body'));
  stageCanvas.tabIndex = 0;
  stageCanvas.setAttribute('role', 'group');
  stageCanvas.setAttribute('aria-describedby', layoutHelp.id);
  let walls;
  let distances;
  let exits;
  let agents;
  let step = 0;
  let evacuated = 0;
  let population = Number($('population').value);
  let playing = !motion.matches;
  let view = 'agents';
  let accumulator = 0;
  let progress = 1;
  const cellId = (x, y) => y * COLS + x;
  function neighbors(id) {
    const x = id % COLS;
    const y = Math.floor(id / COLS);
    return [[x+1,y],[x,y-1],[x,y+1],[x-1,y]]
      .filter(([nx,ny]) => nx >= 0 && ny >= 0 && nx < COLS && ny < ROWS)
      .map(([nx,ny]) => cellId(nx,ny)).filter((next) => !walls.has(next));
  }
  function createEnvironment() {
    walls = new Set();
    for (let x = 0; x < COLS; x++) { walls.add(cellId(x,0)); walls.add(cellId(x,ROWS-1)); }
    for (let y = 0; y < ROWS; y++) { walls.add(cellId(0,y)); walls.add(cellId(COLS-1,y)); }
    for (const block of obstacles) {
      for (let y=block.y; y<block.y+block.height; y++) {
        for (let x=block.x; x<block.x+block.width; x++) walls.add(cellId(x,y));
      }
    }
    exits = [cellId(COLS-1,12), cellId(COLS-1,13)];
    if ($('scenario').value === 'dual') exits.push(cellId(0,12),cellId(0,13));
    exits.forEach((id) => walls.delete(id));
    distances = new Map(exits.map((id) => [id, 0]));
    const queue = [...exits];
    for (let i=0; i<queue.length; i++) {
      const id = queue[i];
      for (const next of neighbors(id)) if (!distances.has(next)) {
        distances.set(next, distances.get(id) + 1);
        queue.push(next);
      }
    }
  }
  function reset() {
    finishObstacleDrag(false);
    createEnvironment();
    $('population-value').value = numberFormat.format(population);
    $('speed-value').value = `${numberFormat.format(Number($('speed').value))}×`;
    const random = randomSequence(42);
    const starts = [...distances.keys()].filter((id) => id % COLS > 2 && id % COLS < 26 && distances.get(id) > 4);
    for (let i=starts.length-1; i>0; i--) {
      const j = Math.floor(random() * (i+1));
      [starts[i], starts[j]] = [starts[j], starts[i]];
    }
    agents = starts.slice(0,population).map((id,index) => ({id, previous:id, index, trail:[]}));
    step = 0;
    evacuated = 0;
    accumulator = 0;
    progress = 1;
    updateStats();
    drawStage();
  }
  function tick() {
    // Simultaneous proposals accept only currently empty cells and unique destinations.
    const occupied = new Set(agents.map((agent) => agent.id));
    const reserved = new Set();
    const proposals = new Map();
    const order = [...agents].sort((a,b) => ((a.index + step) % population) - ((b.index + step) % population));
    for (const agent of order) {
      const candidates = neighbors(agent.id)
        .filter((id) => distances.get(id) < distances.get(agent.id))
        .sort((a,b) => distances.get(a) - distances.get(b));
      const target = candidates.find((id) => !occupied.has(id) && !reserved.has(id));
      if (target !== undefined) { proposals.set(agent.index,target); reserved.add(target); }
    }
    for (const agent of agents) {
      agent.previous = agent.id;
      if (proposals.has(agent.index)) {
        agent.trail.push(agent.id);
        if (agent.trail.length > 7) agent.trail.shift();
        agent.id = proposals.get(agent.index);
      }
    }
    agents = agents.filter((agent) => {
      if (exits.includes(agent.id)) { evacuated++; return false; }
      return true;
    });
    step++;
    if (!agents.length) playing = false;
    updateStats();
  }
  function updateStats() {
    $('step-count').textContent = stepFormat.format(step);
    $('remaining').textContent = numberFormat.format(agents.length);
    $('exited').textContent = numberFormat.format(evacuated);
    $('completion').textContent = percentFormat.format(evacuated/population);
    $('pause').textContent = playing ? labels.pause : labels.resume;
    $('run-status').textContent = agents.length ? (playing ? labels.running : labels.paused) : labels.complete;
  }
  function drawStage() {
    const { context: ctx, width: w, height: h } = stage;
    if (!w || !h) return;
    ctx.clearRect(0,0,w,h);
    const { size, ox, oy } = stageGeometry();
    const point = (id) => [ox+(id%COLS+0.5)*size,oy+(Math.floor(id/COLS)+0.5)*size];
    for (const id of walls) {
      const [x,y] = point(id);
      ctx.fillStyle = '#1947790c';
      ctx.fillRect(x-size/2,y-size/2,size-0.6,size-0.6);
    }
    obstacles.forEach((block, index) => {
      ctx.strokeStyle = index === selectedObstacle ? '#19477999' : '#19477955';
      ctx.lineWidth = 1;
      ctx.strokeRect(ox+block.x*size, oy+block.y*size, block.width*size, block.height*size);
      ctx.fillStyle = '#194779';
      ctx.font = '10px Vazirmatn, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(numberFormat.format(index+1), ox+(block.x+block.width/2)*size, oy+(block.y+block.height/2)*size+4);
    });
    if (view === 'density') {
      for (const agent of agents) {
        const [x,y] = point(agent.id);
        const gradient = ctx.createRadialGradient(x,y,0,x,y,size*2.6);
        gradient.addColorStop(0,'#19477960'); gradient.addColorStop(1,'#19477900');
        ctx.fillStyle = gradient; ctx.fillRect(x-size*3,y-size*3,size*6,size*6);
      }
    }
    for (const agent of agents) {
      const [px,py] = point(agent.previous);
      const [nx,ny] = point(agent.id);
      const x = px+(nx-px)*progress;
      const y = py+(ny-py)*progress;
      if (view === 'agents') {
        ctx.strokeStyle = '#19477927'; ctx.lineWidth = 1; ctx.beginPath();
        agent.trail.forEach((id,i) => { const [tx,ty]=point(id); if(i===0) ctx.moveTo(tx,ty); else ctx.lineTo(tx,ty); });
        ctx.lineTo(x,y); ctx.stroke();
      }
      ctx.fillStyle = agent.index % 7 === 0 ? '#34659a' : '#194779';
      ctx.beginPath(); ctx.arc(x,y,Math.max(1.7,size*0.22),0,Math.PI*2); ctx.fill();
    }
    for (const id of exits) {
      const [x,y]=point(id);ctx.fillStyle='#194779';ctx.fillRect(x-size/2,y-size/2,size,size);
    }
    ctx.fillStyle='#194779';ctx.font=language === 'fa' ? '10px Vazirmatn, sans-serif' : '8px Consolas, monospace';ctx.textAlign='right';
    ctx.fillText(language === 'fa' ? 'خروج →' : 'EXIT →', ox+COLS*size,oy-9);
    if ($('scenario').value === 'dual') {ctx.textAlign='left';ctx.fillText(language === 'fa' ? '← خروج' : '← EXIT',ox,oy-9);}
    if (obstacleDrag) {
      const block = obstacleDrag.preview;
      const valid = canPlaceObstacle(block, obstacleDrag.index);
      ctx.fillStyle = valid ? '#19477925' : '#b1435730';
      ctx.strokeStyle = valid ? '#194779' : '#b14357';
      ctx.lineWidth = 2;
      ctx.fillRect(ox+block.x*size, oy+block.y*size, block.width*size, block.height*size);
      ctx.strokeRect(ox+block.x*size, oy+block.y*size, block.width*size, block.height*size);
    }
  }
  function stageGeometry() {
    const size = Math.min((stage.width-32)/COLS, (stage.height-55)/ROWS);
    return { size, ox: (stage.width-COLS*size)/2, oy: (stage.height-ROWS*size)/2-6 };
  }
  function stageCell(event) {
    const bounds = stageCanvas.getBoundingClientRect();
    const { size, ox, oy } = stageGeometry();
    return {
      x: Math.floor(((event.clientX-bounds.left)*stage.width/bounds.width-ox)/size),
      y: Math.floor(((event.clientY-bounds.top)*stage.height/bounds.height-oy)/size)
    };
  }
  function canPlaceObstacle(candidate, index) {
    if (candidate.x < 2 || candidate.y < 2 ||
        candidate.x+candidate.width > COLS-2 || candidate.y+candidate.height > ROWS-2) return false;
    // One clear cell around each block preserves connected corridors and exit access.
    return obstacles.every((other, i) => i === index ||
      candidate.x >= other.x+other.width+1 || candidate.x+candidate.width+1 <= other.x ||
      candidate.y >= other.y+other.height+1 || candidate.y+candidate.height+1 <= other.y);
  }
  function moveObstacle(index, candidate) {
    if (!canPlaceObstacle(candidate, index)) {
      layoutStatus.textContent = layoutText.blocked;
      return false;
    }
    if (candidate.x === obstacles[index].x && candidate.y === obstacles[index].y) return false;
    obstacles[index] = { ...candidate };
    reset();
    layoutStatus.textContent = layoutText.changed;
    return true;
  }
  function finishObstacleDrag(commit) {
    if (!obstacleDrag) return;
    const drag = obstacleDrag;
    obstacleDrag = null;
    stageCanvas.classList.remove('dragging');
    if (stageCanvas.hasPointerCapture(drag.pointerId)) stageCanvas.releasePointerCapture(drag.pointerId);
    playing = drag.wasPlaying;
    if (!commit) layoutStatus.textContent = layoutText.cancelled;
    else moveObstacle(drag.index, drag.preview);
    updateStats();
    drawStage();
  }
  stageCanvas.addEventListener('pointerdown', (event) => {
    if (event.button !== 0 || obstacleDrag) return;
    const cell = stageCell(event);
    const index = obstacles.findIndex((block) => cell.x >= block.x && cell.x < block.x+block.width &&
      cell.y >= block.y && cell.y < block.y+block.height);
    if (index < 0) return;
    event.preventDefault();
    stageCanvas.focus({ preventScroll: true });
    selectedObstacle = index;
    obstacleDrag = { index, pointerId: event.pointerId, offsetX: cell.x-obstacles[index].x,
      offsetY: cell.y-obstacles[index].y, preview: { ...obstacles[index] }, wasPlaying: playing };
    playing = false;
    layoutStatus.textContent = `${layoutText.selected} ${numberFormat.format(index+1)}`;
    stageCanvas.setPointerCapture(event.pointerId);
    stageCanvas.classList.add('dragging');
    updateStats(); drawStage();
  });
  stageCanvas.addEventListener('pointermove', (event) => {
    const cell = stageCell(event);
    if (!obstacleDrag) {
      stageCanvas.classList.toggle('over-obstacle', obstacles.some((block) =>
        cell.x >= block.x && cell.x < block.x+block.width && cell.y >= block.y && cell.y < block.y+block.height));
      return;
    }
    if (event.pointerId !== obstacleDrag.pointerId) return;
    const block = obstacles[obstacleDrag.index];
    obstacleDrag.preview = { ...block,
      x: Math.max(2, Math.min(COLS-2-block.width, cell.x-obstacleDrag.offsetX)),
      y: Math.max(2, Math.min(ROWS-2-block.height, cell.y-obstacleDrag.offsetY)) };
    drawStage();
  });
  stageCanvas.addEventListener('pointerup', (event) => {
    if (obstacleDrag && event.pointerId === obstacleDrag.pointerId) finishObstacleDrag(true);
  });
  for (const type of ['pointercancel', 'lostpointercapture']) {
    stageCanvas.addEventListener(type, (event) => {
      if (obstacleDrag && event.pointerId === obstacleDrag.pointerId) finishObstacleDrag(false);
    });
  }
  stageCanvas.addEventListener('pointerleave', () => stageCanvas.classList.remove('over-obstacle'));
  window.addEventListener('blur', () => finishObstacleDrag(false));
  stageCanvas.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') { finishObstacleDrag(false); return; }
    if (obstacleDrag) return;
    const digit = '123۱۲۳'.indexOf(event.key);
    if (digit >= 0) {
      selectedObstacle = digit % 3;
      layoutStatus.textContent = `${layoutText.selected} ${numberFormat.format(selectedObstacle+1)}`;
      drawStage(); return;
    }
    const direction = { ArrowLeft: [-1,0], ArrowRight: [1,0], ArrowUp: [0,-1], ArrowDown: [0,1] }[event.key];
    if (!direction || obstacleDrag) return;
    event.preventDefault();
    const block = obstacles[selectedObstacle];
    moveObstacle(selectedObstacle, { ...block, x: block.x+direction[0], y: block.y+direction[1] });
  });
  restoreLayout.addEventListener('click', () => {
    finishObstacleDrag(false);
    obstacles = defaultObstacles.map((block) => ({ ...block }));
    reset();
    layoutStatus.textContent = layoutText.changed;
  });
  $('population').addEventListener('input', () => {
    population = Number($('population').value);
    $('population-value').value = numberFormat.format(population);
    reset();
  });
  $('speed').addEventListener('input', () => { $('speed-value').value = `${numberFormat.format(Number($('speed').value))}×`; });
  $('scenario').addEventListener('change', reset);
  $('reset').addEventListener('click', reset);
  $('pause').addEventListener('click', () => {
    if (!agents.length) reset();
    playing = !playing;
    accumulator = 0;
    updateStats();
  });
  document.querySelectorAll('[data-view]').forEach((button) => button.addEventListener('click', () => {
    view = button.dataset.view;
    document.querySelectorAll('[data-view]').forEach((item) => item.setAttribute('aria-pressed', String(item === button)));
    drawStage();
  }));
  motion.addEventListener('change', () => {
    if (motion.matches) playing = false;
    updateStats();
  });
  let stageVisible = false;
  if ('IntersectionObserver' in window) {
    const visibility = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        stageVisible = entry.isIntersecting;
      }
    });
    visibility.observe($('simulation'));
  } else stageVisible = true;
  let lastTime = 0;
  let frameId;
  function frame(time) {
    const dt = Math.min(time-lastTime,50);
    lastTime = time;
    if (stageVisible) {
      if (playing) {
        const interval = 145 / Number($('speed').value);
        accumulator += dt;
        if (accumulator >= interval) { accumulator %= interval; tick(); }
        progress = motion.matches ? 1 : Math.min(1,accumulator/interval);
      }
      drawStage();
    }
    frameId = requestAnimationFrame(frame);
  }
  document.addEventListener('visibilitychange', () => {
    finishObstacleDrag(false);
    cancelAnimationFrame(frameId);
    if (!document.hidden) { lastTime=performance.now(); frameId=requestAnimationFrame(frame); }
  });
  reset();
  frameId=requestAnimationFrame(frame);
})();
