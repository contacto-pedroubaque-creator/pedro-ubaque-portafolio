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
  // Detección estricta de móvil/tablet para prevenir el crash de memoria RAM (OOM / Jetsam) en iOS WebKit y Android
  const IS_MOBILE = window.innerWidth <= 768 || ('ontouchstart' in window && window.innerWidth <= 1024) || !!conn.saveData;
  const STATIC_BG = REDUCED_MOTION || IS_MOBILE;

  const LOW_POWER = !!conn.saveData || /(^|-)(2g|3g)$/.test(conn.effectiveType || '');
  const FRAME_STEP = LOW_POWER ? 2 : 1;
  const CONCURRENCY = LOW_POWER ? 4 : 6;

  // Ajusta un índice al frame más cercano que realmente se descarga
  function snapFrame(i) {
    if (FRAME_STEP === 1 || i >= FRAME_COUNT) return i;
    return Math.min(FRAME_COUNT, 1 + Math.round((i - 1) / FRAME_STEP) * FRAME_STEP);
  }

  // Preloaded frames array (1-indexed, size 241)
  const frames = new Array(FRAME_COUNT + 1).fill(null);

  let targetFrame = 1;
  let currentFrame = 1;
  let lastDrawnIndex = -1;
  let isFirstFrameRendered = false;
  // Tracks frames drawn as fallback that need a redraw when the real frame loads
  const pendingFrameUpdates = new Set();

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
      const bitmap = await createImageBitmap(blob);
      frames[index] = bitmap;
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
      frames[index] = img;
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

// Calculate target frame from scroll position
function updateScrollTarget() {
  if (STATIC_BG) {
    targetFrame = 1;
    return;
  }

  const scrollElement = document.documentElement;
  const maxScroll = scrollElement.scrollHeight - window.innerHeight;
  const scrollTop = Math.max(0, window.scrollY || scrollElement.scrollTop);

  const progress = maxScroll > 0 ? Math.min(Math.max(scrollTop / maxScroll, 0), 1) : 0;
  targetFrame = 1 + progress * (FRAME_COUNT - 1);
  wake();
}

// El bucle solo corre mientras hay algo que animar (ahorra batería en reposo)
let rafId = null;
function wake() {
  if (STATIC_BG) return;
  if (rafId === null) rafId = requestAnimationFrame(tick);
}

// Smooth linear interpolation animation loop
function tick() {
  rafId = null;
  if (STATIC_BG) return;

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

  // En móvil / ahorro de datos o con "reducir movimiento":
  // Se detiene aquí. Solo se usa el fotograma 1 (~8 MB RAM).
  // Esto elimina el 100% de los cierres forzosos (Jetsam OOM Crash) en iOS Safari y Android.
  if (STATIC_BG) return;

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

