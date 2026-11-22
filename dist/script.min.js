(function () {
  'use strict';

  const canvas = document.getElementById('animation-canvas');
  if (!canvas) return;

  const ctx = canvas.getContext('2d', { alpha: false, desynchronized: true });
  const framesFolder = canvas.getAttribute('data-folder') || 'frames';
  const FRAME_COUNT = parseInt(canvas.getAttribute('data-frame-count'), 10) || 240;

  // --- Ajustes de rendimiento y protección de memoria móvil ---
  const REDUCED_MOTION = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const conn = navigator.connection || {};
  // Detección estricta de móvil/tablet para adaptar el presupuesto de memoria RAM (OOM / Jetsam)
  const IS_MOBILE = window.innerWidth <= 768 || ('ontouchstart' in window && window.innerWidth <= 1024) || !!conn.saveData;

  const LOW_POWER = !!conn.saveData || /(^|-)(2g|3g)$/.test(conn.effectiveType || '');
  const FRAME_STEP = IS_MOBILE ? 2 : (LOW_POWER ? 2 : 1);
  const CONCURRENCY = IS_MOBILE ? 3 : (LOW_POWER ? 4 : 6);

  // Límite de fotogramas simultáneos en RAM para evitar que WebKit/Safari cierre la pestaña
  // En móvil: máximo 16 fotogramas (~32 MB de RAM con downsampling a 960x540)
  // En PC/Desktop: hasta 240 fotogramas
  const MAX_MEMORY_FRAMES = IS_MOBILE ? 16 : 240;

  // Ajusta un índice al frame más cercano que realmente se descarga
  function snapFrame(i) {
    if (FRAME_STEP === 1 || i >= FRAME_COUNT) return i;
    return Math.min(FRAME_COUNT, 1 + Math.round((i - 1) / FRAME_STEP) * FRAME_STEP);
  }

  // Preloaded frames array (1-indexed, size 241)
  const frames = new Array(FRAME_COUNT + 1).fill(null);
  const activeFrameKeys = [];

  let targetFrame = 1;
  let currentFrame = 1;
  let lastDrawnIndex = -1;
  let isFirstFrameRendered = false;
  // Tracks frames drawn as fallback that need a redraw when the real frame loads
  const pendingFrameUpdates = new Set();

  // Libera de forma activa la memoria del fotograma más alejado para no exceder MAX_MEMORY_FRAMES
  function evictExcessFrames(currentIndex) {
    if (activeFrameKeys.length <= MAX_MEMORY_FRAMES) return;

    let farthestIdx = -1;
    let maxDist = -1;
    let listPos = -1;

    for (let i = 0; i < activeFrameKeys.length; i++) {
      const idx = activeFrameKeys[i];
      if (idx === 1) continue; // Mantener siempre el fotograma 1 como ancla visual
      const dist = Math.abs(idx - currentIndex);
      if (dist > maxDist) {
        maxDist = dist;
        farthestIdx = idx;
        listPos = i;
      }
    }

    if (farthestIdx !== -1 && listPos !== -1) {
      activeFrameKeys.splice(listPos, 1);
      const oldItem = frames[farthestIdx];
      frames[farthestIdx] = null;
      if (oldItem && typeof oldItem.close === 'function') {
        try { oldItem.close(); } catch (e) {} // Libera la memoria de GPU y RAM de inmediato
      }
    }
  }

  function storeFrame(index, item) {
    frames[index] = item;
    if (!activeFrameKeys.includes(index)) {
      activeFrameKeys.push(index);
    }
    evictExcessFrames(Math.round(currentFrame));
  }

  // Format frame URL
  function getFrameUrl(index) {
    const paddedIndex = String(index).padStart(3, '0');
    return `${framesFolder}/ezgif-frame-${paddedIndex}.webp`;
  }

// Load a single frame via fetch + createImageBitmap for zero main-thread decoding jank
async function loadSingleFrame(index) {
  if (frames[index]) return frames[index];

  const url = getFrameUrl(index);
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const blob = await res.blob();
    if ('createImageBitmap' in window) {
      // En móvil se decodifica adaptando a 960x540 (ultra nítido en pantallas verticales) ahorrando 75% de RAM por frame
      let bitmap;
      if (IS_MOBILE) {
        try {
          bitmap = await createImageBitmap(blob, { resizeWidth: 960, resizeHeight: 540, resizeQuality: 'medium' });
        } catch (e) {
          bitmap = await createImageBitmap(blob);
        }
      } else {
        bitmap = await createImageBitmap(blob);
      }

      storeFrame(index, bitmap);
      // If this frame was previously drawn as a fallback, redraw it now
      if (pendingFrameUpdates.has(index)) {
        pendingFrameUpdates.delete(index);
        const snapped = snapFrame(Math.max(1, Math.min(FRAME_COUNT, Math.round(currentFrame))));
        if (snapped === index) drawFrame(index);
      }
      return bitmap;
    }
  } catch (e) {
    // Fallback to Image element
  }

  return new Promise((resolve) => {
    const img = new Image();
    img.src = url;
    img.onload = () => {
      storeFrame(index, img);
      // If this frame was previously drawn as a fallback, redraw it now
      if (pendingFrameUpdates.has(index)) {
        pendingFrameUpdates.delete(index);
        const snapped = snapFrame(Math.max(1, Math.min(FRAME_COUNT, Math.round(currentFrame))));
        if (snapped === index) drawFrame(index);
      }
      resolve(img);
    };
    img.onerror = () => {
      resolve(null);
    };
  });
}

// Draw a specific frame to the canvas with "cover" fit & crisp rendering
function drawFrame(index) {
  if (!canvas.width || !canvas.height) return;

  let isExactFrame = true;
  let img = frames[index];

  // If the target frame is not yet loaded, use the closest loaded frame as fallback
  if (!img) {
    isExactFrame = false;
    for (let offset = 1; offset < FRAME_COUNT; offset++) {
      if (index - offset >= 1 && frames[index - offset]) {
        img = frames[index - offset];
        break;
      }
      if (index + offset <= FRAME_COUNT && frames[index + offset]) {
        img = frames[index + offset];
        break;
      }
    }
    // Dispara la carga bajo demanda del fotograma objetivo
    loadSingleFrame(index);
  }

  if (!img) return;

  const cw = canvas.width;
  const ch = canvas.height;
  const imgW = img.width;
  const imgH = img.height;

  // Maintain aspect ratio: cover viewport
  const hRatio = cw / imgW;
  const vRatio = ch / imgH;
  const ratio = Math.max(hRatio, vRatio);

  const renderW = Math.ceil(imgW * ratio);
  const renderH = Math.ceil(imgH * ratio);
  const offsetX = Math.floor((cw - renderW) / 2);
  const offsetY = Math.floor((ch - renderH) / 2);

  ctx.drawImage(img, offsetX, offsetY, renderW, renderH);

  // Always mark as drawn so tick() can exit cleanly.
  // If it was a fallback, schedule a single re-draw once the real frame arrives.
  lastDrawnIndex = index;
  if (!isExactFrame) {
    pendingFrameUpdates.add(index);
  }
}

// Resize canvas buffer matching viewport & DPR for retina sharpness
function resize() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const w = window.innerWidth;
  const h = window.innerHeight;

  const bufferW = Math.floor(w * dpr);
  const bufferH = Math.floor(h * dpr);

  if (canvas.width !== bufferW || canvas.height !== bufferH) {
    canvas.width = bufferW;
    canvas.height = bufferH;
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
  }

  const currentIdx = snapFrame(Math.max(1, Math.min(FRAME_COUNT, Math.round(currentFrame))));
  drawFrame(currentIdx);
}

