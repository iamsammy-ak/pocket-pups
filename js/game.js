// ================= Core game engine =================
const W = 512, HH = 384;
const SAVE_KEY = 'pocketpups_save_v1';
const FONT = 'Fredoka, "Trebuchet MS", "Segoe UI", sans-serif';
const BED = { x: 92, y: 248 };

const G = {
  save: null, scene: null, scenes: {}, dogs: [], t: 0, last: 0,
  bot: null, bctx: null, top: null, tctx: null,
  pointer: { down: false, x: 0, y: 0 },
  particles: [], msgs: [], msgTimer: 0,
  room: { food: null, water: null, toys: [], poop: [], bubbles: [] },
  pendingDrop: null, weather: 'sun', flash: 0, bubbleMode: false,
};

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const rand = (a, b) => a + Math.random() * (b - a);
const pick = arr => arr[Math.floor(Math.random() * arr.length)];
const dist = (a, b, c, d) => Math.hypot(c - a, d - b);
const fmtMoney = n => '$' + Math.round(n).toLocaleString();
const uid = () => Math.random().toString(36).slice(2, 9);
function buzz(ms = 12) { if (G.save && G.save.haptics === false) return; try { navigator.vibrate && navigator.vibrate(ms); } catch (e) { } }

// ---------- messages / particles ----------
function say(text, ms = 4000) { G.msgs.push({ text, ms }); }
function spawnParticle(p) { G.particles.push(Object.assign({ life: 1, vx: 0, vy: -30, size: 14, type: 'heart' }, p)); }
function hearts(x, y, n = 1) { for (let i = 0; i < n; i++) spawnParticle({ x: x + rand(-12, 12), y: y + rand(-8, 8), vx: rand(-15, 15), vy: rand(-50, -25), type: 'heart', size: rand(10, 16) }); }
function sparkle(x, y, n = 6) { for (let i = 0; i < n; i++) spawnParticle({ x, y, vx: rand(-60, 60), vy: rand(-80, -10), type: 'spark', size: rand(3, 6), rot: rand(0, 3) }); }
function textPop(x, y, text, color = '#333') { spawnParticle({ x, y, vy: -25, type: 'text', text, color, life: 1.3 }); }
function updateParticles(dt) {
  for (const p of G.particles) { p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt * 0.8; if (p.type === 'spark') p.vy += 120 * dt; }
  G.particles = G.particles.filter(p => p.life > 0);
}
function drawStar(ctx, x, y, r, color, rot = 0) {
  ctx.fillStyle = color; ctx.beginPath();
  for (let i = 0; i < 8; i++) { const a = rot + i * Math.PI / 4, rr = i % 2 ? r * 0.4 : r; ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); }
  ctx.closePath(); ctx.fill();
}
function drawParticles(ctx) {
  for (const p of G.particles) {
    ctx.save(); ctx.globalAlpha = clamp(p.life, 0, 1);
    if (p.type === 'heart') drawHeart(ctx, p.x, p.y, p.size, '#f06a8e');
    else if (p.type === 'spark') drawStar(ctx, p.x, p.y, p.size * 1.3, '#ffe066', p.rot + p.life * 3);
    else if (p.type === 'text') { ctx.font = `600 15px ${FONT}`; ctx.textAlign = 'center'; ctx.fillStyle = p.color; ctx.strokeStyle = 'rgba(255,255,255,0.85)'; ctx.lineWidth = 3; ctx.lineJoin = 'round'; ctx.strokeText(p.text, p.x, p.y); ctx.fillText(p.text, p.x, p.y); }
    else if (p.type === 'drop') { ctx.fillStyle = 'rgba(120,190,255,0.8)'; ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill(); }
    else if (p.type === 'bubble') { ctx.strokeStyle = 'rgba(255,255,255,0.9)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.stroke(); }
    else if (p.type === 'rain') { ctx.strokeStyle = 'rgba(170,200,240,0.7)'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x - 2, p.y + 9); ctx.stroke(); }
    ctx.restore();
  }
}
function drawHeart(ctx, x, y, s, color) {
  ctx.fillStyle = color; ctx.beginPath();
  ctx.moveTo(x, y + s * 0.35);
  ctx.bezierCurveTo(x - s * 0.6, y - s * 0.1, x - s * 0.3, y - s * 0.55, x, y - s * 0.2);
  ctx.bezierCurveTo(x + s * 0.3, y - s * 0.55, x + s * 0.6, y - s * 0.1, x, y + s * 0.35);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.45)'; ctx.beginPath(); ctx.ellipse(x - s * 0.22, y - s * 0.22, s * 0.12, s * 0.07, -0.6, 0, Math.PI * 2); ctx.fill();
}
function roundRect(ctx, x, y, w, h, r, fill, stroke) {
  ctx.beginPath(); ctx.roundRect(x, y, w, h, r);
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  if (stroke) { ctx.strokeStyle = stroke; ctx.stroke(); }
}

// ---------- save ----------
function newSave() {
  return {
    version: 2, money: 2500, inventory: { water: 99, dryfood: 3, ball: 1 }, ownedAcc: [], rooms: ['room_basic'], room: 'room_basic',
    dogs: [], activeDog: null, lastSeen: Date.now(), contestDay: '', contestsToday: 0, walksToday: 0, walkDay: '',
    created: Date.now(), trainerPts: 0, tutorial: 0, totalWalks: 0, photos: [], haptics: true, sound: true, seenRank: 'Beginner',
  };
}
function newDog(breed, color, name) {
  return {
    id: uid(), name, breed, color, hunger: 70, thirst: 70, happy: 70, clean: 90, energy: 90, bond: 10,
    tricks: {}, acc: { neck: null, head: null, face: null }, discSkill: 5, agiSkill: 5, born: Date.now(),
    classes: { disc: 0, agility: 0, obedience: 0 }, trophies: [], personality: pick(['playful', 'calm', 'curious', 'brave']),
  };
}
function migrateSave(s) {
  const base = newSave(); const out = Object.assign(base, s);
  out.inventory = Object.assign({}, base.inventory, s.inventory || {});
  out.photos = Array.isArray(s.photos) ? s.photos : [];
  if (!out.rooms.includes(out.room)) out.room = 'room_basic';
  for (const d of out.dogs) { const nd = newDog(d.breed, d.color, d.name); for (const k in nd) if (d[k] === undefined) d[k] = nd[k]; if (!BREEDS[d.breed]) d.breed = 'lab'; if (!BREEDS[d.breed].colors[d.color]) d.color = Object.keys(BREEDS[d.breed].colors)[0]; }
  out.version = 2; return out;
}
function saveGame() {
  if (!G.save) return;
  G.save.lastSeen = Date.now();
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(G.save)); } catch (e) { }
}
function loadGame() {
  try { const s = localStorage.getItem(SAVE_KEY); if (s) return JSON.parse(s); } catch (e) { }
  return null;
}
function applyOffline(save) {
  const mins = clamp((Date.now() - save.lastSeen) / 60000, 0, 60 * 24);
  for (const d of save.dogs) {
    d.hunger = clamp(d.hunger - mins * 0.25, 0, 100);
    d.thirst = clamp(d.thirst - mins * 0.35, 0, 100);
    d.happy = clamp(d.happy - mins * 0.12, 5, 100);
    d.clean = clamp(d.clean - mins * 0.08, 0, 100);
    d.energy = clamp(d.energy + mins * 0.5, 0, 100);
  }
  if (mins > 30 && save.dogs.length) say(`Welcome back! Your ${save.dogs.length > 1 ? 'puppies have' : 'puppy has'} missed you.`, 6000);
}
function todayKey() { const d = new Date(); return d.getFullYear() + '-' + d.getMonth() + '-' + d.getDate(); }
function daySeed() { const d = new Date(); let h = d.getFullYear() * 372 + d.getMonth() * 31 + d.getDate(); h = (h ^ (h >>> 7)) * 2654435761; return ((h >>> 0) % 1000) / 1000; }
function weatherToday() { const r = daySeed(); return r < 0.58 ? 'sun' : r < 0.82 ? 'cloud' : 'rain'; }

// ---------- puppy runtime ----------
class Pup {
  constructor(data) {
    this.d = data; this.x = rand(150, 350); this.y = rand(240, 330); this.facing = 1;
    this.pose = 'stand'; this.walkPhase = 0; this.state = 'idle'; this.stateT = rand(0.5, 2); this.target = null;
    this.eyes = 'open'; this.mouth = 'closed'; this.blinkT = rand(2, 5); this.tailWag = 0; this.headPitch = 0; this.headTurn = 0;
    this.rollAngle = 0; this.spinAngle = 0; this.jumpY = 0; this.jumpV = 0; this.holdT = 0; this.carrying = null;
    this.petHeat = 0; this.barkT = 0; this.hidden = false; this.sudsLevel = 0; this.mood = 0; this.wantsAttention = 0;
  }
  get scale() { return 0.72 + clamp((this.y - 210) / 140, 0, 1) * 0.5; }
  get size() { return BREEDS[this.d.breed].size; }
  opts(extra) {
    return Object.assign({
      x: this.x, y: this.y, scale: this.scale, facing: this.facing, pose: this.pose, walkPhase: this.walkPhase, t: G.t,
      eyes: this.eyes, mouth: this.mouth, headPitch: this.headPitch, headTurn: this.headTurn, tailWag: this.tailWag,
      rollAngle: this.rollAngle, spinAngle: this.spinAngle, jumpY: this.jumpY, acc: this.d.acc,
      dirt: clamp((60 - this.d.clean) / 60, 0, 1), suds: this.sudsLevel,
    }, extra || {});
  }
  draw(ctx, extra) { drawDog(ctx, this.d, this.opts(extra)); }
  hit(px, py) { return hitDog(this.d, this.opts(), px, py); }
  zones() { return dogHitZones(this.d, this.opts()); }

  setState(s, t = 0) { this.state = s; this.stateT = t; }
  moveToward(tx, ty, dt, speed) {
    const dx = tx - this.x, dy = ty - this.y, d = Math.hypot(dx, dy);
    if (d < 3) return true;
    const sp = (speed || 70) * this.scale * dt;
    if (Math.abs(dx) > 2) this.facing = dx > 0 ? 1 : -1;
    this.x += dx / d * Math.min(sp, d); this.y += dy / d * Math.min(sp, d);
    this.pose = 'walk'; this.walkPhase += dt * (speed > 100 ? 16 : 11);
    return d < sp + 1;
  }
  bark(n = 1) {
    if (this.barkT > 0) return; this.barkT = 0.5;
    if (n === 2) Sound.doubleBark(this.size); else Sound.bark(this.size);
    this.mouth = 'open'; setTimeout(() => { if (this.mouth === 'open') this.mouth = 'closed'; }, 180);
  }
  tick(dt) {
    this.blinkT -= dt; this.barkT -= dt; this.petHeat = Math.max(0, this.petHeat - dt * 0.5);
    if (this.blinkT < 0) { this.eyes = this.eyes === 'open' ? 'closed' : this.eyes; this.blinkT = this.blinkT < -0.12 ? rand(2, 6) : this.blinkT; if (this.blinkT > 0 && this.eyes === 'closed') this.eyes = 'open'; }
    if (this.jumpY > 0 || this.jumpV !== 0) { this.jumpV -= 600 * dt; this.jumpY += this.jumpV * dt; if (this.jumpY <= 0) { this.jumpY = 0; this.jumpV = 0; if (this.pose === 'jump') this.pose = 'stand'; } }
    this.tailWag = this.petHeat > 0.2 || this.state === 'return' || this.state === 'chase' || this.state === 'play' || this.d.happy > 85 ? 10 : (this.d.happy > 50 ? 4 : 0);
    if (this.state !== 'held' && this.state !== 'sleep' && this.eyes !== 'closed') this.eyes = this.petHeat > 0.6 ? 'happy' : (this.d.happy < 25 || this.d.hunger < 15 ? 'sad' : 'open');
    if (this.state !== 'held' && this.mouth !== 'open') this.mouth = (this.d.energy < 30 && this.state !== 'sleep') || this.state === 'chase' || this.state === 'return' || this.state === 'play' ? 'pant' : (this.d.happy > 70 ? 'smile' : 'closed');
  }
}

// stat drain per second while playing
function drainStats(dt) {
  const perMin = dt / 60;
  for (const p of G.dogs) {
    const d = p.d;
    d.hunger = clamp(d.hunger - perMin * 1.2, 0, 100);
    d.thirst = clamp(d.thirst - perMin * 1.6, 0, 100);
    d.happy = clamp(d.happy - perMin * (d.hunger < 20 || d.thirst < 20 ? 2 : 0.6), 0, 100);
    d.clean = clamp(d.clean - perMin * 0.3, 0, 100);
    if (p.state === 'sleep') d.energy = clamp(d.energy + perMin * 12, 0, 100);
    else d.energy = clamp(d.energy - perMin * (p.state === 'chase' || p.state === 'return' || p.state === 'play' ? 3 : 0.4), 0, 100);
    if (d.hunger < 10 || d.thirst < 10) d.bond = clamp(d.bond - perMin * 0.3, 0, 100);
  }
}

function addTP(n) {
  if (!G.save || n <= 0) return;
  const before = trainerRank(G.save.trainerPts); G.save.trainerPts += n; const after = trainerRank(G.save.trainerPts);
  if (after !== before) { say(`You are now a ${after}! New breeds and items may have unlocked.`, 7000); Sound.fanfare(); }
}
function addBond(d, n) { d.bond = clamp(d.bond + n, 0, 100); addTP(Math.max(0, n)); }
function addMoney(n) { G.save.money = Math.max(0, G.save.money + n); if (n > 0) Sound.coin(); }
function invCount(id) { return G.save.inventory[id] || 0; }
function invAdd(id, n = 1) { G.save.inventory[id] = Math.max(0, (G.save.inventory[id] || 0) + n); }
function dogTitle(d) { const b = BREEDS[d.breed].name; return b.toLowerCase().includes(d.color.toLowerCase()) ? b : `${d.color} ${b}`; }
function activePup() { return G.dogs.find(p => p.d.id === G.save.activeDog) || G.dogs[0]; }
function setActive(p) { if (p) G.save.activeDog = p.d.id; }
function isUnlocked(def) { return !def.unlock || G.save.trainerPts >= def.unlock; }
function moodOf(d) {
  if (d.hunger < 25) return ['Hungry', '#e0523c']; if (d.thirst < 25) return ['Thirsty', '#3f6fb5']; if (d.energy < 20) return ['Sleepy', '#8a7a9a'];
  if (d.clean < 30) return ['Needs a bath', '#8a6a4a']; if (d.happy < 35) return ['Bored', '#c08a2a']; if (d.happy > 80) return ['Delighted', '#f06a8e']; return ['Content', '#5cae5a'];
}

