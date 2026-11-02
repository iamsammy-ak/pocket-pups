// ================= Walk map: draw your route, then go =================
const MAP_SPOTS = {
  home: { x: 72, y: 318, name: 'Home' },
  park: { x: 404, y: 86, name: 'Park', icon: 'park', desc: 'Disc practice with other dogs' },
  gym: { x: 112, y: 84, name: 'Gym', icon: 'gym', desc: 'Agility practice' },
  shop: { x: 436, y: 296, name: 'Bargain shop', icon: 'shop', desc: 'Half-price goods' },
  fountain: { x: 262, y: 196, name: 'Fountain', icon: 'fountain', desc: 'A drink of water' },
};
let MAP_BG = null;
function mapBackground() {
  if (MAP_BG) return MAP_BG;
  const c = document.createElement('canvas'); c.width = W; c.height = HH; const ctx = c.getContext('2d');
  ctx.fillStyle = '#dff0c4'; ctx.fillRect(0, 0, W, HH);
  ctx.fillStyle = 'rgba(255,255,255,0.18)'; for (let i = 0; i < 120; i++) { ctx.beginPath(); ctx.arc((i * 131) % W, (i * 79) % HH, 2, 0, Math.PI * 2); ctx.fill(); }
  // streets: a loose grid
  ctx.strokeStyle = '#f3ead6'; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.lineWidth = 22;
  const streets = [[[30, 318], [480, 318]], [[30, 196], [480, 196]], [[30, 84], [480, 84]], [[72, 60], [72, 350]], [[262, 60], [262, 350]], [[436, 60], [436, 350]], [[112, 84], [262, 196]], [[262, 196], [404, 86]]];
  for (const [a, b] of streets) { ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke(); }
  ctx.strokeStyle = 'rgba(0,0,0,0.06)'; ctx.lineWidth = 24; ctx.globalCompositeOperation = 'destination-over'; ctx.globalCompositeOperation = 'source-over';
  ctx.setLineDash([8, 10]); ctx.strokeStyle = 'rgba(200,180,140,0.6)'; ctx.lineWidth = 1.5; for (const [a, b] of streets) { ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke(); } ctx.setLineDash([]);
  // pond
  ctx.fillStyle = '#9ad4ee'; ctx.beginPath(); ctx.ellipse(350, 150, 38, 22, -0.3, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.beginPath(); ctx.ellipse(340, 144, 12, 4, -0.3, 0, Math.PI * 2); ctx.fill();
  // houses
  const house = (x, y, col) => { ctx.fillStyle = col; ctx.fillRect(x - 12, y - 8, 24, 18); ctx.fillStyle = '#b25e5e'; ctx.beginPath(); ctx.moveTo(x - 15, y - 8); ctx.lineTo(x, y - 20); ctx.lineTo(x + 15, y - 8); ctx.fill(); ctx.fillStyle = '#8fcdf2'; ctx.fillRect(x - 7, y - 4, 6, 6); ctx.fillStyle = '#6a4a2a'; ctx.fillRect(x + 2, y - 2, 6, 12); };
  [[150, 250, '#fff2d6'], [200, 250, '#f6dcd0'], [330, 250, '#e9f0d8'], [380, 250, '#fff2d6'], [160, 130, '#f6dcd0'], [210, 130, '#fff2d6'], [320, 40, '#e9f0d8'], [180, 40, '#fff2d6'], [470, 140, '#f6dcd0']].forEach(([x, y, c]) => house(x, y, c));
  // trees
  const tree = (x, y, s = 1) => { ctx.fillStyle = 'rgba(0,0,0,0.1)'; ctx.beginPath(); ctx.ellipse(x + 2, y + 3, 9 * s, 4 * s, 0, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#5ea84f'; ctx.beginPath(); ctx.arc(x, y, 9 * s, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#79c468'; ctx.beginPath(); ctx.arc(x - 2 * s, y - 3 * s, 5 * s, 0, Math.PI * 2); ctx.fill(); };
  [[360, 110], [440, 120], [380, 60], [120, 240], [40, 240], [40, 130], [230, 300], [300, 300], [480, 230], [480, 40], [30, 40], [300, 230]].forEach(([x, y]) => tree(x, y, 1));
  for (let i = 0; i < 5; i++) tree(380 + i * 18, 110 + (i % 2) * 14, 0.8);
  // flower beds
  for (let i = 0; i < 14; i++) { ctx.fillStyle = ['#ff8fb1', '#ffe066', '#fff'][i % 3]; ctx.beginPath(); ctx.arc(280 + (i * 37) % 120, 120 + (i * 53) % 50, 2.5, 0, Math.PI * 2); ctx.fill(); }
  MAP_BG = c; return c;
}
function drawMapSpots(ctx, route, visited) {
  for (const [id, s] of Object.entries(MAP_SPOTS)) {
    const on = visited && visited.includes(id);
    ctx.fillStyle = 'rgba(0,0,0,0.12)'; ctx.beginPath(); ctx.ellipse(s.x + 2, s.y + 14, 16, 6, 0, 0, Math.PI * 2); ctx.fill();
    if (id === 'home') { ctx.fillStyle = '#fff'; ctx.fillRect(s.x - 14, s.y - 8, 28, 20); ctx.fillStyle = '#3f6fb5'; ctx.beginPath(); ctx.moveTo(s.x - 18, s.y - 8); ctx.lineTo(s.x, s.y - 24); ctx.lineTo(s.x + 18, s.y - 8); ctx.fill(); ctx.fillStyle = '#f28c28'; ctx.fillRect(s.x - 4, s.y, 8, 12); }
    else { ctx.fillStyle = on ? '#fff2cc' : '#fff'; ctx.beginPath(); ctx.arc(s.x, s.y, 17, 0, Math.PI * 2); ctx.fill(); ctx.lineWidth = on ? 3 : 2; ctx.strokeStyle = on ? '#f28c28' : 'rgba(0,0,0,0.12)'; ctx.stroke(); ctx.save(); ctx.translate(s.x, s.y); drawIcon(ctx, s.icon, 24); ctx.restore(); }
    ctx.font = `600 11px ${FONT}`; ctx.textAlign = 'center'; ctx.fillStyle = '#3b2e25'; ctx.strokeStyle = 'rgba(255,255,255,0.9)'; ctx.lineWidth = 3; ctx.lineJoin = 'round'; ctx.strokeText(s.name, s.x, s.y + 32); ctx.fillText(s.name, s.x, s.y + 32);
  }
}
function drawRoute(ctx, pts, done) {
  if (pts.length < 2) return;
  ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.strokeStyle = 'rgba(255,255,255,0.9)'; ctx.lineWidth = 8; ctx.beginPath(); pts.forEach((p, i) => i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)); ctx.stroke();
  ctx.strokeStyle = '#e0523c'; ctx.lineWidth = 4; if (!done) ctx.setLineDash([10, 8]); ctx.beginPath(); pts.forEach((p, i) => i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)); ctx.stroke();
  ctx.restore();
}
function routePointAt(route, frac) {
  const pts = route.pts; let target = frac * route.len, acc = 0;
  for (let i = 1; i < pts.length; i++) { const d = dist(pts[i - 1].x, pts[i - 1].y, pts[i].x, pts[i].y); if (acc + d >= target) { const u = d ? (target - acc) / d : 0; return { x: lerp(pts[i - 1].x, pts[i].x, u), y: lerp(pts[i - 1].y, pts[i].y, u) }; } acc += d; }
  return pts[pts.length - 1];
}

const WalkMap = {
  enter() {
    this.p = activePup(); this.pts = []; this.len = 0; this.drawing = false; this.done = false; this.stops = []; this.visited = [];
    this.maxLen = Math.round(380 + this.p.d.energy * 6.5);
    this.p.setState('held'); this.p.pose = 'sit'; this.p.x = 150; this.p.y = 300; this.p.facing = 1;
    document.getElementById('cmdbar').style.display = 'none'; document.getElementById('menubar').style.display = 'none';
    say('Draw a route starting from Home. Pass the Park, Gym, Shop or Fountain to stop there.', 7000);
  },
  exit() { UI.hide(); },
  update(dt) { this.p.tick(dt); this.p.tailWag = 8; updateParticles(dt); },
  onDown(x, y) {
    if (x < 80 && y < 44) { switchScene('home'); return; }
    if (this.done) { if (y > HH - 58) { if (x > 262 && x < 440) this.go(); else if (x > 90 && x < 250) this.redraw(); } return; }
    const h = MAP_SPOTS.home;
    if (dist(x, y, h.x, h.y) < 40) { this.drawing = true; this.pts = [{ x: h.x, y: h.y }]; this.len = 0; Sound.click(); }
    else { say('Start drawing at Home (bottom left).', 2500); }
  },
  onMove(x, y) {
    if (!this.drawing) return;
    const last = this.pts[this.pts.length - 1]; const d = dist(x, y, last.x, last.y);
    if (d < 6) return;
    const px = clamp(x, 14, W - 14), py = clamp(y, 14, HH - 14);
    if (this.len + d > this.maxLen) { const u = (this.maxLen - this.len) / d; this.pts.push({ x: lerp(last.x, px, u), y: lerp(last.y, py, u) }); this.len = this.maxLen; this.finishDrawing(true); return; }
    this.pts.push({ x: px, y: py }); this.len += d;
  },
  onUp() { if (this.drawing) this.finishDrawing(false); },
  finishDrawing(hitLimit) {
    this.drawing = false;
    if (this.pts.length < 6 || this.len < 60) { this.pts = []; this.len = 0; say('That route is too short. Draw a longer loop from Home.', 3000); return; }
    const h = MAP_SPOTS.home; const last = this.pts[this.pts.length - 1];
    const back = dist(last.x, last.y, h.x, h.y);
    if (back > 30) { this.pts.push({ x: h.x, y: h.y }); this.len += back; }
    // stops: first point near each landmark
    let acc = 0; const found = {};
    for (let i = 1; i < this.pts.length; i++) {
      acc += dist(this.pts[i - 1].x, this.pts[i - 1].y, this.pts[i].x, this.pts[i].y);
      for (const [id, s] of Object.entries(MAP_SPOTS)) { if (id === 'home' || found[id]) continue; if (dist(this.pts[i].x, this.pts[i].y, s.x, s.y) < 30) found[id] = acc / this.len; }
    }
    this.stops = Object.entries(found).map(([kind, frac]) => ({ kind, frac: clamp(frac, 0.08, 0.95) })).sort((a, b) => a.frac - b.frac);
    this.visited = this.stops.map(s => s.kind);
    this.done = true; Sound.chime(); this.hitLimit = hitLimit;
    say(this.stops.length ? `Route set: ${this.stops.map(s => MAP_SPOTS[s.kind].name).join(', ')}. Tap Start the walk.` : 'Route set. Tap Start the walk, or redraw to pass a landmark.', 6000);
  },
  redraw() { UI.hide(); this.pts = []; this.len = 0; this.done = false; this.stops = []; this.visited = []; },
  go() { UI.hide(); switchScene('walk', { route: { pts: this.pts, len: this.len, stops: this.stops } }); },
  draw(ctx) {
    ctx.drawImage(mapBackground(), 0, 0);
    drawRoute(ctx, this.pts, this.done);
    drawMapSpots(ctx, null, this.visited);
    // puppy pin while drawing / done
    if (this.pts.length) { const e = this.pts[this.pts.length - 1]; ctx.fillStyle = '#e0523c'; ctx.beginPath(); ctx.arc(e.x, e.y, 6, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke(); }
    // length meter
    roundRect(ctx, 150, 10, 212, 30, 15, 'rgba(255,255,255,0.9)');
    roundRect(ctx, 158, 25, 196, 8, 4, '#eadfcb'); roundRect(ctx, 158, 25, 196 * clamp(this.len / this.maxLen, 0, 1), 8, 4, this.len / this.maxLen > 0.9 ? '#e0523c' : '#5cae5a');
    ctx.fillStyle = '#3b2e25'; ctx.font = `600 12px ${FONT}`; ctx.textAlign = 'center'; ctx.fillText(this.done ? 'Route ready' : this.drawing ? `Drawing… ${Math.round(this.len * 1.6)} m` : 'Drag from Home to draw your route', 256, 21);
    if (G.dogs.length) { ctx.font = `500 11px ${FONT}`; ctx.textAlign = 'left'; ctx.fillStyle = '#7a6756'; ctx.fillText('Max ' + Math.round(this.maxLen * 1.6) + ' m', 370, 30); }
    drawParticles(ctx);
    if (this.done) { // confirmation strip with canvas buttons
      roundRect(ctx, 0, HH - 64, W, 64, 0, 'rgba(255,253,248,0.96)'); ctx.fillStyle = 'rgba(0,0,0,0.08)'; ctx.fillRect(0, HH - 64, W, 2);
      ctx.fillStyle = '#3b2e25'; ctx.font = `600 13px ${FONT}`; ctx.textAlign = 'left'; ctx.fillText(`${Math.round(this.len * 1.6)} m · Stops: ${this.stops.length ? this.stops.map(s => MAP_SPOTS[s.kind].name).join(', ') : 'none'}`, 14, HH - 42);
      roundRect(ctx, 90, HH - 34, 160, 26, 13, '#fff', '#e7d8c0'); ctx.fillStyle = '#7a6756'; ctx.textAlign = 'center'; ctx.fillText('Redraw', 170, HH - 16);
      roundRect(ctx, 262, HH - 34, 178, 26, 13, '#3f6fb5'); ctx.fillStyle = '#fff'; ctx.fillText('Start the walk', 351, HH - 16);
    }
    // back button
    roundRect(ctx, 10, 10, 64, 30, 15, 'rgba(255,255,255,0.9)'); ctx.fillStyle = '#3f6fb5'; ctx.font = `600 13px ${FONT}`; ctx.textAlign = 'center'; ctx.fillText('‹ Back', 42, 30);
  },
  drawTop(ctx) {
    topPanelBG(ctx, 'Plan a walk');
    ctx.fillStyle = '#3b2e25'; font(ctx, 14); ctx.textAlign = 'left';
    ctx.fillText(`${this.p.d.name} · Energy ${Math.round(this.p.d.energy)} · ${G.weather === 'rain' ? 'Rainy' : G.weather === 'cloud' ? 'Cloudy' : 'Sunny'}`, 18, 56);
    roundRect(ctx, 18, 70, W - 36, 110, 12, 'rgba(255,255,255,0.8)');
    font(ctx, 13); ctx.fillStyle = '#5a4634';
    wrapText(ctx, 'Draw a loop on the touch screen with your finger or mouse, starting at Home. Longer routes find more presents but tire your puppy. Pass a landmark to stop there:', 30, 92, W - 60, 17);
    const cols = [['park', 30, 150], ['gym', 270, 150], ['shop', 30, 172], ['fountain', 270, 172]];
    for (const [id, x, yy] of cols) { const s = MAP_SPOTS[id]; ctx.save(); ctx.translate(x + 10, yy - 4); drawIcon(ctx, s.icon, 18); ctx.restore(); ctx.fillStyle = '#3b2e25'; font(ctx, 12.5); ctx.textAlign = 'left'; ctx.fillText(`${s.name}: ${s.desc}`, x + 26, yy); }
    drawDog(ctx, this.p.d, { x: 256, y: 300, scale: 1.0, facing: 1, pose: 'sit', t: G.t, eyes: 'open', mouth: 'smile', tailWag: 8, acc: Object.assign({}, this.p.d.acc, { neck: this.p.d.acc.neck || 'collar_red' }) });
    ctx.strokeStyle = '#c0392b'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(300, 236); ctx.quadraticCurveTo(340, 250, 380, 200); ctx.stroke();
    drawMessageBox(ctx);
  },
};
function registerWalkMap() { G.scenes.walkmap = WalkMap; }