// Precarga dinámica adaptativa en móvil según la posición del scroll
let nearbyScrollTimer = null;
function requestNearbyFrames(centerIdx) {
  clearTimeout(nearbyScrollTimer);
  nearbyScrollTimer = setTimeout(() => {
    const step = FRAME_STEP;
    const count = IS_MOBILE ? 3 : 6;
    for (let offset = 1; offset <= count; offset++) {
      const forwardIdx = snapFrame(centerIdx + offset * step);
      const backwardIdx = snapFrame(centerIdx - offset * step);
      if (forwardIdx <= FRAME_COUNT && !frames[forwardIdx]) loadSingleFrame(forwardIdx);
      if (backwardIdx >= 1 && !frames[backwardIdx]) loadSingleFrame(backwardIdx);
    }
  }, 25);
}

// Calculate target frame from scroll position
function updateScrollTarget() {
  if (REDUCED_MOTION) {
    targetFrame = 1;
    return;
  }

  const scrollElement = document.documentElement;
  const maxScroll = scrollElement.scrollHeight - window.innerHeight;
  const scrollTop = Math.max(0, window.scrollY || scrollElement.scrollTop);

  const progress = maxScroll > 0 ? Math.min(Math.max(scrollTop / maxScroll, 0), 1) : 0;
  targetFrame = 1 + progress * (FRAME_COUNT - 1);
  wake();

  if (IS_MOBILE) {
    requestNearbyFrames(Math.round(targetFrame));
  }
}

