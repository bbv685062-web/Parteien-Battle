'use strict';
/* Leichte, abhängigkeitsfreie Effekt-Bibliothek: Partikel-Konfetti, fliegende
   Punktzahlen und Bildschirm-Flashs. Wird von control.js und vote.js genutzt. */

(function (global) {
  let layer = null;

  function getLayer() {
    if (layer && document.body.contains(layer)) return layer;
    layer = document.createElement('div');
    layer.className = 'fx-layer';
    document.body.appendChild(layer);
    return layer;
  }

  function rand(min, max) {
    return min + Math.random() * (max - min);
  }

  // Konfetti-Burst ausgehend von einem Element (z.B. einer Parteizeile) oder
  // von einer festen Bildschirmposition {x, y}.
  function burst(origin, color, count) {
    const l = getLayer();
    let x, y;
    if (origin && origin.getBoundingClientRect) {
      const r = origin.getBoundingClientRect();
      x = r.left + r.width / 2;
      y = r.top + r.height / 2;
    } else if (origin && typeof origin.x === 'number') {
      x = origin.x;
      y = origin.y;
    } else {
      x = window.innerWidth / 2;
      y = window.innerHeight / 2;
    }
    const n = count || 22;
    for (let i = 0; i < n; i++) {
      const el = document.createElement('span');
      el.className = 'fx-particle';
      const size = rand(6, 12);
      el.style.width = size + 'px';
      el.style.height = size + 'px';
      el.style.background = color || '#fff';
      el.style.left = x + 'px';
      el.style.top = y + 'px';
      const angle = rand(0, Math.PI * 2);
      const dist = rand(60, 220);
      const dx = Math.cos(angle) * dist;
      const dy = Math.sin(angle) * dist - rand(20, 80);
      const rot = rand(-540, 540);
      const dur = rand(650, 1200);
      el.style.setProperty('--dx', dx + 'px');
      el.style.setProperty('--dy', dy + 'px');
      el.style.setProperty('--rot', rot + 'deg');
      el.style.animationDuration = dur + 'ms';
      if (Math.random() > 0.5) el.style.borderRadius = '50%';
      l.appendChild(el);
      setTimeout(() => el.remove(), dur + 50);
    }
  }

  // Große, anhaltende Konfetti-Dusche von oben (für den Sieger-Effekt).
  function rain(durationMs, colors) {
    const l = getLayer();
    const palette = colors && colors.length ? colors : ['#fbbf24', '#f472b6', '#60a5fa', '#34d399', '#fff'];
    const end = Date.now() + (durationMs || 3500);
    let stop = false;
    function tick() {
      if (stop || Date.now() > end) return;
      for (let i = 0; i < 4; i++) {
        const el = document.createElement('span');
        el.className = 'fx-confetti-fall';
        const size = rand(6, 14);
        el.style.width = size + 'px';
        el.style.height = size * rand(0.6, 1.4) + 'px';
        el.style.left = rand(0, window.innerWidth) + 'px';
        el.style.background = palette[Math.floor(Math.random() * palette.length)];
        const dur = rand(2200, 4200);
        el.style.animationDuration = dur + 'ms';
        el.style.setProperty('--rot', rand(-720, 720) + 'deg');
        if (Math.random() > 0.5) el.style.borderRadius = '50%';
        l.appendChild(el);
        setTimeout(() => el.remove(), dur + 100);
      }
      requestAnimationFrame(() => setTimeout(tick, 60));
    }
    tick();
    return () => {
      stop = true;
    };
  }

  // Fliegender "+N" Text über einem Element.
  function floatingPoints(origin, text, color) {
    const l = getLayer();
    let x, y;
    if (origin && origin.getBoundingClientRect) {
      const r = origin.getBoundingClientRect();
      x = r.left + r.width / 2;
      y = r.top + r.height / 2;
    } else {
      x = window.innerWidth / 2;
      y = window.innerHeight / 2;
    }
    const el = document.createElement('div');
    el.className = 'fx-float-points';
    el.textContent = text;
    el.style.left = x + 'px';
    el.style.top = y + 'px';
    el.style.color = color || '#fff';
    l.appendChild(el);
    setTimeout(() => el.remove(), 1300);
  }

  // Kurzer, farbiger Bildschirm-Flash.
  function screenFlash(color) {
    const l = getLayer();
    const el = document.createElement('div');
    el.className = 'fx-flash';
    el.style.background = color || '#fff';
    l.appendChild(el);
    setTimeout(() => el.remove(), 500);
  }

  global.FX = { burst, rain, floatingPoints, screenFlash };
})(window);