// ---------- command parsing (voice / typed) ----------
function normalize(s) { return (s || '').toLowerCase().replace(/[^a-z0-9 ]/g, '').trim(); }
function similar(a, b) {
  a = normalize(a); b = normalize(b); if (!a || !b) return false;
  if (a === b || a.includes(b) || b.includes(a)) return true;
  const m = a.length, n = b.length; if (Math.abs(m - n) > 2) return false;
  const dp = Array.from({ length: m + 1 }, (_, i) => [i]); for (let j = 1; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) for (let j = 1; j <= n; j++) dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return dp[m][n] <= (Math.max(m, n) > 5 ? 2 : 1);
}
function handleCommand(text) {
  text = normalize(text); if (!text) return;
  Sound.click();
  if (G.scene && G.scene.onCommand && G.scene.onCommand(text)) return;
  if (G.scene !== G.scenes.home) return;
  const words = text.split(' ');
  let handled = false;
  for (const p of G.dogs) {
    if (similar(text, p.d.name) || words.some(w => similar(w, p.d.name))) { pupCome(p); handled = true; }
  }
  if (handled) return;
  if (/good (boy|girl|dog|pup)|good job|well done/.test(text)) { for (const p of G.dogs) { p.petHeat = 1.2; hearts(p.x, p.y - 60, 2); p.d.happy = clamp(p.d.happy + 2, 0, 100); } Sound.heart(); return; }
  for (const p of G.dogs) {
    for (const [id, tr] of Object.entries(p.d.tricks)) {
      if (similar(text, tr.cmd)) { performTrick(p, id, true); handled = true; break; }
    }
  }
  if (!handled) {
    const p = activePup(); if (!p) return;
    p.headTurn = 0.35; textPop(p.x, p.zones().top - 20, '?', '#555');
    setTimeout(() => p.headTurn = 0, 900);
    say(`${p.d.name} tilts its head. It doesn't know that word yet.`);
  }
}
function pupCome(p) {
  if (p.state === 'held') return;
  p.bark(1); p.setState('come'); p.target = { x: 256 + rand(-40, 40), y: 345 }; p.d.happy = clamp(p.d.happy + 1, 0, 100);
}
function performTrick(p, id, fromCommand) {
  const tr = p.d.tricks[id];
  const chance = tr ? clamp(0.5 + tr.mastery / 160, 0, 0.98) : 0.3;
  if (p.state === 'sleep') { p.setState('idle', 0.5); p.pose = 'stand'; }
  if (Math.random() > chance) {
    p.headTurn = 0.3; setTimeout(() => p.headTurn = 0, 800);
    textPop(p.x, p.zones().top - 20, '?', '#777');
    if (tr) tr.mastery = clamp(tr.mastery + 1, 0, 100);
    return false;
  }
  if (tr && fromCommand) { tr.mastery = clamp(tr.mastery + 4, 0, 100); addBond(p.d, 0.5); }
  startPose(p, id, 3.2);
  if (fromCommand) { sparkle(p.x, p.zones().top - 10, 5); textPop(p.x, p.zones().top - 24, TRICKS[id].name + '!', '#2a8a3a'); Sound.chime(); }
  return true;
}
function startPose(p, id, dur) {
  p.setState('trick', dur); p.trick = id; p.trickT = 0;
  p.pose = { sit: 'sit', lie: 'lie', beg: 'beg', shake: 'shake', roll: 'roll', spin: 'spin', jump: 'jump' }[id] || 'stand';
  if (id === 'jump') { p.jumpV = 260; }
  if (id === 'roll') p.rollAngle = 0;
  if (id === 'spin') p.spinAngle = 0;
}

