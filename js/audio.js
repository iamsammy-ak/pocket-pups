// Tiny synthesized sound effects (no external assets)
const Sound = {
  ctx: null, enabled: true,
  init() {
    if (this.ctx) return;
    try { this.ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { this.enabled = false; }
  },
  resume() { if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume(); },
  tone(freq, dur, type = 'sine', vol = 0.15, slide = 0, delay = 0) {
    if (!this.enabled || !this.ctx) return;
    const c = this.ctx, o = c.createOscillator(), g = c.createGain();
    const t0 = c.currentTime + delay;
    o.type = type; o.frequency.setValueAtTime(freq, t0);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol, t0 + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g); g.connect(c.destination);
    o.start(t0); o.stop(t0 + dur + 0.02);
  },
  noise(dur, vol = 0.08, delay = 0) {
    if (!this.enabled || !this.ctx) return;
    const c = this.ctx, n = Math.floor(c.sampleRate * dur), buf = c.createBuffer(1, n, c.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
    const s = c.createBufferSource(), g = c.createGain(), f = c.createBiquadFilter();
    f.type = 'bandpass'; f.frequency.value = 900;
    s.buffer = buf; g.gain.value = vol; s.connect(f); f.connect(g); g.connect(c.destination);
    s.start(c.currentTime + delay);
  },
  bark(size = 1) {
    const f = 420 / size;
    this.tone(f, 0.09, 'sawtooth', 0.12, -f * 0.4);
    this.tone(f * 1.5, 0.07, 'square', 0.05, -f * 0.5);
    this.noise(0.08, 0.05);
  },
  doubleBark(size = 1) { this.bark(size); setTimeout(() => this.bark(size), 160); },
  whine() { this.tone(700, 0.4, 'sine', 0.08, 300); },
  pant() { this.noise(0.12, 0.03); },
  squeak() { this.tone(1800, 0.12, 'square', 0.05, 400); },
  chime() { [523, 659, 784].forEach((f, i) => this.tone(f, 0.25, 'triangle', 0.1, 0, i * 0.09)); },
  fanfare() { [523, 659, 784, 1047, 784, 1047].forEach((f, i) => this.tone(f, 0.22, 'triangle', 0.1, 0, i * 0.12)); },
  sad() { [440, 392, 330].forEach((f, i) => this.tone(f, 0.3, 'triangle', 0.08, 0, i * 0.2)); },
  click() { this.tone(900, 0.05, 'square', 0.04); },
  coin() { this.tone(1200, 0.08, 'square', 0.06); this.tone(1800, 0.15, 'square', 0.06, 0, 0.08); },
  pop() { this.tone(500, 0.06, 'sine', 0.1, 400); },
  splash() { this.noise(0.3, 0.06); this.tone(300, 0.2, 'sine', 0.05, -150); },
  whistle() { this.tone(1500, 0.25, 'sine', 0.08, 600); },
  eat() { this.noise(0.05, 0.04); this.tone(200, 0.05, 'square', 0.03); },
  bounce() { this.tone(300, 0.08, 'sine', 0.08, 150); },
  heart() { this.tone(1046, 0.1, 'sine', 0.05); this.tone(1318, 0.12, 'sine', 0.05, 0, 0.07); },
};
