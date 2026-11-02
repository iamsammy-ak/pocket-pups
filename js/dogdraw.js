// Procedural puppy renderer. Draws a dog facing +x at origin (ground under body centre).
// opts: { x, y, scale, facing(1|-1), pose, walkPhase, t, eyes, mouth, headPitch, headTurn,
//         tailWag, rollAngle, spinAngle, jumpY, shakePaw, acc:{neck,head,face}, dirt, suds }

function hexToRgb(h) {
  const n = parseInt(h.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function shade(hex, amt) {
  const [r, g, b] = hexToRgb(hex);
  const f = v => Math.max(0, Math.min(255, Math.round(v + amt)));
  return `rgb(${f(r)},${f(g)},${f(b)})`;
}
function mix(h1, h2, t) {
  const a = hexToRgb(h1), b = hexToRgb(h2);
  return `rgb(${Math.round(a[0] + (b[0] - a[0]) * t)},${Math.round(a[1] + (b[1] - a[1]) * t)},${Math.round(a[2] + (b[2] - a[2]) * t)})`;
}

function ellipsePath(ctx, x, y, rx, ry, rot = 0) {
  ctx.beginPath();
  ctx.ellipse(x, y, Math.max(0.1, rx), Math.max(0.1, ry), rot, 0, Math.PI * 2);
}
function fillEllipse(ctx, x, y, rx, ry, color, rot = 0) {
  ellipsePath(ctx, x, y, rx, ry, rot);
  ctx.fillStyle = color; ctx.fill();
}
function strokeLine(ctx, x1, y1, x2, y2, w, color) {
  ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2);
  ctx.lineWidth = w; ctx.strokeStyle = color; ctx.lineCap = 'round'; ctx.stroke();
}

function drawDog(ctx, dog, o) {
  const b = BREEDS[dog.breed];
  const col = b.colors[dog.color] || Object.values(b.colors)[0];
  const base = col.base, sec = col.sec, ter = col.ter || col.sec;
  const scale = (o.scale || 1) * b.size;
  const facing = o.facing || 1;
  const pose = o.pose || 'stand';
  const t = o.t || 0;
  const outline = shade(base, -70);
  const marks = b.marks;
  const has = m => marks.includes(m);
  const dirt = o.dirt || 0; // 0..1 dirtiness tint

  const L = 58 * b.bodyLen, H = 30, LG = 26 * b.legLen, R = 16 * b.headR;
  const legW = 9 * (b.size > 0.9 ? 1 : 0.9);

  ctx.save();
  ctx.translate(o.x, o.y);
  // soft contact shadow
  const shW = (pose === 'lie' || pose === 'roll') ? L * 0.75 : L * 0.6;
  ctx.save(); ctx.scale(scale, scale);
  const shJump = (o.jumpY || 0) / scale;
  const sg = ctx.createRadialGradient(0, 2, 1, 0, 2, shW);
  sg.addColorStop(0, `rgba(30,20,10,${0.28 / (1 + shJump / 30)})`); sg.addColorStop(0.7, `rgba(30,20,10,${0.16 / (1 + shJump / 30)})`); sg.addColorStop(1, 'rgba(30,20,10,0)');
  ctx.save(); ctx.scale(1, 7 / shW); ctx.fillStyle = sg; ctx.beginPath(); ctx.arc(0, 2 * shW / 7, shW * (1 + shJump / 60), 0, Math.PI * 2); ctx.fill(); ctx.restore();
  ctx.restore();

  let sx = facing;
  if (pose === 'spin') {
    const c = Math.cos(o.spinAngle || 0);
    sx = facing * (Math.abs(c) < 0.25 ? (c < 0 ? -0.25 : 0.25) : c);
  }
  ctx.scale(sx * scale, scale);
  ctx.translate(0, -(o.jumpY || 0));

  // ---------- skeleton ----------
  const bodyY = -(LG + H / 2);
  let rearX = -L / 2, frontX = L / 2, rearY = bodyY, frontY = bodyY;
  let legs = []; // {hipX, hipY, footX, footY, near, front}
  let headPitch = o.headPitch || 0;
  let neckX, neckY;
  let haunch = false;
  let legStyle = 'normal';
  let bodyRot = null;

  const hipFront = () => frontX - 6, hipRear = () => rearX + 7;
  const wp = o.walkPhase || 0;

  if (pose === 'stand' || pose === 'walk' || pose === 'eat' || pose === 'sneeze' || pose === 'spin' || pose === 'jump' || pose === 'shakeoff') {
    const walking = pose === 'walk';
    const stride = 10, lift = 7;
    const legDef = [
      { hip: hipFront(), near: true, front: true, ph: wp },
      { hip: hipRear(), near: false, front: false, ph: wp },
      { hip: hipFront(), near: false, front: true, ph: wp + Math.PI },
      { hip: hipRear(), near: true, front: false, ph: wp + Math.PI },
    ];
    for (const d of legDef) {
      let fx = d.hip, fy = 0;
      if (walking) { fx = d.hip + stride * Math.cos(d.ph); fy = -lift * Math.max(0, -Math.sin(d.ph)); }
      if (pose === 'jump') { fx = d.hip + (d.front ? 6 : -6); fy = -LG * 0.45; }
      legs.push({ hipX: d.hip, hipY: bodyY + H * 0.25, footX: fx, footY: fy, near: d.near, front: d.front });
    }
    if (pose === 'eat') headPitch += 0.9;
    if (pose === 'shakeoff') { bodyRot = Math.sin(t * 40) * 0.08; }
  } else if (pose === 'sit' || pose === 'shake' || pose === 'beg') {
    rearY = -H * 0.5;
    frontY = pose === 'beg' ? -(LG + H + 4) : bodyY - 3;
    if (pose === 'beg') frontX = L * 0.15, rearX = -L * 0.3;
    else frontX = L * 0.3, rearX = -L * 0.42;
    haunch = true;
    const hipY = frontY + H * 0.3;
    if (pose === 'beg') {
      legStyle = 'beg';
      legs.push({ hipX: frontX - 2, hipY, footX: frontX + 10, footY: hipY + 12, near: true, front: true });
      legs.push({ hipX: frontX - 4, hipY, footX: frontX + 8, footY: hipY + 13, near: false, front: true });
    } else {
      legs.push({ hipX: frontX - 5, hipY, footX: frontX - 5, footY: 0, near: false, front: true });
      if (pose === 'shake') legs.push({ hipX: frontX - 4, hipY, footX: frontX + 16, footY: hipY + 2, near: true, front: true, raised: true });
      else legs.push({ hipX: frontX - 4, hipY, footX: frontX - 3, footY: 0, near: true, front: true });
    }
  } else if (pose === 'lie' || pose === 'sleep') {
    rearY = frontY = -H * 0.5 + 1;
    haunch = true;
    const hipY = frontY + H * 0.25;
    legs.push({ hipX: frontX - 6, hipY, footX: frontX + 14, footY: -1, near: false, front: true });
    legs.push({ hipX: frontX - 5, hipY, footX: frontX + 16, footY: -1, near: true, front: true });
    if (pose === 'sleep') headPitch += 0.35;
  } else if (pose === 'roll') {
    // handled with rotation of a lying dog
    rearY = frontY = -H * 0.55;
    bodyRot = o.rollAngle || 0;
    legStyle = 'roll';
    const hipY = frontY + H * 0.3;
    legs.push({ hipX: frontX - 6, hipY, footX: frontX + 6, footY: hipY + 12, near: false, front: true });
    legs.push({ hipX: frontX - 4, hipY, footX: frontX + 8, footY: hipY + 14, near: true, front: true });
    legs.push({ hipX: rearX + 6, hipY, footX: rearX + 16, footY: hipY + 12, near: false, front: false });
    legs.push({ hipX: rearX + 8, hipY, footX: rearX + 18, footY: hipY + 14, near: true, front: false });
  }

  const bodyCX = (rearX + frontX) / 2, bodyCY = (rearY + frontY) / 2;
  const bodyAng = Math.atan2(frontY - rearY, frontX - rearX);
  const bodyLen = Math.hypot(frontX - rearX, frontY - rearY);
  neckX = frontX; neckY = frontY - H * 0.15;

  // rotation wrapper for roll / shakeoff
  if (bodyRot !== null) {
    ctx.translate(bodyCX, bodyCY);
    ctx.rotate(bodyRot);
    ctx.translate(-bodyCX, -bodyCY);
  }

  const bodyPath = () => {
    ctx.beginPath();
    ctx.ellipse(bodyCX, bodyCY, bodyLen / 2 + H * 0.35, H / 2 + (b.fluffy ? 2 : 0), bodyAng, 0, Math.PI * 2);
  };

  const furColor = dirt > 0 ? mix(base, '#6b5a3a', dirt * 0.5) : base;
  const furSec = dirt > 0 ? mix(sec, '#8a7a5a', dirt * 0.5) : sec;

  // ---------- tail ----------
  const wag = Math.sin(t * (o.tailWag || 4)) * (o.tailWag ? 0.5 : 0.15);
  const tailX = rearX - 2, tailY = rearY - H * 0.25;
  ctx.save();
  ctx.translate(tailX, tailY);
  ctx.rotate(-wag);
  const tailCol = furColor;
  switch (b.tail) {
    case 'curl': case 'curlfluffy': {
      ctx.beginPath(); ctx.arc(-2, -12, 9, Math.PI * 0.4, Math.PI * 2.1);
      ctx.lineWidth = b.tail === 'curlfluffy' ? 11 : 7; ctx.strokeStyle = tailCol; ctx.lineCap = 'round'; ctx.stroke();
      if (has('huskymask') || has('tri')) { ctx.beginPath(); ctx.arc(-2, -12, 9, Math.PI * 1.2, Math.PI * 2.0); ctx.lineWidth = 5; ctx.strokeStyle = furSec; ctx.stroke(); }
      break;
    }
    case 'stub': fillEllipse(ctx, -3, -3, 5, 4, tailCol); break;
    case 'pom': strokeLine(ctx, 0, 0, -6, -14, 4, tailCol); fillEllipse(ctx, -8, -17, 7, 7, tailCol); break;
    case 'fluffy': {
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(-14, -6, -22, -22);
      ctx.lineWidth = 12; ctx.strokeStyle = tailCol; ctx.lineCap = 'round'; ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-6, -4); ctx.quadraticCurveTo(-16, -8, -22, -22);
      ctx.lineWidth = 5; ctx.strokeStyle = furSec; ctx.stroke();
      break;
    }
    default: {
      const w = b.tail === 'thick' ? 8 : 4.5;
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(-12, -8, -18, -24);
      ctx.lineWidth = w; ctx.strokeStyle = tailCol; ctx.lineCap = 'round'; ctx.stroke();
      if (has('tri')) { ctx.beginPath(); ctx.moveTo(-15, -17); ctx.lineTo(-18, -24); ctx.lineWidth = w; ctx.strokeStyle = furSec; ctx.stroke(); }
    }
  }
  ctx.restore();

  // ---------- legs ----------
  const drawLeg = (lg) => {
    const c = lg.near ? furColor : shade(base, -22);
    const sockCol = lg.near ? furSec : shade(sec, -22);
    const kneeX = (lg.hipX + lg.footX) / 2 + (lg.front ? 1 : -3), kneeY = (lg.hipY + lg.footY) / 2;
    ctx.beginPath(); ctx.moveTo(lg.hipX, lg.hipY); ctx.quadraticCurveTo(kneeX, kneeY, lg.footX, lg.footY - 3);
    ctx.lineWidth = legW; ctx.strokeStyle = c; ctx.lineCap = 'round'; ctx.stroke();
    if (has('socks') || has('tri') || has('corgi') || has('huskymask')) {
      ctx.beginPath(); ctx.moveTo((lg.hipX + lg.footX) / 2, (lg.hipY + lg.footY) / 2 + 2); ctx.lineTo(lg.footX, lg.footY - 3);
      ctx.lineWidth = legW; ctx.strokeStyle = sockCol; ctx.stroke();
    }
    if (has('eyebrows')) {
      ctx.beginPath(); ctx.moveTo(lg.footX, lg.footY - 8); ctx.lineTo(lg.footX, lg.footY - 3);
      ctx.lineWidth = legW; ctx.strokeStyle = sockCol; ctx.stroke();
    }
    // paw
    const pawCol = (has('socks') || has('tri') || has('corgi') || has('huskymask')) ? sockCol : (has('eyebrows') ? sockCol : c);
    fillEllipse(ctx, lg.footX + 2, lg.footY - 2, legW * 0.65, legW * 0.45, pawCol);
    if (b.ears === 'pom') fillEllipse(ctx, lg.footX + 1, lg.footY - 4, legW * 0.85, legW * 0.75, c);
  };
  const drawHaunch = (near) => {
    const c = near ? furColor : shade(base, -22);
    const hx = rearX + 6, hy = -H * 0.45;
    fillEllipse(ctx, hx, hy, H * 0.5, H * 0.48, c);
    // folded foot forward
    const fx = rearX + 16 + (near ? 2 : -2), fy = -3;
    ctx.beginPath(); ctx.moveTo(hx, hy + 6); ctx.lineTo(fx, fy); ctx.lineWidth = legW; ctx.strokeStyle = c; ctx.lineCap = 'round'; ctx.stroke();
    const pawCol = (has('socks') || has('tri') || has('corgi') || has('huskymask') || has('eyebrows')) ? (near ? furSec : shade(sec, -22)) : c;
    fillEllipse(ctx, fx + 2, fy - 1, legW * 0.65, legW * 0.45, pawCol);
  };

  // far legs
  if (haunch) drawHaunch(false);
  for (const lg of legs) if (!lg.near) drawLeg(lg);

  // ---------- body ----------
  bodyPath(); ctx.fillStyle = furColor; ctx.fill();
  ctx.save(); bodyPath(); ctx.clip();
  // markings on body
  if (has('belly') || has('corgi') || has('huskymask') || has('tri')) {
    ctx.save(); ctx.translate(bodyCX, bodyCY); ctx.rotate(bodyAng);
    fillEllipse(ctx, 2, H * 0.3, bodyLen * 0.45, H * 0.32, furSec);
    if (has('corgi') || has('tri') || has('huskymask')) fillEllipse(ctx, bodyLen / 2 - 4, 0, 11, H * 0.5, furSec); // chest
    ctx.restore();
  }
  if (has('saddle') || has('tri')) {
    ctx.save(); ctx.translate(bodyCX, bodyCY); ctx.rotate(bodyAng);
    fillEllipse(ctx, -4, -H * 0.32, bodyLen * 0.42, H * 0.36, has('tri') ? (dirt ? mix(ter, '#6b5a3a', dirt * 0.5) : ter) : furSec);
    ctx.restore();
  }
  if (has('eyebrows')) {
    ctx.save(); ctx.translate(bodyCX, bodyCY); ctx.rotate(bodyAng);
    fillEllipse(ctx, bodyLen / 2 - 2, H * 0.1, 9, H * 0.4, furSec);
    ctx.restore();
  }
  if (has('patch')) { // rump patch
    ctx.save(); ctx.translate(bodyCX, bodyCY); ctx.rotate(bodyAng);
    fillEllipse(ctx, -bodyLen * 0.3, -H * 0.2, bodyLen * 0.22, H * 0.42, furSec);
    ctx.restore();
  }
  if (has('spots')) {
    ctx.save(); ctx.translate(bodyCX, bodyCY); ctx.rotate(bodyAng);
    const sp = [[-0.38, -0.25, 4.5], [0.05, -0.4, 3.5], [0.36, 0.0, 4], [-0.12, 0.2, 3], [-0.45, 0.3, 3.2], [0.28, -0.45, 2.8], [0.5, 0.35, 3], [-0.2, -0.05, 2.4], [0.15, 0.4, 2.6]];
    for (const [px, py, r] of sp) fillEllipse(ctx, px * bodyLen, py * H, r, r * 0.85, furSec);
    ctx.restore();
  }
  // fluffy shading
  if (b.fluffy) {
    ctx.save(); ctx.translate(bodyCX, bodyCY); ctx.rotate(bodyAng);
    for (let i = -3; i <= 3; i++) fillEllipse(ctx, i * bodyLen / 7, H * 0.45, 7, 6, shade(base, 10));
    for (let i = -2; i <= 2; i++) fillEllipse(ctx, i * bodyLen / 5 + 3, -H * 0.42, 6, 4, shade(base, 14));
    ctx.restore();
  }
  // form shading: highlight along the back, shade under the belly
  {
    ctx.save(); ctx.translate(bodyCX, bodyCY); ctx.rotate(bodyAng);
    const hl = ctx.createLinearGradient(0, -H * 0.6, 0, H * 0.6);
    hl.addColorStop(0, 'rgba(255,255,255,0.22)'); hl.addColorStop(0.35, 'rgba(255,255,255,0.04)'); hl.addColorStop(0.7, 'rgba(60,30,10,0.05)'); hl.addColorStop(1, 'rgba(60,30,10,0.22)');
    ctx.fillStyle = hl; ctx.fillRect(-bodyLen, -H, bodyLen * 2, H * 2);
    ctx.restore();
  }
  // suds
  if (o.suds > 0) {
    ctx.globalAlpha = Math.min(1, o.suds);
    for (let i = 0; i < 9; i++) {
      const a = i * 2.4 + 1;
      fillEllipse(ctx, bodyCX + Math.cos(a) * bodyLen * 0.4, bodyCY + Math.sin(a) * H * 0.4, 9 + (i % 3) * 3, 8 + (i % 2) * 3, '#ffffff');
    }
    ctx.globalAlpha = 1;
  }
  ctx.restore();
  // body outline
  bodyPath(); ctx.lineWidth = 1.6; ctx.strokeStyle = 'rgba(40,20,10,0.2)'; ctx.stroke();

  // near haunch and legs
  if (haunch) drawHaunch(true);
  for (const lg of legs) if (lg.near) drawLeg(lg);

  // ---------- head ----------
  ctx.save();
  ctx.translate(neckX, neckY);
  const pitch = pose === 'beg' ? -0.2 : (pose === 'sit' || pose === 'shake' ? -0.1 : (pose === 'lie' || pose === 'sleep' ? 0.25 : 0));
  ctx.rotate(headPitch + pitch);
  const hx = R * 0.55, hy = -R * 0.85 - (b.headR > 1.1 ? 2 : 0);
  ctx.translate(hx, hy);
  const turn = o.headTurn || 0; // tilt
  if (turn) ctx.rotate(turn);

  const headPath = () => { ctx.beginPath(); ctx.arc(0, 0, R, 0, Math.PI * 2); };
  const earCol = (has('pugmask') || has('spots') || has('patch')) ? furSec : furColor;
  const innerEar = '#f3b0b0';

  // ears (behind head)
  const drawEar = (side) => { // side -1 back, +1 front
    const floppyish = b.ears === 'floppy' || b.ears === 'long';
    const ex = side < 0 ? -R * (floppyish ? 0.7 : 0.55) : R * (floppyish ? 0.7 : 0.45), ey = floppyish ? -R * 0.45 : -R * 0.6;
    ctx.save(); ctx.translate(ex, ey);
    switch (b.ears) {
      case 'floppy': case 'long': {
        const len = b.ears === 'long' ? R * 1.5 : R * 1.25;
        ctx.rotate(side < 0 ? 0.55 : -0.5);
        const ec = has('tri') ? ter : earCol;
        fillEllipse(ctx, 0, len * 0.5, R * 0.42, len * 0.55, ec);
        if (side > 0) fillEllipse(ctx, R * 0.04, len * 0.56, R * 0.2, len * 0.36, 'rgba(243,176,176,0.5)');
        ellipsePath(ctx, 0, len * 0.5, R * 0.42, len * 0.55); ctx.lineWidth = 1.2; ctx.strokeStyle = 'rgba(40,20,10,0.18)'; ctx.stroke();
        break;
      }
      case 'pointy': {
        const tipX = side < 0 ? -R * 0.35 : R * 0.3, tipY = -R * 1.15;
        ctx.beginPath(); ctx.moveTo(-R * 0.5, R * 0.1); ctx.lineTo(tipX, tipY); ctx.lineTo(R * 0.5, R * 0.1); ctx.closePath();
        ctx.fillStyle = earCol; ctx.fill();
        ctx.beginPath(); ctx.moveTo(-R * 0.25, R * 0.05); ctx.lineTo(tipX, tipY + R * 0.3); ctx.lineTo(R * 0.25, R * 0.05); ctx.closePath();
        ctx.fillStyle = innerEar; ctx.fill();
        break;
      }
      case 'folded': {
        ctx.rotate(side < 0 ? 0.5 : -0.5);
        fillEllipse(ctx, 0, R * 0.35, R * 0.35, R * 0.5, has('pugmask') ? col.sec : earCol);
        break;
      }
      case 'pom': {
        fillEllipse(ctx, side < 0 ? -R * 0.2 : R * 0.2, R * 0.55, R * 0.55, R * 0.75, earCol);
        break;
      }
    }
    ctx.restore();
  };
  drawEar(-1); drawEar(1);

  // head base
  headPath(); ctx.fillStyle = furColor; ctx.fill();
  ctx.save(); headPath(); ctx.clip();
  if (has('huskymask')) {
    fillEllipse(ctx, R * 0.25, R * 0.35, R * 0.95, R * 0.7, furSec);
    fillEllipse(ctx, -R * 0.25, -R * 0.45, R * 0.18, R * 0.14, furSec);
    fillEllipse(ctx, R * 0.4, -R * 0.5, R * 0.18, R * 0.14, furSec);
  }
  if (has('blaze')) { fillEllipse(ctx, R * 0.2, 0, R * 0.22, R * 1.1, furSec); }
  if (has('eyebrows')) {
    fillEllipse(ctx, -R * 0.22, -R * 0.5, R * 0.15, R * 0.11, furSec);
    fillEllipse(ctx, R * 0.4, -R * 0.52, R * 0.15, R * 0.11, furSec);
    fillEllipse(ctx, R * 0.55, R * 0.45, R * 0.5, R * 0.35, furSec);
  }
  if (has('tri')) { fillEllipse(ctx, -R * 0.55, -R * 0.1, R * 0.55, R * 0.8, ter); }
  if (has('saddle')) { fillEllipse(ctx, R * 0.6, R * 0.35, R * 0.6, R * 0.5, furSec); }
  if (has('patch')) { fillEllipse(ctx, R * 0.42, -R * 0.3, R * 0.48, R * 0.55, furSec); fillEllipse(ctx, -R * 0.55, -R * 0.2, R * 0.4, R * 0.5, furSec); }
  if (has('spots')) { for (const [px, py, r] of [[-0.45, -0.3, 0.22], [0.1, -0.6, 0.18], [-0.1, 0.55, 0.16], [0.55, 0.65, 0.14]]) fillEllipse(ctx, px * R, py * R, r * R, r * R * 0.9, furSec); }
  if (b.fluffy && b.ears === 'pom') { fillEllipse(ctx, -R * 0.1, -R * 0.75, R * 0.8, R * 0.5, shade(base, 8)); }
  // head form shading
  {
    const hg = ctx.createRadialGradient(-R * 0.3, -R * 0.4, R * 0.1, 0, 0, R * 1.1);
    hg.addColorStop(0, 'rgba(255,255,255,0.2)'); hg.addColorStop(0.55, 'rgba(255,255,255,0)'); hg.addColorStop(1, 'rgba(60,30,10,0.2)');
    ctx.fillStyle = hg; ctx.fillRect(-R, -R, R * 2, R * 2);
  }
  ctx.restore();
  headPath(); ctx.lineWidth = 1.5; ctx.strokeStyle = 'rgba(40,20,10,0.2)'; ctx.stroke();
  if (b.fluffy && b.ears !== 'pom') { // cheek fluff
    fillEllipse(ctx, -R * 0.1, R * 0.75, R * 0.55, R * 0.3, shade(base, 10)); fillEllipse(ctx, R * 0.35, R * 0.8, R * 0.45, R * 0.28, shade(base, 10));
  }
  if (b.ears === 'pom') fillEllipse(ctx, -R * 0.05, -R * 0.9, R * 0.7, R * 0.45, shade(base, 8)); // top knot

  // snout
  const snX = R * 0.5, snY = R * 0.3, snRx = R * (0.55 * b.snout + 0.1), snRy = R * 0.42;
  let snoutCol = furColor;
  if (has('pugmask')) snoutCol = col.sec;
  else if (has('saddle')) snoutCol = furSec;
  else if (has('belly') || has('huskymask') || has('corgi') || has('blaze') || has('eyebrows') || has('tri')) snoutCol = furSec;
  fillEllipse(ctx, snX, snY, snRx, snRy, snoutCol);
  if (has('pugmask')) { // wrinkles
    ctx.beginPath(); ctx.arc(snX - 2, snY - 6, R * 0.5, Math.PI * 1.15, Math.PI * 1.85); ctx.lineWidth = 1.5; ctx.strokeStyle = 'rgba(0,0,0,0.25)'; ctx.stroke();
  }
  // mouth
  const mouth = o.mouth || 'closed';
  ctx.strokeStyle = '#3a2a22'; ctx.lineWidth = 1.5; ctx.lineCap = 'round';
  const nX = snX + snRx * 0.7, nY = snY - snRy * 0.35;
  if (mouth === 'open' || mouth === 'pant') {
    ctx.beginPath(); ctx.arc(snX + snRx * 0.2, snY + snRy * 0.35, R * 0.28, 0, Math.PI); ctx.fillStyle = '#5a2730'; ctx.fill();
    fillEllipse(ctx, snX + snRx * 0.25, snY + snRy * 0.55 + (mouth === 'pant' ? Math.sin(t * 14) * 1.5 : 2), R * 0.16, R * 0.25, '#ff8aa0');
  } else if (mouth === 'smile') {
    ctx.beginPath(); ctx.arc(snX + snRx * 0.2, snY + snRy * 0.2, R * 0.28, 0.15, Math.PI - 0.15); ctx.stroke();
  } else {
    ctx.beginPath(); ctx.moveTo(nX - 1, nY + 3); ctx.quadraticCurveTo(nX - 3, nY + 9, nX - 7, nY + 7); ctx.stroke();
  }
  // nose
  fillEllipse(ctx, nX, nY, R * 0.2 * (b.snout < 0.5 ? 1.2 : 1), R * 0.15, col.nose);
  fillEllipse(ctx, nX - R * 0.05, nY - R * 0.05, R * 0.06, R * 0.04, 'rgba(255,255,255,0.6)');

  // eyes
  const eyes = o.eyes || 'open';
  const eyeCol = b.eye || '#2a1f1a';
  const eyeDefs = [[-R * 0.2, -R * 0.22], [R * 0.42, -R * 0.26]];
  for (const [ex, ey] of eyeDefs) {
    const er = R * 0.15 * (b.headR > 1.1 ? 1.25 : 1);
    if (eyes === 'closed' || eyes === 'sleep') {
      ctx.beginPath(); ctx.arc(ex, ey, er, 0.2, Math.PI - 0.2); ctx.lineWidth = 2; ctx.strokeStyle = '#3a2a22'; ctx.stroke();
    } else if (eyes === 'happy') {
      ctx.beginPath(); ctx.arc(ex, ey + er * 0.6, er, Math.PI + 0.2, Math.PI * 2 - 0.2); ctx.lineWidth = 2.2; ctx.strokeStyle = '#3a2a22'; ctx.stroke();
    } else {
      fillEllipse(ctx, ex, ey, er * 1.15, er * 1.25, '#fff');
      fillEllipse(ctx, ex + er * 0.15, ey + er * 0.1, er * 0.9, er, eyeCol);
      fillEllipse(ctx, ex + er * 0.35, ey - er * 0.35, er * 0.35, er * 0.3, '#fff');
      if (eyes === 'sad') { strokeLine(ctx, ex - er, ey - er * 1.4, ex + er, ey - er * 1.0, 1.5, '#3a2a22'); }
    }
  }
  if (has('pugmask')) { fillEllipse(ctx, snX - R * 0.1, snY - R * 0.1, snRx * 0.9, snRy * 1.2, 'rgba(40,30,30,0.18)'); }
  if (eyes === 'happy') { fillEllipse(ctx, -R * 0.35, R * 0.15, R * 0.22, R * 0.12, 'rgba(255,120,140,0.35)'); fillEllipse(ctx, R * 0.62, R * 0.1, R * 0.2, R * 0.11, 'rgba(255,120,140,0.35)'); }

  // head accessories
  const acc = o.acc || {};
  if (acc.head === 'bow') {
    ctx.save(); ctx.translate(-R * 0.35, -R * 0.95);
    const c = ITEMS.bow.color;
    fillEllipse(ctx, -6, 0, 6, 4, c, -0.3); fillEllipse(ctx, 6, 0, 6, 4, c, 0.3); fillEllipse(ctx, 0, 0, 3, 3, shade(c, -40));
    ctx.restore();
  } else if (acc.head === 'cap') {
    ctx.save(); ctx.translate(R * 0.05, -R * 0.75);
    ctx.beginPath(); ctx.arc(0, 2, R * 0.75, Math.PI, 0); ctx.fillStyle = ITEMS.cap.color; ctx.fill();
    fillEllipse(ctx, R * 0.75, 3, R * 0.5, R * 0.14, shade(ITEMS.cap.color, -30));
    ctx.restore();
  } else if (acc.head === 'tiara') {
    ctx.save(); ctx.translate(0, -R * 0.95);
    ctx.beginPath(); ctx.moveTo(-R * 0.5, 2); ctx.lineTo(-R * 0.35, -R * 0.4); ctx.lineTo(-R * 0.15, 0); ctx.lineTo(0, -R * 0.55); ctx.lineTo(R * 0.15, 0); ctx.lineTo(R * 0.35, -R * 0.4); ctx.lineTo(R * 0.5, 2); ctx.closePath();
    ctx.fillStyle = ITEMS.tiara.color; ctx.fill();
    fillEllipse(ctx, 0, -R * 0.45, 2, 2, '#ff5b8a');
    ctx.restore();
  }
  if (acc.face === 'shades') {
    for (const [ex, ey] of eyeDefs) {
      ctx.fillStyle = '#1b1b22'; ctx.beginPath(); ctx.roundRect(ex - R * 0.26, ey - R * 0.2, R * 0.52, R * 0.4, 3); ctx.fill();
    }
    strokeLine(ctx, eyeDefs[0][0] + R * 0.26, eyeDefs[0][1], eyeDefs[1][0] - R * 0.26, eyeDefs[1][1], 1.5, '#1b1b22');
  }
  // sleep Z
  if (eyes === 'sleep') {
    ctx.save(); ctx.fillStyle = 'rgba(80,80,120,0.8)'; ctx.font = 'bold 10px sans-serif'; ctx.scale(sx < 0 ? -1 : 1, 1);
    const zt = (t % 2) / 2;
    ctx.globalAlpha = 1 - zt; ctx.fillText('z', (sx < 0 ? -1 : 1) * (R * 0.9) + zt * 6, -R - zt * 14);
    ctx.restore();
  }
  ctx.restore(); // head

  // collar (after head so it overlaps neck)
  if (acc.neck) {
    const c = ITEMS[acc.neck].color;
    ctx.save(); ctx.translate(neckX - 2, neckY + 2); ctx.rotate(bodyAng + (pose === 'beg' ? 0.3 : 0.5));
    fillEllipse(ctx, 0, 0, R * 0.75, R * 0.3, c);
    fillEllipse(ctx, R * 0.25, R * 0.2, 3, 3, '#ffd84a');
    if (acc.neck === 'bandana') {
      ctx.beginPath(); ctx.moveTo(-R * 0.6, 2); ctx.lineTo(R * 0.4, 2); ctx.lineTo(0, R * 0.9); ctx.closePath(); ctx.fillStyle = c; ctx.fill();
      strokeLine(ctx, -R * 0.3, 5, R * 0.1, 5, 1, 'rgba(255,255,255,0.5)');
    }
    ctx.restore();
  }

  // dirt specks
  if (dirt > 0.3) {
    ctx.fillStyle = 'rgba(70,50,20,' + (0.25 + dirt * 0.3) + ')';
    for (let i = 0; i < 6; i++) { const a = i * 1.9; ctx.beginPath(); ctx.arc(bodyCX + Math.cos(a) * bodyLen * 0.35, bodyCY + Math.sin(a * 1.3) * H * 0.3, 2.5, 0, Math.PI * 2); ctx.fill(); }
  }

  ctx.restore();
}