// ================= HOME SCENE =================
const Home = {
  pet: null, dragToy: null, lastTap: 0, hintT: 0, tug: null, blowT: 0,
  enter() {
    document.getElementById('cmdbar').style.display = 'flex';
    document.getElementById('menubar').style.display = 'flex';
    document.getElementById('snap').style.display = 'flex';
    for (const p of G.dogs) { if (p.state === 'held' || p.state === 'trick') { p.setState('idle', 1); p.pose = 'stand'; } p.hidden = false; }
  },
  exit() { document.getElementById('cmdbar').style.display = 'none'; document.getElementById('menubar').style.display = 'none'; document.getElementById('snap').style.display = 'none'; this.pet = null; this.dragToy = null; this.tug = null; G.bubbleMode = false; },

  update(dt) {
    drainStats(dt);
    const room = G.room;
    for (const key of ['food', 'water']) { const bowl = room[key]; if (bowl && bowl.amount <= 0) room[key] = null; }
    // toys physics
    for (const toy of room.toys) {
      if (toy.held) continue;
      if (toy.z > 0 || toy.vz !== 0 || Math.abs(toy.vx) > 1 || Math.abs(toy.vy) > 1) {
        toy.x += toy.vx * dt; toy.y += toy.vy * dt; toy.z += toy.vz * dt; toy.vz -= 500 * dt;
        toy.spin += toy.vx * dt * 0.05;
        if (toy.z <= 0) { toy.z = 0; if (Math.abs(toy.vz) > 60) { toy.vz = -toy.vz * (toy.id === 'ball' ? 0.55 : 0.2); Sound.bounce(); } else toy.vz = 0; toy.vx *= 0.6; toy.vy *= 0.6; }
        if (toy.z === 0 && toy.vz === 0) { toy.vx *= (1 - 3 * dt); toy.vy *= (1 - 3 * dt); if (Math.abs(toy.vx) < 1 && Math.abs(toy.vy) < 1) { toy.vx = toy.vy = 0; } }
        if (toy.x < 40) { toy.x = 40; toy.vx = Math.abs(toy.vx) * 0.5; } if (toy.x > W - 40) { toy.x = W - 40; toy.vx = -Math.abs(toy.vx) * 0.5; }
        if (toy.y < 205) { toy.y = 205; toy.vy = Math.abs(toy.vy) * 0.5; } if (toy.y > 365) { toy.y = 365; toy.vy = -Math.abs(toy.vy) * 0.5; }
        toy.moving = true;
      } else toy.moving = false;
    }
    // bubbles
    if (G.bubbleMode && G.pointer.down && !this.pet && !this.dragToy) {
      this.blowT -= dt;
      if (this.blowT <= 0) { this.blowT = 0.14; room.bubbles.push({ x: G.pointer.x + rand(-6, 6), y: G.pointer.y - 8, r: rand(7, 14), vx: rand(-14, 14), vy: rand(-18, -8), life: rand(6, 9), ph: rand(0, 6) }); if (room.bubbles.length > 24) room.bubbles.shift(); }
    }
    for (const b of room.bubbles) { b.life -= dt; b.x += (b.vx + Math.sin(G.t * 2 + b.ph) * 10) * dt; b.y += b.vy * dt; if (b.x < 10 || b.x > W - 10) b.vx *= -1; }
    room.bubbles = room.bubbles.filter(b => { if (b.life <= 0 || b.y < 40) { sparkle(b.x, b.y, 2); return false; } return true; });
    for (const p of G.dogs) this.updatePup(p, dt);
    updateParticles(dt);
    this.hintT += dt; G.flash = Math.max(0, G.flash - dt * 3);
  },

  updatePup(p, dt) {
    p.tick(dt);
    const d = p.d;
    p.stateT -= dt;
    switch (p.state) {
      case 'held': break;
      case 'trick': {
        p.trickT += dt;
        if (p.trick === 'roll') { p.rollAngle = Math.min(Math.PI * 2, p.trickT * 4.2); if (p.rollAngle >= Math.PI * 2 && p.stateT > 0.6) p.stateT = 0.6; }
        if (p.trick === 'spin') { p.spinAngle = p.trickT * 6; if (p.spinAngle > Math.PI * 2 * 1.5 && p.stateT > 0.3) p.stateT = 0.3; }
        if (p.trick === 'jump' && p.jumpY === 0 && p.trickT > 0.3) p.pose = 'stand';
        if (p.stateT <= 0) { p.pose = (p.trick === 'sit' || p.trick === 'shake' || p.trick === 'beg') ? 'sit' : (p.trick === 'lie' ? 'lie' : 'stand'); p.rollAngle = 0; p.spinAngle = 0; p.setState('idle', rand(1.5, 3)); }
        break;
      }
      case 'tobed': {
        if (p.moveToward(BED.x + (p.facing > 0 ? -6 : 6), BED.y + 2, dt, 60)) { p.facing = 1; p.setState('sleep', 25); p.pose = 'sleep'; }
        else if (p.stateT < -12) { p.setState('sleep', 20); p.pose = 'sleep'; }
        break;
      }
      case 'sleep': {
        p.pose = 'sleep'; p.eyes = 'sleep'; p.mouth = 'closed';
        const smellsFood = (G.room.food && G.room.food.amount > 0 && d.hunger < 60) || (G.room.water && G.room.water.amount > 0 && d.thirst < 50);
        const toyFlying = G.room.toys.some(t => t.moving && !t.heldBy && !t.held);
        if ((d.energy > 70 && p.stateT < 0) || ((smellsFood || toyFlying) && d.energy > 20)) { p.eyes = 'open'; p.pose = 'lie'; p.setState('idle', 0.6); }
        break;
      }
      case 'come': {
        if (p.moveToward(p.target.x, p.target.y, dt, 110)) { p.pose = 'sit'; p.facing = p.x < 256 ? 1 : -1; p.setState('idle', rand(2, 4)); p.wantsAttention = 1; }
        break;
      }
      case 'wander': {
        if (p.moveToward(p.target.x, p.target.y, dt, 55)) { p.pose = 'stand'; p.setState('idle', rand(1, 4)); }
        break;
      }
      case 'tofood': case 'towater': {
        const bowl = G.room[p.state === 'tofood' ? 'food' : 'water'];
        if (!bowl) { p.setState('idle', 0.5); p.pose = 'stand'; break; }
        const side = p.x < bowl.x ? -1 : 1;
        if (p.moveToward(bowl.x + side * 26 * p.scale, bowl.y + 4, dt, 80)) { p.facing = -side; p.pose = 'eat'; p.setState(p.state === 'tofood' ? 'eat' : 'drink', 6); p.eatBowl = bowl; }
        break;
      }
      case 'eat': case 'drink': {
        const bowl = p.eatBowl; p.pose = 'eat'; p.headPitch = Math.sin(G.t * 9) * 0.08;
        if (!bowl || bowl.amount <= 0) { p.headPitch = 0; p.pose = 'stand'; p.setState('idle', 1); break; }
        const it = ITEMS[bowl.item]; const rate = dt / 6; bowl.amount -= rate;
        d.hunger = clamp(d.hunger + (it.hunger || 0) * rate, 0, 100); d.thirst = clamp(d.thirst + (it.thirst || 0) * rate, 0, 100);
        d.happy = clamp(d.happy + (it.happy || 0) * rate, 0, 100); if (it.bond) addBond(d, it.bond * rate);
        if (Math.random() < dt * 4) Sound.eat();
        if (bowl.amount <= 0) { bowl.amount = 0; p.headPitch = 0; p.pose = 'stand'; p.setState('idle', 1); hearts(p.x, p.zones().top, 2); say(`${d.name} finished ${p.state === 'eat' ? 'eating' : 'drinking'}. Yum!`); if (p.state === 'eat') { p.pose = 'sit'; } }
        break;
      }
      case 'chase': {
        const toy = p.target; if (!toy || toy.held || toy.heldBy) { p.setState('idle', 0.5); p.pose = 'stand'; break; }
        const reached = p.moveToward(toy.x, toy.y + 2, dt, 150);
        if (reached && !toy.moving && toy.z < 5) {
          toy.heldBy = p; p.carrying = toy; p.setState('return'); p.target = { x: 256 + rand(-30, 30), y: 350 };
          p.d.happy = clamp(p.d.happy + 3, 0, 100); if (toy.id === 'frisbee') d.discSkill = clamp(d.discSkill + 1.5, 0, 100);
          Sound.pop();
        } else if (reached && toy.moving) { p.pose = 'stand'; }
        if (toy.id === 'frisbee' && toy.z > 20 && dist(p.x, p.y, toy.x, toy.y) < 30 * p.scale && toy.vz < 0 && Math.random() < 0.6) {
          toy.heldBy = p; p.carrying = toy; toy.z = 0; toy.vx = toy.vy = toy.vz = 0; p.jumpV = 240; p.pose = 'jump';
          p.setState('return'); p.target = { x: 256 + rand(-30, 30), y: 350 }; textPop(p.x, p.zones().top - 20, 'Nice catch!', '#e05080'); sparkle(p.x, p.zones().top, 8);
          d.discSkill = clamp(d.discSkill + 3, 0, 100); p.d.happy = clamp(p.d.happy + 5, 0, 100);
        }
        break;
      }
      case 'return': {
        const toy = p.carrying; if (!toy) { p.setState('idle', 0.5); break; }
        if (p.moveToward(p.target.x, p.target.y, dt, 120)) {
          toy.heldBy = null; p.carrying = null; toy.x = p.x + p.facing * 20; toy.y = p.y + 4; toy.z = 0; toy.vx = toy.vy = toy.vz = 0;
          p.pose = 'sit'; p.facing = p.x < 256 ? 1 : -1; p.setState('idle', rand(3, 5)); p.wantsAttention = 1; p.bark(1);
          addBond(d, 0.6); d.happy = clamp(d.happy + 2, 0, 100); hearts(p.x, p.zones().top, 1);
        }
        break;
      }
      case 'tug': {
        p.tugT = (p.tugT || 0) + dt; p.pose = 'stand'; p.mouth = 'closed';
        const toy = p.carrying; if (!toy) { p.setState('idle', 1); break; }
        const tg = Home.tug; if (tg && tg.p === p) { p.facing = G.pointer.x > p.x ? 1 : -1; p.x += (tg.pull - p.x) * dt * 2; p.headPitch = Math.sin(p.tugT * 14) * 0.15; }
        if (p.stateT <= 0 || !tg) { Home.endTug(true); }
        break;
      }
      case 'popbubble': {
        const b = p.target; if (!b || !G.room.bubbles.includes(b)) { p.setState('idle', 0.4); p.pose = 'stand'; break; }
        const tx = b.x, ty = clamp(b.y + 60, 215, 360);
        const near = Math.abs(p.x - tx) < 16 * p.scale && Math.abs(p.y - ty) < 24;
        if (!near) p.moveToward(tx, ty, dt, 130);
        else { p.pose = 'stand'; if (b.y > p.y - 105 * p.scale && p.jumpY === 0) { p.jumpV = 240; p.pose = 'jump'; } }
        if ((p.jumpY > 0 || b.y > p.y - 55 * p.scale) && dist(p.x, p.y - p.jumpY - 50 * p.scale, b.x, b.y) < 40) { G.room.bubbles.splice(G.room.bubbles.indexOf(b), 1); sparkle(b.x, b.y, 5); Sound.pop(); buzz(8); d.happy = clamp(d.happy + 1.5, 0, 100); addBond(d, 0.2); p.setState('idle', 0.5); p.target = null; }
        break;
      }
      case 'play': {
        const o = p.target; if (!o || o.state === 'held' || o.state === 'sleep') { p.setState('idle', 0.5); p.pose = 'stand'; break; }
        if (p.moveToward(o.x + (p.x < o.x ? -34 : 34) * p.scale, o.y, dt, 120)) {
          p.facing = o.x > p.x ? 1 : -1; o.facing = -p.facing; p.jumpV = 200; p.pose = 'jump'; o.jumpV = 180; o.pose = 'jump'; p.bark(1); hearts((p.x + o.x) / 2, Math.min(p.y, o.y) - 70, 3);
          p.d.happy = clamp(p.d.happy + 3, 0, 100); o.d.happy = clamp(o.d.happy + 3, 0, 100); addBond(p.d, 0.3);
          p.setState('idle', rand(2, 3)); o.setState('idle', rand(2, 3));
        }
        break;
      }
      case 'playwait': { p.pose = 'sit'; if (p.stateT <= 0) p.setState('idle', 0.5); break; }
      default: { // idle
        if (p.pose === 'walk') p.pose = 'stand';
        if (p.stateT > 0) break;
        const foodBowl = G.room.food, waterBowl = G.room.water;
        const movingToy = G.room.toys.find(t => t.moving && !t.heldBy && !t.held);
        if (movingToy && d.energy > 10) { p.setState('chase'); p.target = movingToy; break; }
        const bubble = G.room.bubbles.find(b => b.y > 90 && Math.abs(b.x - p.x) < 170 && !G.dogs.some(o => o !== p && o.state === 'popbubble' && o.target === b));
        if (bubble && d.energy > 10) { p.setState('popbubble', 6); p.target = bubble; break; }
        if (foodBowl && foodBowl.amount > 0 && d.hunger < 85 && !G.dogs.some(o => o !== p && (o.state === 'eat' || o.state === 'tofood'))) { p.setState('tofood'); break; }
        if (waterBowl && waterBowl.amount > 0 && d.thirst < 85 && !G.dogs.some(o => o !== p && (o.state === 'drink' || o.state === 'towater'))) { p.setState('towater'); break; }
        const hr = new Date().getHours();
        if (d.energy < 15 || ((hr >= 23 || hr < 6) && d.energy < 70 && Math.random() < 0.15)) { if (dist(p.x, p.y, BED.x, BED.y) < 40) { p.setState('sleep', 20); p.pose = 'sleep'; } else p.setState('tobed', 0); break; }
        const r = Math.random();
        const sleepyToy = G.room.toys.find(t => !t.heldBy && !t.held && t.z === 0);
        const mate = G.dogs.find(o => o !== p && (o.state === 'idle' || o.state === 'wander') && o.d.energy > 30 && o.d.happy > 35);
        if (r < 0.42) { p.setState('wander'); p.target = { x: rand(80, W - 80), y: rand(225, 350) }; }
        else if (r < 0.56) { p.pose = 'sit'; p.setState('idle', rand(3, 6)); }
        else if (r < 0.65) { p.pose = 'lie'; p.setState('idle', rand(4, 8)); }
        else if (r < 0.72 && mate && d.energy > 30 && d.happy > 35) { p.setState('play'); p.target = mate; mate.setState('playwait', 4); mate.pose = 'sit'; }
        else if (r < 0.79 && sleepyToy && d.happy > 40) { p.setState('chase'); p.target = sleepyToy; }
        else if (r < 0.86 && (d.hunger < 30 || d.thirst < 30 || d.happy < 30)) { p.bark(2); p.setState('idle', rand(2, 4)); say(`${d.name} is ${d.hunger < 30 ? 'hungry' : d.thirst < 30 ? 'thirsty' : 'bored'}!`); }
        else if (r < 0.91) { p.facing *= -1; p.setState('idle', rand(1, 3)); }
        else { p.pose = 'stand'; p.setState('idle', rand(1, 3)); }
      }
    }
    if (p.carrying) { const z = p.zones(); p.carrying.x = z.head.x + p.facing * z.head.r * 0.9; p.carrying.y = p.y + 1; p.carrying.z = (p.y - z.head.y) + 4; }
    p.x = clamp(p.x, 50, W - 50); p.y = clamp(p.y, 215, 360);
  },

  // ----- drawing -----
  draw(ctx) {
    drawRoom(ctx);
    const items = [];
    for (const key of ['food', 'water']) if (G.room[key]) items.push({ y: G.room[key].y - 2, draw: () => drawBowl(ctx, G.room[key]) });
    for (const toy of G.room.toys) items.push({ y: toy.y + (toy.heldBy ? 2 : 0), draw: () => drawToy(ctx, toy) });
    for (const p of G.dogs) if (!p.hidden) items.push({ y: p.y, draw: () => p.draw(ctx) });
    items.sort((a, b) => a.y - b.y);
    for (const it of items) it.draw();
    for (const p of G.dogs) if (p.wantsAttention > 0) { p.wantsAttention -= 0.016; }
    // bubbles
    for (const b of G.room.bubbles) {
      ctx.save(); ctx.globalAlpha = clamp(b.life, 0, 1) * 0.9;
      const bg = ctx.createRadialGradient(b.x - b.r * 0.3, b.y - b.r * 0.3, 1, b.x, b.y, b.r); bg.addColorStop(0, 'rgba(255,255,255,0.55)'); bg.addColorStop(0.7, 'rgba(200,230,255,0.12)'); bg.addColorStop(1, 'rgba(160,200,255,0.35)');
      ctx.fillStyle = bg; ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.85)'; ctx.lineWidth = 1.2; ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.9)'; ctx.beginPath(); ctx.ellipse(b.x - b.r * 0.35, b.y - b.r * 0.4, b.r * 0.25, b.r * 0.15, -0.7, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }
    drawParticles(ctx);
    if (this.dragToy) drawToy(ctx, this.dragToy);
    if (G.bubbleMode) { // wand at pointer
      const x = G.pointer.down && !this.pet ? G.pointer.x : 60, y = G.pointer.down && !this.pet ? G.pointer.y : 190;
      ctx.save(); ctx.translate(x, y); ctx.rotate(-0.5); ctx.strokeStyle = '#f06a8e'; ctx.lineWidth = 4; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, 34); ctx.stroke(); ctx.beginPath(); ctx.arc(0, -9, 10, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
      if (!G.pointer.down) { ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.font = `13px ${FONT}`; ctx.textAlign = 'center'; ctx.fillText('Hold anywhere to blow bubbles', W / 2, 196); }
    }
    if (this.tug) { ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.font = `600 13px ${FONT}`; ctx.textAlign = 'center'; ctx.fillText('Tug of war! Drag back and forth', W / 2, 196); }
    if (this.pet && this.pet.gestureHint) { ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.font = `13px ${FONT}`; ctx.textAlign = 'center'; ctx.fillText(this.pet.gestureHint, W / 2, 196); }
    if (!G.dogs.length) { ctx.fillStyle = '#5a4a3a'; ctx.font = `600 18px ${FONT}`; ctx.textAlign = 'center'; ctx.fillText('Your room is empty. Visit the Kennel to adopt a puppy!', W / 2, 120); }
    if (G.flash > 0) { ctx.fillStyle = `rgba(255,255,255,${G.flash})`; ctx.fillRect(0, 0, W, HH); }
  },

  // ----- pointer -----
  onDown(x, y) {
    const now = performance.now();
    if (G.bubbleMode) { this.blowT = 0; return; }
    for (const toy of [...G.room.toys].reverse()) {
      if (toy.heldBy && toy.heldBy.state !== 'idle' && !(toy.id === 'rope' && toy.heldBy.state === 'return')) continue;
      if (dist(x, y, toy.x, toy.y - toy.z) < 22) {
        if (toy.heldBy && toy.id === 'rope') { this.startTug(toy.heldBy, toy, x); return; }
        if (toy.heldBy) { toy.heldBy.carrying = null; toy.heldBy = null; }
        toy.held = true; this.dragToy = toy; toy.vx = toy.vy = toy.vz = 0; toy.z = 0; toy.trail = [{ x, y, t: now }]; Sound.click(); return;
      }
    }
    const pups = [...G.dogs].sort((a, b) => b.y - a.y);
    for (const p of pups) {
      const part = p.hit(x, y);
      if (part) {
        setActive(p);
        if (p.state === 'sleep') { p.eyes = 'open'; p.pose = 'lie'; }
        const wasPose = p.pose === 'walk' ? 'stand' : p.pose;
        if (['trick', 'come', 'wander', 'chase', 'return', 'play', 'popbubble', 'tobed'].includes(p.state)) { p.rollAngle = 0; p.spinAngle = 0; }
        if (p.carrying) { const toy = p.carrying; toy.heldBy = null; p.carrying = null; toy.x = p.x + p.facing * 18; toy.y = p.y + 3; toy.z = 0; }
        p.setState('held'); p.pose = wasPose === 'sleep' ? 'lie' : (['sit', 'lie', 'beg', 'shake'].includes(wasPose) ? (wasPose === 'beg' || wasPose === 'shake' ? 'sit' : wasPose) : 'stand');
        p.headPitch = 0; p.jumpY = 0; p.jumpV = 0;
        this.pet = { p, part, sx: x, sy: y, lx: x, ly: y, moved: 0, t0: now, path: [{ x, y }], gesture: null, angle: 0, lastAng: null, strokes: 0 };
        if (part === 'paw' && p.pose === 'sit') this.triggerGesture('shake');
        if (part === 'head' && p.pose !== 'lie') { this.pet.gestureHint = p.pose === 'sit' ? 'Drag down: Lie Down  •  Drag up: Beg' : 'Push down: Sit  •  Flick up: Jump'; }
        else if (p.pose === 'lie') this.pet.gestureHint = 'Drag sideways: Roll Over';
        else if (p.pose === 'stand') this.pet.gestureHint = 'Circle around: Spin  •  Stroke to pet';
        return;
      }
    }
    if (now - this.lastTap < 350) { for (const p of G.dogs) if (p.state !== 'held') pupCome(p); Sound.whistle(); }
    this.lastTap = now;
  },
  onMove(x, y) {
    if (this.tug) { const tg = this.tug; tg.pull = clamp(x, 60, W - 60); tg.dist += Math.abs(x - tg.lx); tg.lx = x; if (tg.dist > 60) { tg.dist = 0; hearts(tg.p.x, tg.p.zones().top - 10, 1); tg.p.d.happy = clamp(tg.p.d.happy + 1, 0, 100); buzz(6); Sound.squeak(); } return; }
    if (this.dragToy) { const toy = this.dragToy; toy.x = x; toy.y = Math.max(200, y); toy.trail.push({ x, y, t: performance.now() }); if (toy.trail.length > 8) toy.trail.shift(); return; }
    const pet = this.pet; if (!pet) return;
    const p = pet.p;
    const dx = x - pet.lx, dy = y - pet.ly; pet.moved += Math.hypot(dx, dy); pet.lx = x; pet.ly = y; pet.path.push({ x, y });
    const tdx = x - pet.sx, tdy = y - pet.sy; const elapsed = performance.now() - pet.t0;
    if (pet.moved > 30 && !pet.gesture) {
      pet.moved = 0; pet.strokes++;
      p.petHeat = 1.2; p.eyes = 'happy';
      p.d.happy = clamp(p.d.happy + 0.6, 0, 100); addBond(p.d, 0.15);
      hearts(x, y - 10, 1); if (pet.strokes % 3 === 0) { Sound.heart(); buzz(8); }
      if (invCount('brush') > 0 && G.brushMode) { p.d.clean = clamp(p.d.clean + 0.8, 0, 100); sparkle(x, y, 1); }
    }
    if (pet.gesture) return;
    if (pet.part === 'head') {
      if (p.pose === 'stand' && tdy > 30 && Math.abs(tdx) < 50) this.triggerGesture('sit');
      else if (p.pose === 'stand' && tdy < -45 && elapsed < 400) this.triggerGesture('jump');
      else if (p.pose === 'sit' && tdy > 34 && Math.abs(tdx) < 50) this.triggerGesture('lie');
      else if (p.pose === 'sit' && tdy < -34 && Math.abs(tdx) < 50) this.triggerGesture('beg');
    }
    if (p.pose === 'lie' && Math.abs(tdx) > 55 && Math.abs(tdy) < 50) this.triggerGesture('roll', tdx > 0 ? 1 : -1);
    if (p.pose === 'stand') {
      const cx = p.x, cy = p.y - 30 * p.scale;
      const ang = Math.atan2(y - cy, x - cx);
      if (pet.lastAng !== null) { let da = ang - pet.lastAng; if (da > Math.PI) da -= Math.PI * 2; if (da < -Math.PI) da += Math.PI * 2; pet.angle += da; }
      pet.lastAng = ang;
      if (Math.abs(pet.angle) > Math.PI * 1.7 && dist(x, y, cx, cy) > 25) this.triggerGesture('spin');
    }
  },
  onUp(x, y) {
    if (this.tug) { this.endTug(false); return; }
    if (this.dragToy) {
      const toy = this.dragToy; toy.held = false; this.dragToy = null;
      const tr = toy.trail; const now = performance.now();
      const recent = tr.filter(s => now - s.t < 120); const a = recent[0] || tr[0], b = tr[tr.length - 1];
      const dt = Math.max(0.03, (b.t - a.t) / 1000);
      let vx = (b.x - a.x) / dt, vy = (b.y - a.y) / dt;
      const sp = Math.hypot(vx, vy);
      if (sp > 150) {
        const k = toy.id === 'frisbee' ? 0.9 : 0.7; vx *= k; vy *= k * 0.6;
        toy.vx = clamp(vx, -500, 500); toy.vy = clamp(vy, -400, 200); toy.vz = Math.min(360, sp * (toy.id === 'frisbee' ? 0.5 : 0.65)); toy.z = 1; toy.moving = true;
        Sound.pop();
        for (const p of G.dogs) if (p.state !== 'held' && p.state !== 'sleep' && p.d.energy > 10) { p.setState('chase'); p.target = toy; p.pose = 'stand'; }
      }
      return;
    }
    const pet = this.pet; if (!pet) return; this.pet = null;
    const p = pet.p;
    if (!pet.gesture) {
      if (pet.strokes > 0) { p.eyes = 'happy'; }
      p.setState('idle', pet.strokes > 2 ? rand(2, 3) : rand(0.5, 1.5));
      if (pet.strokes === 0 && performance.now() - pet.t0 < 250) { p.bark(1); p.headTurn = 0.2; setTimeout(() => p.headTurn = 0, 500); }
    }
  },
  startTug(p, toy, x) { this.tug = { p, toy, pull: x, lx: x, dist: 0 }; p.setState('tug', 4); p.pose = 'stand'; p.tugT = 0; Sound.squeak(); },
  endTug(letGo) {
    const tg = this.tug; this.tug = null; if (!tg) return; const p = tg.p, toy = tg.toy;
    p.headPitch = 0;
    if (letGo) { toy.heldBy = null; p.carrying = null; toy.x = p.x + p.facing * 20; toy.y = p.y + 4; toy.z = 0; p.pose = 'sit'; hearts(p.x, p.zones().top, 2); addBond(p.d, 1); p.d.happy = clamp(p.d.happy + 3, 0, 100); say(`${p.d.name} let go. What a game!`); p.setState('idle', 1.5); }
    else { p.setState('return'); p.target = { x: clamp(p.x + p.facing * 60, 80, W - 80), y: clamp(p.y + 10, 215, 355) }; }
  },
  triggerGesture(trick, dir) {
    const pet = this.pet; if (!pet || pet.gesture) return;
    pet.gesture = trick; const p = pet.p;
    pet.gestureHint = null;
    startPose(p, trick, trick === 'roll' || trick === 'spin' ? 2.2 : 4);
    Sound.squeak(); buzz(10);
    p.d.happy = clamp(p.d.happy + 1, 0, 100);
    const known = p.d.tricks[trick];
    if (known) {
      known.mastery = clamp(known.mastery + 2, 0, 100);
      textPop(p.x, p.zones().top - 24, TRICKS[trick].name, '#2a8a3a');
      if (known.mastery < 100 && Math.random() < 0.35) say(`${p.d.name} remembers "${known.cmd}" means ${TRICKS[trick].name}.`);
    } else {
      showTeach(p, trick);
    }
  },

  drawTop(ctx) { drawTopHUD(ctx); },
};

