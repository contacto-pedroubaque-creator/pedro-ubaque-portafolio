(function () {
  'use strict';

  const canvas = document.getElementById('animation-canvas');
  if (!canvas) return;

  const ctx = canvas.getContext('2d', { alpha: false, desynchronized: true });
  const framesFolder = canvas.getAttribute('data-folder') || 'frames';
  const FRAME_COUNT = parseInt(canvas.getAttribute('data-frame-count'), 10) || 240;

  // --- Detección de dispositivo y límites de memoria adaptativos ---
  const REDUCED_MOTION = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const conn = navigator.connection || {};
  const IS_MOBILE = window.innerWidth <= 768 || ('ontouchstart' in window && window.innerWidth <= 1024) || !!conn.saveData;

  // En móvil usamos saltos de 2 frames para máxima ligereza y scroll reactivo
  const FRAME_STEP = IS_MOBILE ? 2 : 1;
  const CONCURRENCY = IS_MOBILE ? 2 : 6;

  // En móvil limitamos la memoria en RAM a máximo 12 fotogramas (con ImageBitmap.close() para liberar GPU)
  // En escritorio podemos almacenar hasta FRAME_COUNT fotogramas en RAM
  const MAX_CACHED_FRAMES = IS_MOBILE ? 12 : (FRAME_COUNT + 1);
  const frameCache = new Map(); // index -> ImageBitmap | HTMLImageElement
  const inFlightRequests = new Map();

  // Ajusta un índice al frame más cercano según el paso
  function snapFrame(i) {
    if (FRAME_STEP === 1 || i >= FRAME_COUNT) return i;
    return Math.min(FRAME_COUNT, 1 + Math.round((i - 1) / FRAME_STEP) * FRAME_STEP);
  }

  let targetFrame = 1;
  let currentFrame = 1;
  let lastDrawnIndex = -1;
  let isFirstFrameRendered = false;
  const pendingFrameUpdates = new Set();

  function getFrameUrl(index) {
    const paddedIndex = String(index).padStart(3, '0');
    return `${framesFolder}/ezgif-frame-${paddedIndex}.webp`;
  }

  // Almacena un fotograma en la caché con desalojo LRU seguro para evitar OOM
  function storeFrame(index, imgOrBitmap) {
    if (!imgOrBitmap) return;

    if (frameCache.has(index)) {
      // Mover al final (más recientemente usado)
      frameCache.delete(index);
      frameCache.set(index, imgOrBitmap);
      return;
    }

    // Si excede el límite de memoria permitido (especialmente en móvil):
    if (frameCache.size >= MAX_CACHED_FRAMES) {
      let evictKey = null;
      for (const k of frameCache.keys()) {
        // Mantener siempre el frame 1 (fallback permanente) y evitar desalojar el fotograma actual
        if (k !== 1 && Math.abs(k - targetFrame) > 3) {
          evictKey = k;
          break;
        }
      }
      if (evictKey === null) {
        for (const k of frameCache.keys()) {
          if (k !== 1) {
            evictKey = k;
            break;
          }
        }
      }

      if (evictKey !== null) {
        const oldItem = frameCache.get(evictKey);
        frameCache.delete(evictKey);
        // ImageBitmap.close() libera la memoria de textura en la GPU inmediatamente en WebKit
        if (oldItem && typeof oldItem.close === 'function') {
          try { oldItem.close(); } catch (e) {}
        }
      }
    }

    frameCache.set(index, imgOrBitmap);
  }

  function getCachedFrame(index) {
    if (frameCache.has(index)) {
      const item = frameCache.get(index);
      frameCache.delete(index);
      frameCache.set(index, item);
      return item;
    }
    return null;
  }

  function findClosestFrame(index) {
    if (frameCache.has(index)) return frameCache.get(index);
    for (let offset = 1; offset < FRAME_COUNT; offset++) {
      if (index - offset >= 1 && frameCache.has(index - offset)) {
        return frameCache.get(index - offset);
      }
      if (index + offset <= FRAME_COUNT && frameCache.has(index + offset)) {
        return frameCache.get(index + offset);
      }
    }
    return frameCache.get(1) || null;
  }

  // Carga un fotograma bajo demanda con reescalado ligero en móvil
  async function loadSingleFrame(index) {
    const cached = getCachedFrame(index);
    if (cached) return cached;
    if (inFlightRequests.has(index)) return inFlightRequests.get(index);

    const promise = (async () => {
      const url = getFrameUrl(index);
      try {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const blob = await res.blob();

        if ('createImageBitmap' in window) {
          let bitmap;
          // En móvil reescalamos a máximo 800px para ahorrar 75% de RAM por imagen
          if (IS_MOBILE && canvas.width) {
            const maxW = Math.min(800, canvas.width);
            bitmap = await createImageBitmap(blob, {
              resizeWidth: maxW,
              resizeQuality: 'medium'
            });
          } else {
            bitmap = await createImageBitmap(blob);
          }

          storeFrame(index, bitmap);

          if (pendingFrameUpdates.has(index)) {
            pendingFrameUpdates.delete(index);
            const snapped = snapFrame(Math.max(1, Math.min(FRAME_COUNT, Math.round(currentFrame))));
            if (snapped === index) drawFrame(index);
          }
          return bitmap;
        }
      } catch (e) {
        // Fallback a Image
      }

      return new Promise((resolve) => {
        const img = new Image();
        img.src = url;
        img.onload = () => {
          storeFrame(index, img);
          if (pendingFrameUpdates.has(index)) {
            pendingFrameUpdates.delete(index);
            const snapped = snapFrame(Math.max(1, Math.min(FRAME_COUNT, Math.round(currentFrame))));
            if (snapped === index) drawFrame(index);
          }
          resolve(img);
        };
        img.onerror = () => resolve(null);
      });
    })();

    inFlightRequests.set(index, promise);
    try {
      const res = await promise;
      return res;
    } finally {
      inFlightRequests.delete(index);
    }
  }

  // Dibuja el fotograma en canvas con ajuste tipo "cover"
  function drawFrame(index) {
    if (!canvas.width || !canvas.height) return;

    let isExactFrame = true;
    let img = getCachedFrame(index);

    if (!img) {
      isExactFrame = false;
      img = findClosestFrame(index);
      // Solicitar el fotograma exacto bajo demanda
      loadSingleFrame(index);
    }

    if (!img) return;

    const cw = canvas.width;
    const ch = canvas.height;
    const imgW = img.width;
    const imgH = img.height;

    const hRatio = cw / imgW;
    const vRatio = ch / imgH;
    const ratio = Math.max(hRatio, vRatio);

    const renderW = Math.ceil(imgW * ratio);
    const renderH = Math.ceil(imgH * ratio);
    const offsetX = Math.floor((cw - renderW) / 2);
    const offsetY = Math.floor((ch - renderH) / 2);

    ctx.drawImage(img, offsetX, offsetY, renderW, renderH);

    lastDrawnIndex = index;
    if (!isExactFrame) {
      pendingFrameUpdates.add(index);
    }
  }

  // Redimensiona el buffer del canvas
  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, IS_MOBILE ? 1.5 : 2);
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

  // Calcula el frame objetivo según el scroll
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

    // Precargar de forma predictiva el frame objetivo y el siguiente en móvil
    const targetIdx = snapFrame(Math.round(targetFrame));
    if (!frameCache.has(targetIdx)) {
      loadSingleFrame(targetIdx);
    }
    const nextAhead = snapFrame(Math.min(FRAME_COUNT, targetIdx + FRAME_STEP));
    if (!frameCache.has(nextAhead)) {
      loadSingleFrame(nextAhead);
    }

    wake();
  }

  let rafId = null;
  function wake() {
    if (rafId === null) rafId = requestAnimationFrame(tick);
  }

  // Bucle de interpolación y renderizado
  function tick() {
    rafId = null;

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

    if (currentFrame !== targetFrame || lastDrawnIndex !== frameToDraw) {
      rafId = requestAnimationFrame(tick);
    }
  }

  // Precarga inteligente adaptativa
  async function preloadAllFrames() {
    // 1. Cargar y renderizar inmediatamente el Frame 1
    await loadSingleFrame(1);
    drawFrame(1);
    isFirstFrameRendered = true;

    if (REDUCED_MOTION) return;

    if (document.readyState !== 'complete') {
      await new Promise((r) => window.addEventListener('load', r, { once: true }));
    }
    await new Promise((r) => ('requestIdleCallback' in window
      ? requestIdleCallback(r, { timeout: 1500 })
      : setTimeout(r, 300)));

    if (IS_MOBILE) {
      // En móvil: Precargar únicamente 6 keyframes clave espaciados a lo largo de la página
      // Esto consume solo ~9 MB y garantiza que al desplazarse rápido siempre haya un fotograma de respaldo
      const mobileKeyframes = [1, 40, 80, 120, 160, 200, 240];
      for (const k of mobileKeyframes) {
        if (!frameCache.has(k)) {
          await loadSingleFrame(k);
        }
      }
      return;
    }

    // En escritorio: Precarga completa
    const keyframes = [];
    for (let i = 8; i <= FRAME_COUNT; i += 8) {
      keyframes.push(snapFrame(i));
    }

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

    const remaining = [];
    for (let i = 2; i <= FRAME_COUNT; i++) {
      const wanted = FRAME_STEP === 1 || (i - 1) % FRAME_STEP === 0 || i === FRAME_COUNT;
      if (wanted && !frameCache.has(i)) remaining.push(i);
    }

    await runPool(remaining, CONCURRENCY);
  }

  // Listeners
  function handleResize() {
    resize();
    updateScrollTarget();
  }

  window.addEventListener('scroll', updateScrollTarget, { passive: true });
  window.addEventListener('resize', handleResize, { passive: true });
  window.addEventListener('orientationchange', handleResize, { passive: true });
  window.addEventListener('load', handleResize, { passive: true });

  // Iniciar
  resize();
  updateScrollTarget();
  wake();
  preloadAllFrames();
})();
