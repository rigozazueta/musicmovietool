// DOM-side cinematic layer: film grain, drop flash, fade-through-black
// transitions and serif title cards. Kept off the WebGL pipeline so it costs
// nothing on the render thread.

const $ = (id) => document.getElementById(id);

export function createOverlays() {
  const flashEl = $('flash');
  const fadeEl = $('fade');
  const card = $('titlecard');
  const kickerEl = $('title-kicker');
  const mainEl = $('title-main');
  const subEl = $('title-sub');
  const letterboxEl = $('letterbox');

  const grainCanvas = $('grain');
  const gctx = grainCanvas.getContext('2d');
  const GR = 160; // tiny noise tile, scaled up by CSS — cheap and filmic
  grainCanvas.width = GR;
  grainCanvas.height = GR;
  const noise = gctx.createImageData(GR, GR);

  let flashLevel = 0;
  let grainFrame = 0;
  let cardTimer = 0;

  return {
    flash(strength = 1) { flashLevel = strength; },

    fadeThrough(ms, midpoint) {
      fadeEl.style.transitionDuration = `${ms}ms`;
      fadeEl.style.opacity = '1';
      setTimeout(() => {
        midpoint?.();
        fadeEl.style.opacity = '0';
      }, ms + 30);
    },

    fadeInFromBlack(ms = 1200) {
      fadeEl.style.transitionDuration = '0ms';
      fadeEl.style.opacity = '1';
      void fadeEl.offsetWidth; // commit the opaque state before animating out
      fadeEl.style.transitionDuration = `${ms}ms`;
      fadeEl.style.opacity = '0';
    },

    title(kicker, main, sub = '', holdMs = 3200) {
      kickerEl.textContent = kicker;
      mainEl.textContent = main;
      subEl.textContent = sub;
      card.classList.add('show');
      clearTimeout(cardTimer);
      cardTimer = setTimeout(() => card.classList.remove('show'), holdMs);
    },

    toggleLetterbox() { letterboxEl.classList.toggle('on'); },

    // called every frame from the main loop
    update(dt) {
      if (flashLevel > 0.004) {
        flashLevel *= Math.exp(-5.5 * dt);
        flashEl.style.opacity = flashLevel.toFixed(3);
      } else if (flashEl.style.opacity !== '0') {
        flashEl.style.opacity = '0';
      }

      // re-roll the grain every few frames — constant grain reads as a still
      if (++grainFrame % 3 === 0) {
        const d = noise.data;
        for (let i = 0; i < d.length; i += 4) {
          const v = (Math.random() * 255) | 0;
          d[i] = v; d[i + 1] = v; d[i + 2] = v; d[i + 3] = 255;
        }
        gctx.putImageData(noise, 0, 0);
      }
    },
  };
}