// ---------- teaching prompt ----------
function showTeach(p, trick) {
  const el = document.getElementById('teach');
  el.style.display = 'block';
  el.innerHTML = `<div class="teach-title">${p.d.name} is doing ${TRICKS[trick].name}!</div>
    <div class="teach-sub">Say or type the command word you want ${p.d.name} to learn.</div>
    <div class="teach-row"><input id="teachInput" maxlength="16" placeholder="e.g. ${TRICKS[trick].name.toLowerCase()}" autocomplete="off" autocapitalize="off">
    <button id="teachMic" class="mic" title="Speak" aria-label="Speak the word"><svg><use href="#i-mic"/></svg></button><button id="teachOk" class="primary">Teach</button><button id="teachSkip" class="ghost">Later</button></div>`;
  const input = el.querySelector('#teachInput'); setTimeout(() => input.focus(), 50);
  const finish = () => {
    const word = normalize(input.value).slice(0, 16);
    if (!word) return;
    const clash = Object.entries(p.d.tricks).find(([id, t]) => id !== trick && similar(t.cmd, word));
    if (clash) { input.value = ''; input.placeholder = `"${word}" is already ${TRICKS[clash[0]].name}`; return; }
    if (G.dogs.some(o => similar(o.d.name, word))) { input.value = ''; input.placeholder = `That's a puppy's name!`; return; }
    p.d.tricks[trick] = { cmd: word, mastery: 12 };
    addBond(p.d, 3); addTP(20); p.d.happy = clamp(p.d.happy + 6, 0, 100);
    Sound.fanfare(); sparkle(p.x, p.zones().top - 10, 12); buzz(20);
    say(`${p.d.name} learned ${TRICKS[trick].name}! Say "${word}" to try it. Repeat it to raise mastery.`, 6000);
    el.style.display = 'none'; saveGame();
    p.setState('trick', 2.5);
  };
  el.querySelector('#teachOk').onclick = finish;
  input.onkeydown = e => { if (e.key === 'Enter') finish(); if (e.key === 'Escape') el.style.display = 'none'; };
  el.querySelector('#teachSkip').onclick = () => { el.style.display = 'none'; };
  el.querySelector('#teachMic').onclick = () => listenOnce(txt => { input.value = normalize(txt).split(' ')[0]; });
  p.setState('trick', 20);
  const watch = setInterval(() => { if (el.style.display === 'none') { clearInterval(watch); if (p.state === 'trick' && p.stateT > 3) p.stateT = 1.5; } }, 300);
}

// ---------- speech recognition ----------
function listenOnce(cb) {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  const btns = document.querySelectorAll('.mic');
  if (!SR) { say('Voice input needs Chrome, Edge or Safari. You can type commands instead.'); return; }
  try {
    const r = new SR(); r.lang = 'en-US'; r.interimResults = false; r.maxAlternatives = 3;
    btns.forEach(b => b.classList.add('listening'));
    r.onresult = e => { const txt = e.results[0][0].transcript; cb(txt); };
    r.onerror = e => { if (e.error === 'not-allowed') say('Microphone blocked. Allow the mic in the address bar, or type commands.'); else if (e.error !== 'no-speech') say('Could not hear that. Try again or type it.'); };
    r.onend = () => btns.forEach(b => b.classList.remove('listening'));
    r.start();
  } catch (e) { say('Voice input unavailable here. Type commands instead.'); }
}

