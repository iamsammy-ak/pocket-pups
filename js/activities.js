// ================= Activities: Walk, Bath, Disc, Agility, Obedience =================

function font(ctx, size, bold) { ctx.font = `${bold ? 'bold ' : ''}${size}px "Trebuchet MS", sans-serif`; }
function outlinedText(ctx, text, x, y, size, color = '#fff', align = 'center', bold = true) {
  font(ctx, size, bold); ctx.textAlign = align; ctx.lineWidth = Math.max(3, size / 5); ctx.strokeStyle = 'rgba(0,0,0,0.45)'; ctx.lineJoin = 'round';
  ctx.strokeText(text, x, y); ctx.fillStyle = color; ctx.fillText(text, x, y);
}
function topPanelBG(ctx, title) {
  const g = ctx.createLinearGradient(0, 0, 0, HH); g.addColorStop(0, '#fff6e3'); g.addColorStop(1, '#ffe8c2');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, HH);
  ctx.fillStyle = '#5a4634'; font(ctx, 20, true); ctx.textAlign = 'left'; ctx.fillText(title, 18, 30);
  ctx.textAlign = 'right'; ctx.fillStyle = '#2a7a3a'; ctx.fillText(fmtMoney(G.save.money), W - 18, 30);
}
function drawSkyGround(ctx, scroll, tod, horizonY = 250) {
  tod = tod || timeOfDay();
  const sky = ctx.createLinearGradient(0, 0, 0, horizonY);
  if (tod === 'night') { sky.addColorStop(0, '#0d1240'); sky.addColorStop(1, '#3a4580'); }
  else if (tod === 'dusk') { sky.addColorStop(0, '#5a63b8'); sky.addColorStop(1, '#ffb27a'); }
  else { sky.addColorStop(0, '#5fb0f0'); sky.addColorStop(1, '#d6efff'); }
  ctx.fillStyle = sky; ctx.fillRect(0, 0, W, horizonY);
  // clouds
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  for (let i = 0; i < 5; i++) { const cx = ((i * 170 - scroll * 0.1) % (W + 200) + W + 200) % (W + 200) - 100, cy = 40 + (i % 3) * 30; ctx.beginPath(); ctx.arc(cx, cy, 16, 0, Math.PI * 2); ctx.arc(cx + 18, cy - 8, 20, 0, Math.PI * 2); ctx.arc(cx + 40, cy, 15, 0, Math.PI * 2); ctx.fill(); }
  // hills
  ctx.fillStyle = tod === 'night' ? '#223055' : '#7fbf6a';
  for (let i = -1; i < 6; i++) { const hx = ((i * 220 - scroll * 0.25) % (W + 440) + W + 440) % (W + 440) - 220; ctx.beginPath(); ctx.arc(hx, horizonY + 20, 120, Math.PI, 0); ctx.fill(); }
  if (tod === 'night') { ctx.fillStyle = 'rgba(20,20,60,0.25)'; }
}
function drawTree(ctx, x, y, s = 1, tod) {
  ctx.fillStyle = '#7a4a2a'; ctx.fillRect(x - 5 * s, y - 40 * s, 10 * s, 40 * s);
  ctx.fillStyle = tod === 'night' ? '#1f4a2a' : '#3f8f3a'; ctx.beginPath(); ctx.arc(x, y - 55 * s, 26 * s, 0, Math.PI * 2); ctx.arc(x - 18 * s, y - 40 * s, 18 * s, 0, Math.PI * 2); ctx.arc(x + 18 * s, y - 42 * s, 19 * s, 0, Math.PI * 2); ctx.fill();
}
function otherDogData() { const breed = pick(Object.keys(BREEDS)); const color = pick(Object.keys(BREEDS[breed].colors)); return newDog(breed, color, pick(DOG_NAMES)); }

