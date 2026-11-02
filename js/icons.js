// Procedural icons drawn on small canvases (consistent on every OS, unlike emoji).
// drawIcon(ctx, id, s): draws icon id centred on (0,0) inside an s x s box.
function drawIcon(ctx, id, s) {
  const u = s / 24; // unit: icons are designed on a 24-grid
  const E = (x, y, rx, ry, c, rot = 0) => { ctx.beginPath(); ctx.ellipse(x * u, y * u, rx * u, ry * u, rot, 0, Math.PI * 2); ctx.fillStyle = c; ctx.fill(); };
  const R = (x, y, w, h, r, c) => { ctx.beginPath(); ctx.roundRect(x * u, y * u, w * u, h * u, r * u); ctx.fillStyle = c; ctx.fill(); };
  const L = (x1, y1, x2, y2, w, c) => { ctx.beginPath(); ctx.moveTo(x1 * u, y1 * u); ctx.lineTo(x2 * u, y2 * u); ctx.lineWidth = w * u; ctx.strokeStyle = c; ctx.lineCap = 'round'; ctx.stroke(); };
  const P = (pts, c) => { ctx.beginPath(); pts.forEach(([x, y], i) => i ? ctx.lineTo(x * u, y * u) : ctx.moveTo(x * u, y * u)); ctx.closePath(); ctx.fillStyle = c; ctx.fill(); };
  const bowl = (liquid, kib) => {
    E(0, 5, 10, 4, 'rgba(0,0,0,0.12)'); R(-10, -2, 20, 8, 4, '#d6534f'); E(0, -2, 10, 4, '#e8706c'); E(0, -2, 7.5, 2.8, '#3a2a2a');
    if (liquid) E(0, -2, 7, 2.4, liquid);
    if (kib) for (let i = 0; i < 7; i++) E(Math.cos(i * 2.4) * 4, -2.5 + Math.sin(i * 2.4) * 1.3, 1.5, 1.5, kib);
  };
  const paw = (c) => { E(-5, -3, 2, 2.4, c); E(-1.6, -6, 2, 2.4, c); E(2.2, -6, 2, 2.4, c); E(5.6, -3, 2, 2.4, c); E(0.3, 3, 5.2, 4.4, c); };
  switch (id) {
    case 'water': bowl('#8fd0ff'); E(-2, -3, 1.5, 0.7, 'rgba(255,255,255,0.8)'); break;
    case 'dryfood': bowl(null, '#c08a4a'); break;
    case 'deluxe': bowl(null); E(0, -3, 5.5, 3, '#a5522f'); E(1, -3.5, 3, 1.5, '#d9826a'); E(-3, -4.5, 1.2, 0.8, '#fff'); break;
    case 'milk': R(-6, -9, 12, 18, 2, '#f4f8ff'); P([[-6, -9], [0, -14], [6, -9]], '#dde8f5'); R(-6, -3, 12, 6, 0, '#4f8fd6'); E(0, 0, 2.2, 2.2, '#fff'); break;
    case 'jerky': ctx.save(); ctx.rotate(-0.5); R(-9, -3.5, 18, 7, 3.5, '#8a3a2a'); L(-6, -1, 6, 1, 1.4, 'rgba(255,255,255,0.3)'); L(-5, 2, 4, 2.5, 1, 'rgba(0,0,0,0.25)'); ctx.restore(); break;
    case 'ball': E(0, 0, 9, 9, '#d6e64a'); ctx.beginPath(); ctx.arc(-6 * u, 0, 9 * u, -0.9, 0.9); ctx.lineWidth = 2 * u; ctx.strokeStyle = '#fff'; ctx.stroke(); ctx.beginPath(); ctx.arc(6 * u, 0, 9 * u, Math.PI - 0.9, Math.PI + 0.9); ctx.stroke(); E(-3, -4, 2, 1.2, 'rgba(255,255,255,0.5)', -0.6); break;
    case 'frisbee': case 'disc': E(0, 1, 11, 5.5, '#ff6b6b'); E(0, 0, 11, 5, '#ff8080'); E(0, 0, 6, 2.5, '#c84848'); E(-4, -2, 3, 1, 'rgba(255,255,255,0.5)'); break;
    case 'rope': ctx.save(); ctx.rotate(-0.6); L(-8, 0, 8, 0, 6, '#e7d3a9'); for (let i = -6; i <= 6; i += 3) L(i, -2.5, i + 1.5, 2.5, 1.2, 'rgba(0,0,0,0.15)'); E(-10, 0, 3.5, 3.5, '#d6534f'); E(10, 0, 3.5, 3.5, '#4f8fd6'); ctx.restore(); break;
    case 'bone': ctx.save(); ctx.rotate(-0.6); L(-6, 0, 6, 0, 5.5, '#9ad0ff'); [[-7, -3], [-7, 3], [7, -3], [7, 3]].forEach(([x, y]) => E(x, y, 3.5, 3.5, '#9ad0ff')); ctx.restore(); break;
    case 'bubbles': L(-5, 9, 1, 1, 2.2, '#f06a8e'); ctx.beginPath(); ctx.arc(2 * u, -1 * u, 4 * u, 0, Math.PI * 2); ctx.lineWidth = 2 * u; ctx.strokeStyle = '#f06a8e'; ctx.stroke(); for (const [x, y, r] of [[8, -8, 3], [3, -11, 2], [10, -1, 1.8]]) { ctx.beginPath(); ctx.arc(x * u, y * u, r * u, 0, Math.PI * 2); ctx.strokeStyle = 'rgba(80,150,255,0.8)'; ctx.lineWidth = 1.2 * u; ctx.stroke(); E(x - r * 0.3, y - r * 0.3, r * 0.3, r * 0.2, 'rgba(255,255,255,0.9)'); } break;
    case 'duck': E(0, 3, 7, 5, '#ffd84a'); E(4, -4, 4.5, 4.5, '#ffd84a'); E(8.5, -3.5, 2.5, 1.5, '#f28c28'); E(5.5, -5, 0.8, 0.8, '#222'); E(-5, 2, 3, 1.5, '#f0b800', 0.4); break;
    case 'brush': ctx.save(); ctx.rotate(-0.7); R(-3, -2, 6, 13, 3, '#b25e5e'); R(-7, -12, 14, 11, 4, '#f3d9b1'); for (let i = -5; i <= 5; i += 2.5) for (let j = -10; j <= -4; j += 3) E(i, j, 0.8, 0.8, '#8a6a4a'); ctx.restore(); break;
    case 'shampoo': R(-6, -5, 12, 16, 3, '#9ad0ff'); R(-3, -12, 6, 8, 1.5, '#4f8fd6'); R(-2, -14, 4, 3, 1, '#2c528c'); R(-4, 0, 8, 6, 1.5, 'rgba(255,255,255,0.85)'); E(-1, -8, 1, 2, 'rgba(255,255,255,0.5)'); break;
    case 'collar_red': case 'collar_blue': { const c = id === 'collar_red' ? '#d63b3b' : '#3b78d6'; ctx.beginPath(); ctx.ellipse(0, 0, 9 * u, 7 * u, 0, 0, Math.PI * 2); ctx.lineWidth = 4 * u; ctx.strokeStyle = c; ctx.stroke(); E(0, 7, 2.5, 2.5, '#ffd84a'); break; }
    case 'bandana': P([[-10, -5], [10, -5], [0, 9]], '#e0523c'); L(-10, -5, 10, -5, 3, '#c84030'); for (const [x, y] of [[-3, -1], [3, -1], [0, 3]]) E(x, y, 1, 1, '#fff'); break;
    case 'bow': E(-6, 0, 6, 4, '#ff7eb6', -0.35); E(6, 0, 6, 4, '#ff7eb6', 0.35); E(-6, 0, 3, 1.5, '#ffb3d4', -0.35); E(6, 0, 3, 1.5, '#ffb3d4', 0.35); E(0, 0, 2.8, 2.8, '#e05080'); break;
    case 'cap': ctx.beginPath(); ctx.arc(0, 2 * u, 9 * u, Math.PI, 0); ctx.fillStyle = '#2f74d0'; ctx.fill(); E(6, 3, 8, 2, '#235aa8'); E(-3, -3, 2, 1.2, 'rgba(255,255,255,0.4)', -0.5); E(0, -7, 1.5, 1.5, '#2f74d0'); break;
    case 'shades': R(-11, -3, 9, 7, 3, '#1b1b22'); R(2, -3, 9, 7, 3, '#1b1b22'); L(-2, -1, 2, -1, 1.5, '#1b1b22'); E(-8, -2, 2, 1, 'rgba(255,255,255,0.35)', -0.4); E(5, -2, 2, 1, 'rgba(255,255,255,0.35)', -0.4); break;
    case 'tiara': P([[-10, 6], [-7, -5], [-3.5, 1], [0, -8], [3.5, 1], [7, -5], [10, 6]], '#ffd84a'); R(-10, 4, 20, 3, 1, '#f0b800'); E(0, -6, 1.6, 1.6, '#ff5b8a'); E(-7, -3, 1.1, 1.1, '#7fc4e8'); E(7, -3, 1.1, 1.1, '#7fc4e8'); break;
    case 'room_basic': case 'room_seaside': case 'room_cabin': case 'room_space': case 'room_garden': {
      const th = { room_basic: ['#f6e6c8', '#d9a86b'], room_seaside: ['#bfe6f5', '#f1dfb5'], room_cabin: ['#c89a6a', '#9a6a42'], room_space: ['#1b1f4a', '#5a6080'], room_garden: ['#dff3c4', '#8fbf6a'] }[id];
      ctx.save(); ctx.beginPath(); ctx.roundRect(-10 * u, -9 * u, 20 * u, 18 * u, 3 * u); ctx.clip();
      R(-10, -9, 20, 11, 0, th[0]); R(-10, 2, 20, 8, 0, th[1]); R(-7, -6, 6, 5, 1, id === 'room_space' ? '#0b0d2a' : '#9ac7e8'); L(-4, -6, -4, -1, 0.8, '#fff'); L(-7, -3.5, -1, -3.5, 0.8, '#fff'); R(2, -1, 6, 3, 1.5, id === 'room_space' ? '#8a8fcf' : '#b25e5e'); ctx.restore(); break;
    }
    case 'walk': paw('#3f6fb5'); break;
    case 'walkmap': R(-10, -8, 20, 16, 2, '#dff3c4'); L(-10, 0, 10, 0, 3, '#f1e2c8'); L(0, -8, 0, 8, 3, '#f1e2c8'); E(-5, -4, 2, 2, '#5cae5a'); E(6, 4, 2.2, 2.2, '#f06a8e'); break;
    case 'trophy': case 'contest': P([[-7, -9], [7, -9], [5, 1], [-5, 1]], '#ffd84a'); R(-6, 5, 12, 3, 1, '#c89a20'); R(-2, 1, 4, 5, 1, '#f0b800'); ctx.beginPath(); ctx.arc(-8 * u, -5 * u, 3 * u, Math.PI * 0.5, Math.PI * 1.5); ctx.lineWidth = 1.8 * u; ctx.strokeStyle = '#f0b800'; ctx.stroke(); ctx.beginPath(); ctx.arc(8 * u, -5 * u, 3 * u, -Math.PI * 0.5, Math.PI * 0.5); ctx.stroke(); break;
    case 'medal': L(-4, -10, -1, -2, 3, '#4f8fd6'); L(4, -10, 1, -2, 3, '#d63b3b'); E(0, 3, 6.5, 6.5, '#ffd84a'); E(0, 3, 4.5, 4.5, '#f0b800'); E(0, 3, 1.5, 1.5, '#fff'); break;
    case 'shop': R(-8, -5, 16, 14, 2, '#f28c28'); ctx.beginPath(); ctx.arc(0, -6 * u, 5 * u, Math.PI, 0); ctx.lineWidth = 2 * u; ctx.strokeStyle = '#b35f10'; ctx.stroke(); R(-8, -5, 16, 3, 0, '#d9731a'); E(0, 2, 2, 2, '#fff'); break;
    case 'kennel': P([[-11, -1], [0, -11], [11, -1]], '#7a3b2a'); R(-9, -1, 18, 11, 1, '#c0553c'); ctx.beginPath(); ctx.arc(0, 4 * u, 4 * u, Math.PI, 0); ctx.fillStyle = '#3a1f14'; ctx.fill(); R(-4, 4, 8, 6, 0, '#3a1f14'); break;
    case 'bath': R(-11, -2, 22, 9, 4, '#fff'); R(-10, 0, 20, 4, 2, '#8fd0ff'); L(-7, 7, -7, 10, 2, '#b8c4cc'); L(7, 7, 7, 10, 2, '#b8c4cc'); L(8, -9, 8, -2, 2, '#b8c4cc'); L(4, -9, 8, -9, 2, '#b8c4cc'); for (const [x, y, r] of [[-5, -6, 2.5], [0, -8, 1.8], [-1, -4, 1.3]]) { ctx.beginPath(); ctx.arc(x * u, y * u, r * u, 0, Math.PI * 2); ctx.strokeStyle = 'rgba(80,150,255,0.7)'; ctx.lineWidth = 1 * u; ctx.stroke(); } break;
    case 'switch': ctx.save(); ctx.translate(-4 * u, -1 * u); ctx.scale(0.7, 0.7); paw('#f28c28'); ctx.restore(); ctx.save(); ctx.translate(5 * u, 3 * u); ctx.scale(0.7, 0.7); paw('#3f6fb5'); ctx.restore(); break;
    case 'agility': case 'gym': L(-8, 9, -8, -6, 2.5, '#fff'); L(8, 9, 8, -6, 2.5, '#fff'); L(-8, 9, -8, -6, 1.2, '#999'); L(8, 9, 8, -6, 1.2, '#999'); R(-10, -4, 20, 3, 1, '#e0523c'); R(-5, -4, 3, 3, 0, '#fff'); R(2, -4, 3, 3, 0, '#fff'); L(-10, 9, 10, 9, 2, '#8a6a4a'); break;
    case 'obedience': E(0, -4, 7, 7, '#3f6fb5'); E(0, -4, 4.5, 4.5, '#fff'); P([[-3, -6], [0, -8], [3, -6], [2, -2], [-2, -2]], '#ffd84a'); P([[-5, 2], [-2, 10], [0, 7], [2, 10], [5, 2]], '#d63b3b'); break;
    case 'save': paw('#f06a8e'); break;
    case 'sound': P([[-9, -3], [-5, -3], [0, -8], [0, 8], [-5, 3], [-9, 3]], '#3f6fb5'); ctx.beginPath(); ctx.arc(1 * u, 0, 5 * u, -0.9, 0.9); ctx.lineWidth = 2 * u; ctx.strokeStyle = '#3f6fb5'; ctx.stroke(); ctx.beginPath(); ctx.arc(1 * u, 0, 9 * u, -0.9, 0.9); ctx.stroke(); break;
    case 'mute': P([[-9, -3], [-5, -3], [0, -8], [0, 8], [-5, 3], [-9, 3]], '#a08f7a'); L(4, -4, 10, 4, 2, '#d63b3b'); L(10, -4, 4, 4, 2, '#d63b3b'); break;
    case 'help': E(0, 0, 10, 10, '#3f6fb5'); ctx.fillStyle = '#fff'; ctx.font = `bold ${15 * u}px Fredoka, sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('?', 0, 1 * u); break;
    case 'reset': R(-7, -6, 14, 15, 2, '#a08f7a'); R(-9, -8, 18, 3, 1, '#7a6756'); R(-3, -11, 6, 3, 1, '#7a6756'); L(-3, -2, -3, 6, 1.5, '#fff'); L(0, -2, 0, 6, 1.5, '#fff'); L(3, -2, 3, 6, 1.5, '#fff'); break;
    case 'album': R(-11, -8, 22, 17, 2, '#fff'); R(-9, -6, 18, 13, 1, '#8fcdf2'); P([[-9, 7], [-3, -1], [1, 4], [4, 1], [9, 7]], '#5cae5a'); E(5, -3, 1.8, 1.8, '#ffe066'); break;
    case 'camera': R(-11, -5, 22, 15, 3, '#3b2e25'); R(-4, -9, 8, 5, 2, '#3b2e25'); E(0, 2.5, 5, 5, '#fff'); E(0, 2.5, 3, 3, '#8fcdf2'); E(7, -2, 1.3, 1.3, '#ffe066'); break;
    case 'fullscreen': for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { L(sx * 9, sy * 9, sx * 9, sy * 3, 2.4, '#3f6fb5'); L(sx * 9, sy * 9, sx * 3, sy * 9, 2.4, '#3f6fb5'); } break;
    case 'install': L(0, -9, 0, 4, 2.6, '#3f6fb5'); L(-5, -1, 0, 4, 2.6, '#3f6fb5'); L(5, -1, 0, 4, 2.6, '#3f6fb5'); L(-9, 8, 9, 8, 2.6, '#3f6fb5'); break;
    case 'lock': R(-7, -2, 14, 11, 2, '#a08f7a'); ctx.beginPath(); ctx.arc(0, -3 * u, 4.5 * u, Math.PI, 0); ctx.lineWidth = 2.5 * u; ctx.strokeStyle = '#a08f7a'; ctx.stroke(); E(0, 3, 1.6, 1.6, '#fff'); break;
    case 'park': R(-1.5, 2, 3, 8, 1, '#7a4a2a'); E(0, -3, 8, 8, '#3f8f3a'); E(-4, 1, 5, 5, '#3f8f3a'); E(4, 0, 5.5, 5.5, '#4fa548'); break;
    case 'present': R(-9, -4, 18, 13, 2, '#ff7eb6'); R(-2, -4, 4, 13, 0, '#fff'); R(-9, -1, 18, 3, 0, '#fff'); E(-4, -7, 3.5, 2.5, '#ffd84a', -0.5); E(4, -7, 3.5, 2.5, '#ffd84a', 0.5); break;
    case 'fountain': E(0, 7, 10, 3.5, '#8fd0ff'); R(-2, -4, 4, 10, 1, '#b8c4cc'); E(0, -6, 4, 1.5, '#8fd0ff'); L(-3, -5, -6, 3, 1.5, '#8fd0ff'); L(3, -5, 6, 3, 1.5, '#8fd0ff'); break;
    case 'heart': ctx.fillStyle = '#f06a8e'; ctx.beginPath(); ctx.moveTo(0, 8 * u); ctx.bezierCurveTo(-13 * u, -2 * u, -6 * u, -12 * u, 0, -5 * u); ctx.bezierCurveTo(6 * u, -12 * u, 13 * u, -2 * u, 0, 8 * u); ctx.fill(); break;
    case 'coin': E(0, 0, 9, 9, '#f0b800'); E(0, 0, 6.5, 6.5, '#ffd84a'); ctx.fillStyle = '#c89a20'; ctx.font = `bold ${11 * u}px Fredoka, sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('$', 0, 1 * u); break;
    case 'star': P(Array.from({ length: 10 }, (_, i) => { const a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? 4 : 10; return [Math.cos(a) * r, Math.sin(a) * r]; }), '#ffd84a'); break;
    case 'weather_sun': E(0, 0, 6, 6, '#ffd84a'); for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; L(Math.cos(a) * 8, Math.sin(a) * 8, Math.cos(a) * 11, Math.sin(a) * 11, 2, '#ffd84a'); } break;
    case 'weather_cloud': E(-3, 2, 7, 5, '#fff'); E(3, 0, 7, 6, '#fff'); E(-6, 3, 4, 3.5, '#fff'); break;
    case 'weather_rain': E(-3, -2, 7, 5, '#dde8f5'); E(3, -4, 7, 6, '#dde8f5'); for (const x of [-6, -1, 4]) L(x, 4, x - 1.5, 9, 2, '#4f8fd6'); break;
    case 'weather_night': ctx.beginPath(); ctx.arc(0, 0, 8 * u, 0, Math.PI * 2); ctx.fillStyle = '#ffe9a0'; ctx.fill(); ctx.beginPath(); ctx.arc(4 * u, -3 * u, 7 * u, 0, Math.PI * 2); ctx.fillStyle = '#5a6090'; ctx.fill(); break;
    default: paw('#a08f7a');
  }
}
// HTML snippet for an icon canvas; call renderIcons() after inserting into the DOM.
function iconHTML(id, size = 36) { return `<canvas class="icn" data-icon="${id}" width="${size * 2}" height="${size * 2}" style="width:${size}px;height:${size}px"></canvas>`; }
function renderIcons(root) {
  (root || document).querySelectorAll('canvas.icn').forEach(c => {
    if (c.dataset.done === c.dataset.icon) return;
    const s = c.width; const ctx = c.getContext('2d'); ctx.clearRect(0, 0, s, s);
    ctx.save(); ctx.translate(s / 2, s / 2); drawIcon(ctx, c.dataset.icon, s * 0.92); ctx.restore(); c.dataset.done = c.dataset.icon;
  });
}