// ---------- room / props drawing ----------
function timeOfDay() { const h = new Date().getHours() + new Date().getMinutes() / 60; if (h < 5.5 || h > 20.5) return 'night'; if (h < 7.5 || h > 18.5) return 'dusk'; return 'day'; }
const ROOM_THEMES = {
  room_basic: { wall1: '#f7e9cf', wall2: '#ecd6b1', paper: 'stripe', floor1: '#d8a66a', floor2: '#b87f49', plank: true, skirt: '#fff7ea', rug: ['#d9534f', '#f0a090'], curtain: '#e8788a', frame: '#8a5a3a', bed: ['#b25e5e', '#efc6c6'] },
  room_seaside: { wall1: '#d3f0fb', wall2: '#9fd5ec', paper: 'wave', floor1: '#f3e2bd', floor2: '#dcc395', plank: true, skirt: '#ffffff', rug: ['#3f9fd6', '#bfe6f5'], curtain: '#ffffffcc', frame: '#5a8aa8', bed: ['#3f8fb5', '#cfe8f5'] },
  room_garden: { wall1: '#e9f5d6', wall2: '#cfe6b3', paper: 'leaf', floor1: '#9cc47a', floor2: '#79a65a', plank: false, skirt: '#ffffff', rug: ['#f3e2bd', '#fff7ea'], curtain: '#f0b8c8', frame: '#6a8a4a', bed: ['#8a6a4a', '#e9d8b8'] },
  room_cabin: { wall1: '#c89a6a', wall2: '#a87848', paper: 'logs', floor1: '#8e5f3a', floor2: '#6e472a', plank: true, skirt: '#5a3a22', rug: ['#b24a3a', '#e0b060'], curtain: '#8a5a3a', frame: '#4a2e1a', bed: ['#6a4a2a', '#e8d2a8'] },
  room_space: { wall1: '#1b1f4a', wall2: '#0b0d2a', paper: 'stars', floor1: '#5a6080', floor2: '#3c4160', plank: false, skirt: '#2a2f55', rug: ['#6a70c0', '#9aa0ff'], curtain: '#3a3f80', frame: '#223', bed: ['#4a4f8a', '#8a8fcf'] },
};
const ROOM_CACHE = {};
function roomBackground(theme, tod, weather) {
  const key = theme + '|' + tod + '|' + weather; if (ROOM_CACHE[key]) return ROOM_CACHE[key];
  const c = document.createElement('canvas'); c.width = W; c.height = HH; const ctx = c.getContext('2d');
  const T = ROOM_THEMES[theme] || ROOM_THEMES.room_basic; const horizon = 200;
  // walls
  const g = ctx.createLinearGradient(0, 0, 0, horizon); g.addColorStop(0, T.wall1); g.addColorStop(1, T.wall2);
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, horizon);
  if (T.paper === 'stripe') { ctx.fillStyle = 'rgba(255,255,255,0.18)'; for (let x = 0; x < W; x += 28) ctx.fillRect(x, 0, 12, horizon); }
  else if (T.paper === 'wave') { ctx.strokeStyle = 'rgba(255,255,255,0.45)'; ctx.lineWidth = 2; for (let y = 20; y < horizon; y += 26) { ctx.beginPath(); for (let x = 0; x <= W; x += 8) ctx.lineTo(x, y + Math.sin(x / 14) * 3); ctx.stroke(); } }
  else if (T.paper === 'leaf') { ctx.fillStyle = 'rgba(90,150,70,0.18)'; for (let i = 0; i < 60; i++) { const x = (i * 97) % W, y = (i * 61) % horizon; ctx.beginPath(); ctx.ellipse(x, y, 7, 3.5, (i % 5) * 0.6, 0, Math.PI * 2); ctx.fill(); } }
  else if (T.paper === 'logs') { for (let y = 0; y < horizon; y += 24) { ctx.fillStyle = y % 48 ? '#b8865a' : '#c49466'; roundRect(ctx, -4, y, W + 8, 22, 10, ctx.fillStyle); ctx.fillStyle = 'rgba(0,0,0,0.12)'; ctx.fillRect(0, y + 18, W, 4); } }
  else if (T.paper === 'stars') { ctx.fillStyle = '#fff'; for (let i = 0; i < 70; i++) { const x = (i * 131) % W, y = (i * 83) % horizon, r = (i % 3) * 0.5 + 0.6; ctx.globalAlpha = 0.4 + (i % 4) * 0.15; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); } ctx.globalAlpha = 1; }
  // floor
  const fg = ctx.createLinearGradient(0, horizon, 0, HH); fg.addColorStop(0, T.floor1); fg.addColorStop(1, T.floor2);
  ctx.fillStyle = fg; ctx.fillRect(0, horizon, W, HH - horizon);
  if (T.plank) {
    ctx.strokeStyle = 'rgba(0,0,0,0.1)'; ctx.lineWidth = 1;
    for (let i = 0; i < 10; i++) { const y = horizon + 10 + i * i * 2.2; ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
    for (let i = -6; i <= 6; i++) { ctx.beginPath(); ctx.moveTo(W / 2 + i * 40, horizon); ctx.lineTo(W / 2 + i * 110, HH); ctx.stroke(); }
    ctx.strokeStyle = 'rgba(255,255,255,0.08)'; for (let i = 0; i < 9; i++) { const y = horizon + 12 + i * i * 2.2; ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
  } else if (theme === 'room_space') { ctx.strokeStyle = 'rgba(255,255,255,0.08)'; for (let i = -6; i <= 6; i++) { ctx.beginPath(); ctx.moveTo(W / 2 + i * 40, horizon); ctx.lineTo(W / 2 + i * 110, HH); ctx.stroke(); } for (let i = 0; i < 6; i++) { const y = horizon + 14 + i * i * 5; ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); } }
  else { ctx.fillStyle = 'rgba(255,255,255,0.08)'; for (let i = 0; i < 80; i++) { const x = (i * 137) % W, y = horizon + ((i * 71) % (HH - horizon)); ctx.beginPath(); ctx.ellipse(x, y, 6, 2, 0, 0, Math.PI * 2); ctx.fill(); } }
  // skirting board
  ctx.fillStyle = T.skirt; ctx.fillRect(0, horizon - 10, W, 10); ctx.fillStyle = 'rgba(0,0,0,0.12)'; ctx.fillRect(0, horizon, W, 3);
  // window
  const wx = 300, wy = 40, ww = 150, wh = 110;
  if (theme === 'room_space') {
    ctx.fillStyle = '#9aa0c8'; ctx.beginPath(); ctx.arc(375, 95, 66, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#6a70a0'; ctx.beginPath(); ctx.arc(375, 95, 58, 0, Math.PI * 2); ctx.fill();
    const sg = ctx.createRadialGradient(360, 80, 5, 375, 95, 56); sg.addColorStop(0, '#2a2f70'); sg.addColorStop(1, '#05061a'); ctx.fillStyle = sg; ctx.beginPath(); ctx.arc(375, 95, 52, 0, Math.PI * 2); ctx.fill();
    ctx.save(); ctx.beginPath(); ctx.arc(375, 95, 52, 0, Math.PI * 2); ctx.clip();
    ctx.fillStyle = '#fff'; for (let i = 0; i < 25; i++) { ctx.beginPath(); ctx.arc(330 + (i * 37) % 100, 50 + (i * 53) % 100, 1 + (i % 2), 0, Math.PI * 2); ctx.fill(); }
    const pg = ctx.createRadialGradient(395, 110, 2, 400, 115, 22); pg.addColorStop(0, '#ffb070'); pg.addColorStop(1, '#c0502a'); ctx.fillStyle = pg; ctx.beginPath(); ctx.arc(400, 115, 20, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(255,220,180,0.7)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(400, 115, 32, 8, -0.4, 0, Math.PI * 2); ctx.stroke();
    ctx.restore();
    for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; ctx.fillStyle = '#d0d4f0'; ctx.beginPath(); ctx.arc(375 + Math.cos(a) * 62, 95 + Math.sin(a) * 62, 3, 0, Math.PI * 2); ctx.fill(); }
  } else {
    ctx.fillStyle = theme === 'room_cabin' ? '#4a2e1a' : '#fff'; roundRect(ctx, wx - 9, wy - 9, ww + 18, wh + 18, 4, ctx.fillStyle);
    let sky = ctx.createLinearGradient(0, wy, 0, wy + wh);
    if (tod === 'night') { sky.addColorStop(0, '#0d1240'); sky.addColorStop(1, '#2a3570'); }
    else if (tod === 'dusk') { sky.addColorStop(0, '#5a63b8'); sky.addColorStop(1, '#f7a46a'); }
    else if (weather === 'rain') { sky.addColorStop(0, '#7a8aa0'); sky.addColorStop(1, '#b8c4d0'); }
    else if (weather === 'cloud') { sky.addColorStop(0, '#9ec4e6'); sky.addColorStop(1, '#dbe9f3'); }
    else { sky.addColorStop(0, '#6cb8f0'); sky.addColorStop(1, '#cdeaff'); }
    ctx.fillStyle = sky; ctx.fillRect(wx, wy, ww, wh);
    ctx.save(); ctx.beginPath(); ctx.rect(wx, wy, ww, wh); ctx.clip();
    if (tod === 'night') { ctx.fillStyle = '#fff'; for (let i = 0; i < 18; i++) ctx.fillRect(wx + (i * 37) % ww, wy + (i * 53) % wh, 2, 2); ctx.fillStyle = '#fff6c0'; ctx.beginPath(); ctx.arc(wx + 110, wy + 30, 14, 0, Math.PI * 2); ctx.fill(); }
    else if (weather !== 'rain') { ctx.fillStyle = tod === 'dusk' ? '#ffb347' : '#fff3a0'; ctx.beginPath(); ctx.arc(wx + 110, wy + 32, 16, 0, Math.PI * 2); ctx.fill(); }
    if (tod !== 'night') { ctx.fillStyle = weather === 'rain' ? 'rgba(90,100,120,0.6)' : 'rgba(255,255,255,0.85)'; const clouds = weather === 'sun' ? [[20, 60], [95, 75]] : [[10, 40], [50, 62], [100, 38], [120, 80]]; clouds.forEach(([cx, cy]) => { ctx.beginPath(); ctx.arc(wx + cx, wy + cy, 12, 0, Math.PI * 2); ctx.arc(wx + cx + 14, wy + cy - 6, 14, 0, Math.PI * 2); ctx.arc(wx + cx + 30, wy + cy, 11, 0, Math.PI * 2); ctx.fill(); }); }
    if (theme === 'room_seaside') { ctx.fillStyle = tod === 'night' ? '#1f4f7a' : '#3f9fd6'; ctx.fillRect(wx, wy + wh * 0.62, ww, wh * 0.38); ctx.fillStyle = 'rgba(255,255,255,0.5)'; for (let i = 0; i < 4; i++) ctx.fillRect(wx + 10 + i * 36, wy + wh * 0.7 + (i % 2) * 8, 18, 2); ctx.fillStyle = '#f0dba8'; ctx.fillRect(wx, wy + wh * 0.85, ww, wh * 0.15); }
    else { ctx.fillStyle = tod === 'night' ? '#2a4a2a' : '#6aa84f'; ctx.fillRect(wx, wy + wh * 0.72, ww, wh * 0.28); ctx.fillStyle = tod === 'night' ? '#1f3a1f' : '#3d7a2a'; [[15, 30], [60, 36], [120, 28]].forEach(([tx, r]) => { ctx.beginPath(); ctx.arc(wx + tx, wy + wh * 0.72, r * 0.6, Math.PI, 0); ctx.fill(); }); if (theme === 'room_garden') { ctx.fillStyle = '#f06a8e'; for (let i = 0; i < 6; i++) { ctx.beginPath(); ctx.arc(wx + 12 + i * 26, wy + wh * 0.8 + (i % 2) * 6, 3, 0, Math.PI * 2); ctx.fill(); } } }
    ctx.restore();
    ctx.strokeStyle = theme === 'room_cabin' ? '#4a2e1a' : '#fff'; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(wx + ww / 2, wy); ctx.lineTo(wx + ww / 2, wy + wh); ctx.moveTo(wx, wy + wh / 2); ctx.lineTo(wx + ww, wy + wh / 2); ctx.stroke();
    ctx.fillStyle = 'rgba(0,0,0,0.08)'; ctx.fillRect(wx - 9, wy + wh + 9, ww + 18, 4);
    // curtains
    ctx.fillStyle = T.curtain; roundRect(ctx, wx - 28, wy - 16, 22, wh + 34, 6, T.curtain); roundRect(ctx, wx + ww + 6, wy - 16, 22, wh + 34, 6, T.curtain);
    ctx.fillStyle = 'rgba(0,0,0,0.1)'; for (let i = 0; i < 3; i++) { ctx.fillRect(wx - 25 + i * 7, wy - 12, 2, wh + 26); ctx.fillRect(wx + ww + 9 + i * 7, wy - 12, 2, wh + 26); }
    // sun pool on the floor
    if (tod === 'day' && weather === 'sun') { const lg = ctx.createLinearGradient(0, horizon, 0, horizon + 120); lg.addColorStop(0, 'rgba(255,245,200,0.28)'); lg.addColorStop(1, 'rgba(255,245,200,0)'); ctx.fillStyle = lg; ctx.beginPath(); ctx.moveTo(wx + 10, horizon); ctx.lineTo(wx + ww - 10, horizon); ctx.lineTo(wx + ww + 70, horizon + 120); ctx.lineTo(wx - 40, horizon + 120); ctx.fill(); }
  }
  // picture frame (portrait drawn live)
  roundRect(ctx, 58, 48, 94, 74, 5, T.frame); roundRect(ctx, 65, 55, 80, 60, 2, theme === 'room_space' ? '#223' : '#cfe8f7');
  // shelf
  ctx.fillStyle = T.frame; ctx.fillRect(176, 124, 108, 7); ctx.fillStyle = 'rgba(0,0,0,0.15)'; ctx.fillRect(176, 131, 108, 3);
  // clock
  ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(230, 70, 17, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = T.frame; ctx.lineWidth = 3; ctx.stroke();
  // plant (left) and lamp (right)
  ctx.fillStyle = '#b86a4a'; roundRect(ctx, 18, 170, 26, 24, 4, '#b86a4a'); ctx.fillStyle = '#3f8f3a'; for (const [lx, ly, r] of [[31, 158, 12], [20, 150, 9], [42, 150, 9], [31, 140, 8]]) { ctx.beginPath(); ctx.ellipse(lx, ly, r, r * 1.3, 0, 0, Math.PI * 2); ctx.fill(); }
  if (theme !== 'room_space') { ctx.fillStyle = '#8a6a4a'; ctx.fillRect(482, 110, 4, 90); ctx.fillStyle = tod === 'night' ? '#ffe9a0' : '#f3e2bd'; ctx.beginPath(); ctx.moveTo(462, 112); ctx.lineTo(506, 112); ctx.lineTo(500, 84); ctx.lineTo(468, 84); ctx.closePath(); ctx.fill(); if (tod === 'night') { const lg = ctx.createRadialGradient(484, 112, 4, 484, 140, 90); lg.addColorStop(0, 'rgba(255,230,150,0.45)'); lg.addColorStop(1, 'rgba(255,230,150,0)'); ctx.fillStyle = lg; ctx.fillRect(380, 60, 132, 200); } }
  // theme props
  if (theme === 'room_seaside') { ctx.save(); ctx.translate(470, 150); ctx.rotate(0.15); ctx.fillStyle = '#ff9a6a'; ctx.beginPath(); ctx.ellipse(0, 0, 14, 60, 0, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#fff'; ctx.fillRect(-2, -50, 4, 100); ctx.restore(); }
  if (theme === 'room_cabin') { ctx.fillStyle = '#6a6a6a'; roundRect(ctx, 400, 120, 100, 80, 4, '#7a7a7a'); ctx.fillStyle = '#555'; for (let i = 0; i < 12; i++) ctx.fillRect(404 + (i % 4) * 24, 124 + Math.floor(i / 4) * 24, 20, 18); ctx.fillStyle = '#1a1a1a'; roundRect(ctx, 416, 150, 68, 48, 4, '#1a1a1a'); ctx.fillStyle = '#9a6a42'; ctx.fillRect(396, 116, 108, 6); }
  if (theme === 'room_garden') { ctx.fillStyle = '#d9d9d9'; roundRect(ctx, 460, 166, 30, 30, 6, '#8fbf6a'); ctx.fillStyle = '#5a8a3a'; ctx.fillRect(458, 172, 34, 6); ctx.fillStyle = '#7a8a9a'; ctx.beginPath(); ctx.moveTo(466, 170); ctx.lineTo(450, 150); ctx.lineTo(454, 148); ctx.lineTo(472, 168); ctx.fill(); }
  // rug
  ctx.fillStyle = T.rug[0]; ctx.globalAlpha = 0.5; ellipsePath(ctx, 256, 300, 150, 48); ctx.fill(); ctx.globalAlpha = 1;
  ctx.strokeStyle = T.rug[1]; ctx.lineWidth = 3; ellipsePath(ctx, 256, 300, 135, 40); ctx.stroke(); ctx.lineWidth = 1.5; ellipsePath(ctx, 256, 300, 110, 30); ctx.stroke();
  // bed base
  ctx.fillStyle = 'rgba(0,0,0,0.12)'; ellipsePath(ctx, BED.x, BED.y + 4, 50, 16); ctx.fill();
  ctx.fillStyle = T.bed[0]; ellipsePath(ctx, BED.x, BED.y - 2, 48, 18); ctx.fill();
  ctx.fillStyle = T.bed[1]; ellipsePath(ctx, BED.x, BED.y, 36, 11); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.25)'; ellipsePath(ctx, BED.x - 10, BED.y - 10, 20, 4); ctx.fill();
  // light
  if (tod === 'night') { ctx.fillStyle = 'rgba(20,20,70,0.3)'; ctx.fillRect(0, 0, W, HH); }
  else if (tod === 'dusk') { ctx.fillStyle = 'rgba(255,150,80,0.1)'; ctx.fillRect(0, 0, W, HH); }
  else if (weather === 'rain') { ctx.fillStyle = 'rgba(60,70,100,0.08)'; ctx.fillRect(0, 0, W, HH); }
  // vignette
  const vg = ctx.createRadialGradient(256, 200, 180, 256, 200, 420); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,0.18)'); ctx.fillStyle = vg; ctx.fillRect(0, 0, W, HH);
  ROOM_CACHE[key] = c; return c;
}
function drawRoom(ctx) {
  const theme = G.save.room || 'room_basic'; const tod = timeOfDay();
  ctx.drawImage(roomBackground(theme, tod, G.weather), 0, 0);
  // live bits: portrait, trophies, clock hands, rain, fire
  const fp = activePup();
  if (fp) drawDog(ctx, fp.d, { x: 105, y: 108, scale: 0.42, facing: 1, pose: 'sit', t: 0, eyes: 'happy', mouth: 'smile' });
  let tx = 184; const trophies = G.dogs.flatMap(p => p.d.trophies);
  for (const tr of trophies.slice(0, 5)) { drawTrophy(ctx, tx + 8, 122, tr); tx += 20; }
  const now = new Date(); const hA = (now.getHours() % 12 + now.getMinutes() / 60) / 12 * Math.PI * 2 - Math.PI / 2, mA = now.getMinutes() / 60 * Math.PI * 2 - Math.PI / 2;
  ctx.strokeStyle = '#3b2e25'; ctx.lineCap = 'round'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(230, 70); ctx.lineTo(230 + Math.cos(hA) * 8, 70 + Math.sin(hA) * 8); ctx.stroke(); ctx.lineWidth = 1.8; ctx.beginPath(); ctx.moveTo(230, 70); ctx.lineTo(230 + Math.cos(mA) * 12, 70 + Math.sin(mA) * 12); ctx.stroke();
  if (G.weather === 'rain' && theme !== 'room_space') { ctx.strokeStyle = 'rgba(200,220,255,0.6)'; ctx.lineWidth = 1.2; for (let i = 0; i < 24; i++) { const x = 300 + (i * 23 + 7) % 150, y = 40 + ((i * 41 + G.t * 240) % 110); ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - 1.5, y + 8); ctx.stroke(); } }
  if (theme === 'room_cabin') {
    ctx.save(); ctx.beginPath(); ctx.roundRect(416, 150, 68, 48, 4); ctx.clip();
    const glow = ctx.createRadialGradient(450, 192, 4, 450, 192, 40); glow.addColorStop(0, 'rgba(255,170,60,0.55)'); glow.addColorStop(1, 'rgba(255,120,30,0)'); ctx.fillStyle = glow; ctx.fillRect(416, 150, 68, 48);
    for (let i = 0; i < 6; i++) { const fx = 428 + i * 9 + Math.sin(G.t * 7 + i) * 2, fh = 14 + Math.sin(G.t * 11 + i * 2) * 5 + (i % 2) * 4; ctx.fillStyle = i % 2 ? '#ffb030' : '#ff7a20'; ctx.beginPath(); ctx.moveTo(fx - 5, 196); ctx.quadraticCurveTo(fx - 6, 196 - fh * 0.6, fx, 196 - fh); ctx.quadraticCurveTo(fx + 6, 196 - fh * 0.6, fx + 5, 196); ctx.fill(); }
    for (let i = 0; i < 3; i++) { const fx = 436 + i * 10 + Math.sin(G.t * 9 + i) * 2, fh = 8 + Math.sin(G.t * 13 + i) * 3; ctx.fillStyle = '#ffe066'; ctx.beginPath(); ctx.moveTo(fx - 3, 196); ctx.quadraticCurveTo(fx - 3, 196 - fh * 0.6, fx, 196 - fh); ctx.quadraticCurveTo(fx + 3, 196 - fh * 0.6, fx + 3, 196); ctx.fill(); }
    ctx.restore(); ctx.fillStyle = '#5a3a1a'; ctx.fillRect(422, 192, 56, 5); ctx.fillStyle = '#3a2410'; ctx.fillRect(426, 190, 48, 3);
  }
}
function drawTrophy(ctx, x, y, tr) {
  const col = tr.rank === 1 ? '#ffd84a' : tr.rank === 2 ? '#d8d8e0' : '#d08a4a';
  ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(x - 6, y - 14); ctx.lineTo(x + 6, y - 14); ctx.lineTo(x + 4, y - 4); ctx.lineTo(x - 4, y - 4); ctx.closePath(); ctx.fill();
  ctx.fillRect(x - 5, y - 2, 10, 2); ctx.fillRect(x - 1, y - 5, 2, 3);
  ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.fillRect(x - 4, y - 12, 2, 6);
}
function drawBowl(ctx, bowl) {
  const { x, y } = bowl; const isWater = bowl.item === 'water' || bowl.item === 'milk';
  fillEllipse(ctx, x, y + 2, 26, 9, 'rgba(0,0,0,0.15)');
  const c1 = isWater ? '#4f8fd6' : '#d6534f', c2 = isWater ? '#3a6fae' : '#a83b38';
  ctx.fillStyle = c2; ctx.fillRect(x - 26, y - 2, 52, 8); ellipsePath(ctx, x, y + 6, 26, 9); ctx.fill();
  const bg = ctx.createLinearGradient(x - 26, 0, x + 26, 0); bg.addColorStop(0, c2); bg.addColorStop(0.5, c1); bg.addColorStop(1, c2); ctx.fillStyle = bg; ellipsePath(ctx, x, y - 2, 26, 11); ctx.fill();
  ctx.fillStyle = '#2a2a2a'; ellipsePath(ctx, x, y - 2, 20, 7); ctx.fill();
  if (bowl.amount > 0) {
    const a = bowl.amount;
    if (isWater) { ctx.fillStyle = bowl.item === 'milk' ? '#fffaf0' : '#8fd0ff'; ellipsePath(ctx, x, y - 2, 19 * Math.sqrt(a) + 1, 6 * Math.sqrt(a) + 0.5); ctx.fill(); ctx.fillStyle = 'rgba(255,255,255,0.6)'; ellipsePath(ctx, x - 6, y - 4, 6, 1.5); ctx.fill(); }
    else {
      ctx.fillStyle = bowl.item === 'deluxe' ? '#a5522f' : bowl.item === 'jerky' ? '#8a3a2a' : '#c08a4a';
      for (let i = 0; i < Math.ceil(a * 9); i++) { const ang = i * 2.4; ctx.beginPath(); ctx.arc(x + Math.cos(ang) * 10 * ((i % 3) / 3 + 0.3), y - 3 + Math.sin(ang) * 3.5, 3.2, 0, Math.PI * 2); ctx.fill(); }
    }
  }
}
function drawToy(ctx, toy) {
  const x = toy.x, y = toy.y - toy.z; const c = ITEMS[toy.id].color;
  if (!toy.heldBy) fillEllipse(ctx, toy.x, toy.y + 1, 12, 5, `rgba(0,0,0,${0.18 / (1 + toy.z / 40)})`);
  ctx.save(); ctx.translate(x, y);
  switch (toy.id) {
    case 'ball': ctx.rotate(toy.spin || 0); { const bg = ctx.createRadialGradient(-3, -9, 1, 0, -6, 11); bg.addColorStop(0, '#eef77a'); bg.addColorStop(1, c); fillEllipse(ctx, 0, -6, 10, 10, bg); } ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(-6, -6, 10, -0.9, 0.9); ctx.stroke(); ctx.beginPath(); ctx.arc(6, -6, 10, Math.PI - 0.9, Math.PI + 0.9); ctx.stroke(); break;
    case 'frisbee': fillEllipse(ctx, 0, -4, 18, 7 + (toy.z > 2 ? 4 : 0), c); fillEllipse(ctx, 0, -5, 10, 3.5 + (toy.z > 2 ? 2 : 0), shade(c, -40)); fillEllipse(ctx, -6, -7, 5, 1.5, 'rgba(255,255,255,0.5)'); break;
    case 'rope': ctx.rotate(toy.spin || 0); strokeLine(ctx, -14, -5, 14, -5, 7, c); for (let i = -10; i <= 10; i += 5) strokeLine(ctx, i, -8, i + 2, -2, 1.2, 'rgba(0,0,0,0.15)'); fillEllipse(ctx, -16, -5, 6, 6, '#d6534f'); fillEllipse(ctx, 16, -5, 6, 6, '#4f8fd6'); break;
    case 'bone': ctx.rotate(toy.spin || 0); strokeLine(ctx, -10, -6, 10, -6, 7, c); [[-11, -9], [-11, -3], [11, -9], [11, -3]].forEach(([bx, by]) => fillEllipse(ctx, bx, by, 5, 5, c)); fillEllipse(ctx, -4, -8, 5, 1.5, 'rgba(255,255,255,0.5)'); break;
  }
  ctx.restore();
}

// ---------- top screen HUD ----------
function drawStatBar(ctx, x, y, w, label, val, color) {
  ctx.font = `500 12px ${FONT}`; ctx.fillStyle = '#7a6756'; ctx.textAlign = 'left'; ctx.fillText(label, x, y + 9);
  roundRect(ctx, x + 60, y, w - 60, 10, 5, '#eadfcb');
  roundRect(ctx, x + 60, y, Math.max(2, (w - 60) * clamp(val, 0, 100) / 100), 10, 5, val < 25 ? '#e0523c' : color);
  ctx.fillStyle = 'rgba(255,255,255,0.35)'; roundRect(ctx, x + 62, y + 2, Math.max(0, (w - 64) * clamp(val, 0, 100) / 100), 3, 1.5, 'rgba(255,255,255,0.35)');
}
function hudBackground(ctx, tod) {
  const g = ctx.createLinearGradient(0, 0, 0, HH);
  if (tod === 'night') { g.addColorStop(0, '#2b2f66'); g.addColorStop(1, '#4a4f8a'); } else { g.addColorStop(0, '#fff8ea'); g.addColorStop(1, '#f6e6cc'); }
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, HH);
  ctx.fillStyle = tod === 'night' ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.35)'; for (let i = 0; i < 14; i++) { ctx.beginPath(); ctx.arc((i * 73) % W, (i * 47) % HH, 1.5 + (i % 3), 0, Math.PI * 2); ctx.fill(); }
}
function drawTopHUD(ctx) {
  const tod = timeOfDay(); hudBackground(ctx, tod);
  const ink = tod === 'night' ? '#fff' : '#3b2e25', sub = tod === 'night' ? 'rgba(255,255,255,0.75)' : '#7a6756';
  const now = new Date();
  ctx.fillStyle = ink; ctx.font = `700 21px ${FONT}`; ctx.textAlign = 'left';
  ctx.fillText('Pocket Pups', 18, 30);
  ctx.font = `500 13px ${FONT}`; ctx.fillStyle = sub;
  ctx.fillText(now.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' }) + '  ' + now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), 18, 49);
  // weather pill
  ctx.save(); ctx.translate(176, 26); drawIcon(ctx, tod === 'night' ? 'weather_night' : 'weather_' + G.weather, 24); ctx.restore();
  ctx.textAlign = 'right'; ctx.font = `700 19px ${FONT}`; ctx.fillStyle = '#f28c28'; ctx.fillText(fmtMoney(G.save.money), W - 18, 30);
  ctx.font = `500 13px ${FONT}`; ctx.fillStyle = sub; const nr = nextRank(G.save.trainerPts);
  ctx.fillText(`${trainerRank(G.save.trainerPts)} · ${Math.floor(G.save.trainerPts)} pts${nr ? ' · next at ' + nr.at : ''}`, W - 18, 49);
  // dog cards
  const n = G.dogs.length; const cardW = n > 1 ? (W - 36 - (n - 1) * 10) / n : W - 36;
  G.dogs.forEach((p, i) => {
    const x = 18 + i * (cardW + 10), y = 62, h = 244;
    const active = p.d.id === G.save.activeDog;
    ctx.lineWidth = active ? 3 : 1.5;
    roundRect(ctx, x, y, cardW, h, 14, 'rgba(255,255,255,0.82)', active ? '#f28c28' : 'rgba(0,0,0,0.08)');
    ctx.save(); ctx.beginPath(); ctx.roundRect(x, y, cardW, h, 14); ctx.clip();
    const pg = ctx.createLinearGradient(0, y, 0, y + 130); pg.addColorStop(0, 'rgba(191,227,245,0.5)'); pg.addColorStop(1, 'rgba(191,227,245,0)'); ctx.fillStyle = pg; ctx.fillRect(x, y, cardW, 130);
    const ps = n > 1 ? 0.75 : 1.0;
    drawDog(ctx, p.d, { x: x + cardW * 0.5, y: y + 112 * ps + 10, scale: ps, facing: 1, pose: p.pose === 'walk' ? 'walk' : p.pose, walkPhase: p.walkPhase, t: G.t, eyes: p.eyes, mouth: p.mouth, headPitch: p.headPitch, headTurn: p.headTurn, tailWag: p.tailWag, rollAngle: p.rollAngle, spinAngle: p.spinAngle, jumpY: p.jumpY, acc: p.d.acc, dirt: clamp((60 - p.d.clean) / 60, 0, 1) });
    ctx.restore();
    ctx.fillStyle = '#3b2e25'; ctx.textAlign = 'left'; ctx.font = `700 16px ${FONT}`;
    ctx.fillText(p.d.name, x + 12, y + 20);
    ctx.font = `500 12px ${FONT}`; ctx.fillStyle = '#7a6756';
    ctx.fillText(dogTitle(p.d), x + 12, y + 34);
    const [mood, mc] = moodOf(p.d); ctx.textAlign = 'right'; ctx.font = `600 11px ${FONT}`; const mw = ctx.measureText(mood).width + 14;
    roundRect(ctx, x + cardW - 10 - mw, y + 9, mw, 16, 8, mc); ctx.fillStyle = '#fff'; ctx.fillText(mood, x + cardW - 17, y + 21);
    const bx = x + 12, bw = cardW - 24; let by = y + 142;
    const rows = [['Hunger', p.d.hunger, '#f28c28'], ['Thirst', p.d.thirst, '#4f8fd6'], ['Happiness', p.d.happy, '#f06a8e'], ['Clean', p.d.clean, '#6ac6e0'], ['Energy', p.d.energy, '#5cae5a'], ['Bond', p.d.bond, '#c070e0']];
    for (const [l, v, c] of rows) { drawStatBar(ctx, bx, by, bw, l, v, c); by += 16; }
  });
  if (!n) { ctx.fillStyle = ink; ctx.textAlign = 'center'; ctx.font = `500 16px ${FONT}`; ctx.fillText('No puppies yet. Open Puppies → Kennel to adopt one!', W / 2, 180); }
  drawMessageBox(ctx);
}
function drawWelcomeTop(ctx) {
  hudBackground(ctx, 'day');
  ctx.fillStyle = '#3b2e25'; ctx.font = `700 24px ${FONT}`; ctx.textAlign = 'center'; ctx.fillText('Pocket Pups', W / 2, 46);
  ctx.font = `500 13px ${FONT}`; ctx.fillStyle = '#7a6756';
  if (G.dogs.length) {
    ctx.fillText(`${G.dogs.map(p => p.d.name).join(', ')} ${G.dogs.length > 1 ? 'are' : 'is'} waiting for you`, W / 2, 68);
    const n = G.dogs.length; G.dogs.forEach((p, i) => { const x = W / 2 + (i - (n - 1) / 2) * 150; drawDog(ctx, p.d, { x, y: 250, scale: 1.1, facing: 1, pose: 'sit', t: G.t, eyes: Math.floor(G.t) % 5 === 0 ? 'happy' : 'open', mouth: 'smile', tailWag: 8, acc: p.d.acc }); ctx.fillStyle = '#3b2e25'; ctx.font = `600 14px ${FONT}`; ctx.fillText(p.d.name, x, 282); });
    ctx.font = `500 12px ${FONT}`; ctx.fillStyle = '#7a6756'; ctx.fillText(`${trainerRank(G.save.trainerPts)} · ${fmtMoney(G.save.money)}`, W / 2, 330);
  } else {
    ctx.fillText('Adopt a puppy, teach it tricks with gestures and your voice,', W / 2, 160); ctx.fillText('take it for walks and win contests.', W / 2, 180);
    const bs = ['lab', 'shiba', 'pug', 'beagle']; bs.forEach((b, i) => drawDog(ctx, { breed: b, color: Object.keys(BREEDS[b].colors)[0], acc: {} }, { x: 90 + i * 110, y: 300, scale: 0.95, facing: 1, pose: i % 2 ? 'sit' : 'stand', t: G.t, eyes: 'open', mouth: 'smile', tailWag: 6 }));
  }
}
function drawMessageBox(ctx) {
  roundRect(ctx, 18, 314, W - 36, 56, 12, 'rgba(255,255,255,0.92)', 'rgba(0,0,0,0.08)');
  ctx.fillStyle = '#f28c28'; ctx.fillRect(18, 326, 4, 32);
  const m = G.msgs[0];
  ctx.fillStyle = '#3b2e25'; ctx.font = `500 14px ${FONT}`; ctx.textAlign = 'left';
  const text = m ? m.text : tipText();
  wrapText(ctx, text, 34, 336, W - 66, 18);
}
const TIPS = ['Tip: Stroke your puppy to pet it. Press its head and push down to teach Sit.',
  'Tip: Say a trick command (type or tap the mic) after teaching it. Mastery grows with practice.',
  'Tip: Double-tap the floor to call your puppies over.',
  'Tip: Throw toys by dragging and flinging them. Frisbee practice raises Disc skill.',
  'Tip: Contests pay prize money. Win first place to move up a class.',
  'Tip: Puppies get dirty over time. Buy shampoo at the shop and give them a bath.',
  'Tip: Draw a walk route past the park or gym for a free training stop.',
  'Tip: Trainer points unlock new breeds, the tiara and the space room.',
  'Tip: Grab the rope while your puppy holds it for a game of tug-of-war.',
  'Tip: Tap the camera to save a photo to your album.'];
function tipText() { return TIPS[Math.floor(G.t / 12) % TIPS.length]; }
function wrapText(ctx, text, x, y, maxW, lh) {
  const words = text.split(' '); let line = '';
  for (const w of words) { const test = line + w + ' '; if (ctx.measureText(test).width > maxW && line) { ctx.fillText(line, x, y); line = w + ' '; y += lh; } else line = test; }
  ctx.fillText(line, x, y);
}
function updateMessages(dt) { if (G.msgs.length) { G.msgs[0].ms -= dt * 1000; if (G.msgs[0].ms <= 0) G.msgs.shift(); } }

// ---------- photos ----------
function takePhoto() {
  if (!G.bot) return;
  const c = document.createElement('canvas'); c.width = 256; c.height = 192; const cx = c.getContext('2d');
  cx.drawImage(G.bot, 0, 0, 256, 192);
  let url; try { url = c.toDataURL('image/jpeg', 0.72); } catch (e) { say('Could not take a photo here.'); return; }
  const p = activePup();
  G.save.photos.unshift({ d: url, t: Date.now(), who: p ? p.d.name : '', where: G.sceneName });
  if (G.save.photos.length > 12) G.save.photos.length = 12;
  G.flash = 0.9; Sound.click(); buzz(15); addTP(2); say('Click! Photo saved to your album (Info → Album).', 3000); saveGame();
}
function openAlbum() {
  const ph = G.save.photos;
  const cards = ph.map((x, i) => `<div class="ph-card"><img src="${x.d}" alt="Photo of ${x.who}"><div>${x.who ? x.who + ' · ' : ''}${new Date(x.t).toLocaleDateString()} · <a href="${x.d}" download="pocket-pups-${i + 1}.jpg">save</a> · <a href="#" onclick="deletePhoto(${i});return false">delete</a></div></div>`).join('');
  UI.show(panelHeader('Photo album') + `<div class="note">Tap the camera on the touch screen to take a photo. The album keeps the latest 12.</div><div class="album">${cards || '<div class="note">No photos yet.</div>'}</div>`);
}
function deletePhoto(i) { G.save.photos.splice(i, 1); saveGame(); openAlbum(); }

// ================= UI panels =================
const UI = {
  panel: null, current: null,
  show(html, cls = '') { const el = document.getElementById('panel'); el.className = 'panel ' + cls; el.innerHTML = html; el.style.display = 'block'; el.scrollTop = 0; renderIcons(el); Sound.click(); },
  hide() { document.getElementById('panel').style.display = 'none'; this.current = null; document.querySelectorAll('#menubar button').forEach(b => b.classList.remove('on')); if (G.afterPanel) { const f = G.afterPanel; G.afterPanel = null; f(); } },
  isOpen() { return document.getElementById('panel').style.display === 'block'; },
};
function menuButton(id) {
  Sound.init(); Sound.resume();
  if (UI.isOpen() && UI.current === id) { UI.hide(); return; }
  UI.current = id;
  document.querySelectorAll('#menubar button').forEach(b => b.classList.toggle('on', b.dataset.m === id));
  if (id === 'supplies') openSupplies('food');
  else if (id === 'care') openCare();
  else if (id === 'out') openGoOut();
  else if (id === 'info') openInfo();
  else if (id === 'dogs') openDogs();
  else if (id === 'system') openSystem();
}
function panelHeader(title, money) { return `<div class="ph"><span>${title}</span>${money ? `<span class="money">${fmtMoney(G.save.money)}</span>` : ''}<button class="close" onclick="UI.hide()" aria-label="Close">✕</button></div>`; }
function card(opts) { // {icon, name, sub, cls, onclick, badge, desc}
  return `<div class="card ${opts.cls || ''}" ${opts.onclick ? `onclick="${opts.onclick}"` : ''}>${opts.badge ? `<span class="badge ${opts.badgeCls || ''}">${opts.badge}</span>` : ''}<div class="ico">${iconHTML(opts.icon, opts.size || 36)}</div><div class="nm">${opts.name}</div>${opts.sub !== undefined ? `<div class="ct">${opts.sub}</div>` : ''}${opts.desc ? `<div class="desc">${opts.desc}</div>` : ''}</div>`;
}

function openSupplies(tab) {
  UI.current = 'supplies';
  const tabs = ['food', 'toy', 'acc'].map(t => `<button class="tab ${t === tab ? 'on' : ''}" onclick="openSupplies('${t}')">${{ food: 'Food & drink', toy: 'Toys', acc: 'Accessories' }[t]}</button>`).join('');
  let body = '';
  if (tab === 'food') {
    body += '<div class="grid">';
    for (const [id, it] of Object.entries(ITEMS)) if (it.type === 'food') {
      const c = invCount(id); const have = id === 'water' || c > 0;
      body += card({ icon: id, name: it.name, sub: id === 'water' ? 'Always free' : 'x' + c, cls: have ? '' : 'dim', onclick: `placeFood('${id}')` });
    }
    body += '</div><div class="note">Tap an item to put it in the room. Hungry puppies come to eat on their own.</div>';
  } else if (tab === 'toy') {
    body += '<div class="grid">';
    for (const [id, it] of Object.entries(ITEMS)) if (it.type === 'toy') {
      const c = invCount(id); const out = G.room.toys.filter(t => t.id === id).length;
      if (it.tool) body += card({ icon: id, name: it.name, sub: c ? (G.bubbleMode ? 'In use' : 'Tap to use') : 'Not owned', cls: c ? (G.bubbleMode ? 'on' : '') : 'dim', onclick: `toggleBubbles()` });
      else body += card({ icon: id, name: it.name, sub: `x${c}${out ? ' (' + out + ' out)' : ''}`, cls: c > 0 ? '' : 'dim', onclick: `placeToy('${id}')` });
    }
    body += `</div><div class="note">Tap to toss a toy into the room. Drag and fling it to play fetch. <button class="small" onclick="putAwayToys()">Put all toys away</button></div>`;
  } else {
    const p = activePup();
    if (!p) body = '<div class="note">Adopt a puppy first.</div>';
    else {
      body += `<div class="note">Dressing <b>${p.d.name}</b>. Tap to wear or remove.</div><div class="grid">`;
      for (const id of G.save.ownedAcc) {
        const it = ITEMS[id]; const on = p.d.acc[it.slot] === id;
        body += card({ icon: id, name: it.name, sub: on ? 'Wearing' : it.slot, cls: on ? 'on' : '', onclick: `toggleAcc('${id}')` });
      }
      if (!G.save.ownedAcc.length) body += '<div class="note">No accessories yet. Buy some at the shop (Go out → Shop).</div>';
      body += '</div>';
    }
  }
  UI.show(panelHeader('Supplies') + `<div class="tabs">${tabs}</div>${body}`);
}
function placeFood(id) {
  const it = ITEMS[id]; if (id !== 'water' && invCount(id) <= 0) { say('You are out of that. Buy more at the shop.'); return; }
  const isDrink = it.thirst > 20 && it.hunger < 20;
  const key = isDrink ? 'water' : 'food';
  if (G.room[key] && G.room[key].amount > 0.05) { say(`There is already a ${key} bowl out. Wait until it's empty.`); return; }
  if (id !== 'water') invAdd(id, -1);
  G.room[key] = { item: id, amount: 1, x: key === 'food' ? 405 : 455, y: key === 'food' ? 292 : 330 };
  UI.hide(); Sound.pop(); say(`You put out ${it.name}.`);
  for (const p of G.dogs) if (p.state === 'idle' || p.state === 'wander') { p.setState('idle', 0.2); }
  saveGame();
}
function placeToy(id) {
  if (invCount(id) <= 0) return;
  const out = G.room.toys.filter(t => t.id === id).length; if (out >= invCount(id)) { say('All of those are already in the room.'); return; }
  if (G.room.toys.length >= 4) { say('The room is getting cluttered. Put some toys away first.'); return; }
  const toy = { id, x: 256 + rand(-40, 40), y: 360, z: 1, vx: rand(-80, 80), vy: rand(-320, -220), vz: 260, spin: 0, held: false, heldBy: null, trail: [] };
  G.room.toys.push(toy); UI.hide(); Sound.pop(); G.bubbleMode = false;
  for (const p of G.dogs) if (p.state !== 'held' && p.state !== 'sleep') { p.setState('chase'); p.target = toy; }
}
function putAwayToys() { for (const t of G.room.toys) if (t.heldBy) t.heldBy.carrying = null; G.room.toys = []; G.room.bubbles = []; G.bubbleMode = false; UI.hide(); for (const p of G.dogs) if (p.state === 'chase' || p.state === 'return' || p.state === 'tug' || p.state === 'popbubble') p.setState('idle', 0.5); Home.tug = null; }
function toggleBubbles() { if (!invCount('bubbles')) { say('Buy a bubble blower at the shop first.'); return; } G.bubbleMode = !G.bubbleMode; UI.hide(); say(G.bubbleMode ? 'Hold anywhere on the touch screen to blow bubbles.' : 'Bubble blower put away.'); if (!G.bubbleMode) G.room.bubbles = []; }
function toggleAcc(id) { const p = activePup(); const slot = ITEMS[id].slot; p.d.acc[slot] = p.d.acc[slot] === id ? null : id; Sound.click(); openSupplies('acc'); saveGame(); }

function openCare() {
  const p = activePup(); if (!p) { UI.show(panelHeader('Care') + '<div class="note">Adopt a puppy first.</div>'); return; }
  UI.show(panelHeader('Care') + `<div class="note">Caring for <b>${p.d.name}</b> · Clean ${Math.round(p.d.clean)}%</div><div class="grid">
    ${card({ icon: 'brush', name: 'Brush', sub: invCount('brush') ? (G.brushMode ? 'On: stroke to brush' : 'Stroke to brush') : 'Not owned', cls: invCount('brush') ? (G.brushMode ? 'on' : '') : 'dim', onclick: 'startBrush()' })}
    ${card({ icon: 'bath', name: 'Bath', sub: `Shampoo x${invCount('shampoo')}`, cls: invCount('shampoo') ? '' : 'dim', onclick: 'startBath()' })}
    ${card({ icon: 'switch', name: 'Switch puppy', sub: `${G.dogs.length} at home`, onclick: 'openDogs()' })}
  </div>`);
}
function startBrush() { if (!invCount('brush')) { say('Buy a brush at the shop first.'); return; } G.brushMode = !G.brushMode; UI.hide(); say(G.brushMode ? 'Brush mode on: stroke your puppy to brush its coat.' : 'Brush put away.'); }
function startBath() { if (!invCount('shampoo')) { say('You need shampoo. Buy some at the shop.'); return; } UI.hide(); switchScene('bath'); }

function openGoOut() {
  const p = activePup();
  const walkLeft = Math.max(0, 3 - (G.save.walkDay === todayKey() ? G.save.walksToday : 0));
  const cLeft = Math.max(0, 3 - (G.save.contestDay === todayKey() ? G.save.contestsToday : 0));
  UI.show(panelHeader('Go out', true) + `<div class="note">${p ? `Taking <b>${p.d.name}</b>` : 'Adopt a puppy first'} · ${G.weather === 'rain' ? 'It is raining today.' : G.weather === 'cloud' ? 'Cloudy today.' : 'Sunny today.'}</div><div class="grid">
    ${card({ icon: 'walkmap', name: 'Walk', sub: `${walkLeft} left today`, cls: p && walkLeft ? '' : 'dim', onclick: 'goWalk()' })}
    ${card({ icon: 'trophy', name: 'Contests', sub: `${cLeft} entries left`, cls: p && cLeft ? '' : 'dim', onclick: 'openContests()' })}
    ${card({ icon: 'shop', name: 'Shop', sub: 'BARC store', onclick: "openShop('food')" })}
    ${card({ icon: 'kennel', name: 'Kennel', sub: G.dogs.length >= 3 ? 'House full' : 'Adopt a puppy', onclick: 'openKennel()' })}
  </div>`);
}
function goWalk() {
  const p = activePup(); if (!p) return;
  if (G.save.walkDay !== todayKey()) { G.save.walkDay = todayKey(); G.save.walksToday = 0; }
  if (G.save.walksToday >= 3) { say('You have walked enough for today. Come back tomorrow!'); return; }
  if (p.d.energy < 15) { say(`${p.d.name} is too tired to walk. Let it rest first.`); return; }
  UI.hide(); switchScene('walkmap');
}
function openContests() {
  const p = activePup(); if (!p) return;
  if (G.save.contestDay !== todayKey()) { G.save.contestDay = todayKey(); G.save.contestsToday = 0; }
  const left = 3 - G.save.contestsToday;
  const c = p.d.classes;
  UI.show(panelHeader('Contests', true) + `<div class="note"><b>${p.d.name}</b> can enter ${left} more contest${left === 1 ? '' : 's'} today. Win 1st place to advance a class.</div><div class="grid">
    ${card({ icon: 'disc', name: 'Disc Competition', sub: `${CONTEST_CLASSES[c.disc]} class`, onclick: "enterContest('disc')" })}
    ${card({ icon: 'agility', name: 'Agility Trial', sub: `${CONTEST_CLASSES[c.agility]} class`, onclick: "enterContest('agility')" })}
    ${card({ icon: 'obedience', name: 'Obedience Trial', sub: `${CONTEST_CLASSES[c.obedience]} class`, onclick: "enterContest('obedience')" })}
  </div>`);
}
function enterContest(kind) {
  const p = activePup(); if (!p) return;
  if (G.save.contestsToday >= 3) { say('No more contest entries today.'); return; }
  if (kind === 'obedience' && Object.keys(p.d.tricks).length < 2) { say(`${p.d.name} needs to know at least 2 tricks for the Obedience Trial.`); return; }
  if (p.d.energy < 20) { say(`${p.d.name} is too tired to compete right now.`); return; }
  G.save.contestsToday++; addTP(10); UI.hide(); switchScene(kind);
}

function openInfo() {
  const p = activePup(); if (!p) { UI.show(panelHeader('Info') + '<div class="note">Adopt a puppy first.</div>'); return; }
  const d = p.d; const days = Math.max(1, Math.floor((Date.now() - d.born) / 86400000) + 1);
  let tricks = Object.entries(d.tricks).map(([id, t]) => `<div class="trick"><span>${TRICKS[id].name}</span><span class="cmd">"${t.cmd}"</span><span class="bar"><i style="width:${t.mastery}%"></i></span></div>`).join('');
  if (!tricks) tricks = '<div class="note">No tricks yet. Use gestures on your puppy to discover them.</div>';
  const unknown = Object.keys(TRICKS).filter(k => !d.tricks[k]).map(k => `<li><b>${TRICKS[k].name}</b>: ${TRICKS[k].hint}</li>`).join('');
  const troph = d.trophies.length ? d.trophies.map(t => `<span class="troph">${['1st', '2nd', '3rd'][t.rank - 1]} ${t.kind} (${CONTEST_CLASSES[t.cls]})</span>`).join(' ') : 'None yet';
  const nr = nextRank(G.save.trainerPts);
  UI.show(panelHeader('Info') + `<div class="grid" style="margin-bottom:8px">${card({ icon: 'album', name: 'Photo album', sub: `${G.save.photos.length} photos`, onclick: 'openAlbum()' })}${card({ icon: 'camera', name: 'Take photo', sub: 'of the touch screen', onclick: 'UI.hide();takePhoto()' })}${card({ icon: 'medal', name: trainerRank(G.save.trainerPts), sub: `${Math.floor(G.save.trainerPts)} trainer pts${nr ? ' · ' + nr.name + ' at ' + nr.at : ''}` })}</div><div class="info">
    <div class="row"><b>${d.name}</b> · ${dogTitle(d)} · ${d.personality}</div>
    <div class="row">Day ${days} together · Disc skill ${Math.round(d.discSkill)} · Agility skill ${Math.round(d.agiSkill)}</div>
    <div class="row">Classes: Disc ${CONTEST_CLASSES[d.classes.disc]} · Agility ${CONTEST_CLASSES[d.classes.agility]} · Obedience ${CONTEST_CLASSES[d.classes.obedience]}</div>
    <div class="row">Trophies: ${troph}</div>
    <h4>Tricks learned</h4>${tricks}
    <h4>Tricks to discover</h4><ul class="hints">${unknown || '<li>All tricks learned. Amazing!</li>'}</ul>
  </div>`);
}
function openDogs() {
  UI.current = 'dogs';
  let cards = G.dogs.map(p => `<div class="card ${p.d.id === G.save.activeDog ? 'on' : ''}" onclick="selectDog('${p.d.id}')"><canvas class="pupicon" data-id="${p.d.id}" width="160" height="140" style="width:80px;height:70px;margin:0 auto"></canvas><div class="nm">${p.d.name}</div><div class="ct">${BREEDS[p.d.breed].name}</div></div>`).join('');
  cards += card({ icon: 'kennel', name: 'Kennel', sub: G.dogs.length >= 3 ? 'House full (3)' : 'Adopt a puppy', cls: G.dogs.length >= 3 ? 'dim' : '', onclick: 'openKennel()' });
  UI.show(panelHeader('Your puppies') + `<div class="note">Tap a puppy to make it the one you take out, dress up and care for.</div><div class="grid">${cards}</div>
    ${G.dogs.length ? `<div class="note"><button class="small danger" onclick="confirmRehome()">Send ${activePup().d.name} back to the kennel</button></div>` : ''}`);
  renderPupIcons();
}
function renderPupIcons() {
  document.querySelectorAll('canvas.pupicon').forEach(c => { const p = G.dogs.find(d => d.d.id === c.dataset.id); if (!p) return; const cx = c.getContext('2d'); cx.setTransform(2, 0, 0, 2, 0, 0); cx.clearRect(0, 0, 80, 70); drawDog(cx, p.d, { x: 40, y: 64, scale: 0.55, facing: 1, pose: 'sit', t: 0, eyes: 'open', mouth: 'smile', acc: p.d.acc }); });
}
function selectDog(id) { const p = G.dogs.find(d => d.d.id === id); if (p) { setActive(p); p.bark(1); } openDogs(); }
function confirmRehome() {
  const p = activePup(); if (!p) return;
  UI.show(panelHeader('Are you sure?') + `<div class="note">Send <b>${p.d.name}</b> back to the kennel? You will receive ${fmtMoney(BREEDS[p.d.breed].price / 2)} and ${p.d.name} will be gone for good.</div>
    <div class="note"><button class="small danger" onclick="rehome()">Yes, say goodbye</button> <button class="small" onclick="openDogs()">No, keep ${p.d.name}</button></div>`);
}
function rehome() { const p = activePup(); G.save.dogs = G.save.dogs.filter(d => d.id !== p.d.id); G.dogs = G.dogs.filter(d => d !== p); addMoney(BREEDS[p.d.breed].price / 2); G.save.activeDog = G.dogs[0] ? G.dogs[0].d.id : null; UI.hide(); Sound.sad(); say(`${p.d.name} went back to the kennel. Goodbye...`); saveGame(); }

function openSystem() {
  UI.current = 'system';
  const fs = canFullscreen(); const inst = !!window.installPrompt;
  UI.show(panelHeader('System') + `<div class="grid">
    ${card({ icon: 'save', name: 'Save', sub: 'Auto-saves too', onclick: "saveGame();say('Game saved.');UI.hide()" })}
    ${card({ icon: Sound.enabled ? 'sound' : 'mute', name: 'Sound', sub: Sound.enabled ? 'On' : 'Off', onclick: 'Sound.enabled=!Sound.enabled;G.save.sound=Sound.enabled;openSystem()' })}
    ${card({ icon: 'heart', name: 'Vibration', sub: G.save.haptics === false ? 'Off' : 'On (phones)', onclick: 'G.save.haptics=G.save.haptics===false;openSystem()' })}
    ${fs ? card({ icon: 'fullscreen', name: 'Full screen', sub: document.fullscreenElement ? 'Exit' : 'Enter', onclick: 'toggleFullscreen();UI.hide()' }) : ''}
    ${inst ? card({ icon: 'install', name: 'Install app', sub: 'Add to home screen', onclick: 'promptInstall();UI.hide()' }) : ''}
    ${card({ icon: 'help', name: 'How to play', sub: 'Controls and tips', onclick: 'openHelp()' })}
    ${card({ icon: 'reset', name: 'New game', sub: 'Erase save', onclick: 'confirmReset()' })}
  </div><div class="note">On a phone you can add Pocket Pups to your home screen from the browser menu; it then opens full screen and works offline.</div>`);
}
function confirmReset() { UI.show(panelHeader('Erase everything?') + `<div class="note">This deletes your puppies, money, photos and progress.</div><div class="note"><button class="small danger" onclick="localStorage.removeItem(SAVE_KEY);location.reload()">Erase and restart</button> <button class="small" onclick="openSystem()">Cancel</button></div>`); }
function openHelp() {
  UI.show(panelHeader('How to play') + `<div class="info help">
    <p><b>Petting:</b> touch and stroke your puppy. Hearts mean it's happy. Bond grows with care.</p>
    <p><b>Tricks:</b> use gestures to make your puppy pose: push its head down for Sit, drag down from Sit for Lie Down, drag up for Beg, tap a paw while sitting for Shake, drag sideways while lying for Roll Over, draw a circle around a standing puppy for Spin, flick up for Jump. Then teach a command word. Say it later (type it or tap the mic) and your puppy performs. Practice raises mastery.</p>
    <p><b>Feeding:</b> Supplies → Food. Put out a bowl and the puppy comes to eat. Water is free; buy food at the shop.</p>
    <p><b>Toys:</b> Supplies → Toys. Drag a toy and fling it; your puppy fetches it back. Grab the rope while your puppy holds it for tug-of-war. The bubble blower makes puppies leap.</p>
    <p><b>Go out:</b> draw a walk route on the map. Pass the park for free disc practice, the gym for agility practice, the shop for bargains. Contests earn prize money (3 entries a day).</p>
    <p><b>Care:</b> buy a brush and shampoo. Dirty puppies are unhappy. Bath: rub in shampoo, then rinse.</p>
    <p><b>Trainer points</b> come from bonding, walks, teaching and contests. They unlock breeds, the tiara and the space room.</p>
    <p><b>Double-tap the floor</b> to call your puppies. Say a puppy's name to call just that one. Say "good girl/boy" to praise.</p>
    <p>Stats drop over time, even while you're away (capped at one day). Visit often!</p>
  </div>`);
}

// ================= SHOP =================
function saleItem() { const ids = Object.keys(ITEMS).filter(k => ITEMS[k].price > 0 && ITEMS[k].type !== 'room'); return ids[Math.floor(daySeed() * ids.length)]; }
function itemPrice(id) { const it = ITEMS[id]; return id === saleItem() ? Math.round(it.price * 0.7) : it.price; }
function openShop(tab) {
  UI.current = 'shop';
  const tabs = ['food', 'toy', 'care', 'acc', 'room'].map(t => `<button class="tab ${t === tab ? 'on' : ''}" onclick="openShop('${t}')">${{ food: 'Food', toy: 'Toys', care: 'Care', acc: 'Accessories', room: 'Interiors' }[t]}</button>`).join('');
  let body = '<div class="grid shop">';
  for (const [id, it] of Object.entries(ITEMS)) {
    if (it.type !== tab || id === 'water') continue;
    const price = itemPrice(id); const locked = !isUnlocked(it);
    let owned = '', can = G.save.money >= price;
    if (tab === 'acc') { if (G.save.ownedAcc.includes(id)) { owned = 'Owned'; can = false; } }
    else if (tab === 'room') { if (G.save.rooms.includes(id)) { owned = G.save.room === id ? 'In use' : 'Owned'; } }
    else if ((id === 'brush' || id === 'bubbles') && invCount(id)) { owned = 'Owned'; can = false; }
    else owned = 'x' + invCount(id);
    const sub = locked ? `Unlocks at ${it.unlock} trainer pts` : `${owned ? owned + ' · ' : ''}${price ? (id === saleItem() ? `<s>${fmtMoney(it.price)}</s> <b>${fmtMoney(price)}</b>` : fmtMoney(price)) : 'Free'}`;
    body += card({ icon: locked ? 'lock' : id, name: it.name, sub, desc: it.desc, cls: locked ? 'lock' : (can || (tab === 'room' && G.save.rooms.includes(id)) ? '' : 'dim'), onclick: locked ? '' : `buy('${id}')`, badge: id === saleItem() && !locked ? 'Sale' : '', badgeCls: 'sale' });
  }
  body += '</div>';
  UI.show(panelHeader('BARC shop', true) + `<div class="tabs">${tabs}</div>${body}`);
}
function buy(id) {
  const it = ITEMS[id]; const price = itemPrice(id);
  if (!isUnlocked(it)) return;
  if (it.type === 'room' && G.save.rooms.includes(id)) { G.save.room = id; say(`Room changed to ${it.name}.`); openShop('room'); saveGame(); return; }
  if (it.type === 'acc' && G.save.ownedAcc.includes(id)) return;
  if ((id === 'brush' || id === 'bubbles') && invCount(id)) return;
  if (G.save.money < price) { say('Not enough money. Win contests or find presents on walks.'); Sound.sad(); return; }
  addMoney(-price); Sound.coin(); buzz(10);
  if (it.type === 'acc') G.save.ownedAcc.push(id);
  else if (it.type === 'room') { G.save.rooms.push(id); G.save.room = id; }
  else invAdd(id, 1);
  say(`Bought ${it.name}.`); openShop(it.type); saveGame();
}

// ================= KENNEL / ADOPTION =================
let kennelSel = { breed: 'lab', color: null };
function openKennel() {
  if (G.dogs.length >= 3) { say('Your house is full. You can have up to 3 puppies.'); return; }
  UI.hide(); switchScene('kennel');
}
const Kennel = {
  preview: null, phase: 'browse', enterT: 0,
  enter() {
    this.phase = 'browse'; document.getElementById('cmdbar').style.display = 'none'; document.getElementById('menubar').style.display = 'none';
    if (!isUnlocked(BREEDS[kennelSel.breed])) kennelSel.breed = 'lab';
    if (!BREEDS[kennelSel.breed].colors[kennelSel.color]) kennelSel.color = Object.keys(BREEDS[kennelSel.breed].colors)[0];
    this.makePreview(); this.render();
  },
  exit() { UI.hide(); document.getElementById('kennel').style.display = 'none'; },
  makePreview() { this.preview = new Pup(newDog(kennelSel.breed, kennelSel.color, 'Puppy')); this.preview.x = 256; this.preview.y = 300; this.preview.setState('idle', 1); },
  render() {
    const el = document.getElementById('kennel'); el.style.display = 'block';
    const b = BREEDS[kennelSel.breed]; const locked = !isUnlocked(b);
    const breedBtns = Object.entries(BREEDS).map(([id, br]) => `<button class="bb ${id === kennelSel.breed ? 'on' : ''} ${isUnlocked(br) ? '' : 'lock'}" onclick="kennelPick('${id}')">${isUnlocked(br) ? '' : '🔒 '}${br.name}</button>`).join('');
    const colorBtns = Object.entries(b.colors).map(([c, v]) => `<button class="cb ${c === kennelSel.color ? 'on' : ''}" style="background:${v.base};border-color:${v.sec}" title="${c}" aria-label="${c}" onclick="kennelColor('${c}')"></button>`).join('');
    const can = G.save.money >= b.price && !locked;
    el.innerHTML = `<div class="kh"><span>Kennel</span><span class="money">${fmtMoney(G.save.money)}</span>${G.dogs.length ? '<button class="close" onclick="switchScene(\'home\')" aria-label="Close">✕</button>' : ''}</div>
      <div class="kbreeds">${breedBtns}</div>
      <div class="kinfo"><div><b>${b.name}</b> <span class="price">${fmtMoney(b.price)}</span></div><div class="kdesc">${b.desc}</div>
      ${locked ? `<div class="klock">This breed unlocks at <b>${b.unlock} trainer points</b> (you have ${Math.floor(G.save.trainerPts)}). Earn points by bonding, walking, teaching tricks and entering contests.</div>` : `
      <div class="kcolors">Coat: ${colorBtns} <span class="cname">${kennelSel.color}</span></div>
      <div class="krow"><input id="pupName" maxlength="12" placeholder="Name your puppy" value="${kennelSel.name || (kennelSel.name = pick(DOG_NAMES))}" autocomplete="off" oninput="kennelSel.name=this.value" aria-label="Puppy name"> <button class="mic" aria-label="Speak a name" onclick="listenOnce(t=>{document.getElementById('pupName').value=t.split(' ')[0].slice(0,12);kennelSel.name=document.getElementById('pupName').value})"><svg><use href="#i-mic"/></svg></button>
      <button id="adoptBtn" class="primary" ${can ? '' : 'disabled'} onclick="adopt()">${can ? 'Adopt' : 'Not enough money'}</button></div>`}</div>`;
  },
  update(dt) { const p = this.preview; p.tick(dt); p.stateT -= dt; p.tailWag = 6; if (p.state === 'wander') { if (p.moveToward(p.target.x, p.target.y, dt, 50)) { p.pose = 'stand'; p.setState('idle', rand(1, 3)); } } else if (p.stateT < 0) { const r = Math.random(); if (r < 0.5) { p.setState('wander'); p.target = { x: rand(120, 390), y: rand(260, 340) }; } else if (r < 0.7) { p.pose = 'sit'; p.setState('idle', 3); } else if (r < 0.8) { p.jumpV = 200; p.pose = 'jump'; p.setState('idle', 1.5); } else { p.pose = 'stand'; p.facing *= -1; p.setState('idle', 2); } } updateParticles(dt); },
  draw(ctx) { ctx.fillStyle = '#fffdf8'; ctx.fillRect(0, 0, W, HH); },
  drawTop(ctx) {
    const g = ctx.createLinearGradient(0, 0, 0, HH); g.addColorStop(0, '#8fd3ff'); g.addColorStop(0.55, '#d8f0ff'); g.addColorStop(0.56, '#79b85a'); g.addColorStop(1, '#4f8f3a');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, HH);
    ctx.fillStyle = 'rgba(255,255,255,0.9)'; for (let i = 0; i < 3; i++) { const cx = 60 + i * 180 + Math.sin(G.t * 0.3 + i) * 10, cy = 60 + (i % 2) * 30; ctx.beginPath(); ctx.arc(cx, cy, 16, 0, Math.PI * 2); ctx.arc(cx + 18, cy - 8, 20, 0, Math.PI * 2); ctx.arc(cx + 40, cy, 15, 0, Math.PI * 2); ctx.fill(); }
    ctx.fillStyle = '#f7f0dc'; for (let i = 0; i < 14; i++) { ctx.fillRect(i * 38 + 6, 170, 14, 60); ctx.beginPath(); ctx.moveTo(i * 38 + 6, 170); ctx.lineTo(i * 38 + 13, 160); ctx.lineTo(i * 38 + 20, 170); ctx.fill(); } ctx.fillRect(0, 185, W, 8); ctx.fillRect(0, 210, W, 8);
    ctx.fillStyle = '#c0553c'; ctx.fillRect(400, 150, 90, 70); ctx.fillStyle = '#7a3b2a'; ctx.beginPath(); ctx.moveTo(390, 152); ctx.lineTo(445, 112); ctx.lineTo(500, 152); ctx.fill(); ctx.fillStyle = '#3a1f14'; ctx.beginPath(); ctx.arc(445, 200, 20, Math.PI, 0); ctx.fillRect(425, 200, 40, 20); ctx.fill();
    const p = this.preview; const locked = !isUnlocked(BREEDS[kennelSel.breed]);
    if (locked) ctx.globalAlpha = 0.35; p.draw(ctx); ctx.globalAlpha = 1;
    drawParticles(ctx);
    ctx.fillStyle = '#fff'; ctx.font = `700 22px ${FONT}`; ctx.textAlign = 'center'; ctx.strokeStyle = 'rgba(0,0,0,0.3)'; ctx.lineWidth = 4; ctx.lineJoin = 'round';
    const kt = dogTitle({ breed: kennelSel.breed, color: kennelSel.color });
    ctx.strokeText(kt, W / 2, 40); ctx.fillText(kt, W / 2, 40);
    ctx.font = `500 13px ${FONT}`; const sub = locked ? `Unlocks at ${BREEDS[kennelSel.breed].unlock} trainer points.` : 'Pick a breed and coat colour on the touch screen, then name your puppy.'; ctx.strokeText(sub, W / 2, 62); ctx.fillText(sub, W / 2, 62);
  },
  onDown(x, y) { }, onMove() { }, onUp() { },
};
function kennelPick(id) { kennelSel.breed = id; kennelSel.color = Object.keys(BREEDS[id].colors)[0]; Kennel.makePreview(); Kennel.render(); if (isUnlocked(BREEDS[id])) Sound.bark(BREEDS[id].size); else Sound.click(); }
function kennelColor(c) { kennelSel.color = c; Kennel.makePreview(); Kennel.render(); Sound.click(); }
function adopt() {
  const b = BREEDS[kennelSel.breed]; if (G.save.money < b.price || !isUnlocked(b)) return;
  const name = (document.getElementById('pupName').value || pick(DOG_NAMES)).trim().slice(0, 12) || 'Puppy';
  addMoney(-b.price);
  const d = newDog(kennelSel.breed, kennelSel.color, name); G.save.dogs.push(d); const p = new Pup(d); G.dogs.push(p); setActive(p);
  p.x = 256; p.y = 345; p.pose = 'sit'; p.setState('idle', 3);
  Sound.fanfare(); buzz(25); say(`Welcome home, ${name}! Try petting ${name}, then push its head down to teach it to Sit.`, 8000);
  saveGame(); switchScene('home');
  hearts(256, 280, 6);
}