// ================= WALK =================
const Walk = {
  enter() {
    this.p = activePup(); this.scroll = 0; this.speed = 100; this.len = 3200; this.done = false; this.t = 0; this.found = []; this.money = 0;
    this.p.x = 190; this.p.y = 330; this.p.facing = 1; this.p.pose = 'walk'; this.p.setState('held'); this.p.hidden = false; this.p.carrying = null;
    this.event = null; this.events = [];
    const kinds = ['present', 'present', 'present', 'poop', 'otherdog', 'hydrant', 'trash', 'otherdog', 'present', 'poop'];
    const n = 7 + Math.floor(Math.random() * 3);
    const chosen = kinds.sort(() => Math.random() - 0.5).slice(0, n);
    if (this.p.d.hunger > 50 && !chosen.includes('poop')) chosen.push('poop');
    chosen.forEach((k, i) => this.events.push({ kind: k, wx: 500 + i * ((this.len - 800) / n) + rand(-60, 60), state: 'pending', data: {} }));
    this.events.sort((a, b) => a.wx - b.wx);
    this.bagT = 0; this.tod = timeOfDay(); this.msg = `Walking with ${this.p.d.name}. Tap presents, clean up poop, pull the leash near trash!`;
    say(this.msg, 6000); this.other = null;
  },
  exit() { this.p.setState('idle', 1); this.p.pose = 'stand'; this.p.x = 256; this.p.y = 340; this.p.hidden = false; },
  update(dt) {
    this.t += dt; const p = this.p; p.tick(dt);
    const ev = this.event;
    if (!ev && !this.done) {
      this.scroll += this.speed * dt; p.pose = 'walk'; p.walkPhase += dt * 11; p.mouth = 'pant';
      // next event
      const next = this.events.find(e => e.state === 'pending');
      if (next && next.wx - this.scroll < p.x + 40) this.startEvent(next);
      if (this.scroll >= this.len) this.finish();
    } else if (ev) {
      ev.t += dt; this.updateEvent(ev, dt);
    }
    if (this.other) { const o = this.other; o.tick(dt); if (o.state === 'leaving') { o.x -= 120 * dt; o.pose = 'walk'; o.walkPhase += dt * 11; if (o.x < -80) this.other = null; } else if (o.state === 'approach') { if (o.x > p.x + 150) { o.x -= 110 * dt; o.pose = 'walk'; o.walkPhase += dt * 11; } else o.pose = 'stand'; } }
    updateParticles(dt);
  },
  startEvent(ev) {
    ev.state = 'active'; ev.t = 0; this.event = ev; const p = this.p;
    p.pose = 'stand';
    switch (ev.kind) {
      case 'present': ev.prompt = 'A present! Tap it to pick it up.'; ev.limit = 4; ev.x = ev.wx - this.scroll; break;
      case 'poop': ev.prompt = `${p.d.name} needs to go...`; ev.limit = 99; ev.phase = 'squat'; ev.x = p.x - 20; break;
      case 'otherdog': { ev.prompt = 'Another puppy! Tap it to say hello.'; ev.limit = 5; this.other = new Pup(otherDogData()); this.other.x = W + 60; this.other.y = 330; this.other.facing = -1; this.other.state = 'approach'; break; }
      case 'hydrant': ev.prompt = `${p.d.name} is sniffing a hydrant.`; ev.limit = 1.8; ev.x = ev.wx - this.scroll; break;
      case 'trash': ev.prompt = 'Trash! Drag the puppy left to pull it away!'; ev.limit = 3; ev.x = ev.wx - this.scroll; ev.pull = 0; break;
    }
    say(ev.prompt, 5000);
  },
  updateEvent(ev, dt) {
    const p = this.p;
    if (ev.kind === 'poop') {
      if (ev.phase === 'squat') { p.pose = 'sit'; if (ev.t > 1.6) { ev.phase = 'drop'; ev.poopX = p.x - 28; ev.poopY = 334; ev.t = 0; say('Tap the poop to bag it before anyone sees!', 4000); } }
      else if (ev.phase === 'drop') { p.pose = 'stand'; if (ev.t > 5) { this.endEvent('A neighbour frowned at you for not cleaning up.', -3); } }
      return;
    }
    if (ev.kind === 'hydrant') { p.headPitch = 0.6; if (ev.t > ev.limit) { p.headPitch = 0; this.endEvent(null, 0); } return; }
    if (ev.kind === 'trash') {
      p.headPitch = 0.5; p.x += 12 * dt; if (ev.pull >= 1) { p.headPitch = 0; p.x = 190; this.endEvent(`Good! You pulled ${p.d.name} away from the trash.`, 1); return; }
      if (ev.t > ev.limit) { p.headPitch = 0; p.x = 190; p.d.clean = clamp(p.d.clean - 15, 0, 100); p.d.hunger = clamp(p.d.hunger + 5, 0, 100); this.endEvent(`${p.d.name} ate something gross from the trash. Yuck!`, -1); }
      return;
    }
    if (ev.kind === 'otherdog') {
      if (ev.t > ev.limit + 1.5) { if (this.other) this.other.state = 'leaving'; this.endEvent('The other puppy walked on.', 0); }
      if (this.other && ev.t > 0.2) { p.facing = 1; }
      return;
    }
    if (ev.kind === 'present') { p.headPitch = 0.4; if (ev.t > ev.limit) { p.headPitch = 0; this.endEvent('You left the present behind.', 0); } }
  },
  endEvent(msg, bond) {
    if (msg) say(msg, 3500); if (bond) addBond(this.p.d, bond);
    if (this.event) this.event.state = 'done'; this.event = null; this.p.pose = 'walk';
  },
  finish() {
    this.done = true; const d = this.p.d;
    d.energy = clamp(d.energy - 25, 0, 100); d.clean = clamp(d.clean - 12, 0, 100); d.happy = clamp(d.happy + 20, 0, 100); d.hunger = clamp(d.hunger - 8, 0, 100); d.thirst = clamp(d.thirst - 12, 0, 100); addBond(d, 4);
    G.save.totalWalks++;
    const items = this.found.length ? '<ul>' + this.found.map(f => `<li>${f}</li>`).join('') + '</ul>' : '<div class="note">Nothing found this time.</div>';
    UI.show(panelHeader('Walk complete!') + `<div class="info"><p>${d.name} had a great walk. Happiness +20, Bond +4.</p><h4>Found on the way</h4>${items}${this.money ? `<p>Money found: ${fmtMoney(this.money)}</p>` : ''}
      <div class="note"><button onclick="switchScene('home')">Head home</button></div></div>`, 'tall');
    saveGame(); Sound.chime();
  },
  onDown(x, y) {
    const ev = this.event; if (!ev) return; const p = this.p;
    if (ev.kind === 'present' && dist(x, y, ev.x, 318) < 36) { this.openPresent(); return; }
    if (ev.kind === 'poop' && ev.phase === 'drop' && dist(x, y, ev.poopX, ev.poopY) < 34) { Sound.pop(); sparkle(ev.poopX, ev.poopY, 8); this.endEvent('You bagged it. Good trainer!', 2); return; }
    if (ev.kind === 'otherdog' && this.other && this.other.hit(x, y)) {
      const o = this.other; o.tailWag = 10; p.tailWag = 10; hearts((o.x + p.x) / 2, 280, 4); Sound.doubleBark(o.size);
      const friendly = Math.random() < 0.8;
      if (friendly) { p.d.happy = clamp(p.d.happy + 6, 0, 100); addBond(p.d, 1); say(`${p.d.name} and ${o.d.name} the ${BREEDS[o.d.breed].name} became friends!`, 3500); if (Math.random() < 0.3) { const gift = pick(['ball', 'bone', 'dryfood', 'jerky']); invAdd(gift); this.found.push(`${ITEMS[gift].name} (gift from ${o.d.name}'s owner)`); } }
      else { say(`${o.d.name} wasn't in the mood to play.`, 3000); }
      o.state = 'leaving'; ev.state = 'done'; this.event = null; p.pose = 'walk';
      return;
    }
    if (ev.kind === 'trash') { this.dragStart = { x, y }; }
  },
  onMove(x, y) { const ev = this.event; if (ev && ev.kind === 'trash' && this.dragStart && G.pointer.down) { if (x < this.dragStart.x - 6) { ev.pull += (this.dragStart.x - x) / 140; this.dragStart.x = x; } } },
  onUp() { this.dragStart = null; },
  openPresent() {
    const ev = this.event; const p = this.p; Sound.coin(); sparkle(ev.x, 300, 14);
    const r = Math.random(); let msg;
    if (r < 0.3) { const m = pick([20, 30, 50, 80, 120]); addMoney(m); this.money += m; msg = `${fmtMoney(m)}`; }
    else if (r < 0.75) { const it = pick(['dryfood', 'dryfood', 'milk', 'jerky', 'deluxe', 'ball', 'bone', 'rope', 'frisbee', 'shampoo']); invAdd(it); msg = ITEMS[it].name; }
    else if (r < 0.9) { const accs = Object.keys(ITEMS).filter(k => ITEMS[k].type === 'acc' && !G.save.ownedAcc.includes(k)); if (accs.length) { const a = pick(accs); G.save.ownedAcc.push(a); msg = ITEMS[a].name + ' (accessory!)'; } else { addMoney(60); this.money += 60; msg = '$60'; } }
    else { msg = 'an empty box'; }
    this.found.push(msg); say(`Inside the present: ${msg}!`, 3500); p.d.happy = clamp(p.d.happy + 3, 0, 100);
    p.headPitch = 0; ev.state = 'done'; this.event = null; p.pose = 'walk';
  },
  draw(ctx) {
    const s = this.scroll; const tod = this.tod;
    drawSkyGround(ctx, s, tod, 240);
    // buildings far
    for (let i = -1; i < 7; i++) { const bx = ((i * 150 - s * 0.4) % (W + 300) + W + 300) % (W + 300) - 150; const bh = 60 + (i * 37) % 50; ctx.fillStyle = tod === 'night' ? '#2a3050' : ['#e8d6c0', '#d6c8b8', '#c9b9a9'][(i + 3) % 3]; ctx.fillRect(bx, 240 - bh, 90, bh); ctx.fillStyle = tod === 'night' ? '#ffe9a0' : '#9ac7e8'; for (let w = 0; w < 6; w++) ctx.fillRect(bx + 10 + (w % 3) * 26, 250 - bh + Math.floor(w / 3) * 24, 14, 14); }
    // grass strip and sidewalk
    ctx.fillStyle = tod === 'night' ? '#2f5a2a' : '#6fb25a'; ctx.fillRect(0, 240, W, 40);
    for (let i = -1; i < 8; i++) drawTree(ctx, ((i * 190 - s * 0.7) % (W + 380) + W + 380) % (W + 380) - 190, 262, 0.9, tod);
    ctx.fillStyle = tod === 'night' ? '#9a9aa8' : '#d8d2c8'; ctx.fillRect(0, 280, W, 70);
    ctx.strokeStyle = 'rgba(0,0,0,0.12)'; ctx.lineWidth = 2; for (let i = -1; i < 8; i++) { const lx = ((i * 90 - s) % (W + 180) + W + 180) % (W + 180) - 90; ctx.beginPath(); ctx.moveTo(lx, 280); ctx.lineTo(lx, 350); ctx.stroke(); }
    ctx.fillStyle = tod === 'night' ? '#2e2e38' : '#595966'; ctx.fillRect(0, 350, W, 34);
    ctx.fillStyle = '#f0d060'; for (let i = -1; i < 8; i++) { const lx = ((i * 80 - s * 1.2) % (W + 160) + W + 160) % (W + 160) - 80; ctx.fillRect(lx, 365, 40, 4); }
    // event props
    for (const ev of this.events) {
      const ex = ev.wx - s; if (ex < -60 || ex > W + 60) continue;
      if (ev.kind === 'present' && ev.state !== 'done') { ev.x = ex; this.drawPresent(ctx, ex, 318, ev.state === 'active'); }
      if (ev.kind === 'hydrant') { ctx.fillStyle = '#d64545'; roundRect(ctx, ex - 8, 296, 16, 36, 4, '#d64545'); roundRect(ctx, ex - 12, 300, 24, 6, 2, '#b83535'); ctx.beginPath(); ctx.arc(ex, 296, 9, Math.PI, 0); ctx.fill(); }
      if (ev.kind === 'trash') { roundRect(ctx, ex - 16, 290, 32, 44, 4, '#6a7a6a'); roundRect(ctx, ex - 19, 286, 38, 8, 3, '#4f5f4f'); if (ev.state !== 'done') { ctx.fillStyle = '#e0e0a0'; ctx.beginPath(); ctx.arc(ex + 4, 292, 6, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#c05050'; ctx.beginPath(); ctx.arc(ex - 6, 290, 5, 0, Math.PI * 2); ctx.fill(); } }
      if (ev.kind === 'poop' && ev.phase === 'drop' && ev.state === 'active') { const px = ev.poopX, py = ev.poopY; ctx.fillStyle = '#6b4a2a'; ctx.beginPath(); ctx.arc(px, py, 9, 0, Math.PI * 2); ctx.arc(px - 2, py - 8, 6, 0, Math.PI * 2); ctx.arc(px + 1, py - 13, 4, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = 'rgba(255,255,255,0.9)'; outlinedText(ctx, '💩 tap!', px, py - 24, 13); }
    }
    // leash hand
    const p = this.p; const z = p.zones();
    ctx.strokeStyle = '#c0392b'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(40, 150); ctx.quadraticCurveTo(100, 260, z.head.x - 10, z.head.y + 14); ctx.stroke();
    ctx.fillStyle = '#f1c9a5'; ctx.beginPath(); ctx.arc(40, 150, 14, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#4f8fd6'; ctx.fillRect(0, 150, 46, 60); ctx.beginPath(); ctx.arc(23, 150, 23, Math.PI, 0); ctx.fill();
    if (this.other) this.other.draw(ctx);
    p.draw(ctx, { scale: 1.1, acc: Object.assign({}, p.d.acc, { neck: p.d.acc.neck || 'collar_red' }) });
    drawParticles(ctx);
    if (this.event && this.event.prompt && !this.done) outlinedText(ctx, this.event.prompt, W / 2, 30, 16);
  },
  drawPresent(ctx, x, y, active) {
    const bob = active ? Math.sin(G.t * 6) * 3 : 0;
    roundRect(ctx, x - 18, y - 30 + bob, 36, 30, 4, '#ff7eb6'); ctx.fillStyle = '#fff'; ctx.fillRect(x - 4, y - 30 + bob, 8, 30); ctx.fillRect(x - 18, y - 18 + bob, 36, 7);
    fillEllipse(ctx, x - 6, y - 34 + bob, 6, 4, '#ffd84a', -0.5); fillEllipse(ctx, x + 6, y - 34 + bob, 6, 4, '#ffd84a', 0.5);
    if (active) outlinedText(ctx, 'tap!', x, y - 44 + bob, 13);
  },
  drawTop(ctx) {
    topPanelBG(ctx, 'Walk');
    const p = this.p;
    ctx.fillStyle = '#5a4634'; font(ctx, 14); ctx.textAlign = 'left';
    ctx.fillText(`${p.d.name} · Energy ${Math.round(p.d.energy)} · Clean ${Math.round(p.d.clean)}`, 18, 56);
    // route map
    roundRect(ctx, 18, 70, W - 36, 120, 12, 'rgba(255,255,255,0.8)');
    ctx.strokeStyle = '#c8b89a'; ctx.lineWidth = 10; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(50, 150); ctx.bezierCurveTo(150, 80, 250, 190, 350, 110); ctx.lineTo(460, 130); ctx.stroke();
    const prog = clamp(this.scroll / this.len, 0, 1);
    // position along bezier approximated by t
    const pt = this.routePoint(prog);
    ctx.fillStyle = '#e0523c'; ctx.beginPath(); ctx.arc(50, 150, 8, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#2a8a3a'; ctx.beginPath(); ctx.arc(460, 130, 8, 0, Math.PI * 2); ctx.fill();
    for (const ev of this.events) { const q = this.routePoint(clamp(ev.wx / this.len, 0, 1)); ctx.fillStyle = ev.state === 'done' ? '#bbb' : ev.kind === 'present' ? '#ff7eb6' : ev.kind === 'otherdog' ? '#4f8fd6' : '#c8b89a'; ctx.beginPath(); ctx.arc(q.x, q.y, 5, 0, Math.PI * 2); ctx.fill(); }
    drawDog(ctx, p.d, { x: pt.x, y: pt.y + 4, scale: 0.35, facing: 1, pose: 'walk', walkPhase: p.walkPhase, t: G.t });
    font(ctx, 12); ctx.fillStyle = '#8a7a6a'; ctx.textAlign = 'left'; ctx.fillText('Home', 36, 172); ctx.textAlign = 'right'; ctx.fillText('Home', 476, 112);
    ctx.textAlign = 'left'; ctx.fillStyle = '#5a4634'; font(ctx, 14, true); ctx.fillText(`Progress ${Math.round(prog * 100)}%`, 18, 215);
    roundRect(ctx, 18, 222, W - 36, 12, 6, '#e8dcc6'); roundRect(ctx, 18, 222, (W - 36) * prog, 12, 6, '#8ad05a');
    font(ctx, 13); ctx.fillStyle = '#5a4634'; ctx.fillText('Found: ' + (this.found.length ? this.found.join(', ') : 'nothing yet'), 18, 258);
    wrapText(ctx, 'Tap presents · Tap poop to bag it · Drag left to pull away from trash · Tap other puppies to greet', 18, 280, W - 36, 16);
    drawMessageBox(ctx);
  },
  routePoint(t) {
    if (t < 0.8) { const u = t / 0.8; const x = (1 - u) ** 3 * 50 + 3 * (1 - u) ** 2 * u * 150 + 3 * (1 - u) * u * u * 250 + u ** 3 * 350; const y = (1 - u) ** 3 * 150 + 3 * (1 - u) ** 2 * u * 80 + 3 * (1 - u) * u * u * 190 + u ** 3 * 110; return { x, y }; }
    const u = (t - 0.8) / 0.2; return { x: lerp(350, 460, u), y: lerp(110, 130, u) };
  },
};

// ================= BATH =================
const Bath = {
  enter() { this.p = activePup(); this.phase = 'lather'; this.suds = 0; this.rinse = 0; this.t = 0; this.tool = null; this.shakeT = 0; this.p.setState('held'); this.p.pose = 'stand'; this.p.hidden = false; say('Rub the sponge over your puppy to lather up, then rinse with the shower.', 6000); },
  exit() { this.p.sudsLevel = 0; this.p.setState('idle', 1); this.p.pose = 'stand'; this.p.x = 256; this.p.y = 340; },
  update(dt) {
    this.t += dt; const p = this.p; p.tick(dt);
    p.x = 256; p.y = 300; p.facing = 1;
    if (this.phase === 'lather') { p.sudsLevel = this.suds; if (this.suds >= 1) { this.phase = 'rinse'; say('All soapy! Now drag the shower over your puppy to rinse.', 5000); Sound.chime(); } }
    else if (this.phase === 'rinse') { p.sudsLevel = 1 - this.rinse; if (this.rinse >= 1) { this.phase = 'shake'; this.shakeT = 0; p.sudsLevel = 0; Sound.splash(); } }
    else if (this.phase === 'shake') { this.shakeT += dt; p.pose = 'shakeoff'; p.eyes = 'closed'; if (Math.random() < 0.6) spawnParticle({ x: p.x + rand(-60, 60), y: p.y - rand(20, 90), vx: rand(-120, 120), vy: rand(-80, 20), type: 'drop', size: rand(2, 4), life: 0.8 }); if (this.shakeT > 1.6) this.finish(); }
    if (this.phase === 'lather' && this.tool === 'sponge' && G.pointer.down && p.hit(G.pointer.x, G.pointer.y)) { this.suds = clamp(this.suds + dt * 0.35, 0, 1); p.eyes = 'happy'; if (Math.random() < 0.3) spawnParticle({ x: G.pointer.x + rand(-10, 10), y: G.pointer.y + rand(-10, 10), vx: rand(-10, 10), vy: -20, type: 'bubble', size: rand(3, 8), life: 1 }); }
    if (this.phase === 'rinse' && this.tool === 'shower' && G.pointer.down) { for (let i = 0; i < 3; i++) spawnParticle({ x: G.pointer.x + rand(-14, 14), y: G.pointer.y + 10, vx: rand(-10, 10), vy: 220, type: 'drop', size: 2.5, life: 0.5 }); if (p.hit(G.pointer.x, G.pointer.y + 30) || p.hit(G.pointer.x, G.pointer.y + 60)) { this.rinse = clamp(this.rinse + dt * 0.4, 0, 1); p.eyes = 'closed'; } }
    updateParticles(dt);
  },
  finish() {
    const d = this.p.d; d.clean = 100; d.happy = clamp(d.happy + 8, 0, 100); addBond(d, 2); invAdd('shampoo', -1); this.phase = 'done';
    UI.show(panelHeader('Squeaky clean!') + `<div class="info"><p>${d.name} is sparkling clean and smells great. Happiness +8, Bond +2.</p><div class="note"><button onclick="switchScene('home')">Back to the room</button></div></div>`);
    sparkle(256, 220, 16); Sound.fanfare(); saveGame();
  },
  onDown(x, y) { if (this.phase === 'lather' && dist(x, y, 70, 330) < 40) this.tool = 'sponge'; else if (this.phase === 'rinse' && dist(x, y, 440, 330) < 40) this.tool = 'shower'; else if (this.phase === 'lather') this.tool = 'sponge'; else if (this.phase === 'rinse') this.tool = 'shower'; },
  onMove() { }, onUp() { },
  draw(ctx) {
    // bathroom
    ctx.fillStyle = '#d8f0f7'; ctx.fillRect(0, 0, W, HH);
    ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.lineWidth = 2; for (let i = 0; i < 14; i++) { ctx.beginPath(); ctx.moveTo(i * 40, 0); ctx.lineTo(i * 40, 230); ctx.stroke(); } for (let j = 0; j < 7; j++) { ctx.beginPath(); ctx.moveTo(0, j * 40); ctx.lineTo(W, j * 40); ctx.stroke(); }
    ctx.fillStyle = '#9fcbe0'; ctx.fillRect(0, 230, W, HH - 230);
    // tub back
    roundRect(ctx, 96, 250, 320, 60, 20, '#ffffff');
    const p = this.p;
    // water in tub
    ctx.fillStyle = 'rgba(120,190,255,0.55)'; ellipsePath(ctx, 256, 300, 150, 16); ctx.fill();
    p.draw(ctx, { scale: 1.45 });
    // tub front
    roundRect(ctx, 90, 300, 332, 60, 24, '#f4f8fa'); ctx.fillStyle = 'rgba(0,0,0,0.06)'; ctx.fillRect(96, 348, 320, 12);
    // tap
    ctx.fillStyle = '#b8c4cc'; roundRect(ctx, 400, 215, 10, 40, 4, '#b8c4cc'); roundRect(ctx, 380, 212, 40, 10, 4, '#b8c4cc');
    // tools
    const sp = this.phase === 'lather', sh = this.phase === 'rinse';
    ctx.save(); ctx.globalAlpha = sp ? 1 : 0.4; roundRect(ctx, 46, 316, 48, 28, 6, '#f5d76e'); ctx.fillStyle = 'rgba(0,0,0,0.1)'; for (let i = 0; i < 8; i++) { ctx.beginPath(); ctx.arc(52 + (i * 13) % 40, 322 + (i * 7) % 18, 2, 0, Math.PI * 2); ctx.fill(); } ctx.restore();
    outlinedText(ctx, 'Sponge', 70, 368, 12, '#345');
    ctx.save(); ctx.globalAlpha = sh ? 1 : 0.4; ctx.strokeStyle = '#8fa5b5'; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(470, 380); ctx.quadraticCurveTo(480, 330, 445, 318); ctx.stroke(); fillEllipse(ctx, 440, 322, 22, 10, '#c8d4dc', -0.5); ctx.restore();
    outlinedText(ctx, 'Shower', 440, 368, 12, '#345');
    drawParticles(ctx);
    // cursor tool
    if (G.pointer.down && this.tool && (sp || sh)) {
      const { x, y } = G.pointer;
      if (this.tool === 'sponge') roundRect(ctx, x - 22, y - 12, 44, 24, 6, '#f5d76e');
      else { fillEllipse(ctx, x, y, 22, 10, '#c8d4dc'); ctx.strokeStyle = '#8fa5b5'; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(x + 10, y - 4); ctx.quadraticCurveTo(x + 60, y - 60, W, 0); ctx.stroke(); }
    }
    const meter = this.phase === 'lather' ? this.suds : this.phase === 'rinse' ? this.rinse : 1;
    roundRect(ctx, 156, 16, 200, 14, 7, 'rgba(255,255,255,0.8)'); roundRect(ctx, 156, 16, 200 * meter, 14, 7, this.phase === 'lather' ? '#f5d76e' : '#4f8fd6');
    outlinedText(ctx, this.phase === 'lather' ? 'Lather' : this.phase === 'rinse' ? 'Rinse' : 'Shake it off!', W / 2, 52, 16);
  },
  drawTop(ctx) { topPanelBG(ctx, 'Bath time'); ctx.fillStyle = '#5a4634'; font(ctx, 14); ctx.textAlign = 'left'; ctx.fillText(`${this.p.d.name} · Clean ${Math.round(this.p.d.clean)}% · Shampoo left: ${invCount('shampoo')}`, 18, 56); wrapText(ctx, this.phase === 'lather' ? 'Hold the mouse on your puppy and rub the sponge back and forth until the bubbles meter is full.' : this.phase === 'rinse' ? 'Hold the shower above your puppy so the water falls on it. Rinse until all the suds are gone.' : 'All done!', 18, 84, W - 36, 18); drawDog(ctx, this.p.d, { x: 256, y: 290, scale: 1.2, facing: 1, pose: 'sit', t: G.t, eyes: 'happy', mouth: 'smile', acc: this.p.d.acc, dirt: clamp((60 - this.p.d.clean) / 60, 0, 1) }); drawMessageBox(ctx); },
};

// ================= Contest helpers =================
function contestCompetitors(kind, cls) {
  const mine = G.dogs.map(p => normalize(p.d.name));
  const names = DOG_NAMES.filter(n => !mine.includes(normalize(n))).sort(() => Math.random() - 0.5).slice(0, 4);
  const bases = { disc: [16, 25, 34, 43, 52], agility: [31, 27, 24, 21.5, 19.5], obedience: [44, 58, 70, 80, 90] }[kind];
  return names.map(n => ({ name: n, breed: BREEDS[pick(Object.keys(BREEDS))].name, score: kind === 'agility' ? bases[cls] + rand(-2.5, 3) : Math.max(0, Math.round(bases[cls] + rand(-3, 3.5))) }));
}
function contestResult(kind, score, label, better) {
  const p = activePup(); const d = p.d; const cls = d.classes[kind];
  const comps = contestCompetitors(kind, cls);
  const all = [...comps.map(c => ({ ...c, me: false })), { name: d.name, breed: BREEDS[d.breed].name, score, me: true }];
  all.sort((a, b) => better === 'low' ? a.score - b.score : b.score - a.score);
  const rank = all.findIndex(a => a.me) + 1;
  const prize = rank <= 3 ? CONTEST_PRIZES[cls][rank - 1] : 0;
  let note = '';
  if (prize) { addMoney(prize); }
  if (rank === 1) { d.trophies.push({ kind: { disc: 'Disc', agility: 'Agility', obedience: 'Obedience' }[kind], cls, rank }); if (cls < CONTEST_CLASSES.length - 1) { d.classes[kind]++; note = `Promoted to <b>${CONTEST_CLASSES[cls + 1]}</b> class!`; } else note = 'Champion of champions!'; Sound.fanfare(); }
  else if (rank <= 3) { d.trophies.push({ kind: { disc: 'Disc', agility: 'Agility', obedience: 'Obedience' }[kind], cls, rank }); Sound.chime(); }
  else Sound.sad();
  d.energy = clamp(d.energy - 15, 0, 100); d.happy = clamp(d.happy + (rank <= 3 ? 10 : 3), 0, 100); addBond(d, rank <= 3 ? 3 : 1); d.thirst = clamp(d.thirst - 10, 0, 100);
  G.save.trainerPts += prize / 10;
  const rows = all.map((a, i) => `<tr class="${a.me ? 'me' : ''}"><td>${['🥇', '🥈', '🥉'][i] || (i + 1) + 'th'}</td><td>${a.name}</td><td>${a.breed}</td><td>${better === 'low' ? a.score.toFixed(2) + 's' : a.score + ' ' + label}</td></tr>`).join('');
  UI.show(panelHeader(`${{ disc: 'Disc Competition', agility: 'Agility Trial', obedience: 'Obedience Trial' }[kind]} · ${CONTEST_CLASSES[cls]}`) + `<div class="info"><p><b>${d.name}</b> finished <b>${rank}${['st', 'nd', 'rd'][rank - 1] || 'th'}</b>! ${prize ? 'Prize: ' + fmtMoney(prize) + '.' : 'No prize this time.'} ${note}</p>
    <table class="rank">${rows}</table><div class="note"><button onclick="switchScene('home')">Back home</button></div></div>`, 'tall');
  saveGame();
}

// ================= DISC COMPETITION =================
const Disc = {
  enter() {
    this.p = activePup(); this.time = 60; this.score = 0; this.throws = 0; this.state = 'ready'; this.disc = null; this.drag = null; this.over = false; this.lastPts = null;
    this.dog = { wx: 18, d: 4, target: null, has: false, jump: 0, jumpV: 0, pose: 'sit', facing: -1, walk: 0 };
    this.p.setState('held'); this.p.hidden = true; this.t = 0; this.intro = 2.5;
    say('Drag the disc and release to throw. Far zones score more. Mid-air catches score double!', 7000);
  },
  exit() { this.p.hidden = false; this.p.setState('idle', 1); this.p.pose = 'stand'; this.p.x = 256; this.p.y = 340; },
  proj(wx, d, z = 0) { const k = 1 - d / 115; const y = 352 - d * 2.15; return { x: 256 + wx * (0.9 * k + 0.25) * 4.2, y: y - z * (0.4 + 0.6 * k), s: 0.35 + 0.95 * k }; },
  update(dt) {
    this.t += dt; const p = this.p; p.tick(dt);
    if (this.intro > 0) { this.intro -= dt; return; }
    if (!this.over) { this.time -= dt; if (this.time <= 0) { this.time = 0; this.over = true; this.state = 'done'; setTimeout(() => contestResult('disc', this.score, 'pts', 'high'), 1200); p.d.discSkill = clamp(p.d.discSkill + 2, 0, 100); } }
    const dog = this.dog; const skill = p.d.discSkill;
    const speed = 40 + skill * 0.4;
    if (dog.jump > 0 || dog.jumpV) { dog.jumpV -= 160 * dt; dog.jump += dog.jumpV * dt; if (dog.jump <= 0) { dog.jump = 0; dog.jumpV = 0; } }
    const disc = this.disc;
    if (disc && disc.flying) {
      disc.t += dt; disc.wx += disc.vx * dt; disc.d += disc.vd * dt; disc.vd *= (1 - 0.35 * dt); disc.vz -= 20 * dt; disc.z += disc.vz * dt; disc.spin += dt * 12;
      // dog chase
      if (disc.t > 0.2) {
        // predicted landing
        let sz = disc.z, svz = disc.vz, sd = disc.d, svd = disc.vd, sx = disc.wx; let tt = 0;
        while (sz > 0 && tt < 6) { svz -= 20 * 0.05; sz += svz * 0.05; sd += svd * 0.05; svd *= (1 - 0.35 * 0.05); sx += disc.vx * 0.05; tt += 0.05; }
        dog.target = { wx: clamp(sx, -48, 48), d: clamp(sd, 0, 108) };
        const dx = dog.target.wx - dog.wx, dd = dog.target.d - dog.d, L = Math.hypot(dx, dd);
        if (L > 1) { const mv = Math.min(L, speed * dt); dog.wx += dx / L * mv; dog.d += dd / L * mv; dog.pose = 'walk'; dog.walk += dt * 16; dog.facing = dx >= 0 ? 1 : -1; } else dog.pose = 'stand';
        // catch?
        const hd = Math.hypot(disc.wx - dog.wx, disc.d - dog.d);
        // jump catch: decided once per throw when the descending disc is overhead
        if (!disc.jumpRolled && disc.vz < 0 && disc.z < 24 && disc.z >= 8 && hd < 8) {
          disc.jumpRolled = true;
          if (Math.random() < 0.22 + skill / 160) { dog.jumpV = 60; dog.jump = 0.1; this.catchDisc(true); return; }
        }
        if (hd < 7 && disc.z < 8 && disc.z > 0) {
          const fumble = Math.random() < clamp(0.26 - skill / 400, 0.03, 0.26);
          if (!fumble) { this.catchDisc(false); return; }
          disc.z = 0; // fumbled: disc drops
        }
      }
      if (disc.z <= 0) { disc.z = 0; disc.flying = false; disc.landed = true; this.lastPts = 0; textPop(this.proj(disc.wx, disc.d).x, this.proj(disc.wx, disc.d).y - 20, 'Miss', '#888'); this.state = 'retrieve'; }
    } else if (this.state === 'retrieve' && disc) {
      // dog goes to disc, picks up, returns
      if (!dog.has) { const dx = disc.wx - dog.wx, dd = disc.d - dog.d, L = Math.hypot(dx, dd); if (L > 1.5) { const mv = Math.min(L, speed * dt); dog.wx += dx / L * mv; dog.d += dd / L * mv; dog.pose = 'walk'; dog.walk += dt * 16; dog.facing = dx >= 0 ? 1 : -1; } else { dog.has = true; } }
      else { const dx = 14 - dog.wx, dd = 4 - dog.d, L = Math.hypot(dx, dd); if (L > 1.5) { const mv = Math.min(L, speed * 1.1 * dt); dog.wx += dx / L * mv; dog.d += dd / L * mv; dog.pose = 'walk'; dog.walk += dt * 16; dog.facing = dx >= 0 ? 1 : -1; disc.wx = dog.wx; disc.d = dog.d; disc.z = 3; } else { dog.has = false; this.disc = null; this.state = 'drop'; this.dropT = 0.7; dog.pose = 'sit'; dog.facing = -1; } }
    } else if (this.state === 'drop') { this.dropT -= dt; if (this.dropT <= 0) this.state = 'ready'; }
    else if (this.state === 'ready') { dog.pose = 'sit'; }
    updateParticles(dt);
  },
  catchDisc(air) {
    const disc = this.disc; const zone = disc.d < 34 ? 1 : disc.d < 67 ? 2 : disc.d <= 100 ? 3 : 0;
    const inBounds = Math.abs(disc.wx) <= 45 && zone > 0;
    const pts = inBounds ? zone * (air ? 2 : 1) : 0;
    this.score += pts; this.lastPts = pts;
    const pr = this.proj(disc.wx, disc.d);
    textPop(pr.x, pr.y - 30, pts ? `+${pts}${air ? ' AIR!' : ''}` : 'Out!', pts ? '#e05080' : '#888');
    if (pts) { sparkle(pr.x, pr.y - 20, 8); Sound.chime(); if (air) Sound.squeak(); } else Sound.sad();
    disc.flying = false; disc.z = 3; this.dog.has = true; this.state = 'retrieve'; this.p.d.discSkill = clamp(this.p.d.discSkill + 0.4, 0, 100);
  },
  onDown(x, y) { if (this.state !== 'ready' || this.over || this.intro > 0) return; if (dist(x, y, 256, 345) < 60) { this.drag = { x, y, sx: x, sy: y, t: performance.now() }; } },
  onMove(x, y) { if (this.drag) { this.drag.x = x; this.drag.y = y; } },
  onUp(x, y) {
    const dr = this.drag; if (!dr) return; this.drag = null;
    const dx = x - dr.sx, dy = dr.sy - y; const dur = Math.max(0.08, (performance.now() - dr.t) / 1000);
    if (dy < 20) return;
    const power = clamp(dy / 230 + Math.min(0.15, Math.hypot(dx, dy) / (dur * 6000)), 0.12, 1.0);
    this.disc = { wx: 0, d: 2, z: 8, vx: clamp(dx / 9, -30, 30), vd: 18 + power * 40, vz: 12 + power * 12, t: 0, flying: true, spin: 0 };
    this.throws++; this.state = 'flying'; this.dog.pose = 'stand'; Sound.pop();
  },
  draw(ctx) {
    drawSkyGround(ctx, 0, 'day', 130);
    const g = ctx.createLinearGradient(0, 130, 0, HH); g.addColorStop(0, '#5fa54a'); g.addColorStop(1, '#8fd36a'); ctx.fillStyle = g; ctx.fillRect(0, 130, W, HH - 130);
    // zone lines
    const zones = [[0, '#fff'], [34, '#fff'], [67, '#fff'], [100, '#fff']];
    for (const [d, c] of zones) { const a = this.proj(-50, d), b = this.proj(50, d); ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); }
    const l1 = this.proj(-50, 0), l2 = this.proj(-50, 100), r1 = this.proj(50, 0), r2 = this.proj(50, 100);
    ctx.beginPath(); ctx.moveTo(l1.x, l1.y); ctx.lineTo(l2.x, l2.y); ctx.moveTo(r1.x, r1.y); ctx.lineTo(r2.x, r2.y); ctx.stroke();
    // stripes
    for (let i = 0; i < 10; i++) { if (i % 2) continue; const a = this.proj(-50, i * 10), b = this.proj(50, i * 10), c = this.proj(50, i * 10 + 10), d = this.proj(-50, i * 10 + 10); ctx.fillStyle = 'rgba(255,255,255,0.07)'; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.lineTo(c.x, c.y); ctx.lineTo(d.x, d.y); ctx.fill(); }
    for (const [d, label] of [[17, '1 pt'], [50, '2 pts'], [84, '3 pts']]) { const pr = this.proj(-44, d); outlinedText(ctx, label, pr.x + 10, pr.y, 13 * pr.s + 6, '#fff', 'left'); }
    // crowd/trees
    for (let i = 0; i < 9; i++) drawTree(ctx, 20 + i * 60, 136, 0.5, 'day');
    // dog & disc, sorted by depth
    const dog = this.dog; const dp = this.proj(dog.wx, dog.d);
    const items = [{ d: dog.d, f: () => this.p.draw(ctx, { x: dp.x, y: dp.y, scale: dp.s * 1.1, facing: dog.facing, pose: dog.pose, walkPhase: dog.walk, jumpY: dog.jump * 10, mouth: 'pant', eyes: 'open', headPitch: 0, hidden: false }) }];
    if (this.disc) { const disc = this.disc; const pr = this.proj(disc.wx, disc.d, 0); const prz = this.proj(disc.wx, disc.d, disc.z); items.push({ d: disc.d - 0.5, f: () => { fillEllipse(ctx, pr.x, pr.y, 16 * pr.s, 5 * pr.s, 'rgba(0,0,0,0.2)'); fillEllipse(ctx, prz.x, prz.y - 4, 18 * prz.s, 6 * prz.s + Math.abs(Math.sin(disc.spin)) * 3 * prz.s, '#ff6b6b'); fillEllipse(ctx, prz.x, prz.y - 5, 10 * prz.s, 3 * prz.s, '#c84848'); } }); }
    items.sort((a, b) => b.d - a.d); for (const it of items) it.f();
    // thrower's disc
    if (this.state === 'ready' && !this.over) { const d = this.drag; const x = d ? d.x : 256, y = d ? d.y : 345; fillEllipse(ctx, x, y, 28, 10, '#ff6b6b'); fillEllipse(ctx, x, y - 1, 16, 5, '#c84848'); if (d) { ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineWidth = 3; ctx.setLineDash([6, 6]); ctx.beginPath(); ctx.moveTo(d.sx, d.sy); ctx.lineTo(x, y); ctx.stroke(); ctx.setLineDash([]); } else outlinedText(ctx, 'Drag the disc up and release!', 256, 300, 15); }
    // hand
    ctx.fillStyle = '#f1c9a5'; ctx.beginPath(); ctx.arc(256, 395, 40, Math.PI, 0); ctx.fill();
    drawParticles(ctx);
    // HUD
    roundRect(ctx, 10, 10, 120, 46, 10, 'rgba(0,0,0,0.45)'); outlinedText(ctx, `Score ${this.score}`, 70, 30, 16); outlinedText(ctx, `Throws ${this.throws}`, 70, 49, 12);
    roundRect(ctx, W - 110, 10, 100, 46, 10, 'rgba(0,0,0,0.45)'); outlinedText(ctx, `${Math.ceil(this.time)}s`, W - 60, 40, 24, this.time < 10 ? '#ff8080' : '#fff');
    if (this.intro > 0) outlinedText(ctx, 'Ready...', 256, 200, 36);
    if (this.over) outlinedText(ctx, 'Time up!', 256, 200, 36);
  },
  drawTop(ctx) {
    topPanelBG(ctx, `Disc Competition · ${CONTEST_CLASSES[this.p.d.classes.disc]} class`);
    ctx.fillStyle = '#5a4634'; font(ctx, 14); ctx.textAlign = 'left';
    ctx.fillText(`${this.p.d.name} · Disc skill ${Math.round(this.p.d.discSkill)}`, 18, 56);
    roundRect(ctx, 18, 70, W - 36, 150, 12, 'rgba(255,255,255,0.8)');
    font(ctx, 46, true); ctx.fillStyle = '#e05080'; ctx.textAlign = 'center'; ctx.fillText(this.score + ' pts', 150, 150);
    font(ctx, 13); ctx.fillStyle = '#5a4634'; ctx.textAlign = 'left';
    wrapText(ctx, 'Rules: 60 seconds. Drag the disc upward and let go to throw. Longer drags fly farther. Catch in zone 1/2/3 for 1/2/3 points. A mid-air catch doubles the points. Landing outside the lines scores nothing.', 280, 92, 200, 17);
    if (this.lastPts !== null) { font(ctx, 16, true); ctx.fillStyle = '#5a4634'; ctx.textAlign = 'center'; ctx.fillText(this.lastPts ? `Last throw: +${this.lastPts}` : 'Last throw: miss', 150, 190); }
    drawDog(ctx, this.p.d, { x: 150, y: 300, scale: 0.9, facing: 1, pose: 'sit', t: G.t, eyes: 'open', mouth: 'pant', acc: this.p.d.acc });
    drawMessageBox(ctx);
  },
};

// ================= AGILITY TRIAL =================
const Agility = {
  enter() {
    this.p = activePup(); this.p.setState('held'); this.p.hidden = true;
    this.x = 0; this.time = 0; this.faults = 0; this.running = false; this.intro = 2.5; this.finished = false; this.jump = 0; this.jumpV = 0; this.crouch = 0; this.walk = 0; this.flash = null; this.msgT = 0;
    this.speed = 150 + this.p.d.agiSkill * 1.4;
    const kinds = ['hurdle', 'tire', 'tunnel', 'hurdle', 'seesaw', 'tire', 'hurdle', 'tunnel', 'hurdle'];
    this.obs = kinds.map((k, i) => ({ kind: k, wx: 520 + i * 420 + rand(-40, 40), done: false, result: null }));
    this.finishX = this.obs[this.obs.length - 1].wx + 500;
    say('Press SPACE or tap the screen at the right moment: jump hurdles and tires, duck into tunnels, balance on the seesaw!', 8000);
  },
  exit() { this.p.hidden = false; this.p.setState('idle', 1); this.p.pose = 'stand'; this.p.x = 256; this.p.y = 340; },
  dogX: 150,
  update(dt) {
    this.p.tick(dt);
    if (this.intro > 0) { this.intro -= dt; if (this.intro <= 0) this.running = true; return; }
    if (!this.running) { updateParticles(dt); return; }
    this.time += dt; this.x += this.speed * dt; this.walk += dt * 18;
    if (this.jump > 0 || this.jumpV) { this.jumpV -= 900 * dt; this.jump += this.jumpV * dt; if (this.jump <= 0) { this.jump = 0; this.jumpV = 0; } }
    this.crouch = Math.max(0, this.crouch - dt);
    if (this.msgT > 0) this.msgT -= dt;
    for (const o of this.obs) {
      if (o.done) continue;
      const rel = o.wx - this.x - this.dogX; // distance ahead of dog
      if (o.kind === 'hurdle' || o.kind === 'tire') { if (rel < 0 && rel > -10) { if (this.jump < (o.kind === 'tire' ? 28 : 22)) this.fault(o, 'Knocked it!'); else this.clear(o); } }
      else if (o.kind === 'tunnel') { if (rel < 10 && rel > 0) { if (this.crouch > 0) this.clear(o, 'Through!'); else this.fault(o, 'Ran around the tunnel!'); } }
      else if (o.kind === 'seesaw') { if (rel < -40 && !o.tipped) { this.fault(o, 'Fell off the seesaw!'); } }
    }
    if (this.x + this.dogX > this.finishX && !this.finished) {
      this.finished = true; this.running = false; const total = this.time + this.faults * 3;
      this.p.d.agiSkill = clamp(this.p.d.agiSkill + 3, 0, 100);
      Sound.chime(); setTimeout(() => contestResult('agility', Math.round(total * 100) / 100, 's', 'low'), 1200);
    }
    updateParticles(dt);
  },
  clear(o, msg) { o.done = true; o.result = 'ok'; sparkle(this.dogX + 30, 300, 6); this.flash = { text: msg || 'Clear!', color: '#2a8a3a' }; this.msgT = 0.8; Sound.pop(); },
  fault(o, msg) { o.done = true; o.result = 'fault'; this.faults++; this.flash = { text: msg + ' +3s', color: '#e0523c' }; this.msgT = 1.2; Sound.sad(); },
  action() {
    if (!this.running) return;
    const next = this.obs.find(o => !o.done); if (!next) return;
    const rel = next.wx - this.x - this.dogX;
    if (next.kind === 'hurdle' || next.kind === 'tire') { if (this.jump === 0) { this.jumpV = 330; this.jump = 1; } }
    else if (next.kind === 'tunnel') { this.crouch = 0.9; }
    else if (next.kind === 'seesaw') { if (rel < 30 && rel > -40) { next.tipped = true; this.clear(next, 'Balanced!'); } else if (rel < 90) { this.fault(next, 'Tipped too early!'); } }
  },
  onDown() { this.action(); }, onMove() { }, onUp() { },
  onKey(e) { if (e.code === 'Space' || e.code === 'ArrowUp') { e.preventDefault(); this.action(); } },
  draw(ctx) {
    drawSkyGround(ctx, this.x, 'day', 230);
    ctx.fillStyle = '#6fb25a'; ctx.fillRect(0, 230, W, HH - 230);
    ctx.fillStyle = '#5a9a48'; ctx.fillRect(0, 300, W, 84);
    ctx.fillStyle = '#c7a470'; ctx.fillRect(0, 326, W, 30);
    ctx.strokeStyle = 'rgba(255,255,255,0.4)'; ctx.lineWidth = 2; for (let i = -1; i < 8; i++) { const lx = ((i * 80 - this.x) % (W + 160) + W + 160) % (W + 160) - 80; ctx.beginPath(); ctx.moveTo(lx, 326); ctx.lineTo(lx, 356); ctx.stroke(); }
    for (let i = -1; i < 6; i++) drawTree(ctx, ((i * 230 - this.x * 0.6) % (W + 460) + W + 460) % (W + 460) - 230, 250, 0.8, 'day');
    // bleachers
    for (let i = -1; i < 5; i++) { const bx = ((i * 300 - this.x * 0.3) % (W + 600) + W + 600) % (W + 600) - 300; ctx.fillStyle = '#d8c8a8'; ctx.fillRect(bx, 200, 200, 32); ctx.fillStyle = '#e0523c'; for (let k = 0; k < 8; k++) { ctx.beginPath(); ctx.arc(bx + 12 + k * 25, 206 + (k % 2) * 8, 6, 0, Math.PI * 2); ctx.fill(); } }
    const ground = 340;
    const next = this.obs.find(o => !o.done);
    for (const o of this.obs) {
      const sx = o.wx - this.x; if (sx < -200 || sx > W + 100) continue;
      const hot = o === next && Math.abs(o.wx - this.x - this.dogX) < (o.kind === 'seesaw' ? 60 : o.kind === 'tunnel' ? 60 : 70) && (o.wx - this.x - this.dogX) > -10;
      ctx.save(); if (hot) { ctx.shadowColor = '#ffe066'; ctx.shadowBlur = 18; }
      if (o.kind === 'hurdle') { ctx.fillStyle = '#fff'; ctx.fillRect(sx - 4, ground - 46, 6, 46); ctx.fillRect(sx + 26, ground - 46, 6, 46); ctx.fillStyle = o.result === 'fault' ? '#999' : '#e0523c'; ctx.fillRect(sx - 6, ground - (o.result === 'fault' ? 10 : 36), 40, 7); ctx.fillStyle = '#fff'; ctx.fillRect(sx + 6, ground - (o.result === 'fault' ? 10 : 36), 8, 7); ctx.fillRect(sx + 22, ground - (o.result === 'fault' ? 10 : 36), 8, 7); }
      else if (o.kind === 'tire') { ctx.fillStyle = '#4f8fd6'; ctx.fillRect(sx - 3, ground - 90, 6, 90); ctx.fillRect(sx + 50, ground - 90, 6, 90); ctx.fillRect(sx - 3, ground - 90, 59, 6); ctx.strokeStyle = o.result === 'fault' ? '#777' : '#333'; ctx.lineWidth = 10; ctx.beginPath(); ctx.arc(sx + 27, ground - 46, 20, 0, Math.PI * 2); ctx.stroke(); }
      else if (o.kind === 'tunnel') { ctx.fillStyle = '#f0a040'; roundRect(ctx, sx, ground - 40, 110, 40, 18, '#f0a040'); ctx.fillStyle = 'rgba(0,0,0,0.25)'; for (let k = 1; k < 5; k++) ctx.fillRect(sx + k * 22, ground - 40, 3, 40); ctx.fillStyle = '#5a3a1a'; ellipsePath(ctx, sx + 2, ground - 20, 8, 18); ctx.fill(); }
      else if (o.kind === 'seesaw') { ctx.fillStyle = '#8a5a3a'; ctx.beginPath(); ctx.moveTo(sx + 60, ground); ctx.lineTo(sx + 50, ground - 26); ctx.lineTo(sx + 70, ground - 26); ctx.fill(); ctx.save(); ctx.translate(sx + 60, ground - 26); ctx.rotate(o.tipped ? 0.22 : -0.22); ctx.fillStyle = o.result === 'fault' ? '#999' : '#f5d76e'; ctx.fillRect(-70, -6, 140, 8); ctx.restore(); }
      ctx.restore();
      if (hot) outlinedText(ctx, o.kind === 'tunnel' ? 'DUCK!' : o.kind === 'seesaw' ? 'BALANCE!' : 'JUMP!', sx + 30, ground - 110, 16, '#ffe066');
    }
    // finish line
    const fx = this.finishX - this.x; if (fx > -100 && fx < W + 100) { ctx.fillStyle = '#333'; for (let k = 0; k < 8; k++) for (let j = 0; j < 2; j++) if ((k + j) % 2 === 0) ctx.fillRect(fx + j * 10, ground - 120 + k * 15, 10, 15); ctx.fillStyle = '#fff'; for (let k = 0; k < 8; k++) for (let j = 0; j < 2; j++) if ((k + j) % 2 === 1) ctx.fillRect(fx + j * 10, ground - 120 + k * 15, 10, 15); outlinedText(ctx, 'FINISH', fx + 10, ground - 130, 16); }
    // dog
    const pose = !this.running && this.intro > 0 ? 'sit' : (this.jump > 0 ? 'jump' : (this.crouch > 0 ? 'lie' : 'walk'));
    this.p.draw(ctx, { x: this.dogX, y: ground + 2, scale: 1.05, facing: 1, pose, walkPhase: this.walk, jumpY: this.jump, mouth: 'pant', eyes: 'open', headPitch: 0 });
    drawParticles(ctx);
    roundRect(ctx, 10, 10, 150, 46, 10, 'rgba(0,0,0,0.45)'); outlinedText(ctx, `${(this.time + this.faults * 3).toFixed(1)}s`, 85, 32, 18); outlinedText(ctx, `Faults: ${this.faults} (+3s each)`, 85, 50, 11);
    if (this.msgT > 0 && this.flash) outlinedText(ctx, this.flash.text, 256, 120, 24, this.flash.color);
    if (this.intro > 0) outlinedText(ctx, this.intro > 1 ? 'Ready...' : 'GO!', 256, 180, 40);
    if (this.finished) outlinedText(ctx, 'Finished!', 256, 180, 40);
  },
  drawTop(ctx) {
    topPanelBG(ctx, `Agility Trial · ${CONTEST_CLASSES[this.p.d.classes.agility]} class`);
    ctx.fillStyle = '#5a4634'; font(ctx, 14); ctx.textAlign = 'left';
    ctx.fillText(`${this.p.d.name} · Agility skill ${Math.round(this.p.d.agiSkill)}`, 18, 56);
    roundRect(ctx, 18, 70, W - 36, 150, 12, 'rgba(255,255,255,0.8)');
    font(ctx, 13); ctx.fillStyle = '#5a4634';
    wrapText(ctx, 'Your puppy runs the course on its own. Press SPACE (or tap the course) when an obstacle glows: jump over hurdles and through tires, duck right before a tunnel, and press when the puppy reaches the middle of the seesaw. Each fault adds 3 seconds. Fastest time wins!', 30, 92, W - 60, 18);
    // course progress
    const prog = clamp((this.x + this.dogX) / this.finishX, 0, 1);
    roundRect(ctx, 30, 190, W - 60, 10, 5, '#e8dcc6'); roundRect(ctx, 30, 190, (W - 60) * prog, 10, 5, '#8ad05a');
    for (const o of this.obs) { const ox = 30 + (W - 60) * o.wx / this.finishX; ctx.fillStyle = o.done ? (o.result === 'ok' ? '#2a8a3a' : '#e0523c') : '#8a7a6a'; ctx.beginPath(); ctx.arc(ox, 195, 4, 0, Math.PI * 2); ctx.fill(); }
    drawDog(ctx, this.p.d, { x: 256, y: 300, scale: 0.9, facing: 1, pose: 'walk', walkPhase: this.walk, t: G.t, eyes: 'open', mouth: 'pant', acc: this.p.d.acc });
    drawMessageBox(ctx);
  },
};

// ================= OBEDIENCE TRIAL =================
const Obedience = {
  enter() {
    this.p = activePup(); this.p.setState('held'); this.p.hidden = true; this.pose = 'sit'; this.facing = 1;
    const known = Object.keys(this.p.d.tricks);
    this.rounds = []; for (let i = 0; i < 5; i++) this.rounds.push(pick(known));
    this.rounds.splice(2, 0, 'stay');
    this.round = -1; this.score = 0; this.timer = 0; this.phase = 'intro'; this.phaseT = 2.5; this.results = []; this.touched = false; this.rollAngle = 0; this.spinAngle = 0; this.jump = 0; this.jumpV = 0; this.trickT = 0;
    document.getElementById('cmdbar').style.display = 'flex';
    say('The judge will call for tricks. Give YOUR command word for each (type it or press 🎤). Be quick for a higher score!', 8000);
  },
  exit() { this.p.hidden = false; this.p.setState('idle', 1); this.p.pose = 'stand'; this.p.x = 256; this.p.y = 340; document.getElementById('cmdbar').style.display = 'none'; },
  nextRound() {
    this.round++;
    if (this.round >= this.rounds.length) { this.phase = 'done'; this.phaseT = 1.5; setTimeout(() => contestResult('obedience', this.score, 'pts', 'high'), 1500); return; }
    this.current = this.rounds[this.round]; this.phase = 'ask'; this.timer = this.current === 'stay' ? 6 : 9; this.answered = false; this.touched = false; this.pose = 'sit';
    if (this.current === 'stay') say('Judge: "Stay!" Do not touch or call your puppy for 6 seconds.', 5000);
    else say(`Judge: "${TRICKS[this.current].name}!" Say your command for it.`, 5000);
    Sound.whistle();
  },
  update(dt) {
    this.p.tick(dt);
    if (this.jump > 0 || this.jumpV) { this.jumpV -= 600 * dt; this.jump += this.jumpV * dt; if (this.jump <= 0) { this.jump = 0; this.jumpV = 0; } }
    if (this.phase === 'intro' || this.phase === 'between') { this.phaseT -= dt; if (this.phaseT <= 0) this.nextRound(); }
    else if (this.phase === 'ask') {
      this.timer -= dt;
      if (this.current === 'stay') {
        if (this.timer <= 0) { this.finishRound(20, 'Perfect stay!'); }
      } else if (this.timer <= 0) { this.finishRound(0, 'Too slow!'); }
    } else if (this.phase === 'perform') {
      this.trickT += dt;
      if (this.current === 'roll') this.rollAngle = Math.min(Math.PI * 2, this.trickT * 4.2);
      if (this.current === 'spin') this.spinAngle = this.trickT * 6;
      this.phaseT -= dt; if (this.phaseT <= 0) { this.pose = 'sit'; this.rollAngle = 0; this.spinAngle = 0; this.phase = 'between'; this.phaseT = 1.2; }
    } else if (this.phase === 'done') { }
    updateParticles(dt);
  },
  finishRound(pts, label) {
    this.score += pts; this.results.push({ trick: this.current, pts, label });
    textPop(256, 150, label + (pts ? ` +${pts}` : ''), pts >= 15 ? '#2a8a3a' : pts > 0 ? '#c08a2a' : '#e0523c');
    if (pts >= 15) { sparkle(256, 220, 10); Sound.chime(); } else if (!pts) Sound.sad();
    if (this.current === 'stay' || !pts) { this.phase = 'between'; this.phaseT = 1.4; }
  },
  onCommand(text) {
    if (this.phase !== 'ask') return true;
    if (this.current === 'stay') { this.finishRound(0, 'You broke the stay!'); return true; }
    const tr = this.p.d.tricks[this.current];
    const matchedId = Object.entries(this.p.d.tricks).find(([id, t]) => similar(text, t.cmd));
    if (!matchedId) { textPop(256, 150, '?', '#777'); return true; }
    if (matchedId[0] !== this.current) { this.performPose(matchedId[0]); this.finishRound(0, `That was ${TRICKS[matchedId[0]].name}, not ${TRICKS[this.current].name}`); return true; }
    const chance = clamp(0.55 + tr.mastery / 150, 0, 0.98);
    if (Math.random() > chance) { textPop(256, 150, `${this.p.d.name} hesitated...`, '#777'); tr.mastery = clamp(tr.mastery + 1, 0, 100); this.p.headTurn = 0.3; setTimeout(() => this.p.headTurn = 0, 700); return true; }
    const speed = this.timer / 9; const pts = speed > 0.6 ? 20 : speed > 0.3 ? 15 : 10;
    tr.mastery = clamp(tr.mastery + 3, 0, 100);
    this.performPose(this.current); this.finishRound(pts, pts === 20 ? 'Excellent!' : pts === 15 ? 'Good!' : 'OK');
    return true;
  },
  performPose(id) { this.phase = 'perform'; this.phaseT = 2.4; this.trickT = 0; this.pose = { sit: 'sit', lie: 'lie', beg: 'beg', shake: 'shake', roll: 'roll', spin: 'spin', jump: 'jump' }[id]; if (id === 'jump') this.jumpV = 260; this.rollAngle = 0; this.spinAngle = 0; },
  onDown(x, y) { if (this.phase === 'ask' && this.current === 'stay' && this.p.hit(x, y)) { this.finishRound(0, 'You touched the puppy!'); } },
  onMove() { }, onUp() { },
  draw(ctx) {
    // indoor arena
    const g = ctx.createLinearGradient(0, 0, 0, HH); g.addColorStop(0, '#3a3f6a'); g.addColorStop(1, '#5a6090'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, 180);
    ctx.fillStyle = '#c8d8e8'; ctx.fillRect(0, 180, W, HH - 180);
    ctx.fillStyle = '#4f8fd6'; ctx.fillRect(0, 180, W, 6);
    // crowd dots
    for (let r = 0; r < 3; r++) for (let i = 0; i < 16; i++) { ctx.fillStyle = ['#e0523c', '#f0a040', '#8ad05a', '#ff7eb6', '#4f8fd6'][(i + r) % 5]; ctx.beginPath(); ctx.arc(20 + i * 32 + (r % 2) * 16, 100 + r * 24 + Math.sin(G.t * 3 + i) * 2, 9, 0, Math.PI * 2); ctx.fill(); }
    // ring
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 4; ellipsePath(ctx, 256, 300, 200, 60); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.35)'; ellipsePath(ctx, 256, 300, 200, 60); ctx.fill();
    // judge table
    roundRect(ctx, 380, 196, 110, 50, 6, '#8a5a3a'); ctx.fillStyle = '#f1c9a5'; ctx.beginPath(); ctx.arc(435, 180, 18, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#333'; ctx.fillRect(405, 198, 60, 20);
    ctx.fillStyle = '#fff'; font(ctx, 11, true); ctx.textAlign = 'center'; ctx.fillText('JUDGE', 435, 232);
    // dog
    this.p.draw(ctx, { x: 256, y: 318, scale: 1.4, facing: 1, pose: this.pose, rollAngle: this.rollAngle, spinAngle: this.spinAngle, jumpY: this.jump, eyes: this.phase === 'perform' ? 'happy' : 'open', mouth: 'smile', headPitch: 0 });
    drawParticles(ctx);
    // prompt
    if (this.phase === 'ask') {
      roundRect(ctx, 96, 14, 320, 60, 12, 'rgba(0,0,0,0.5)');
      outlinedText(ctx, this.current === 'stay' ? 'Stay! (hands off)' : `Judge wants: ${TRICKS[this.current].name}`, 256, 40, 20);
      roundRect(ctx, 116, 52, 280, 10, 5, 'rgba(255,255,255,0.3)'); roundRect(ctx, 116, 52, 280 * clamp(this.timer / (this.current === 'stay' ? 6 : 9), 0, 1), 10, 5, this.timer < 3 ? '#ff8080' : '#8ad05a');
    } else if (this.phase === 'intro') outlinedText(ctx, 'Obedience Trial', 256, 50, 30);
    else if (this.phase === 'done') outlinedText(ctx, 'All done!', 256, 50, 30);
    roundRect(ctx, 10, HH - 50, 110, 40, 10, 'rgba(0,0,0,0.45)'); outlinedText(ctx, `Score ${this.score}`, 65, HH - 24, 16);
    roundRect(ctx, W - 120, HH - 50, 110, 40, 10, 'rgba(0,0,0,0.45)'); outlinedText(ctx, `Round ${Math.max(0, Math.min(this.round + 1, this.rounds.length))}/${this.rounds.length}`, W - 65, HH - 24, 16);
  },
  drawTop(ctx) {
    topPanelBG(ctx, `Obedience Trial · ${CONTEST_CLASSES[this.p.d.classes.obedience]} class`);
    ctx.fillStyle = '#5a4634'; font(ctx, 14); ctx.textAlign = 'left'; ctx.fillText(`${this.p.d.name} · ${Object.keys(this.p.d.tricks).length} tricks known`, 18, 56);
    roundRect(ctx, 18, 70, W - 36, 170, 12, 'rgba(255,255,255,0.8)');
    font(ctx, 13); ctx.fillStyle = '#5a4634';
    wrapText(ctx, 'The judge names a trick. Give your own command word (the one you taught) using the command bar below the touch screen. Fast correct answers: 20 pts. Slower: 15 or 10. Wrong trick or too slow: 0. During "Stay", do nothing for 6 seconds.', 30, 92, W - 60, 17);
    let y = 170; font(ctx, 13, true);
    ctx.fillText('Your commands:', 30, y); font(ctx, 13); y += 18;
    const cmds = Object.entries(this.p.d.tricks).map(([id, t]) => `${TRICKS[id].name} = "${t.cmd}"`).join('   ·   ');
    wrapText(ctx, cmds, 30, y, W - 60, 17);
    y = 262; for (const r of this.results) { ctx.fillStyle = r.pts >= 15 ? '#2a8a3a' : r.pts > 0 ? '#c08a2a' : '#e0523c'; ctx.fillText(`${r.trick === 'stay' ? 'Stay' : TRICKS[r.trick].name}: ${r.label} (${r.pts})`, 30, y); y += 16; if (y > 310) break; }
    drawMessageBox(ctx);
  },
};

function registerActivities() {
  G.scenes.walk = Walk; G.scenes.bath = Bath; G.scenes.disc = Disc; G.scenes.agility = Agility; G.scenes.obedience = Obedience;
}
