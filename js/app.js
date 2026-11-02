// ================= App shell: responsive layout, title art, PWA =================
(function () {
  const root = document.documentElement, body = document.body;

  // ---- layout: size the two screens to the viewport ----
  function fit() {
    const vw = window.innerWidth, vh = window.innerHeight;
    const landscape = vw > vh * 1.2 && vw >= 700;
    const shell = vw >= 780 && vh >= 540;
    body.classList.toggle('landscape', landscape); body.classList.toggle('shell', shell);
    const controlsH = 128;                 // command bar + menu bar + gaps
    let sw, tw;
    if (landscape) {
      const chrome = shell ? 26 * 2 + 12 * 4 + 10 * 4 + 44 : 16 + 34;
      const availW = vw - chrome, availH = vh - (shell ? 22 + 18 + 24 + 20 : 12);
      sw = Math.min(512, availW / 2, (availH - controlsH) * 4 / 3); tw = sw;
    } else {
      const chrome = shell ? 26 * 2 + 12 * 2 + 10 * 2 : 16;
      const availW = vw - chrome, availH = vh - (shell ? 22 + 18 + 44 + 42 + 40 : 12 + 22);
      sw = Math.min(512, availW);
      let th = availH - (sw * 0.75 + controlsH);
      tw = Math.min(sw, th * 4 / 3);
      if (tw < sw * 0.62) { sw = Math.max(250, Math.min(sw, (availH - controlsH) / (0.75 * 1.62))); tw = sw * 0.62; }
    }
    root.style.setProperty('--sw', Math.floor(sw) + 'px');
    root.style.setProperty('--tw', Math.floor(tw) + 'px');
  }
  window.addEventListener('resize', fit); window.addEventListener('orientationchange', () => setTimeout(fit, 80)); fit();
  if (window.visualViewport) window.visualViewport.addEventListener('resize', fit);

  // ---- title screen art ----
  const art = document.getElementById('titleArt');
  if (art) {
    const ctx = art.getContext('2d');
    const breeds = Object.keys(BREEDS);
    const star = { breed: breeds[Math.floor(Math.random() * breeds.length)] };
    star.color = Object.keys(BREEDS[star.breed].colors)[0];
    const dog = { breed: star.breed, color: star.color, acc: {} };
    let t0 = performance.now();
    function frame(now) {
      if (document.getElementById('title').style.display === 'none') return;
      const t = (now - t0) / 1000;
      const W = 512, H = 192;
      const sky = ctx.createLinearGradient(0, 0, 0, H); sky.addColorStop(0, '#8fcdf2'); sky.addColorStop(0.7, '#dff1fb'); ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = '#fff6b0'; ctx.beginPath(); ctx.arc(430, 46, 28, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      for (let i = 0; i < 4; i++) { const cx = ((i * 160 + t * 12) % (W + 160)) - 80, cy = 34 + (i % 2) * 26; ctx.beginPath(); ctx.arc(cx, cy, 18, 0, Math.PI * 2); ctx.arc(cx + 22, cy - 10, 24, 0, Math.PI * 2); ctx.arc(cx + 48, cy, 18, 0, Math.PI * 2); ctx.fill(); }
      ctx.fillStyle = '#7dc46b'; ctx.beginPath(); ctx.ellipse(256, 215, 420, 90, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#69b358'; ctx.beginPath(); ctx.ellipse(100, 230, 260, 70, 0, 0, Math.PI * 2); ctx.fill();
      // flowers
      for (let i = 0; i < 9; i++) { const fx = 30 + i * 58, fy = 150 + (i % 3) * 12; ctx.fillStyle = ['#ff8fb1', '#ffe066', '#fff'][i % 3]; for (let k = 0; k < 5; k++) { ctx.beginPath(); ctx.arc(fx + Math.cos(k * 1.26) * 4, fy + Math.sin(k * 1.26) * 4, 3, 0, Math.PI * 2); ctx.fill(); } ctx.fillStyle = '#f0a040'; ctx.beginPath(); ctx.arc(fx, fy, 2, 0, Math.PI * 2); ctx.fill(); }
      // the puppy walks in, sits, wags
      const walkT = Math.min(1, t / 2.6);
      const x = -60 + walkT * 316, y = 176;
      const sitting = walkT >= 1;
      const bounce = sitting && t % 4 > 3.4 ? Math.abs(Math.sin((t % 4 - 3.4) / 0.6 * Math.PI)) * 18 : 0;
      drawDog(ctx, dog, { x, y, scale: 1.25, facing: 1, pose: sitting ? (bounce ? 'jump' : 'sit') : 'walk', walkPhase: t * 11, t, eyes: sitting && Math.floor(t * 2) % 7 === 0 ? 'happy' : 'open', mouth: sitting ? 'smile' : 'pant', tailWag: 10, jumpY: bounce });
      if (sitting && Math.floor(t * 3) % 9 === 0) { ctx.fillStyle = '#f06a8e'; const hx = x + 40, hy = y - 86 - (t % 1) * 20; ctx.beginPath(); ctx.moveTo(hx, hy + 6); ctx.bezierCurveTo(hx - 10, hy - 2, hx - 5, hy - 10, hx, hy - 4); ctx.bezierCurveTo(hx + 5, hy - 10, hx + 10, hy - 2, hx, hy + 6); ctx.fill(); }
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
    window.restartTitleArt = () => { t0 = performance.now(); requestAnimationFrame(frame); };
  }

  // ---- fullscreen / install ----
  window.canFullscreen = () => !!(document.documentElement.requestFullscreen || document.documentElement.webkitRequestFullscreen);
  window.toggleFullscreen = function () {
    const el = document.documentElement;
    if (document.fullscreenElement || document.webkitFullscreenElement) { (document.exitFullscreen || document.webkitExitFullscreen).call(document); return; }
    const req = el.requestFullscreen || el.webkitRequestFullscreen; if (!req) return;
    const r = req.call(el); if (r && r.then) r.then(() => { try { screen.orientation && screen.orientation.lock && screen.orientation.lock('portrait').catch(() => { }); } catch (e) { } }).catch(() => { });
  };
  window.installPrompt = null;
  window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); window.installPrompt = e; });
  window.promptInstall = function () { const p = window.installPrompt; if (!p) return false; p.prompt(); p.userChoice.then(() => { window.installPrompt = null; }); return true; };

  // ---- service worker (only when served over http/https) ----
  if ('serviceWorker' in navigator && /^https?:/.test(location.protocol)) {
    window.addEventListener('load', () => { navigator.serviceWorker.register('sw.js').catch(() => { }); });
  }
})();