// ================= engine =================
function switchScene(name, opts) {
  if (G.scene && G.scene.exit) G.scene.exit();
  G.particles = [];
  G.scene = G.scenes[name]; G.sceneName = name;
  UI.hide();
  document.getElementById('teach').style.display = 'none';
  document.getElementById('snap').style.display = (name === 'home' || name === 'walk') ? 'flex' : 'none';
  if (G.scene.enter) G.scene.enter(opts || {});
}
function canvasPos(e, canvas) {
  const r = canvas.getBoundingClientRect(); const t = e.touches ? e.touches[0] || e.changedTouches[0] : e;
  return { x: (t.clientX - r.left) * (W / r.width), y: (t.clientY - r.top) * (HH / r.height) };
}
function loop(ts) {
  const dt = Math.min(0.05, (ts - G.last) / 1000 || 0.016); G.last = ts; G.t += dt;
  if (G.scene) {
    G.scene.update(dt);
    G.bctx.clearRect(0, 0, W, HH); G.scene.draw(G.bctx);
    G.tctx.clearRect(0, 0, W, HH); if (G.scene.drawTop) G.scene.drawTop(G.tctx); else drawTopHUD(G.tctx);
  } else drawWelcomeTop(G.tctx);
  updateMessages(dt);
  G.autosave = (G.autosave || 0) + dt; if (G.autosave > 20) { G.autosave = 0; saveGame(); }
  requestAnimationFrame(loop);
}
function setupCanvas(c) {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  c.width = W * dpr; c.height = HH * dpr; const ctx = c.getContext('2d'); ctx.setTransform(dpr, 0, 0, dpr, 0, 0); return ctx;
}
function init() {
  G.bot = document.getElementById('bot'); G.bctx = setupCanvas(G.bot);
  G.top = document.getElementById('top'); G.tctx = setupCanvas(G.top);
  G.scenes.home = Home; G.scenes.kennel = Kennel;
  if (typeof registerActivities === 'function') registerActivities();
  if (typeof registerWalkMap === 'function') registerWalkMap();
  const existing = loadGame();
  G.save = existing ? migrateSave(existing) : newSave();
  if (existing) applyOffline(G.save);
  G.weather = weatherToday(); Sound.enabled = G.save.sound !== false;
  G.dogs = G.save.dogs.map(d => new Pup(d));
  if (!G.save.activeDog && G.dogs[0]) G.save.activeDog = G.dogs[0].d.id;
  // pointer events
  const down = e => { Sound.init(); Sound.resume(); if (e.cancelable) e.preventDefault(); const p = canvasPos(e, G.bot); G.pointer.down = true; G.pointer.x = p.x; G.pointer.y = p.y; if (G.scene && G.scene.onDown) G.scene.onDown(p.x, p.y, e); };
  const move = e => { const p = canvasPos(e, G.bot); G.pointer.x = p.x; G.pointer.y = p.y; if (G.pointer.down && e.cancelable) e.preventDefault(); if (G.scene && G.scene.onMove) G.scene.onMove(p.x, p.y, e); };
  const up = e => { if (!G.pointer.down) return; G.pointer.down = false; const p = canvasPos(e, G.bot); if (G.scene && G.scene.onUp) G.scene.onUp(p.x, p.y, e); };
  G.bot.addEventListener('mousedown', down); window.addEventListener('mousemove', move); window.addEventListener('mouseup', up);
  G.bot.addEventListener('touchstart', down, { passive: false }); G.bot.addEventListener('touchmove', move, { passive: false }); G.bot.addEventListener('touchend', up); G.bot.addEventListener('touchcancel', up);
  window.addEventListener('keydown', e => { if (e.target.tagName === 'INPUT') return; if (G.scene && G.scene.onKey) G.scene.onKey(e); });
  // command bar
  const cmd = document.getElementById('cmd');
  document.getElementById('send').onclick = () => { handleCommand(cmd.value); cmd.value = ''; };
  cmd.onkeydown = e => { if (e.key === 'Enter') { handleCommand(cmd.value); cmd.value = ''; cmd.blur(); } };
  document.getElementById('speak').onclick = () => listenOnce(t => { cmd.value = t; handleCommand(t); setTimeout(() => cmd.value = '', 800); });
  document.querySelectorAll('#menubar button').forEach(b => b.onclick = () => menuButton(b.dataset.m));
  document.getElementById('snap').onclick = () => takePhoto();
  // title screen
  const title = document.getElementById('title');
  const start = () => { Sound.init(); Sound.resume(); title.style.display = 'none'; Sound.chime(); if (G.dogs.length) switchScene('home'); else switchScene('kennel'); };
  document.getElementById('startBtn').onclick = start;
  document.getElementById('startBtn').textContent = existing && existing.dogs.length ? 'Continue' : 'Start';
  const nb = document.getElementById('newBtn');
  if (existing && existing.dogs.length) { nb.style.display = ''; nb.onclick = () => { if (nb.dataset.armed) { localStorage.removeItem(SAVE_KEY); location.reload(); } else { nb.dataset.armed = '1'; nb.textContent = 'Erase save? Tap again'; nb.classList.add('danger'); } }; }
  window.addEventListener('beforeunload', saveGame);
  document.addEventListener('visibilitychange', () => { if (document.hidden) saveGame(); });
  requestAnimationFrame(loop);
}
window.addEventListener('DOMContentLoaded', init);