// El bucle solo corre mientras hay algo que animar (ahorra batería en reposo)
let rafId = null;
function wake() {
  if (REDUCED_MOTION) return;
  if (rafId === null) rafId = requestAnimationFrame(tick);
}

// Smooth linear interpolation animation loop
function tick() {
  rafId = null;
  if (REDUCED_MOTION) return;

  // LERP damping for buttery smooth motion
  const diff = targetFrame - currentFrame;
  if (Math.abs(diff) > 0.0005) {
    currentFrame += diff * 0.08;
  } else {
    currentFrame = targetFrame;
  }

  const frameToDraw = snapFrame(Math.max(1, Math.min(FRAME_COUNT, Math.round(currentFrame))));
  if (frameToDraw !== lastDrawnIndex || !isFirstFrameRendered) {
    drawFrame(frameToDraw);
    isFirstFrameRendered = true;
  }

  // Seguir solo si aún se mueve o el frame exacto todavía no se ha dibujado
  if (currentFrame !== targetFrame || lastDrawnIndex !== frameToDraw) {
    rafId = requestAnimationFrame(tick);
  }
}

// Concurrent batch preloader
async function preloadAllFrames() {
  // 1. Inmediatamente carga y renderiza el Fotograma 1 (calidad nativa nítida)
  await loadSingleFrame(1);
  drawFrame(1);
  isFirstFrameRendered = true;

  if (REDUCED_MOTION) return;

  // En móvil: precarga suavemente solo los primeros 10 fotogramas iniciales
  // El resto se carga y recicla en tiempo real con la ventana deslizante al hacer scroll
  if (IS_MOBILE) {
    for (let i = 2; i <= Math.min(10, FRAME_COUNT); i += FRAME_STEP) {
      loadSingleFrame(i);
    }
    return;
  }

  // El resto espera a que la página termine de cargar (fuentes, logos) y al navegador libre
  if (document.readyState !== 'complete') {
    await new Promise((r) => window.addEventListener('load', r, { once: true }));
  }
  await new Promise((r) => ('requestIdleCallback' in window
    ? requestIdleCallback(r, { timeout: 1500 })
    : setTimeout(r, 300)));

  // 2. Fast pass: Preload keyframes evenly across the timeline (every 8th frame)
  // This guarantees instant responsiveness if user scrubs immediately.
  const keyframes = [];
  for (let i = 8; i <= FRAME_COUNT; i += 8) {
    keyframes.push(snapFrame(i));
  }

  // Helper to process queues concurrently
  async function runPool(queue, concurrency = 16) {
    const workers = Array.from({ length: concurrency }, async () => {
      while (queue.length > 0) {
        const idx = queue.shift();
        if (idx !== undefined) {
          await loadSingleFrame(idx);
        }
      }
    });
    await Promise.all(workers);
  }

  await runPool([...new Set(keyframes)], Math.min(8, CONCURRENCY));

  // 3. Complete pass: Preload all remaining frames in sequential order
  const remaining = [];
  for (let i = 2; i <= FRAME_COUNT; i++) {
    const wanted = FRAME_STEP === 1 || (i - 1) % FRAME_STEP === 0 || i === FRAME_COUNT;
    if (wanted && !frames[i]) remaining.push(i);
  }

  await runPool(remaining, CONCURRENCY);
}

// Event listeners
function handleResize() {
  resize();
  updateScrollTarget();
}

window.addEventListener('scroll', updateScrollTarget, { passive: true });
window.addEventListener('resize', handleResize, { passive: true });
window.addEventListener('orientationchange', handleResize, { passive: true });
window.addEventListener('load', handleResize, { passive: true });

// Initialize
resize();
updateScrollTarget();
wake();
preloadAllFrames();
})();