// Approximate hit zones in screen space (for petting / gestures). Returns {head, body, paw, rear} rects.
function dogHitZones(dog, o) {
  const b = BREEDS[dog.breed];
  const s = (o.scale || 1) * b.size;
  const L = 58 * b.bodyLen, H = 30, LG = 26 * b.legLen, R = 16 * b.headR;
  const f = o.facing || 1;
  const pose = o.pose || 'stand';
  let headCX, headCY, bodyCX, bodyCY, bodyW, bodyH;
  if (pose === 'sit' || pose === 'shake') {
    headCX = L * 0.3 + R * 0.6; headCY = -(LG + H / 2) - 3 - H * 0.15 - R * 0.9;
    bodyCX = -L * 0.06; bodyCY = -(LG / 2 + H * 0.4); bodyW = L * 0.8; bodyH = LG + H;
  } else if (pose === 'beg') {
    headCX = L * 0.15 + R * 0.6; headCY = -(LG + H + 4) - R;
    bodyCX = -L * 0.08; bodyCY = -(LG + H) / 2; bodyW = L * 0.6; bodyH = LG + H;
  } else if (pose === 'lie' || pose === 'sleep') {
    headCX = L / 2 + R * 0.6; headCY = -H * 0.5 - R * 0.9;
    bodyCX = 0; bodyCY = -H * 0.5; bodyW = L + H * 0.7; bodyH = H;
  } else {
    headCX = L / 2 + R * 0.55; headCY = -(LG + H / 2) - H * 0.15 - R * 0.85;
    bodyCX = 0; bodyCY = -(LG + H / 2); bodyW = L + H * 0.7; bodyH = H;
  }
  const jump = o.jumpY || 0;
  const toScreen = (x, y) => ({ x: o.x + x * f * s, y: o.y + (y - jump) * s });
  const h = toScreen(headCX, headCY), bd = toScreen(bodyCX, bodyCY);
  const pawX = (pose === 'sit' || pose === 'shake') ? L * 0.3 - 4 : L / 2 - 6;
  const p = toScreen(pawX, -LG * 0.2);
  return {
    head: { x: h.x, y: h.y, r: R * 1.25 * s },
    body: { x: bd.x, y: bd.y, w: bodyW * s, h: bodyH * s },
    paw: { x: p.x, y: p.y, r: (pose === 'sit' ? 9 : 0) * s },
    top: toScreen(0, -(LG + H)).y,
    width: (L + R * 2) * s,
  };
}

function hitDog(dog, o, px, py) {
  const z = dogHitZones(dog, o);
  if (Math.hypot(px - z.head.x, py - z.head.y) < z.head.r) return 'head';
  if (Math.hypot(px - z.paw.x, py - z.paw.y) < z.paw.r) return 'paw';
  if (Math.abs(px - z.body.x) < z.body.w / 2 + 6 && Math.abs(py - z.body.y) < z.body.h / 2 + 10) return 'body';
  // legs region
  if (Math.abs(px - z.body.x) < z.body.w / 2 && py > z.body.y && py < o.y + 4) return 'body';
  return null;
}
