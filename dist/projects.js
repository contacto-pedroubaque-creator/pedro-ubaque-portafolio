/**
 * projects.js — Interactive features for the Stage Portfolio & Visual Showcase
 * Theme: Luxury Agency / Atmospheric Dark Slate Ambient
 * Handles live category filtering, uniform card slideshows with dynamic title updates,
 * counter badges (01/10), cinema lightbox viewer, and smooth navigation.
 */

document.addEventListener('DOMContentLoaded', () => {
  // =========================================================================
  // 1. CARD SLIDESHOW ENGINE WITH DYNAMIC TITLE & TEXT UPDATES
  // =========================================================================
  function initCardSliders() {
    const cards = document.querySelectorAll('.gallery-card-uniform');

    cards.forEach((card) => {
      const slider = card.querySelector('[data-card-slider]');
      if (!slider) return;

      const track = slider.querySelector('.card-slider-track');
      let allSlides = Array.from(slider.querySelectorAll('.card-slide'));
      const prevBtn = slider.querySelector('.slider-prev');
      const nextBtn = slider.querySelector('.slider-next');
      const dotsContainer = slider.querySelector('.slider-dots');
      const currentNumEl = slider.querySelector('.current-slide-num');
      const totalNumEl = slider.querySelector('.total-slides-num');

      // Card info panel elements that update dynamically
      const styleEl = card.querySelector('.gallery-style');
      const ratingEl = card.querySelector('.gallery-rating');
      const yearEl = card.querySelector('.gallery-year');
      const titleMainEl = card.querySelector('.title-main');
      const titleItalicEl = card.querySelector('.title-italic');
      const descEl = card.querySelector('.gallery-card-desc');
      const dynamicFields = card.querySelectorAll('.dynamic-field');

      if (!track || allSlides.length === 0) return;

      function getActiveSlides() {
        return allSlides.filter((s) => !s.classList.contains('slide-unloaded') && s.style.display !== 'none');
      }

      function goToSlide(targetIdx, smooth = true) {
        const activeSlides = getActiveSlides();
        if (!activeSlides.length) return;
        const clampedIdx = Math.max(0, Math.min(activeSlides.length - 1, targetIdx));
        const slideWidth = track.clientWidth || 1;
        track.scrollTo({
          left: clampedIdx * slideWidth,
          behavior: smooth ? 'smooth' : 'auto'
        });
      }

      function rebuildDots() {
        const activeSlides = getActiveSlides();
        if (!dotsContainer) return;

        dotsContainer.innerHTML = '';
        if (activeSlides.length <= 1) {
          dotsContainer.style.display = 'none';
          return;
        }
        dotsContainer.style.display = 'flex';

        activeSlides.forEach((_, idx) => {
          const dot = document.createElement('button');
          dot.type = 'button';
          dot.className = `dot ${idx === 0 ? 'active' : ''}`;
          dot.setAttribute('role', 'tab');
          dot.setAttribute('aria-selected', idx === 0 ? 'true' : 'false');
          dot.setAttribute('aria-label', `Foto ${idx + 1} de ${activeSlides.length}`);

          dot.addEventListener('click', (e) => {
            e.stopPropagation();
            goToSlide(idx);
          });

          dotsContainer.appendChild(dot);
        });
      }

      function refreshCardSliderState() {
        const activeSlides = getActiveSlides();
        const total = activeSlides.length;

        if (totalNumEl) {
          totalNumEl.textContent = total < 10 ? `0${total}` : total;
        }

        if (total <= 1) {
          if (prevBtn) prevBtn.style.display = 'none';
          if (nextBtn) nextBtn.style.display = 'none';
          if (dotsContainer) dotsContainer.style.display = 'none';
        } else {
          if (prevBtn) prevBtn.style.display = '';
          if (nextBtn) nextBtn.style.display = '';
          if (dotsContainer) dotsContainer.style.display = 'flex';
          rebuildDots();
        }

        // Initialize popup quote & rating from first visible slide
        if (activeSlides[0]) {
          const initStyle = activeSlides[0].getAttribute('data-style');
          const initTitle = activeSlides[0].getAttribute('data-title');
          const initTitleItalic = activeSlides[0].getAttribute('data-title-italic');
          const initDesc = activeSlides[0].getAttribute('data-desc');
          if (initStyle && styleEl) styleEl.textContent = initStyle;
          if (initTitle && titleMainEl) titleMainEl.textContent = initTitle;
          if (initTitleItalic && titleItalicEl) titleItalicEl.textContent = initTitleItalic;
          if (initDesc && descEl) descEl.textContent = initDesc;

          if (ratingEl) {
            const initRating = activeSlides[0].getAttribute('data-rating');
            const initQuote = activeSlides[0].getAttribute('data-popup-quote');
            if (initQuote) ratingEl.setAttribute('data-popup-quote', initQuote);
            if (initRating && initRating.includes('★')) {
              const parts = initRating.replace('★', '').trim().split('/');
              const scoreVal = parts[0] ? parts[0].trim() : '4.8';
              const maxVal = parts[1] ? parts[1].trim() : '5';
              ratingEl.innerHTML = `<span class="rating-star">★</span> ${scoreVal} <span class="rating-max">/${maxVal}</span>`;
            }
          }
        }
      }

      // Handle image errors gracefully for empty/unpopulated slots
      allSlides.forEach((slide) => {
        const img = slide.querySelector('img');
        if (!img) return;

        function markUnloaded() {
          if (slide.classList.contains('slide-unloaded')) return;
          slide.classList.add('slide-unloaded');
          slide.style.display = 'none';
          refreshCardSliderState();
        }

        if (img.complete && img.naturalWidth === 0 && img.getAttribute('src')) {
          markUnloaded();
        } else {
          img.addEventListener('error', markUnloaded, { once: true });
        }
      });

      refreshCardSliderState();

      // Track active index to avoid redundant text transitions
      let lastIndex = 0;

      function updateSlideContent(newIndex) {
        if (newIndex === lastIndex) return;
        lastIndex = newIndex;

        const activeSlides = getActiveSlides();
        const activeSlide = activeSlides[newIndex];
        if (!activeSlide) return;

        // Slide attributes
        const newTitle = activeSlide.getAttribute('data-title');
        const newTitleItalic = activeSlide.getAttribute('data-title-italic');
        const newStyle = activeSlide.getAttribute('data-style');
        const newRating = activeSlide.getAttribute('data-rating');
        const newQuote = activeSlide.getAttribute('data-popup-quote');
        const newYear = activeSlide.getAttribute('data-year');
        const newDesc = activeSlide.getAttribute('data-desc');

        // Smooth text transition
        dynamicFields.forEach((f) => f.classList.add('text-fading'));

        setTimeout(() => {
          if (newStyle && styleEl) styleEl.textContent = newStyle;
          if (newRating && ratingEl) {
            if (newRating.includes('★')) {
              const parts = newRating.replace('★', '').trim().split('/');
              const scoreVal = parts[0] ? parts[0].trim() : '4.8';
              const maxVal = parts[1] ? parts[1].trim() : '5';
              ratingEl.innerHTML = `<span class="rating-star">★</span> ${scoreVal} <span class="rating-max">/${maxVal}</span>`;
            } else {
              ratingEl.textContent = newRating;
            }
          } else if (newYear && yearEl) {
            yearEl.textContent = newYear;
          }
          if (newQuote && ratingEl) {
            ratingEl.setAttribute('data-popup-quote', newQuote);
            if (window.refreshRatingPopupIfActive) {
              window.refreshRatingPopupIfActive(ratingEl);
            }
          }
          if (newTitle && titleMainEl) titleMainEl.textContent = newTitle;
          if (newTitleItalic && titleItalicEl) titleItalicEl.textContent = newTitleItalic;
          if (newDesc && descEl) descEl.textContent = newDesc;

          dynamicFields.forEach((f) => f.classList.remove('text-fading'));
        }, 120);
      }

      // Update state on scroll
      let isScrolling = false;
      track.addEventListener('scroll', () => {
        if (isScrolling) return;
        isScrolling = true;

        requestAnimationFrame(() => {
          const activeSlides = getActiveSlides();
          const slideWidth = track.clientWidth;
          if (slideWidth > 0 && activeSlides.length > 0) {
            const currentIndex = Math.min(
              activeSlides.length - 1,
              Math.max(0, Math.round(track.scrollLeft / slideWidth))
            );

            // Update fraction counter (e.g. 02 / 10)
            if (currentNumEl) {
              const formatted = currentIndex + 1 < 10 ? `0${currentIndex + 1}` : currentIndex + 1;
              currentNumEl.textContent = formatted;
            }

            // Update text content dynamically for the active slide
            updateSlideContent(currentIndex);

            // Update dots
            if (dotsContainer) {
              const dots = dotsContainer.querySelectorAll('.dot');
              dots.forEach((d, i) => {
                const isActive = i === currentIndex;
                d.classList.toggle('active', isActive);
                d.setAttribute('aria-selected', isActive ? 'true' : 'false');
              });
            }

            // Update arrows disabled state
            if (prevBtn) prevBtn.disabled = currentIndex === 0;
            if (nextBtn) nextBtn.disabled = currentIndex === activeSlides.length - 1;
          }
          isScrolling = false;
        });
      }, { passive: true });

      // Arrow navigation click handlers (Deterministic index based)
      if (prevBtn) {
        prevBtn.disabled = true; // Initially on first slide
        prevBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          const slideWidth = track.clientWidth || 1;
          const cur = Math.round(track.scrollLeft / slideWidth);
          goToSlide(cur - 1);
        });
      }

      if (nextBtn) {
        nextBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          const slideWidth = track.clientWidth || 1;
          const cur = Math.round(track.scrollLeft / slideWidth);
          goToSlide(cur + 1);
        });
      }

      // Desktop drag-to-scroll with click/drag distinction
      let isDragging = false;
      let startX = 0;
      let scrollStart = 0;
      track._hasDragged = false;

      function onMouseMove(e) {
        if (!isDragging) return;
        const dx = e.pageX - startX;
        if (Math.abs(dx) > 6) {
          track._hasDragged = true;
        }
        track.scrollLeft = scrollStart - dx;
      }

      function onMouseUp() {
        if (!isDragging) return;
        isDragging = false;
        window.removeEventListener('mousemove', onMouseMove);
        window.removeEventListener('mouseup', onMouseUp);
        track.style.scrollBehavior = '';
        track.classList.remove('is-dragging');
        const slideWidth = track.clientWidth || 1;
        const nearestIndex = Math.round(track.scrollLeft / slideWidth);
        goToSlide(nearestIndex);
        setTimeout(() => {
          track._hasDragged = false;
        }, 50);
      }

      track.addEventListener('mousedown', (e) => {
        if (e.target.closest('.slider-arrow, .gallery-zoom-btn, .slider-dots')) return;
        isDragging = true;
        track._hasDragged = false;
        startX = e.pageX;
        scrollStart = track.scrollLeft;
        track.style.scrollBehavior = 'auto';
        track.classList.add('is-dragging');
        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('mouseup', onMouseUp);
      });
    });
  }

  initCardSliders();

  // =========================================================================
  // 2. CATEGORY FILTER LOGIC & DYNAMIC COUNTS
  // =========================================================================
  const filterButtons = document.querySelectorAll('.filter-btn');
  const galleryCards = document.querySelectorAll('.gallery-card-uniform');
  const showcaseItems = document.querySelectorAll('.gallery-card-uniform, .video-reel-card');

  function updateFilterCounts() {
    const counts = { all: galleryCards.length, hotel: 0, teatro: 0 };
    galleryCards.forEach((item) => {
      const cat = item.getAttribute('data-category');
      if (counts[cat] !== undefined) {
        counts[cat]++;
      }
    });

    filterButtons.forEach((btn) => {
      const filter = btn.getAttribute('data-filter');
      const countBadge = btn.querySelector('.filter-count');
      if (countBadge && counts[filter] !== undefined) {
        countBadge.textContent = counts[filter];
      }
    });

    const metricProjs = document.querySelector('[data-count-cards], #metric-items-count');
    if (metricProjs) {
      metricProjs.textContent = galleryCards.length;
    }
  }

  updateFilterCounts();

  filterButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      filterButtons.forEach((b) => {
        b.classList.remove('active');
        b.setAttribute('aria-pressed', 'false');
      });
      btn.classList.add('active');
      btn.setAttribute('aria-pressed', 'true');

      const filterValue = btn.getAttribute('data-filter');

      showcaseItems.forEach((item) => {
        const category = item.getAttribute('data-category');
        if (filterValue === 'all' || category === filterValue) {
          item.classList.remove('hidden');
          item.style.animation = 'fadeInCardUniform 0.45s cubic-bezier(0.16, 1, 0.3, 1) forwards';
        } else {
          item.classList.add('hidden');
        }
      });

      // Keep background canvas scroll timeline in sync with adjusted page height
      requestAnimationFrame(() => {
        window.dispatchEvent(new Event('scroll'));
        window.dispatchEvent(new Event('resize'));
      });
    });
  });

  // =========================================================================
  // 3. LIGHTBOX MODAL — Galería navegable con flechas, teclado y swipe táctil
  // =========================================================================
  const lightbox = document.getElementById('image-lightbox');
  const lightboxImg = document.getElementById('lightbox-img');
  const lightboxCap = document.getElementById('lightbox-caption');
  const lightboxCnt = document.getElementById('lightbox-counter');
  const closeBtnEl = document.getElementById('lightbox-close-btn');
  const prevBtnEl = document.getElementById('lightbox-prev');
  const nextBtnEl = document.getElementById('lightbox-next');

  // Estado actual del lightbox
  let lbSlides = [];   // Array de { src, caption } para la tarjeta abierta
  let lbIndex = 0;    // Índice visible actualmente
  let lbCard = null; // Referencia a la tarjeta de origen
  let lbTouchStartX = 0;
  let lbLastFocusedElement = null; // Elemento activo para restaurar foco al cerrar (A11y)

  // ---- Extrae todas las diapositivas activas de una tarjeta ----
  function extractCardSlides(card) {
    const slides = card.querySelectorAll('.card-slide:not(.slide-unloaded)');
    if (slides.length === 0) {
      // Tarjeta sin slider — imagen única
      const img = card.querySelector('img');
      return img ? [{ src: img.src, caption: img.alt || '' }] : [];
    }
    return Array.from(slides).filter((slide) => slide.style.display !== 'none').map((slide) => {
      const img = slide.querySelector('img');
      const title = slide.getAttribute('data-title') || '';
      const desc = slide.getAttribute('data-desc') || '';
      const caption = title ? `${title}${desc ? ' — ' + desc : ''}` : (img ? img.alt : '');
      return { src: img ? img.src : '', caption };
    }).filter(s => s.src);
  }

  // ---- Detecta el índice activo del slider de la tarjeta ----
  function getCardActiveIndex(card) {
    const track = card.querySelector('.card-slider-track');
    const slides = card.querySelectorAll('.card-slide:not(.slide-unloaded)');
    if (!track || slides.length === 0) return 0;
    const w = track.clientWidth || 1;
    return Math.min(slides.length - 1, Math.max(0, Math.round(track.scrollLeft / w)));
  }

  // ---- Sincroniza el slider de la tarjeta con el índice del lightbox ----
  function syncCardSlider(card, index) {
    const track = card ? card.querySelector('.card-slider-track') : null;
    const slideEls = card ? card.querySelectorAll('.card-slide') : [];
    if (!track || slideEls.length === 0) return;
    const slideWidth = track.clientWidth;
    track.scrollTo({ left: index * slideWidth, behavior: 'smooth' });
  }

  // ---- Actualiza la imagen y el contador en el lightbox ----
  function setLightboxSlide(index) {
    if (!lbSlides.length) return;
    lbIndex = Math.max(0, Math.min(lbSlides.length - 1, index));

    const slide = lbSlides[lbIndex];

    // Cross-fade suave
    lightboxImg.classList.add('lb-fading');
    setTimeout(() => {
      lightboxImg.src = slide.src;
      lightboxImg.alt = slide.caption || 'Fotografía de espectáculo';
      if (lightboxCap) lightboxCap.textContent = slide.caption || '';
      if (lightboxCnt) {
        const cur = String(lbIndex + 1).padStart(2, '0');
        const total = String(lbSlides.length).padStart(2, '0');
        lightboxCnt.textContent = `${cur} / ${total}`;
      }
      lightboxImg.classList.remove('lb-fading');
    }, 180);

    // Estado de los botones
    if (prevBtnEl) {
      prevBtnEl.disabled = lbIndex === 0;
      prevBtnEl.setAttribute('aria-disabled', lbIndex === 0 ? 'true' : 'false');
    }
    if (nextBtnEl) {
      nextBtnEl.disabled = lbIndex === lbSlides.length - 1;
      nextBtnEl.setAttribute('aria-disabled', lbIndex === lbSlides.length - 1 ? 'true' : 'false');
    }

    // Ocultar flechas si solo hay una foto
    const oneSlide = lbSlides.length <= 1;
    if (prevBtnEl) prevBtnEl.style.visibility = oneSlide ? 'hidden' : 'visible';
    if (nextBtnEl) nextBtnEl.style.visibility = oneSlide ? 'hidden' : 'visible';
    if (lightboxCnt) lightboxCnt.style.visibility = oneSlide ? 'hidden' : 'visible';
  }

  // ---- Abre el lightbox ----
  function openLightbox(card, startIndex) {
    if (!lightbox || !card || card.classList.contains('is-coming-soon')) return;
    lbLastFocusedElement = document.activeElement;
    lbCard = card;
    lbSlides = extractCardSlides(card);
    if (!lbSlides.length) return;

    lightbox.classList.add('active');
    lightbox.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';

    // Imagen inicial sin fade (primera apertura)
    lbIndex = startIndex ?? 0;
    const slide = lbSlides[lbIndex];
    lightboxImg.src = slide.src;
    lightboxImg.alt = slide.caption || '';
    if (lightboxCap) lightboxCap.textContent = slide.caption || '';
    if (lightboxCnt) {
      const cur = String(lbIndex + 1).padStart(2, '0');
      const total = String(lbSlides.length).padStart(2, '0');
      lightboxCnt.textContent = `${cur} / ${total}`;
    }

    const oneSlide = lbSlides.length <= 1;
    if (prevBtnEl) {
      prevBtnEl.disabled = lbIndex === 0;
      prevBtnEl.setAttribute('aria-disabled', lbIndex === 0 ? 'true' : 'false');
      prevBtnEl.style.visibility = oneSlide ? 'hidden' : 'visible';
    }
    if (nextBtnEl) {
      nextBtnEl.disabled = lbIndex === lbSlides.length - 1;
      nextBtnEl.setAttribute('aria-disabled', lbIndex === lbSlides.length - 1 ? 'true' : 'false');
      nextBtnEl.style.visibility = oneSlide ? 'hidden' : 'visible';
    }
    if (lightboxCnt) lightboxCnt.style.visibility = oneSlide ? 'hidden' : 'visible';

    // Focus en el dialog para accesibilidad
    setTimeout(() => { if (closeBtnEl) closeBtnEl.focus(); }, 50);
  }

  // ---- Cierra el lightbox ----
  function closeLightbox() {
    if (!lightbox) return;
    lightbox.classList.remove('active');
    lightbox.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    // Sincronizar slider de la tarjeta con el índice visto en lightbox
    if (lbCard) syncCardSlider(lbCard, lbIndex);
    setTimeout(() => { lightboxImg.src = ''; }, 300);
    lbCard = null;

    // Restaurar foco al elemento detonador
    if (lbLastFocusedElement && typeof lbLastFocusedElement.focus === 'function') {
      lbLastFocusedElement.focus();
    }
    lbLastFocusedElement = null;
  }

  // ---- Botón zoom en cada tarjeta ----
  document.querySelectorAll('.gallery-zoom-btn').forEach((zoomBtn) => {
    zoomBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const card = zoomBtn.closest('.gallery-card-uniform');
      if (card && !card.classList.contains('is-coming-soon')) openLightbox(card, getCardActiveIndex(card));
    });
  });

  // ---- Clic en la imagen de un slide ----
  document.querySelectorAll('.card-slide').forEach((slide) => {
    slide.addEventListener('click', (e) => {
      if (e.target.closest('.slider-arrow, .gallery-zoom-btn, .slider-dots')) return;
      const card = slide.closest('.gallery-card-uniform');
      if (card && card.classList.contains('is-coming-soon')) return;
      const track = card ? card.querySelector('.card-slider-track') : null;
      if (track && track._hasDragged) return;
      if (card) openLightbox(card, getCardActiveIndex(card));
    });
  });

  // ---- Botones de navegación dentro del lightbox ----
  if (prevBtnEl) {
    prevBtnEl.addEventListener('click', (e) => {
      e.stopPropagation();
      setLightboxSlide(lbIndex - 1);
    });
  }
  if (nextBtnEl) {
    nextBtnEl.addEventListener('click', (e) => {
      e.stopPropagation();
      setLightboxSlide(lbIndex + 1);
    });
  }

  // ---- Cerrar ----
  if (closeBtnEl) closeBtnEl.addEventListener('click', closeLightbox);

  // ---- Compartir espectáculo (Estándar Web 2026: Web Share API con fallback) ----
  const shareBtnEl = document.getElementById('lightbox-share-btn');
  if (shareBtnEl) {
    shareBtnEl.addEventListener('click', async (e) => {
      e.stopPropagation();
      const currentSlide = lbSlides[lbIndex];
      const cardId = lbCard ? lbCard.id : '';
      const shareUrl = cardId ? `${window.location.origin}${window.location.pathname}#${cardId}` : window.location.href;
      const shareTitle = currentSlide ? currentSlide.caption : 'Pedro Ubaque — Portafolio Escénico';

      if (navigator.share) {
        try {
          await navigator.share({
            title: 'Pedro Ubaque — Espectáculo',
            text: `Espectáculo de Pedro Ubaque: ${shareTitle}`,
            url: shareUrl
          });
        } catch (err) {
          if (err.name !== 'AbortError') console.error('Share error:', err);
        }
      } else {
        try {
          await navigator.clipboard.writeText(shareUrl);
          const origContent = shareBtnEl.innerHTML;
          shareBtnEl.innerHTML = '<span style="font-size:12px;font-weight:700;color:#fff;">✓</span>';
          setTimeout(() => {
            shareBtnEl.innerHTML = origContent;
          }, 2000);
        } catch (err) {
          prompt('Copia este enlace para compartir el espectáculo:', shareUrl);
        }
      }
    });
  }

  if (lightbox) {
    lightbox.addEventListener('click', (e) => {
      // Cerrar solo si se hace clic en el fondo (no en dialog ni flechas)
      if (e.target === lightbox) closeLightbox();
    });
  }

  // ---- Teclado: ← → Escape ----
  document.addEventListener('keydown', (e) => {
    if (!lightbox || !lightbox.classList.contains('active')) return;
    if (e.key === 'Escape') closeLightbox();
    if (e.key === 'ArrowLeft') { e.preventDefault(); setLightboxSlide(lbIndex - 1); }
    if (e.key === 'ArrowRight') { e.preventDefault(); setLightboxSlide(lbIndex + 1); }
  });

  // ---- Swipe táctil ----
  if (lightbox) {
    lightbox.addEventListener('touchstart', (e) => {
      lbTouchStartX = e.touches[0].clientX;
    }, { passive: true });

    lightbox.addEventListener('touchend', (e) => {
      const dx = e.changedTouches[0].clientX - lbTouchStartX;
      if (Math.abs(dx) > 50) {
        if (dx < 0) setLightboxSlide(lbIndex + 1); // swipe izquierda → siguiente
        else setLightboxSlide(lbIndex - 1); // swipe derecha → anterior
      }
    }, { passive: true });
  }


  // =========================================================================
  // 4. SMOOTH SCROLL BACK TO TOP & HASH ROUTING (Direct Show Spotlight)
  // =========================================================================
  const backToTopBtn = document.getElementById('btn-back-top');
  if (backToTopBtn) {
    backToTopBtn.addEventListener('click', (e) => {
      e.preventDefault();
      window.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
    });
  }

  function handleShowHashNavigation() {
    const hash = window.location.hash;
    if (!hash) return;

    let target = null;
    try {
      target = document.querySelector(hash);
    } catch (e) {
      return;
    }
    if (!target) return;

    const card = target.classList.contains('gallery-card-uniform')
      ? target
      : target.closest('.gallery-card-uniform');

    if (card) {
      // Si la tarjeta está oculta por un filtro activo, activar su categoría o "todos"
      if (card.classList.contains('hidden')) {
        const cat = card.getAttribute('data-category');
        const matchingBtn = document.querySelector(`.filter-btn[data-filter="${cat}"]`) ||
          document.querySelector('.filter-btn[data-filter="all"]');
        if (matchingBtn) {
          matchingBtn.click();
        } else {
          card.classList.remove('hidden');
        }
      }

      setTimeout(() => {
        card.scrollIntoView({ behavior: 'smooth', block: 'center' });

        // Activar efecto de resalte (Spotlight Glow)
        card.classList.remove('highlight-spotlight');
        void card.offsetWidth; // Forzar reflow para reiniciar animación
        card.classList.add('highlight-spotlight');

        setTimeout(() => {
          card.classList.remove('highlight-spotlight');
        }, 3000);
      }, 350);
    } else {
      setTimeout(() => {
        target.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 350);
    }
  }

  window.addEventListener('load', handleShowHashNavigation);
  window.addEventListener('hashchange', handleShowHashNavigation);

  // =========================================================================
  // 5. VIDEO REEL MULTI-SLIDER & CINEMA LIGHTBOX (Opción B)
  // =========================================================================

  // ---- Lightbox de Video (Modal de Cine Flotante) ----
  const videoLb = document.getElementById('video-lightbox');
  const videoLbFrame = document.getElementById('video-lb-frame');
  const videoLbCounter = document.getElementById('video-lb-counter');
  const videoLbCaption = document.getElementById('video-lb-caption');
  const videoLbCloseBtn = document.getElementById('video-lb-close-btn');
  const videoLbShareBtn = document.getElementById('video-lb-share-btn');
  const videoLbPrev = document.getElementById('video-lb-prev');
  const videoLbNext = document.getElementById('video-lb-next');

  let activeVideoCard = null;
  let activeVideoPlaylist = [];
  let activeVideoIndex = 0;
  let videoLbLastFocusedElement = null; // Restauración de foco A11y

  function getVideoCardActiveIndex(card) {
    const track = card.querySelector('.video-slider-track');
    if (!track || !track.clientWidth) return 0;
    const slides = card.querySelectorAll('.video-slide');
    return Math.min(
      slides.length - 1,
      Math.max(0, Math.round(track.scrollLeft / track.clientWidth))
    );
  }

  function setVideoLightboxSlide(index) {
    if (!videoLb || index < 0 || index >= activeVideoPlaylist.length) return;
    activeVideoIndex = index;
    const item = activeVideoPlaylist[index];
    const total = activeVideoPlaylist.length;

    // Actualiza contador 01 / 02
    if (videoLbCounter) {
      const curStr = index + 1 < 10 ? `0${index + 1}` : index + 1;
      const totStr = total < 10 ? `0${total}` : total;
      videoLbCounter.textContent = `${curStr} / ${totStr}`;
      videoLbCounter.style.visibility = total <= 1 ? 'hidden' : 'visible';
    }

    // Actualiza caption con títulos y notas
    if (videoLbCaption) {
      videoLbCaption.innerHTML = `
        <div class="video-lb-caption-content">
          <span class="video-lb-title">${item.title}</span>
          ${item.sub ? `<span class="video-lb-sub">${item.sub}</span>` : ''}
          ${item.desc ? `<p class="video-lb-desc">${item.desc}</p>` : ''}
        </div>
      `;
    }

    // Inyecta el reproductor en formato cinematográfico
    if (videoLbFrame) {
      videoLbFrame.innerHTML = `
        <iframe src="https://www.youtube-nocookie.com/embed/${item.youtubeId}?autoplay=1&rel=0&playsinline=1"
                title="${item.title.replace(/"/g, '&quot;')}"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowfullscreen></iframe>
      `;
    }

    // Actualiza visibilidad y estado de flechas
    if (videoLbPrev) {
      videoLbPrev.style.display = total <= 1 ? 'none' : '';
      videoLbPrev.disabled = index === 0;
    }
    if (videoLbNext) {
      videoLbNext.style.display = total <= 1 ? 'none' : '';
      videoLbNext.disabled = index === total - 1;
    }
  }

  function openVideoLightbox(card, startIndex = 0) {
    if (!videoLb) return;
    const slides = Array.from(card.querySelectorAll('.video-slide'));
    if (slides.length === 0) return;

    videoLbLastFocusedElement = document.activeElement;
    activeVideoCard = card;
    activeVideoPlaylist = slides.map((slide) => ({
      youtubeId: slide.getAttribute('data-youtube-id') || '',
      title: slide.getAttribute('data-title') || 'Video de Pedro Ubaque',
      sub: slide.getAttribute('data-sub') || '',
      desc: slide.getAttribute('data-desc') || '',
      badge: card.querySelector('.gallery-badge')?.textContent?.trim() || ''
    }));

    // Si la tarjeta estaba reproduciendo un video inline, detenerlo al abrir cine
    const playingInline = card.querySelector('.video-slide.video-is-playing');
    if (playingInline && playingInline._facadeHTML) {
      playingInline.innerHTML = playingInline._facadeHTML;
      playingInline.classList.remove('video-is-playing');
      attachSlidePlayEvent(playingInline);
    }

    videoLb.classList.add('active');
    videoLb.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';

    setVideoLightboxSlide(startIndex);
    setTimeout(() => { if (videoLbCloseBtn) videoLbCloseBtn.focus(); }, 50);
  }

  function closeVideoLightbox() {
    if (!videoLb) return;
    videoLb.classList.remove('active');
    videoLb.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';

    // Detener audio y video inmediatamente
    if (videoLbFrame) {
      videoLbFrame.innerHTML = '';
    }

    // Sincronizar el carrusel de la tarjeta con el video visto en el visor
    if (activeVideoCard) {
      const track = activeVideoCard.querySelector('.video-slider-track');
      if (track && track.clientWidth) {
        track.scrollTo({
          left: activeVideoIndex * track.clientWidth,
          behavior: 'smooth'
        });
      }
    }
    activeVideoCard = null;

    if (videoLbLastFocusedElement && typeof videoLbLastFocusedElement.focus === 'function') {
      videoLbLastFocusedElement.focus();
    }
    videoLbLastFocusedElement = null;
  }

  // Eventos de botones del lightbox de video
  if (videoLbCloseBtn) videoLbCloseBtn.addEventListener('click', closeVideoLightbox);
  if (videoLbPrev) videoLbPrev.addEventListener('click', () => setVideoLightboxSlide(activeVideoIndex - 1));
  if (videoLbNext) videoLbNext.addEventListener('click', () => setVideoLightboxSlide(activeVideoIndex + 1));

  if (videoLb) {
    videoLb.addEventListener('click', (e) => {
      if (e.target === videoLb) closeVideoLightbox();
    });
  }

  // Compartir video desde el modal de cine
  if (videoLbShareBtn) {
    videoLbShareBtn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const current = activeVideoPlaylist[activeVideoIndex];
      if (!current) return;
      const shareUrl = current.youtubeId
        ? `https://www.youtube.com/watch?v=${current.youtubeId}`
        : window.location.href;
      const shareTitle = `${current.title} — Pedro Ubaque`;

      if (navigator.share) {
        try {
          await navigator.share({
            title: shareTitle,
            text: `Mira este video de Pedro Ubaque: ${current.title}`,
            url: shareUrl
          });
        } catch (err) {
          if (err.name !== 'AbortError') console.error('Share error:', err);
        }
      } else {
        try {
          await navigator.clipboard.writeText(shareUrl);
          const origContent = videoLbShareBtn.innerHTML;
          videoLbShareBtn.innerHTML = '<span style="font-size:12px;font-weight:700;color:#fff;">✓</span>';
          setTimeout(() => { videoLbShareBtn.innerHTML = origContent; }, 2000);
        } catch (err) {
          prompt('Copia este enlace para compartir el video:', shareUrl);
        }
      }
    });
  }

  // Teclado para lightbox de video
  window.addEventListener('keydown', (e) => {
    if (!videoLb || !videoLb.classList.contains('active')) return;
    if (e.key === 'Escape') {
      closeVideoLightbox();
    } else if (e.key === 'ArrowLeft') {
      setVideoLightboxSlide(activeVideoIndex - 1);
    } else if (e.key === 'ArrowRight') {
      setVideoLightboxSlide(activeVideoIndex + 1);
    }
  });

  // Gestos táctiles en lightbox de video
  if (videoLb) {
    let touchStartX = 0;
    videoLb.addEventListener('touchstart', (e) => {
      touchStartX = e.changedTouches[0].clientX;
    }, { passive: true });

    videoLb.addEventListener('touchend', (e) => {
      const touchEndX = e.changedTouches[0].clientX;
      const diffX = touchEndX - touchStartX;
      if (Math.abs(diffX) > 48) {
        if (diffX < 0) {
          setVideoLightboxSlide(activeVideoIndex + 1);
        } else {
          setVideoLightboxSlide(activeVideoIndex - 1);
        }
      }
    }, { passive: true });
  }

  // ---- Función para adjuntar clic de reproducción inline ----
  function attachSlidePlayEvent(slide) {
    if (!slide._facadeHTML) {
      slide._facadeHTML = slide.innerHTML;
    }
    const playTarget = slide.querySelector('.video-thumbnail-facade') || slide;
    playTarget.style.cursor = 'pointer';

    playTarget.addEventListener('click', function onPlayClick(e) {
      if (e.target.closest('.slider-arrow, .video-zoom-btn, .slider-dots')) return;
      const ytId = slide.getAttribute('data-youtube-id');
      if (!ytId || slide.querySelector('iframe')) return;

      const card = slide.closest('.video-reel-card');
      if (card) {
        // Detener otros videos en esta tarjeta que estén reproduciéndose
        card.querySelectorAll('.video-slide.video-is-playing').forEach((otherSlide) => {
          if (otherSlide !== slide && otherSlide._facadeHTML) {
            otherSlide.innerHTML = otherSlide._facadeHTML;
            otherSlide.classList.remove('video-is-playing');
            attachSlidePlayEvent(otherSlide);
          }
        });
      }

      slide.classList.add('video-is-playing');
      const iframe = document.createElement('iframe');
      iframe.src = `https://www.youtube-nocookie.com/embed/${ytId}?autoplay=1&rel=0&playsinline=1`;
      iframe.title = slide.getAttribute('data-title') || 'Pedro Ubaque — Video';
      iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
      iframe.allowFullscreen = true;
      iframe.loading = 'lazy';

      slide.innerHTML = '';
      slide.appendChild(iframe);
    });
  }

  // ---- Inicializador de Carruseles de Video en las Tarjetas ----
  function initVideoCardSliders() {
    const videoCards = document.querySelectorAll('.video-reel-card[data-video-slider]');

    videoCards.forEach((card) => {
      const track = card.querySelector('.video-slider-track');
      const slides = card.querySelectorAll('.video-slide');
      const prevBtn = card.querySelector('.slider-prev');
      const nextBtn = card.querySelector('.slider-next');
      const dotsContainer = card.querySelector('.slider-dots');
      const currentNumEl = card.querySelector('.current-slide-num');
      const totalNumEl = card.querySelector('.total-slides-num');
      const titleEl = card.querySelector('.dynamic-video-title');
      const subEl = card.querySelector('.dynamic-video-sub');
      const zoomBtn = card.querySelector('.video-zoom-btn');

      if (!track || slides.length === 0) return;

      // Asignar reproducción inline a cada slide
      slides.forEach((slide) => {
        attachSlidePlayEvent(slide);
      });

      // Total contador (e.g. 02)
      if (totalNumEl) {
        totalNumEl.textContent = slides.length < 10 ? `0${slides.length}` : slides.length;
      }

      // Si sólo tiene 1 video, ocultar controles de navegación
      if (slides.length <= 1) {
        if (prevBtn) prevBtn.style.display = 'none';
        if (nextBtn) nextBtn.style.display = 'none';
        if (dotsContainer) dotsContainer.style.display = 'none';
      } else {
        // Generar puntos de navegación (dots)
        if (dotsContainer) {
          dotsContainer.innerHTML = '';
          slides.forEach((_, idx) => {
            const dot = document.createElement('button');
            dot.type = 'button';
            dot.className = `dot ${idx === 0 ? 'active' : ''}`;
            dot.setAttribute('role', 'tab');
            dot.setAttribute('aria-selected', idx === 0 ? 'true' : 'false');
            dot.setAttribute('aria-label', `Video ${idx + 1} de ${slides.length}`);

            dot.addEventListener('click', (e) => {
              e.stopPropagation();
              const slideWidth = track.clientWidth;
              track.scrollTo({
                left: idx * slideWidth,
                behavior: 'smooth'
              });
            });

            dotsContainer.appendChild(dot);
          });
        }
      }

      // Botón de pantalla completa / Modal de Cine (Opción B)
      if (zoomBtn) {
        zoomBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          const activeIdx = getVideoCardActiveIndex(card);
          openVideoLightbox(card, activeIdx);
        });
      }

      let lastIndex = 0;
      function updateVideoContent(newIndex) {
        if (newIndex === lastIndex) return;

        // Si el slide anterior estaba reproduciendo video, restaurar fachada y silenciar
        const prevSlide = slides[lastIndex];
        if (prevSlide && prevSlide.classList.contains('video-is-playing') && prevSlide._facadeHTML) {
          prevSlide.innerHTML = prevSlide._facadeHTML;
          prevSlide.classList.remove('video-is-playing');
          attachSlidePlayEvent(prevSlide);
        }

        lastIndex = newIndex;
        const activeSlide = slides[newIndex];
        if (!activeSlide) return;

        const newTitle = activeSlide.getAttribute('data-title');
        const newSub = activeSlide.getAttribute('data-sub');

        if (titleEl) titleEl.classList.add('text-fading');
        if (subEl) subEl.classList.add('text-fading');

        setTimeout(() => {
          if (newTitle && titleEl) titleEl.innerHTML = newTitle;
          if (newSub && subEl) subEl.innerHTML = newSub;
          if (titleEl) titleEl.classList.remove('text-fading');
          if (subEl) subEl.classList.remove('text-fading');
        }, 120);
      }

      // Escucha de desplazamiento (Scroll Snap)
      let isScrolling = false;
      track.addEventListener('scroll', () => {
        if (isScrolling) return;
        isScrolling = true;

        requestAnimationFrame(() => {
          const slideWidth = track.clientWidth;
          if (slideWidth > 0) {
            const currentIndex = Math.min(
              slides.length - 1,
              Math.max(0, Math.round(track.scrollLeft / slideWidth))
            );

            // Actualiza contador de tarjeta (01 / 02)
            if (currentNumEl) {
              const formatted = currentIndex + 1 < 10 ? `0${currentIndex + 1}` : currentIndex + 1;
              currentNumEl.textContent = formatted;
            }

            // Actualiza textos descriptivos de la tarjeta
            updateVideoContent(currentIndex);

            // Actualiza dots activos
            if (dotsContainer) {
              const dots = dotsContainer.querySelectorAll('.dot');
              dots.forEach((d, i) => {
                const isActive = i === currentIndex;
                d.classList.toggle('active', isActive);
                d.setAttribute('aria-selected', isActive ? 'true' : 'false');
              });
            }

            // Actualiza estado de flechas
            if (prevBtn) prevBtn.disabled = currentIndex === 0;
            if (nextBtn) nextBtn.disabled = currentIndex === slides.length - 1;
          }
          isScrolling = false;
        });
      }, { passive: true });

      // Clics en flechas de navegación
      if (prevBtn) {
        prevBtn.disabled = true;
        prevBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          const slideWidth = track.clientWidth;
          track.scrollBy({ left: -slideWidth, behavior: 'smooth' });
        });
      }

      if (nextBtn) {
        nextBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          const slideWidth = track.clientWidth;
          track.scrollBy({ left: slideWidth, behavior: 'smooth' });
        });
      }
    });
  }

  initVideoCardSliders();

  // ==========================================================================
  // RATING POPUP ENGINE (Audience Score Floating Card)
  // ==========================================================================
  function initRatingPopups() {
    const popup = document.getElementById('rating-popup-global');
    if (!popup) return;

    const scoreEl = popup.querySelector('.rating-popup-score');
    const starsRow = popup.querySelector('.rating-popup-stars-row');
    const quoteEl = popup.querySelector('.rating-popup-quote');

    let activeRatingEl = null;

    function buildStars(scoreVal) {
      // Base 5 scale with half-star support
      const floored = Math.floor(scoreVal);
      const hasHalf = (scoreVal - floored) >= 0.5;
      const fullCount = Math.min(5, Math.max(0, floored));
      let html = '';
      for (let i = 1; i <= 5; i++) {
        if (i <= fullCount) {
          html += `<span class="star star-filled">★</span>`;
        } else if (i === fullCount + 1 && hasHalf) {
          html += `<span class="star star-half">★</span>`;
        } else {
          html += `<span class="star star-empty">★</span>`;
        }
      }
      return html;
    }

    function extractScore(ratingEl) {
      const text = ratingEl.textContent || '';
      const match = text.match(/([0-9]+(?:\.[0-9]+)?)/);
      return match ? parseFloat(match[1]) : 4.8;
    }

    function updatePopupData(ratingEl) {
      const scoreVal = extractScore(ratingEl);
      const quote = ratingEl.getAttribute('data-popup-quote') || '';

      if (scoreEl) scoreEl.textContent = scoreVal.toFixed(1);
      if (starsRow) starsRow.innerHTML = buildStars(scoreVal);
      if (quoteEl) quoteEl.textContent = quote ? `«${quote.replace(/^«|»$/g, '').trim()}»` : '';
    }

    function positionPopup(ratingEl) {
      if (!ratingEl) return;
      const rect = ratingEl.getBoundingClientRect();
      const scrollY = window.pageYOffset || document.documentElement.scrollTop;
      const scrollX = window.pageXOffset || document.documentElement.scrollLeft;

      const popupWidth = popup.offsetWidth || 280;
      const popupHeight = popup.offsetHeight || 130;

      const spaceAbove = rect.top;
      const placeBelow = spaceAbove < popupHeight + 24;

      let top;
      if (placeBelow) {
        top = rect.bottom + scrollY + 12;
        popup.classList.add('position-below');
      } else {
        top = rect.top + scrollY - popupHeight - 12;
        popup.classList.remove('position-below');
      }

      const viewportWidth = document.documentElement.clientWidth;
      const naturalCenter = rect.left + scrollX + rect.width / 2;
      const minCenter = scrollX + 16 + popupWidth / 2;
      const maxCenter = scrollX + viewportWidth - 16 - popupWidth / 2;
      const clampedCenter = Math.max(minCenter, Math.min(maxCenter, naturalCenter));

      const arrowPercent = ((naturalCenter - (clampedCenter - popupWidth / 2)) / popupWidth) * 100;
      const clampedArrow = Math.max(12, Math.min(88, arrowPercent));

      popup.style.top = `${top}px`;
      popup.style.left = `${clampedCenter}px`;
      popup.style.setProperty('--arrow-left', `${clampedArrow}%`);
    }

    function openPopup(ratingEl) {
      if (activeRatingEl && activeRatingEl !== ratingEl) {
        activeRatingEl.classList.remove('is-active');
      }

      activeRatingEl = ratingEl;
      activeRatingEl.classList.add('is-active');

      updatePopupData(ratingEl);
      popup.classList.add('is-visible');
      positionPopup(ratingEl);
    }

    function closePopup() {
      if (!activeRatingEl) return;
      activeRatingEl.classList.remove('is-active');
      activeRatingEl = null;
      popup.classList.remove('is-visible');
    }

    // Expose dynamic refresh function so slide transitions auto-update quote
    window.refreshRatingPopupIfActive = function (ratingEl) {
      if (activeRatingEl && activeRatingEl === ratingEl && popup.classList.contains('is-visible')) {
        updatePopupData(ratingEl);
        positionPopup(ratingEl);
      }
    };

    // Click handler with event delegation
    document.addEventListener('click', (e) => {
      const ratingBadge = e.target.closest('.gallery-rating');

      if (ratingBadge) {
        e.preventDefault();
        e.stopPropagation();

        if (activeRatingEl === ratingBadge && popup.classList.contains('is-visible')) {
          closePopup();
        } else {
          openPopup(ratingBadge);
        }
        return;
      }

      if (!e.target.closest('#rating-popup-global')) {
        closePopup();
      }
    });

    // Close on Escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' || e.key === 'Esc') {
        closePopup();
      }
    });

    // Reposition on window resize / scroll (debounced via requestAnimationFrame)
    let isRepositioning = false;
    function handleReposition() {
      if (!activeRatingEl || !popup.classList.contains('is-visible')) return;
      if (!isRepositioning) {
        isRepositioning = true;
        requestAnimationFrame(() => {
          positionPopup(activeRatingEl);
          isRepositioning = false;
        });
      }
    }

    window.addEventListener('resize', handleReposition, { passive: true });
    window.addEventListener('scroll', handleReposition, { passive: true });
  }

  initRatingPopups();

  // Ejecución si el documento ya estaba cargado
  if (document.readyState === 'complete') {
    handleShowHashNavigation();
  }
});
