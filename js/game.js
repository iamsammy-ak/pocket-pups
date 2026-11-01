// ================= Core game engine =================
const W = 512, HH = 384;
const SAVE_KEY = 'pocketpups_save_v1';

const G = {
  save: null, scene: null, scenes: {}, dogs: [], t: 0, last: 0,
  bot: null, bctx: null, top: null, tctx: null,
  pointer: { down: false, x: 0, y: 0 },
  particles: [], msgs: [], msgTimer: 0,
  room: { food: null, water: null, toys: [], poop: [] },
  pendingDrop: null,
};

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const rand = (a, b) => a + Math.random() * (b - a);
const pick = arr => arr[Math.floor(Math.random() * arr.length)];
const dist = (a, b, c, d) => Math.hypot(c - a, d - b);
const fmtMoney = n => '$' + Math.round(n).toLocaleString();
const uid = () => Math.random().toString(36).slice(2, 9);

// ---------- messages / particles ----------
function say(text, ms = 4000) { G.msgs.push({ text, ms }); }
function spawnParticle(p) { G.particles.push(Object.assign({ life: 1, vx: 0, vy: -30, size: 14, type: 'heart' }, p)); }
function hearts(x, y, n = 1) { for (let i = 0; i < n; i++) spawnParticle({ x: x + rand(-12, 12), y: y + rand(-8, 8), vx: rand(-15, 15), vy: rand(-50, -25), type: 'heart', size: rand(10, 16) }); }
function sparkle(x, y, n = 6) { for (let i = 0; i < n; i++) spawnParticle({ x, y, vx: rand(-60, 60), vy: rand(-80, -10), type: 'spark', size: rand(3, 6) }); }
function textPop(x, y, text, color = '#333') { spawnParticle({ x, y, vy: -25, type: 'text', text, color, life: 1.3 }); }
function updateParticles(dt) {
  for (const p of G.particles) { p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt * 0.8; if (p.type === 'spark') p.vy += 120 * dt; }
  G.particles = G.particles.filter(p => p.life > 0);
}
function drawParticles(ctx) {
  for (const p of G.particles) {
    ctx.save(); ctx.globalAlpha = clamp(p.life, 0, 1);
    if (p.type === 'heart') drawHeart(ctx, p.x, p.y, p.size, '#ff5c8a');
    else if (p.type === 'spark') { ctx.fillStyle = '#ffe066'; ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill(); }
    else if (p.type === 'text') { ctx.font = 'bold 15px "Trebuchet MS", sans-serif'; ctx.textAlign = 'center'; ctx.fillStyle = p.color; ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.lineWidth = 3; ctx.strokeText(p.text, p.x, p.y); ctx.fillText(p.text, p.x, p.y); }
    else if (p.type === 'drop') { ctx.fillStyle = 'rgba(120,190,255,0.8)'; ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill(); }
    else if (p.type === 'bubble') { ctx.strokeStyle = 'rgba(255,255,255,0.9)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.stroke(); }
    ctx.restore();
  }
}
function drawHeart(ctx, x, y, s, color) {
  ctx.fillStyle = color; ctx.beginPath();
  ctx.moveTo(x, y + s * 0.35);
  ctx.bezierCurveTo(x - s * 0.6, y - s * 0.1, x - s * 0.3, y - s * 0.55, x, y - s * 0.2);
  ctx.bezierCurveTo(x + s * 0.3, y - s * 0.55, x + s * 0.6, y - s * 0.1, x, y + s * 0.35);
  ctx.fill();
}
function roundRect(ctx, x, y, w, h, r, fill, stroke) {
  ctx.beginPath(); ctx.roundRect(x, y, w, h, r);
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  if (stroke) { ctx.strokeStyle = stroke; ctx.stroke(); }
}

// ---------- save ----------
function newSave() {
  return {
    version: 1, money: 2500, inventory: { water: 99, dryfood: 3, ball: 1 }, ownedAcc: [], rooms: ['room_basic'], room: 'room_basic',
    dogs: [], activeDog: null, lastSeen: Date.now(), contestDay: '', contestsToday: 0, walksToday: 0, walkDay: '',
    created: Date.now(), trainerPts: 0, tutorial: 0, totalWalks: 0,
  };
}
function newDog(breed, color, name) {
  return {
    id: uid(), name, breed, color, hunger: 70, thirst: 70, happy: 70, clean: 90, energy: 90, bond: 10,
    tricks: {}, acc: { neck: null, head: null, face: null }, discSkill: 5, agiSkill: 5, born: Date.now(),
    classes: { disc: 0, agility: 0, obedience: 0 }, trophies: [], personality: pick(['playful', 'calm', 'curious', 'brave']),
  };
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
  // common animation bookkeeping
  tick(dt) {
    this.blinkT -= dt; this.barkT -= dt; this.petHeat = Math.max(0, this.petHeat - dt * 0.5);
    if (this.blinkT < 0) { this.eyes = this.eyes === 'open' ? 'closed' : this.eyes; this.blinkT = this.blinkT < -0.12 ? rand(2, 6) : this.blinkT; if (this.blinkT > 0 && this.eyes === 'closed') this.eyes = 'open'; }
    if (this.jumpY > 0 || this.jumpV !== 0) { this.jumpV -= 600 * dt; this.jumpY += this.jumpV * dt; if (this.jumpY <= 0) { this.jumpY = 0; this.jumpV = 0; if (this.pose === 'jump') this.pose = 'stand'; } }
    this.tailWag = this.petHeat > 0.2 || this.state === 'return' || this.state === 'chase' || this.d.happy > 85 ? 10 : (this.d.happy > 50 ? 4 : 0);
    if (this.state !== 'held' && this.state !== 'sleep' && this.eyes !== 'closed') this.eyes = this.petHeat > 0.6 ? 'happy' : (this.d.happy < 25 || this.d.hunger < 15 ? 'sad' : 'open');
    if (this.state !== 'held' && this.mouth !== 'open') this.mouth = (this.d.energy < 30 && this.state !== 'sleep') || this.state === 'chase' || this.state === 'return' ? 'pant' : (this.d.happy > 70 ? 'smile' : 'closed');
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
    else d.energy = clamp(d.energy - perMin * (p.state === 'chase' || p.state === 'return' ? 3 : 0.4), 0, 100);
    if (d.hunger < 10 || d.thirst < 10) d.bond = clamp(d.bond - perMin * 0.3, 0, 100);
  }
}

function addBond(d, n) { d.bond = clamp(d.bond + n, 0, 100); G.save.trainerPts += Math.max(0, n); }
function addMoney(n) { G.save.money = Math.max(0, G.save.money + n); if (n > 0) Sound.coin(); }
function invCount(id) { return G.save.inventory[id] || 0; }
function invAdd(id, n = 1) { G.save.inventory[id] = Math.max(0, (G.save.inventory[id] || 0) + n); }
function dogTitle(d) { const b = BREEDS[d.breed].name; return b.toLowerCase().includes(d.color.toLowerCase()) ? b : `${d.color} ${b}`; }
function activePup() { return G.dogs.find(p => p.d.id === G.save.activeDog) || G.dogs[0]; }
function setActive(p) { if (p) G.save.activeDog = p.d.id; }

// ---------- command parsing (voice / typed) ----------
function normalize(s) { return (s || '').toLowerCase().replace(/[^a-z0-9 ]/g, '').trim(); }
function similar(a, b) {
  a = normalize(a); b = normalize(b); if (!a || !b) return false;
  if (a === b || a.includes(b) || b.includes(a)) return true;
  // levenshtein <= 1 for short words, <=2 for longer
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
  // tricks
  for (const p of G.dogs) {
    for (const [id, tr] of Object.entries(p.d.tricks)) {
      if (similar(text, tr.cmd)) { performTrick(p, id, true); handled = true; break; }
    }
  }
  if (!handled) {
    const p = activePup(); if (!p) return;
    p.headTurn = 0.35; textPop(p.x, p.zones().top - 20, '?', '#555');
    setTimeout(() => p.headTurn = 0, 900);
    say(`${p.name || p.d.name} tilts its head. It doesn't know that word yet.`);
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
// Put the puppy in a trick pose for a duration
function startPose(p, id, dur) {
  p.setState('trick', dur); p.trick = id; p.trickT = 0;
  p.pose = { sit: 'sit', lie: 'lie', beg: 'beg', shake: 'shake', roll: 'roll', spin: 'spin', jump: 'jump' }[id] || 'stand';
  if (id === 'jump') { p.jumpV = 260; }
  if (id === 'roll') p.rollAngle = 0;
  if (id === 'spin') p.spinAngle = 0;
}

// ================= HOME SCENE =================
const Home = {
  pet: null, dragToy: null, lastTap: 0, hintT: 0,
  enter() {
    document.getElementById('cmdbar').style.display = 'flex';
    document.getElementById('menubar').style.display = 'flex';
    for (const p of G.dogs) { if (p.state === 'held' || p.state === 'trick') { p.setState('idle', 1); p.pose = 'stand'; } p.hidden = false; }
  },
  exit() { document.getElementById('cmdbar').style.display = 'none'; document.getElementById('menubar').style.display = 'none'; this.pet = null; this.dragToy = null; },

  update(dt) {
    drainStats(dt);
    const room = G.room;
    // bowls
    for (const key of ['food', 'water']) {
      const bowl = room[key]; if (bowl && bowl.amount <= 0) room[key] = null;
    }
    // toys physics
    for (const toy of room.toys) {
      if (toy.held) continue;
      if (toy.z > 0 || toy.vz !== 0 || Math.abs(toy.vx) > 1 || Math.abs(toy.vy) > 1) {
        toy.x += toy.vx * dt; toy.y += toy.vy * dt; toy.z += toy.vz * dt; toy.vz -= 500 * dt;
        toy.spin += toy.vx * dt * 0.05;
        if (toy.z <= 0) { toy.z = 0; if (Math.abs(toy.vz) > 60) { toy.vz = -toy.vz * (toy.id === 'ball' ? 0.55 : 0.2); Sound.bounce(); } else toy.vz = 0; toy.vx *= 0.6; toy.vy *= 0.6; }
        if (toy.z === 0 && toy.vz === 0) { toy.vx *= (1 - 3 * dt); toy.vy *= (1 - 3 * dt); if (Math.abs(toy.vx) < 1 && Math.abs(toy.vy) < 1) { toy.vx = toy.vy = 0; } }
        // walls
        if (toy.x < 40) { toy.x = 40; toy.vx = Math.abs(toy.vx) * 0.5; } if (toy.x > W - 40) { toy.x = W - 40; toy.vx = -Math.abs(toy.vx) * 0.5; }
        if (toy.y < 205) { toy.y = 205; toy.vy = Math.abs(toy.vy) * 0.5; } if (toy.y > 365) { toy.y = 365; toy.vy = -Math.abs(toy.vy) * 0.5; }
        toy.moving = true;
      } else toy.moving = false;
    }
    for (const p of G.dogs) this.updatePup(p, dt);
    updateParticles(dt);
    this.hintT += dt;
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
          // pick up
          toy.heldBy = p; p.carrying = toy; p.setState('return'); p.target = { x: 256 + rand(-30, 30), y: 350 };
          p.d.happy = clamp(p.d.happy + 3, 0, 100); if (toy.id === 'frisbee') d.discSkill = clamp(d.discSkill + 1.5, 0, 100);
          Sound.pop();
        } else if (reached && toy.moving) { p.pose = 'stand'; }
        if (toy.id === 'frisbee' && toy.z > 20 && dist(p.x, p.y, toy.x, toy.y) < 30 * p.scale && toy.vz < 0 && Math.random() < 0.6) {
          // jump catch
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
      case 'tug': { p.tugT = (p.tugT || 0) + dt; p.pose = 'stand'; p.x += Math.sin(p.tugT * 12) * 0.6; if (p.stateT <= 0) { p.setState('idle', 1); const toy = p.carrying; if (toy) { toy.heldBy = null; p.carrying = null; toy.x = p.x + p.facing * 20; toy.y = p.y + 4; } } break; }
      default: { // idle
        if (p.pose === 'walk') p.pose = 'stand';
        if (p.stateT > 0) break;
        // decide
        const foodBowl = G.room.food, waterBowl = G.room.water;
        const movingToy = G.room.toys.find(t => t.moving && !t.heldBy && !t.held);
        if (movingToy && d.energy > 10) { p.setState('chase'); p.target = movingToy; break; }
        if (foodBowl && foodBowl.amount > 0 && d.hunger < 85 && !G.dogs.some(o => o !== p && (o.state === 'eat' || o.state === 'tofood'))) { p.setState('tofood'); break; }
        if (waterBowl && waterBowl.amount > 0 && d.thirst < 85 && !G.dogs.some(o => o !== p && (o.state === 'drink' || o.state === 'towater'))) { p.setState('towater'); break; }
        const hr = new Date().getHours();
        if (d.energy < 15 || ((hr >= 23 || hr < 6) && d.energy < 70 && Math.random() < 0.15)) { p.setState('sleep', 20); p.pose = 'sleep'; break; }
        const r = Math.random();
        const sleepyToy = G.room.toys.find(t => !t.heldBy && !t.held && t.z === 0);
        if (r < 0.45) { p.setState('wander'); p.target = { x: rand(80, W - 80), y: rand(225, 350) }; }
        else if (r < 0.6) { p.pose = 'sit'; p.setState('idle', rand(3, 6)); }
        else if (r < 0.7) { p.pose = 'lie'; p.setState('idle', rand(4, 8)); }
        else if (r < 0.78 && sleepyToy && d.happy > 40) { p.setState('chase'); p.target = sleepyToy; }
        else if (r < 0.85 && (d.hunger < 30 || d.thirst < 30 || d.happy < 30)) { p.bark(2); p.setState('idle', rand(2, 4)); say(`${d.name} is ${d.hunger < 30 ? 'hungry' : d.thirst < 30 ? 'thirsty' : 'bored'}!`); }
        else if (r < 0.9) { p.facing *= -1; p.setState('idle', rand(1, 3)); }
        else { p.pose = 'stand'; p.setState('idle', rand(1, 3)); }
      }
    }
    // carrying toy follows mouth
    if (p.carrying) { const z = p.zones(); p.carrying.x = z.head.x + p.facing * z.head.r * 0.9; p.carrying.y = p.y + 1; p.carrying.z = (p.y - z.head.y) + 4; }
    p.x = clamp(p.x, 50, W - 50); p.y = clamp(p.y, 215, 360);
  },

  // ----- drawing -----
  draw(ctx) {
    drawRoom(ctx);
    // draw order: by y
    const items = [];
    for (const key of ['food', 'water']) if (G.room[key]) items.push({ y: G.room[key].y - 2, draw: () => drawBowl(ctx, G.room[key]) });
    for (const toy of G.room.toys) items.push({ y: toy.y + (toy.heldBy ? 2 : 0), draw: () => drawToy(ctx, toy) });
    for (const p of G.dogs) if (!p.hidden) items.push({ y: p.y, draw: () => p.draw(ctx) });
    items.sort((a, b) => a.y - b.y);
    for (const it of items) it.draw();
    // attention mark
    for (const p of G.dogs) if (p.wantsAttention > 0) { p.wantsAttention -= 0.016; }
    drawParticles(ctx);
    // drag toy preview
    if (this.dragToy) drawToy(ctx, this.dragToy);
    if (this.pet && this.pet.gestureHint) { ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.font = '13px sans-serif'; ctx.textAlign = 'center'; ctx.fillText(this.pet.gestureHint, W / 2, 196); }
    if (!G.dogs.length) { ctx.fillStyle = '#5a4a3a'; ctx.font = 'bold 18px "Trebuchet MS", sans-serif'; ctx.textAlign = 'center'; ctx.fillText('Your room is empty. Visit the Kennel to adopt a puppy!', W / 2, 120); }
  },

  // ----- pointer -----
  onDown(x, y) {
    const now = performance.now();
    // toys on floor
    for (const toy of [...G.room.toys].reverse()) {
      if (toy.heldBy && toy.heldBy.state !== 'idle') continue;
      if (dist(x, y, toy.x, toy.y - toy.z) < 22) {
        if (toy.heldBy) { toy.heldBy.carrying = null; toy.heldBy = null; }
        toy.held = true; this.dragToy = toy; toy.vx = toy.vy = toy.vz = 0; toy.z = 0; toy.trail = [{ x, y, t: now }]; Sound.click(); return;
      }
    }
    // dogs, nearest first
    const pups = [...G.dogs].sort((a, b) => b.y - a.y);
    for (const p of pups) {
      const part = p.hit(x, y);
      if (part) {
        setActive(p);
        if (p.state === 'sleep') { p.eyes = 'open'; p.pose = 'lie'; }
        const wasPose = p.pose === 'walk' ? 'stand' : p.pose;
        if (p.state === 'trick' || p.state === 'come' || p.state === 'wander' || p.state === 'chase' || p.state === 'return') { p.rollAngle = 0; p.spinAngle = 0; }
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
    // tap on floor: double tap calls dogs
    if (now - this.lastTap < 350) { for (const p of G.dogs) if (p.state !== 'held') pupCome(p); Sound.whistle(); }
    this.lastTap = now;
  },
  onMove(x, y) {
    if (this.dragToy) { const toy = this.dragToy; toy.x = x; toy.y = Math.max(200, y); toy.trail.push({ x, y, t: performance.now() }); if (toy.trail.length > 8) toy.trail.shift(); return; }
    const pet = this.pet; if (!pet) return;
    const p = pet.p;
    const dx = x - pet.lx, dy = y - pet.ly; pet.moved += Math.hypot(dx, dy); pet.lx = x; pet.ly = y; pet.path.push({ x, y });
    const tdx = x - pet.sx, tdy = y - pet.sy; const elapsed = performance.now() - pet.t0;
    // petting hearts
    if (pet.moved > 30 && !pet.gesture) {
      pet.moved = 0; pet.strokes++;
      p.petHeat = 1.2; p.eyes = 'happy';
      p.d.happy = clamp(p.d.happy + 0.6, 0, 100); addBond(p.d, 0.15);
      hearts(x, y - 10, 1); if (pet.strokes % 3 === 0) Sound.heart();
      if (invCount('brush') > 0 && G.brushMode) { p.d.clean = clamp(p.d.clean + 0.8, 0, 100); sparkle(x, y, 1); }
    }
    if (pet.gesture) return;
    // gestures
    if (pet.part === 'head') {
      if (p.pose === 'stand' && tdy > 30 && Math.abs(tdx) < 50) this.triggerGesture('sit');
      else if (p.pose === 'stand' && tdy < -45 && elapsed < 400) this.triggerGesture('jump');
      else if (p.pose === 'sit' && tdy > 34 && Math.abs(tdx) < 50) this.triggerGesture('lie');
      else if (p.pose === 'sit' && tdy < -34 && Math.abs(tdx) < 50) this.triggerGesture('beg');
    }
    if (p.pose === 'lie' && Math.abs(tdx) > 55 && Math.abs(tdy) < 50) this.triggerGesture('roll', tdx > 0 ? 1 : -1);
    if (p.pose === 'stand') {
      // circle detection around dog centre
      const cx = p.x, cy = p.y - 30 * p.scale;
      const ang = Math.atan2(y - cy, x - cx);
      if (pet.lastAng !== null) { let da = ang - pet.lastAng; if (da > Math.PI) da -= Math.PI * 2; if (da < -Math.PI) da += Math.PI * 2; pet.angle += da; }
      pet.lastAng = ang;
      if (Math.abs(pet.angle) > Math.PI * 1.7 && dist(x, y, cx, cy) > 25) this.triggerGesture('spin');
    }
  },
  onUp(x, y) {
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
    if (pet.gesture) {
      // already transitioned to trick state in triggerGesture
    } else {
      // keep pose briefly then AI
      if (pet.strokes > 0) { p.eyes = 'happy'; }
      p.setState('idle', pet.strokes > 2 ? rand(2, 3) : rand(0.5, 1.5));
      if (pet.strokes === 0 && performance.now() - pet.t0 < 250) { p.bark(1); p.headTurn = 0.2; setTimeout(() => p.headTurn = 0, 500); }
    }
  },
  triggerGesture(trick, dir) {
    const pet = this.pet; if (!pet || pet.gesture) return;
    pet.gesture = trick; const p = pet.p;
    pet.gestureHint = null;
    startPose(p, trick, trick === 'roll' || trick === 'spin' ? 2.2 : 4);
    if (trick === 'roll' && dir < 0) p.facing *= 1; // visual same
    Sound.squeak();
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
  el.innerHTML = `<div class="teach-title">${p.d.name} is doing <b>${TRICKS[trick].name}</b>!</div>
    <div class="teach-sub">Say or type the command word you want ${p.d.name} to learn.</div>
    <div class="teach-row"><input id="teachInput" maxlength="16" placeholder="e.g. ${TRICKS[trick].name.toLowerCase()}" autocomplete="off">
    <button id="teachMic" class="mic" title="Speak">🎤</button><button id="teachOk">Teach</button><button id="teachSkip" class="ghost">Later</button></div>`;
  const input = el.querySelector('#teachInput'); setTimeout(() => input.focus(), 50);
  const finish = () => {
    const word = normalize(input.value).slice(0, 16);
    if (!word) return;
    const clash = Object.entries(p.d.tricks).find(([id, t]) => id !== trick && similar(t.cmd, word));
    if (clash) { input.value = ''; input.placeholder = `"${word}" is already ${TRICKS[clash[0]].name}`; return; }
    if (G.dogs.some(o => similar(o.d.name, word))) { input.value = ''; input.placeholder = `That's a puppy's name!`; return; }
    p.d.tricks[trick] = { cmd: word, mastery: 12 };
    addBond(p.d, 3); p.d.happy = clamp(p.d.happy + 6, 0, 100);
    Sound.fanfare(); sparkle(p.x, p.zones().top - 10, 12);
    say(`${p.d.name} learned ${TRICKS[trick].name}! Say "${word}" to try it. Repeat it to raise mastery.`, 6000);
    el.style.display = 'none'; saveGame();
    p.setState('trick', 2.5);
  };
  el.querySelector('#teachOk').onclick = finish;
  input.onkeydown = e => { if (e.key === 'Enter') finish(); if (e.key === 'Escape') el.style.display = 'none'; };
  el.querySelector('#teachSkip').onclick = () => { el.style.display = 'none'; };
  el.querySelector('#teachMic').onclick = () => listenOnce(txt => { input.value = normalize(txt).split(' ')[0]; });
  // keep dog in pose while prompt is open
  p.setState('trick', 20);
  const watch = setInterval(() => { if (el.style.display === 'none') { clearInterval(watch); if (p.state === 'trick' && p.stateT > 3) p.stateT = 1.5; } }, 300);
}

// ---------- speech recognition ----------
function listenOnce(cb) {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  const btns = document.querySelectorAll('.mic');
  if (!SR) { say('Voice input needs Chrome or Edge. You can type commands instead.'); return; }
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
function drawRoom(ctx) {
  const theme = G.save.room || 'room_basic';
  const tod = timeOfDay();
  const horizon = 200;
  let wall1, wall2, floor1, floor2, base;
  if (theme === 'room_seaside') { wall1 = '#bfe6f5'; wall2 = '#8cc9e6'; floor1 = '#f1dfb5'; floor2 = '#e3c99a'; base = '#f7f0e0'; }
  else if (theme === 'room_cabin') { wall1 = '#c89a6a'; wall2 = '#a87848'; floor1 = '#9a6a42'; floor2 = '#7f5533'; base = '#5a3a22'; }
  else if (theme === 'room_space') { wall1 = '#1b1f4a'; wall2 = '#0b0d2a'; floor1 = '#5a6080'; floor2 = '#404663'; base = '#2a2f55'; }
  else { wall1 = '#f6e6c8'; wall2 = '#e9cfa5'; floor1 = '#d9a86b'; floor2 = '#c28f55'; base = '#f2e3c6'; }
  // night tint
  const g = ctx.createLinearGradient(0, 0, 0, horizon); g.addColorStop(0, wall1); g.addColorStop(1, wall2);
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, horizon);
  const fg = ctx.createLinearGradient(0, horizon, 0, HH); fg.addColorStop(0, floor1); fg.addColorStop(1, floor2);
  ctx.fillStyle = fg; ctx.fillRect(0, horizon, W, HH - horizon);
  // floor planks / pattern
  ctx.strokeStyle = 'rgba(0,0,0,0.08)'; ctx.lineWidth = 1;
  for (let i = 0; i < 10; i++) { const y = horizon + 10 + i * i * 2.2; ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
  for (let i = -6; i <= 6; i++) { ctx.beginPath(); ctx.moveTo(W / 2 + i * 40, horizon); ctx.lineTo(W / 2 + i * 110, HH); ctx.stroke(); }
  // baseboard
  ctx.fillStyle = base; ctx.fillRect(0, horizon - 10, W, 10);
  // window
  const wx = 300, wy = 40, ww = 150, wh = 110;
  ctx.fillStyle = theme === 'room_cabin' ? '#4a2e1a' : '#fff'; ctx.fillRect(wx - 8, wy - 8, ww + 16, wh + 16);
  let sky;
  if (theme === 'room_space') { sky = ctx.createLinearGradient(0, wy, 0, wy + wh); sky.addColorStop(0, '#05061a'); sky.addColorStop(1, '#1a1f55'); }
  else if (tod === 'night') { sky = ctx.createLinearGradient(0, wy, 0, wy + wh); sky.addColorStop(0, '#0d1240'); sky.addColorStop(1, '#2a3570'); }
  else if (tod === 'dusk') { sky = ctx.createLinearGradient(0, wy, 0, wy + wh); sky.addColorStop(0, '#5a63b8'); sky.addColorStop(1, '#f7a46a'); }
  else { sky = ctx.createLinearGradient(0, wy, 0, wy + wh); sky.addColorStop(0, '#6cb8f0'); sky.addColorStop(1, '#cdeaff'); }
  ctx.fillStyle = sky; ctx.fillRect(wx, wy, ww, wh);
  if (tod === 'night' || theme === 'room_space') { ctx.fillStyle = '#fff'; for (let i = 0; i < 18; i++) { ctx.fillRect(wx + (i * 37) % ww, wy + (i * 53) % wh, 2, 2); } ctx.fillStyle = '#fff6c0'; ctx.beginPath(); ctx.arc(wx + 110, wy + 30, 14, 0, Math.PI * 2); ctx.fill(); }
  else { ctx.fillStyle = tod === 'dusk' ? '#ffb347' : '#fff3a0'; ctx.beginPath(); ctx.arc(wx + 110, wy + 32, 16, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = 'rgba(255,255,255,0.85)'; [[20, 60], [60, 45], [95, 75]].forEach(([cx, cy]) => { ctx.beginPath(); ctx.arc(wx + cx, wy + cy, 12, 0, Math.PI * 2); ctx.arc(wx + cx + 14, wy + cy - 6, 14, 0, Math.PI * 2); ctx.arc(wx + cx + 30, wy + cy, 11, 0, Math.PI * 2); ctx.fill(); }); }
  if (theme === 'room_seaside') { ctx.fillStyle = '#3f9fd6'; ctx.fillRect(wx, wy + wh * 0.62, ww, wh * 0.38); ctx.fillStyle = '#f0dba8'; ctx.fillRect(wx, wy + wh * 0.85, ww, wh * 0.15); }
  else if (theme !== 'room_space') { ctx.fillStyle = '#6aa84f'; ctx.fillRect(wx, wy + wh * 0.72, ww, wh * 0.28); ctx.fillStyle = '#3d7a2a'; [[15, 30], [60, 36], [120, 28]].forEach(([tx, r]) => { ctx.beginPath(); ctx.arc(wx + tx, wy + wh * 0.72, r * 0.6, Math.PI, 0); ctx.fill(); }); }
  ctx.strokeStyle = theme === 'room_cabin' ? '#4a2e1a' : '#fff'; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(wx + ww / 2, wy); ctx.lineTo(wx + ww / 2, wy + wh); ctx.moveTo(wx, wy + wh / 2); ctx.lineTo(wx + ww, wy + wh / 2); ctx.stroke();
  // curtains
  ctx.fillStyle = theme === 'room_seaside' ? '#ffffffcc' : theme === 'room_space' ? '#3a3f80' : '#e8788a';
  ctx.fillRect(wx - 26, wy - 14, 22, wh + 30); ctx.fillRect(wx + ww + 4, wy - 14, 22, wh + 30);
  // picture frame
  roundRect(ctx, 60, 50, 90, 70, 4, '#8a5a3a');
  roundRect(ctx, 66, 56, 78, 58, 2, theme === 'room_space' ? '#223' : '#cfe8f7');
  const fp = activePup();
  if (fp) drawDog(ctx, fp.d, { x: 105, y: 108, scale: 0.42, facing: 1, pose: 'sit', t: 0, eyes: 'happy', mouth: 'smile' });
  // shelf with trophies
  ctx.fillStyle = '#9a6a42'; ctx.fillRect(180, 120, 100, 6);
  let tx = 186; const trophies = G.dogs.flatMap(p => p.d.trophies);
  for (const tr of trophies.slice(0, 5)) { drawTrophy(ctx, tx + 8, 118, tr); tx += 20; }
  // dog bed
  ctx.fillStyle = theme === 'room_space' ? '#4a4f8a' : '#b25e5e'; ellipsePath(ctx, 95, 238, 48, 18); ctx.fill();
  ctx.fillStyle = theme === 'room_space' ? '#8a8fcf' : '#e8b4b4'; ellipsePath(ctx, 95, 240, 36, 11); ctx.fill();
  // rug
  ctx.fillStyle = theme === 'room_seaside' ? 'rgba(80,160,200,0.35)' : theme === 'room_space' ? 'rgba(120,140,255,0.2)' : 'rgba(180,60,60,0.25)';
  ellipsePath(ctx, 256, 300, 150, 48); ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 3; ellipsePath(ctx, 256, 300, 135, 40); ctx.stroke();
  // night dim
  if (tod === 'night') { ctx.fillStyle = 'rgba(20,20,60,0.28)'; ctx.fillRect(0, 0, W, HH); }
  else if (tod === 'dusk') { ctx.fillStyle = 'rgba(255,150,80,0.1)'; ctx.fillRect(0, 0, W, HH); }
}
function drawTrophy(ctx, x, y, tr) {
  const col = tr.rank === 1 ? '#ffd84a' : tr.rank === 2 ? '#d8d8e0' : '#d08a4a';
  ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(x - 6, y - 14); ctx.lineTo(x + 6, y - 14); ctx.lineTo(x + 4, y - 4); ctx.lineTo(x - 4, y - 4); ctx.closePath(); ctx.fill();
  ctx.fillRect(x - 5, y - 2, 10, 2); ctx.fillRect(x - 1, y - 5, 2, 3);
}
function drawBowl(ctx, bowl) {
  const { x, y } = bowl; const isWater = bowl.item === 'water' || bowl.item === 'milk';
  fillEllipse(ctx, x, y + 2, 26, 9, 'rgba(0,0,0,0.15)');
  ctx.fillStyle = isWater ? '#4f8fd6' : '#d6534f'; ellipsePath(ctx, x, y - 2, 26, 11); ctx.fill();
  ctx.fillStyle = isWater ? '#3a6fae' : '#a83b38'; ctx.fillRect(x - 26, y - 2, 52, 8); ellipsePath(ctx, x, y + 6, 26, 9); ctx.fill();
  ctx.fillStyle = isWater ? '#4f8fd6' : '#d6534f'; ellipsePath(ctx, x, y - 2, 26, 11); ctx.fill();
  ctx.fillStyle = '#2a2a2a'; ellipsePath(ctx, x, y - 2, 20, 7); ctx.fill();
  if (bowl.amount > 0) {
    const a = bowl.amount;
    if (isWater) { ctx.fillStyle = bowl.item === 'milk' ? '#fffaf0' : '#8fd0ff'; ellipsePath(ctx, x, y - 2, 19 * Math.sqrt(a) + 1, 6 * Math.sqrt(a) + 0.5); ctx.fill(); }
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
    case 'ball': ctx.rotate(toy.spin || 0); fillEllipse(ctx, 0, -6, 10, 10, c); ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(-6, -6, 10, -0.9, 0.9); ctx.stroke(); ctx.beginPath(); ctx.arc(6, -6, 10, Math.PI - 0.9, Math.PI + 0.9); ctx.stroke(); break;
    case 'frisbee': fillEllipse(ctx, 0, -4, 18, 7 + (toy.z > 2 ? 4 : 0), c); fillEllipse(ctx, 0, -5, 10, 3.5 + (toy.z > 2 ? 2 : 0), shade(c, -40)); break;
    case 'rope': ctx.rotate(toy.spin || 0); strokeLine(ctx, -14, -5, 14, -5, 7, c); fillEllipse(ctx, -16, -5, 6, 6, '#d6534f'); fillEllipse(ctx, 16, -5, 6, 6, '#4f8fd6'); break;
    case 'bone': ctx.rotate(toy.spin || 0); strokeLine(ctx, -10, -6, 10, -6, 7, c); [[-11, -9], [-11, -3], [11, -9], [11, -3]].forEach(([bx, by]) => fillEllipse(ctx, bx, by, 5, 5, c)); break;
  }
  ctx.restore();
}

// ---------- top screen HUD ----------
function drawStatBar(ctx, x, y, w, label, val, color) {
  ctx.font = '11px "Trebuchet MS", sans-serif'; ctx.fillStyle = '#5a4634'; ctx.textAlign = 'left'; ctx.fillText(label, x, y + 9);
  roundRect(ctx, x + 60, y, w - 60, 10, 5, '#e8dcc6');
  roundRect(ctx, x + 60, y, Math.max(2, (w - 60) * clamp(val, 0, 100) / 100), 10, 5, val < 25 ? '#e0523c' : color);
}
function drawTopHUD(ctx) {
  const tod = timeOfDay();
  const g = ctx.createLinearGradient(0, 0, 0, HH); g.addColorStop(0, tod === 'night' ? '#2b2f66' : '#fff6e3'); g.addColorStop(1, tod === 'night' ? '#4a4f8a' : '#ffe8c2');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, HH);
  const ink = tod === 'night' ? '#fff' : '#5a4634';
  // header
  const now = new Date();
  ctx.fillStyle = ink; ctx.font = 'bold 20px "Trebuchet MS", sans-serif'; ctx.textAlign = 'left';
  ctx.fillText('Pocket Pups', 18, 30);
  ctx.font = '13px "Trebuchet MS", sans-serif';
  ctx.fillText(now.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' }) + '  ' + now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), 18, 50);
  ctx.textAlign = 'right'; ctx.font = 'bold 18px "Trebuchet MS", sans-serif'; ctx.fillStyle = '#2a7a3a'; ctx.fillText(fmtMoney(G.save.money), W - 18, 30);
  ctx.font = '12px "Trebuchet MS", sans-serif'; ctx.fillStyle = ink; ctx.fillText(`Trainer points: ${Math.floor(G.save.trainerPts)}`, W - 18, 50);
  // dogs cards
  const n = G.dogs.length; const cardW = n > 1 ? (W - 36 - (n - 1) * 10) / n : W - 36;
  G.dogs.forEach((p, i) => {
    const x = 18 + i * (cardW + 10), y = 64, h = 240;
    const active = p.d.id === G.save.activeDog;
    roundRect(ctx, x, y, cardW, h, 12, 'rgba(255,255,255,0.75)', active ? '#f0a040' : 'rgba(0,0,0,0.08)');
    ctx.lineWidth = active ? 3 : 1;
    // portrait
    ctx.save(); ctx.beginPath(); ctx.roundRect(x, y, cardW, h, 12); ctx.clip();
    const ps = n > 1 ? 0.75 : 1.0;
    drawDog(ctx, p.d, { x: x + cardW * 0.5, y: y + 112 * ps + 10, scale: ps, facing: 1, pose: p.pose === 'walk' ? 'walk' : p.pose, walkPhase: p.walkPhase, t: G.t, eyes: p.eyes, mouth: p.mouth, headPitch: p.headPitch, headTurn: p.headTurn, tailWag: p.tailWag, rollAngle: p.rollAngle, spinAngle: p.spinAngle, jumpY: p.jumpY, acc: p.d.acc, dirt: clamp((60 - p.d.clean) / 60, 0, 1) });
    ctx.restore();
    ctx.fillStyle = '#5a4634'; ctx.textAlign = 'left'; ctx.font = 'bold 15px "Trebuchet MS", sans-serif';
    ctx.fillText(p.d.name, x + 12, y + 20);
    ctx.font = '11px "Trebuchet MS", sans-serif'; ctx.fillStyle = '#8a7a6a';
    ctx.fillText(dogTitle(p.d), x + 12, y + 34);
    const bx = x + 12, bw = cardW - 24; let by = y + 140;
    const rows = [['Hunger', p.d.hunger, '#f0a040'], ['Thirst', p.d.thirst, '#4f8fd6'], ['Happiness', p.d.happy, '#ff6b9a'], ['Clean', p.d.clean, '#6ac6e0'], ['Energy', p.d.energy, '#8ad05a'], ['Bond', p.d.bond, '#c070e0']];
    for (const [l, v, c] of rows) { drawStatBar(ctx, bx, by, bw, l, v, c); by += 15; }
  });
  if (!n) { ctx.fillStyle = ink; ctx.textAlign = 'center'; ctx.font = '16px "Trebuchet MS", sans-serif'; ctx.fillText('No puppies yet. Open Dogs → Kennel to adopt one!', W / 2, 180); }
  drawMessageBox(ctx);
}
function drawMessageBox(ctx) {
  roundRect(ctx, 18, 314, W - 36, 56, 10, 'rgba(255,255,255,0.9)', 'rgba(0,0,0,0.1)');
  const m = G.msgs[0];
  ctx.fillStyle = '#5a4634'; ctx.font = '14px "Trebuchet MS", sans-serif'; ctx.textAlign = 'left';
  const text = m ? m.text : tipText();
  wrapText(ctx, text, 32, 336, W - 64, 18);
}
const TIPS = ['Tip: Stroke your puppy with the mouse to pet it. Press its head and push down to teach Sit.',
  'Tip: Say a trick command (type or 🎤) after teaching it. Mastery grows with practice.',
  'Tip: Double-click the floor to call your puppies over.',
  'Tip: Throw toys by dragging and flinging them. Frisbee practice raises Disc skill.',
  'Tip: Contests pay prize money. Win first place to move up a class.',
  'Tip: Puppies get dirty over time. Buy shampoo at the shop and give them a bath.',
  'Tip: Take your puppy on walks to find presents and meet other dogs.'];
function tipText() { return TIPS[Math.floor(G.t / 12) % TIPS.length]; }
function wrapText(ctx, text, x, y, maxW, lh) {
  const words = text.split(' '); let line = '';
  for (const w of words) { const test = line + w + ' '; if (ctx.measureText(test).width > maxW && line) { ctx.fillText(line, x, y); line = w + ' '; y += lh; } else line = test; }
  ctx.fillText(line, x, y);
}
function updateMessages(dt) { if (G.msgs.length) { G.msgs[0].ms -= dt * 1000; if (G.msgs[0].ms <= 0) G.msgs.shift(); } }

// ================= UI panels =================
const UI = {
  panel: null,
  show(html, cls = '') { const el = document.getElementById('panel'); el.className = 'panel ' + cls; el.innerHTML = html; el.style.display = 'block'; Sound.click(); },
  hide() { document.getElementById('panel').style.display = 'none'; },
  isOpen() { return document.getElementById('panel').style.display === 'block'; },
};
function menuButton(id) {
  Sound.init(); Sound.resume();
  if (UI.isOpen() && UI.current === id) { UI.hide(); UI.current = null; return; }
  UI.current = id;
  if (id === 'supplies') openSupplies('food');
  else if (id === 'care') openCare();
  else if (id === 'out') openGoOut();
  else if (id === 'info') openInfo();
  else if (id === 'dogs') openDogs();
  else if (id === 'system') openSystem();
}
function panelHeader(title) { return `<div class="ph"><span>${title}</span><button class="close" onclick="UI.hide();UI.current=null">✕</button></div>`; }

function openSupplies(tab) {
  const tabs = ['food', 'toy', 'acc'].map(t => `<button class="tab ${t === tab ? 'on' : ''}" onclick="openSupplies('${t}')">${{ food: 'Food & Drink', toy: 'Toys', acc: 'Accessories' }[t]}</button>`).join('');
  let body = '';
  if (tab === 'food') {
    body += '<div class="grid">';
    for (const [id, it] of Object.entries(ITEMS)) if (it.type === 'food') {
      const c = invCount(id); const have = id === 'water' || c > 0;
      body += `<div class="card ${have ? '' : 'dim'}" onclick="placeFood('${id}')"><div class="ico">${foodIcon(id)}</div><div class="nm">${it.name}</div><div class="ct">${id === 'water' ? '∞' : 'x' + c}</div></div>`;
    }
    body += '</div><div class="note">Tap an item to put it in the room. Hungry puppies will come eat on their own.</div>';
  } else if (tab === 'toy') {
    body += '<div class="grid">';
    for (const [id, it] of Object.entries(ITEMS)) if (it.type === 'toy') {
      const c = invCount(id); const out = G.room.toys.filter(t => t.id === id).length;
      body += `<div class="card ${c > 0 ? '' : 'dim'}" onclick="placeToy('${id}')"><div class="ico">${toyIcon(id)}</div><div class="nm">${it.name}</div><div class="ct">x${c}${out ? ' (' + out + ' out)' : ''}</div></div>`;
    }
    body += `</div><div class="note">Tap to toss a toy into the room. Drag and fling it to play fetch. <button class="small" onclick="putAwayToys()">Put all toys away</button></div>`;
  } else {
    const p = activePup();
    if (!p) body = '<div class="note">Adopt a puppy first.</div>';
    else {
      body += `<div class="note">Dressing <b>${p.d.name}</b>. Tap to wear or remove.</div><div class="grid">`;
      for (const id of G.save.ownedAcc) {
        const it = ITEMS[id]; const on = p.d.acc[it.slot] === id;
        body += `<div class="card ${on ? 'on' : ''}" onclick="toggleAcc('${id}')"><div class="ico">${accIcon(id)}</div><div class="nm">${it.name}</div><div class="ct">${on ? 'Wearing' : it.slot}</div></div>`;
      }
      if (!G.save.ownedAcc.length) body += '<div class="note">No accessories yet. Buy some at the shop (Go Out → Shop).</div>';
      body += '</div>';
    }
  }
  UI.show(panelHeader('Supplies') + `<div class="tabs">${tabs}</div>${body}`);
}
function foodIcon(id) { return { water: '💧', dryfood: '🥣', deluxe: '🍖', milk: '🥛', jerky: '🥓' }[id] || '🍽️'; }
function toyIcon(id) { return { ball: '🎾', frisbee: '🥏', rope: '🪢', bone: '🦴' }[id] || '🧸'; }
function accIcon(id) { return { collar_red: '🔴', collar_blue: '🔵', bandana: '🧣', bow: '🎀', cap: '🧢', shades: '🕶️', tiara: '👑' }[id] || '✨'; }
function placeFood(id) {
  const it = ITEMS[id]; if (id !== 'water' && invCount(id) <= 0) { say('You are out of that. Buy more at the shop.'); return; }
  const isDrink = it.thirst > 20 && it.hunger < 20;
  const key = isDrink ? 'water' : 'food';
  if (G.room[key] && G.room[key].amount > 0.05) { say(`There is already a ${key} bowl out. Wait until it's empty.`); return; }
  if (id !== 'water') invAdd(id, -1);
  G.room[key] = { item: id, amount: 1, x: key === 'food' ? 405 : 455, y: key === 'food' ? 292 : 330 };
  UI.hide(); UI.current = null; Sound.pop(); say(`You put out ${it.name}.`);
  for (const p of G.dogs) if (p.state === 'idle' || p.state === 'wander') { p.setState('idle', 0.2); }
  saveGame();
}
function placeToy(id) {
  if (invCount(id) <= 0) return;
  const out = G.room.toys.filter(t => t.id === id).length; if (out >= invCount(id)) { say('All of those are already in the room.'); return; }
  if (G.room.toys.length >= 4) { say('The room is getting cluttered. Put some toys away first.'); return; }
  const toy = { id, x: 256 + rand(-40, 40), y: 360, z: 1, vx: rand(-80, 80), vy: rand(-320, -220), vz: 260, spin: 0, held: false, heldBy: null, trail: [] };
  G.room.toys.push(toy); UI.hide(); UI.current = null; Sound.pop();
  for (const p of G.dogs) if (p.state !== 'held' && p.state !== 'sleep') { p.setState('chase'); p.target = toy; }
}
function putAwayToys() { for (const t of G.room.toys) if (t.heldBy) t.heldBy.carrying = null; G.room.toys = []; UI.hide(); UI.current = null; for (const p of G.dogs) if (p.state === 'chase' || p.state === 'return') p.setState('idle', 0.5); }
function toggleAcc(id) { const p = activePup(); const slot = ITEMS[id].slot; p.d.acc[slot] = p.d.acc[slot] === id ? null : id; Sound.click(); openSupplies('acc'); saveGame(); }

function openCare() {
  const p = activePup(); if (!p) { UI.show(panelHeader('Care') + '<div class="note">Adopt a puppy first.</div>'); return; }
  UI.show(panelHeader('Care') + `<div class="note">Caring for <b>${p.d.name}</b> (Clean ${Math.round(p.d.clean)}%)</div><div class="grid">
    <div class="card ${invCount('brush') ? '' : 'dim'}" onclick="startBrush()"><div class="ico">🪮</div><div class="nm">Brush</div><div class="ct">${invCount('brush') ? (G.brushMode ? 'ON' : 'Stroke to brush') : 'Not owned'}</div></div>
    <div class="card ${invCount('shampoo') ? '' : 'dim'}" onclick="startBath()"><div class="ico">🛁</div><div class="nm">Bath</div><div class="ct">Shampoo x${invCount('shampoo')}</div></div>
    <div class="card" onclick="switchDogPanel()"><div class="ico">🐾</div><div class="nm">Switch puppy</div><div class="ct">${G.dogs.length} at home</div></div>
  </div>`);
}
function startBrush() { if (!invCount('brush')) { say('Buy a brush at the shop first.'); return; } G.brushMode = !G.brushMode; UI.hide(); UI.current = null; say(G.brushMode ? 'Brush mode on: stroke your puppy to brush its coat.' : 'Brush put away.'); }
function startBath() { if (!invCount('shampoo')) { say('You need shampoo. Buy some at the shop.'); return; } UI.hide(); UI.current = null; switchScene('bath'); }
function switchDogPanel() { openDogs(); }

function openGoOut() {
  const p = activePup();
  const walkLeft = Math.max(0, 3 - (G.save.walkDay === todayKey() ? G.save.walksToday : 0));
  const cLeft = Math.max(0, 3 - (G.save.contestDay === todayKey() ? G.save.contestsToday : 0));
  UI.show(panelHeader('Go Out') + `<div class="note">${p ? `Taking <b>${p.d.name}</b>` : 'Adopt a puppy first'}</div><div class="grid">
    <div class="card ${p && walkLeft ? '' : 'dim'}" onclick="goWalk()"><div class="ico">🚶</div><div class="nm">Walk</div><div class="ct">${walkLeft} left today</div></div>
    <div class="card ${p && cLeft ? '' : 'dim'}" onclick="openContests()"><div class="ico">🏆</div><div class="nm">Contests</div><div class="ct">${cLeft} entries left today</div></div>
    <div class="card" onclick="openShop('food')"><div class="ico">🛍️</div><div class="nm">Shop</div><div class="ct">BARC Store</div></div>
    <div class="card" onclick="openKennel()"><div class="ico">🏠</div><div class="nm">Kennel</div><div class="ct">Adopt a puppy</div></div>
  </div>`);
}
function goWalk() {
  const p = activePup(); if (!p) return;
  if (G.save.walkDay !== todayKey()) { G.save.walkDay = todayKey(); G.save.walksToday = 0; }
  if (G.save.walksToday >= 3) { say('You have walked enough for today. Come back tomorrow!'); return; }
  if (p.d.energy < 15) { say(`${p.d.name} is too tired to walk. Let it rest first.`); return; }
  G.save.walksToday++; UI.hide(); UI.current = null; switchScene('walk');
}
function openContests() {
  const p = activePup(); if (!p) return;
  if (G.save.contestDay !== todayKey()) { G.save.contestDay = todayKey(); G.save.contestsToday = 0; }
  const left = 3 - G.save.contestsToday;
  const c = p.d.classes;
  UI.show(panelHeader('Contests') + `<div class="note"><b>${p.d.name}</b> can enter ${left} more contest${left === 1 ? '' : 's'} today. Win 1st place to advance a class!</div><div class="grid">
    <div class="card" onclick="enterContest('disc')"><div class="ico">🥏</div><div class="nm">Disc Competition</div><div class="ct">${CONTEST_CLASSES[c.disc]} class</div></div>
    <div class="card" onclick="enterContest('agility')"><div class="ico">🏃</div><div class="nm">Agility Trial</div><div class="ct">${CONTEST_CLASSES[c.agility]} class</div></div>
    <div class="card" onclick="enterContest('obedience')"><div class="ico">🎓</div><div class="nm">Obedience Trial</div><div class="ct">${CONTEST_CLASSES[c.obedience]} class</div></div>
  </div>`);
}
function enterContest(kind) {
  const p = activePup(); if (!p) return;
  if (G.save.contestsToday >= 3) { say('No more contest entries today.'); return; }
  if (kind === 'obedience' && Object.keys(p.d.tricks).length < 2) { say(`${p.d.name} needs to know at least 2 tricks for the Obedience Trial.`); return; }
  if (p.d.energy < 20) { say(`${p.d.name} is too tired to compete right now.`); return; }
  G.save.contestsToday++; UI.hide(); UI.current = null; switchScene(kind);
}

function openInfo() {
  const p = activePup(); if (!p) { UI.show(panelHeader('Info') + '<div class="note">Adopt a puppy first.</div>'); return; }
  const d = p.d; const days = Math.max(1, Math.floor((Date.now() - d.born) / 86400000) + 1);
  let tricks = Object.entries(d.tricks).map(([id, t]) => `<div class="trick"><span>${TRICKS[id].name}</span><span class="cmd">"${t.cmd}"</span><span class="bar"><i style="width:${t.mastery}%"></i></span></div>`).join('');
  if (!tricks) tricks = '<div class="note">No tricks yet. Use gestures on your puppy to discover them!</div>';
  const unknown = Object.keys(TRICKS).filter(k => !d.tricks[k]).map(k => `<li><b>${TRICKS[k].name}</b>: ${TRICKS[k].hint}</li>`).join('');
  const troph = d.trophies.length ? d.trophies.map(t => `<span class="troph">${['🥇', '🥈', '🥉'][t.rank - 1]} ${t.kind} (${CONTEST_CLASSES[t.cls]})</span>`).join(' ') : 'None yet';
  UI.show(panelHeader('Puppy Info') + `<div class="info">
    <div class="row"><b>${d.name}</b> · ${dogTitle(d)} · ${d.personality}</div>
    <div class="row">Day ${days} together · Disc skill ${Math.round(d.discSkill)} · Agility skill ${Math.round(d.agiSkill)}</div>
    <div class="row">Contest classes: Disc ${CONTEST_CLASSES[d.classes.disc]} · Agility ${CONTEST_CLASSES[d.classes.agility]} · Obedience ${CONTEST_CLASSES[d.classes.obedience]}</div>
    <div class="row">Trophies: ${troph}</div>
    <h4>Tricks learned</h4>${tricks}
    <h4>Tricks to discover</h4><ul class="hints">${unknown || '<li>All tricks learned! Amazing!</li>'}</ul>
  </div>`, 'tall');
}
function openDogs() {
  let cards = G.dogs.map(p => `<div class="card ${p.d.id === G.save.activeDog ? 'on' : ''}" onclick="selectDog('${p.d.id}')"><canvas class="pupicon" data-id="${p.d.id}" width="80" height="70"></canvas><div class="nm">${p.d.name}</div><div class="ct">${BREEDS[p.d.breed].name}</div></div>`).join('');
  cards += `<div class="card ${G.dogs.length >= 3 ? 'dim' : ''}" onclick="openKennel()"><div class="ico">➕</div><div class="nm">Kennel</div><div class="ct">${G.dogs.length >= 3 ? 'House full (3)' : 'Adopt a puppy'}</div></div>`;
  UI.show(panelHeader('Your Puppies') + `<div class="note">Tap a puppy to make it the one you take out, dress up and care for.</div><div class="grid">${cards}</div>
    ${G.dogs.length ? `<div class="note"><button class="small danger" onclick="confirmRehome()">Send ${activePup().d.name} to the kennel (permanent)</button></div>` : ''}`);
  renderPupIcons();
}
function renderPupIcons() {
  document.querySelectorAll('canvas.pupicon').forEach(c => { const p = G.dogs.find(d => d.d.id === c.dataset.id); if (!p) return; const cx = c.getContext('2d'); cx.clearRect(0, 0, 80, 70); drawDog(cx, p.d, { x: 40, y: 64, scale: 0.55, facing: 1, pose: 'sit', t: 0, eyes: 'open', mouth: 'smile', acc: p.d.acc }); });
}
function selectDog(id) { const p = G.dogs.find(d => d.d.id === id); if (p) { setActive(p); p.bark(1); } openDogs(); }
function confirmRehome() {
  const p = activePup(); if (!p) return;
  UI.show(panelHeader('Are you sure?') + `<div class="note">Send <b>${p.d.name}</b> back to the kennel? You will receive ${fmtMoney(BREEDS[p.d.breed].price / 2)} and ${p.d.name} will be gone forever.</div>
    <div class="note"><button class="small danger" onclick="rehome()">Yes, say goodbye</button> <button class="small" onclick="openDogs()">No, keep ${p.d.name}</button></div>`);
}
function rehome() { const p = activePup(); G.save.dogs = G.save.dogs.filter(d => d.id !== p.d.id); G.dogs = G.dogs.filter(d => d !== p); addMoney(BREEDS[p.d.breed].price / 2); G.save.activeDog = G.dogs[0] ? G.dogs[0].d.id : null; UI.hide(); UI.current = null; Sound.sad(); say(`${p.d.name} went back to the kennel. Goodbye...`); saveGame(); }

function openSystem() {
  UI.show(panelHeader('System') + `<div class="grid">
    <div class="card" onclick="saveGame();say('Game saved.');UI.hide();UI.current=null"><div class="ico">💾</div><div class="nm">Save</div><div class="ct">Auto-saves too</div></div>
    <div class="card" onclick="Sound.enabled=!Sound.enabled;openSystem()"><div class="ico">${Sound.enabled ? '🔊' : '🔇'}</div><div class="nm">Sound</div><div class="ct">${Sound.enabled ? 'On' : 'Off'}</div></div>
    <div class="card" onclick="openHelp()"><div class="ico">❓</div><div class="nm">How to play</div><div class="ct">Controls & tips</div></div>
    <div class="card" onclick="confirmReset()"><div class="ico">🗑️</div><div class="nm">New game</div><div class="ct">Erase save</div></div>
  </div>`);
}
function confirmReset() { UI.show(panelHeader('Erase everything?') + `<div class="note">This deletes your puppies, money and progress.</div><div class="note"><button class="small danger" onclick="localStorage.removeItem(SAVE_KEY);location.reload()">Erase and restart</button> <button class="small" onclick="openSystem()">Cancel</button></div>`); }
function openHelp() {
  UI.show(panelHeader('How to play') + `<div class="info help">
    <p><b>Petting:</b> click and stroke your puppy. Hearts mean it's happy. Bond grows with care.</p>
    <p><b>Tricks:</b> use gestures to make your puppy pose (push its head down for Sit, drag down from Sit for Lie Down, drag up for Beg, tap a paw while sitting for Shake, drag sideways while lying for Roll Over, draw a circle around a standing puppy for Spin, flick up for Jump). Then teach a command word. Say it later (type it or press 🎤) and your puppy performs. Practice raises mastery.</p>
    <p><b>Feeding:</b> Supplies → Food. Put out a bowl and the puppy comes to eat. Water is free; buy food at the shop.</p>
    <p><b>Toys:</b> Supplies → Toys. Drag a toy and fling it. Your puppy fetches it back. Frisbee play trains for the Disc Competition.</p>
    <p><b>Go Out:</b> Walks find presents and meet dogs (3 a day). Contests earn prize money (3 entries a day). The Shop sells food, toys, shampoo, accessories and rooms.</p>
    <p><b>Care:</b> buy a brush and shampoo. Dirty puppies are unhappy. Bath: rub in shampoo, then rinse.</p>
    <p><b>Double-click the floor</b> to call your puppies. Say a puppy's name to call just that one. Say "good girl/boy" to praise.</p>
    <p>Stats drop over time, even while you're away (capped at one day). Visit often!</p>
  </div>`, 'tall');
}

// ================= SHOP =================
function openShop(tab) {
  const tabs = ['food', 'toy', 'care', 'acc', 'room'].map(t => `<button class="tab ${t === tab ? 'on' : ''}" onclick="openShop('${t}')">${{ food: 'Food', toy: 'Toys', care: 'Care', acc: 'Accessories', room: 'Interiors' }[t]}</button>`).join('');
  let body = '<div class="grid shop">';
  for (const [id, it] of Object.entries(ITEMS)) {
    if (it.type !== tab || id === 'water') continue;
    let owned = '', can = G.save.money >= it.price;
    if (tab === 'acc') { if (G.save.ownedAcc.includes(id)) { owned = 'Owned'; can = false; } }
    else if (tab === 'room') { if (G.save.rooms.includes(id)) { owned = G.save.room === id ? 'In use' : 'Owned'; } }
    else if (id === 'brush' && invCount('brush')) { owned = 'Owned'; can = false; }
    else owned = 'x' + invCount(id);
    body += `<div class="card ${can || (tab === 'room' && G.save.rooms.includes(id)) ? '' : 'dim'}" onclick="buy('${id}')"><div class="ico">${tab === 'food' ? foodIcon(id) : tab === 'toy' ? toyIcon(id) : tab === 'acc' ? accIcon(id) : tab === 'room' ? '🏡' : id === 'brush' ? '🪮' : '🧴'}</div><div class="nm">${it.name}</div><div class="ct">${owned ? owned + ' · ' : ''}${it.price ? fmtMoney(it.price) : 'Free'}</div><div class="desc">${it.desc}</div></div>`;
  }
  body += '</div>';
  UI.show(panelHeader(`BARC Shop · You have ${fmtMoney(G.save.money)}`) + `<div class="tabs">${tabs}</div>${body}`, 'tall');
}
function buy(id) {
  const it = ITEMS[id];
  if (it.type === 'room') {
    if (G.save.rooms.includes(id)) { G.save.room = id; say(`Room changed to ${it.name}.`); openShop('room'); saveGame(); return; }
  }
  if (it.type === 'acc' && G.save.ownedAcc.includes(id)) return;
  if (id === 'brush' && invCount('brush')) return;
  if (G.save.money < it.price) { say('Not enough money! Win contests to earn more.'); Sound.sad(); return; }
  addMoney(-it.price); Sound.coin();
  if (it.type === 'acc') G.save.ownedAcc.push(id);
  else if (it.type === 'room') { G.save.rooms.push(id); G.save.room = id; }
  else invAdd(id, 1);
  say(`Bought ${it.name}.`); openShop(it.type); saveGame();
}

// ================= KENNEL / ADOPTION =================
let kennelSel = { breed: 'lab', color: null };
function openKennel() {
  if (G.dogs.length >= 3) { say('Your house is full. You can have up to 3 puppies.'); return; }
  UI.hide(); UI.current = null; switchScene('kennel');
}
const Kennel = {
  preview: null, phase: 'browse', enterT: 0,
  enter() {
    this.phase = 'browse'; document.getElementById('cmdbar').style.display = 'none'; document.getElementById('menubar').style.display = 'none';
    if (!BREEDS[kennelSel.breed].colors[kennelSel.color]) kennelSel.color = Object.keys(BREEDS[kennelSel.breed].colors)[0];
    this.makePreview(); this.render();
  },
  exit() { UI.hide(); UI.current = null; document.getElementById('kennel').style.display = 'none'; },
  makePreview() { this.preview = new Pup(newDog(kennelSel.breed, kennelSel.color, 'Puppy')); this.preview.x = 256; this.preview.y = 300; this.preview.setState('idle', 1); },
  render() {
    const el = document.getElementById('kennel'); el.style.display = 'block';
    const b = BREEDS[kennelSel.breed];
    let breedBtns = Object.entries(BREEDS).map(([id, br]) => `<button class="bb ${id === kennelSel.breed ? 'on' : ''}" onclick="kennelPick('${id}')">${br.name}</button>`).join('');
    let colorBtns = Object.entries(b.colors).map(([c, v]) => `<button class="cb ${c === kennelSel.color ? 'on' : ''}" style="background:${v.base};border-color:${v.sec}" title="${c}" onclick="kennelColor('${c}')"></button>`).join('');
    const can = G.save.money >= b.price;
    el.innerHTML = `<div class="kh"><span>🏠 Kennel · ${fmtMoney(G.save.money)}</span>${G.dogs.length ? '<button class="close" onclick="switchScene(\'home\')">✕</button>' : ''}</div>
      <div class="kbreeds">${breedBtns}</div>
      <div class="kinfo"><div><b>${b.name}</b> <span class="price">${fmtMoney(b.price)}</span></div><div class="kdesc">${b.desc}</div>
      <div class="kcolors">Coat: ${colorBtns} <span class="cname">${kennelSel.color}</span></div>
      <div class="krow"><input id="pupName" maxlength="12" placeholder="Name your puppy" value="${kennelSel.name || (kennelSel.name = pick(DOG_NAMES))}" autocomplete="off" oninput="kennelSel.name=this.value"> <button class="mic" onclick="listenOnce(t=>{document.getElementById('pupName').value=t.split(' ')[0].slice(0,12)})">🎤</button>
      <button id="adoptBtn" ${can ? '' : 'disabled'} onclick="adopt()">${can ? 'Adopt!' : 'Not enough money'}</button></div></div>`;
  },
  update(dt) { const p = this.preview; p.tick(dt); p.stateT -= dt; p.tailWag = 6; if (p.state === 'wander') { if (p.moveToward(p.target.x, p.target.y, dt, 50)) { p.pose = 'stand'; p.setState('idle', rand(1, 3)); } } else if (p.stateT < 0) { const r = Math.random(); if (r < 0.5) { p.setState('wander'); p.target = { x: rand(120, 390), y: rand(260, 340) }; } else if (r < 0.7) { p.pose = 'sit'; p.setState('idle', 3); } else if (r < 0.8) { p.jumpV = 200; p.pose = 'jump'; p.setState('idle', 1.5); } else { p.pose = 'stand'; p.facing *= -1; p.setState('idle', 2); } } updateParticles(dt); },
  draw(ctx) { // bottom screen is DOM; draw nothing fancy
    ctx.fillStyle = '#f3e8d2'; ctx.fillRect(0, 0, W, HH);
  },
  drawTop(ctx) {
    // a kennel yard with the preview puppy
    const g = ctx.createLinearGradient(0, 0, 0, HH); g.addColorStop(0, '#8fd3ff'); g.addColorStop(0.55, '#d8f0ff'); g.addColorStop(0.56, '#79b85a'); g.addColorStop(1, '#4f8f3a');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, HH);
    // fence
    ctx.fillStyle = '#f7f0dc'; for (let i = 0; i < 14; i++) { ctx.fillRect(i * 38 + 6, 170, 14, 60); ctx.beginPath(); ctx.moveTo(i * 38 + 6, 170); ctx.lineTo(i * 38 + 13, 160); ctx.lineTo(i * 38 + 20, 170); ctx.fill(); } ctx.fillRect(0, 185, W, 8); ctx.fillRect(0, 210, W, 8);
    // kennel house
    ctx.fillStyle = '#c0553c'; ctx.fillRect(400, 150, 90, 70); ctx.fillStyle = '#7a3b2a'; ctx.beginPath(); ctx.moveTo(390, 152); ctx.lineTo(445, 112); ctx.lineTo(500, 152); ctx.fill(); ctx.fillStyle = '#3a1f14'; ctx.beginPath(); ctx.arc(445, 200, 20, Math.PI, 0); ctx.fillRect(425, 200, 40, 20); ctx.fill();
    const p = this.preview; p.draw(ctx);
    drawParticles(ctx);
    ctx.fillStyle = '#fff'; ctx.font = 'bold 20px "Trebuchet MS", sans-serif'; ctx.textAlign = 'center'; ctx.strokeStyle = 'rgba(0,0,0,0.3)'; ctx.lineWidth = 4;
    const kt = dogTitle({ breed: kennelSel.breed, color: kennelSel.color });
    ctx.strokeText(kt, W / 2, 40); ctx.fillText(kt, W / 2, 40);
    ctx.font = '13px "Trebuchet MS", sans-serif'; ctx.strokeText('Pick a breed and coat colour on the touch screen, then name your puppy.', W / 2, 62); ctx.fillText('Pick a breed and coat colour on the touch screen, then name your puppy.', W / 2, 62);
  },
  onDown(x, y) { }, onMove() { }, onUp() { },
};
function kennelPick(id) { kennelSel.breed = id; kennelSel.color = Object.keys(BREEDS[id].colors)[0]; Kennel.makePreview(); Kennel.render(); Sound.bark(BREEDS[id].size); }
function kennelColor(c) { kennelSel.color = c; Kennel.makePreview(); Kennel.render(); Sound.click(); }
function adopt() {
  const b = BREEDS[kennelSel.breed]; if (G.save.money < b.price) return;
  const name = (document.getElementById('pupName').value || pick(DOG_NAMES)).trim().slice(0, 12) || 'Puppy';
  addMoney(-b.price);
  const d = newDog(kennelSel.breed, kennelSel.color, name); G.save.dogs.push(d); const p = new Pup(d); G.dogs.push(p); setActive(p);
  p.x = 256; p.y = 345; p.pose = 'sit'; p.setState('idle', 3);
  Sound.fanfare(); say(`Welcome home, ${name}! Try petting ${name}, then push its head down to teach it to Sit.`, 8000);
  saveGame(); switchScene('home');
  hearts(256, 280, 6);
}

// ================= engine =================
function switchScene(name) {
  if (G.scene && G.scene.exit) G.scene.exit();
  G.particles = [];
  G.scene = G.scenes[name]; G.sceneName = name;
  if (G.scene.enter) G.scene.enter();
  UI.hide(); UI.current = null;
  document.getElementById('teach').style.display = 'none';
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
  }
  updateMessages(dt);
  G.autosave = (G.autosave || 0) + dt; if (G.autosave > 20) { G.autosave = 0; saveGame(); }
  requestAnimationFrame(loop);
}
function init() {
  G.bot = document.getElementById('bot'); G.bctx = G.bot.getContext('2d');
  G.top = document.getElementById('top'); G.tctx = G.top.getContext('2d');
  G.scenes.home = Home; G.scenes.kennel = Kennel;
  if (typeof registerActivities === 'function') registerActivities();
  const existing = loadGame();
  G.save = existing || newSave();
  if (existing) applyOffline(G.save);
  G.dogs = G.save.dogs.map(d => new Pup(d));
  if (!G.save.activeDog && G.dogs[0]) G.save.activeDog = G.dogs[0].d.id;
  // pointer events
  const down = e => { Sound.init(); Sound.resume(); if (e.cancelable) e.preventDefault(); const p = canvasPos(e, G.bot); G.pointer.down = true; G.pointer.x = p.x; G.pointer.y = p.y; if (G.scene && G.scene.onDown) G.scene.onDown(p.x, p.y, e); };
  const move = e => { const p = canvasPos(e, G.bot); G.pointer.x = p.x; G.pointer.y = p.y; if (G.pointer.down && e.cancelable) e.preventDefault(); if (G.scene && G.scene.onMove) G.scene.onMove(p.x, p.y, e); };
  const up = e => { if (!G.pointer.down) return; G.pointer.down = false; const p = canvasPos(e, G.bot); if (G.scene && G.scene.onUp) G.scene.onUp(p.x, p.y, e); };
  G.bot.addEventListener('mousedown', down); window.addEventListener('mousemove', move); window.addEventListener('mouseup', up);
  G.bot.addEventListener('touchstart', down, { passive: false }); G.bot.addEventListener('touchmove', move, { passive: false }); G.bot.addEventListener('touchend', up);
  window.addEventListener('keydown', e => { if (e.target.tagName === 'INPUT') return; if (G.scene && G.scene.onKey) G.scene.onKey(e); });
  // command bar
  const cmd = document.getElementById('cmd');
  document.getElementById('send').onclick = () => { handleCommand(cmd.value); cmd.value = ''; };
  cmd.onkeydown = e => { if (e.key === 'Enter') { handleCommand(cmd.value); cmd.value = ''; cmd.blur(); } };
  document.getElementById('speak').onclick = () => listenOnce(t => { cmd.value = t; handleCommand(t); setTimeout(() => cmd.value = '', 800); });
  document.querySelectorAll('#menubar button').forEach(b => b.onclick = () => menuButton(b.dataset.m));
  // title screen
  const title = document.getElementById('title');
  document.getElementById('startBtn').onclick = () => { Sound.init(); Sound.resume(); title.style.display = 'none'; Sound.chime(); if (G.dogs.length) switchScene('home'); else switchScene('kennel'); };
  document.getElementById('startBtn').textContent = existing && existing.dogs.length ? 'Continue' : 'Start';
  window.addEventListener('beforeunload', saveGame);
  document.addEventListener('visibilitychange', () => { if (document.hidden) saveGame(); });
  requestAnimationFrame(loop);
}
window.addEventListener('DOMContentLoaded', init);
