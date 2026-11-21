// Procedural 8-bit music + SFX. Pure oscillators, zero vocals, zero binary assets.
// Harmonic target measured from the reference: E-flat minor / B-flat major, ~112 BPM.
// One main theme on the map + distinct level loops that intensify as the business grows.

const midi = (n) => 440 * Math.pow(2, (n - 69) / 12)
const MUTE_KEY = 'scuph-safari-muted'

// Ebm, Db, Ab, Bb -> relative Bb major, Cm, F, Bb
const TRACKS = {
  main: {
    bpm: 112,
    chords: [
      { bass: 39, notes: [51, 54, 58, 63] },
      { bass: 37, notes: [49, 53, 56, 61] },
      { bass: 44, notes: [56, 60, 63, 68] },
      { bass: 46, notes: [58, 62, 65, 70] },
    ],
    bass: [0, 8], arp: [0, 1, 2, 1, 3, 2, 1, 2], arpEvery: 2,
    drums: 'soft', wave: 'square', vol: 0.1,
  },
  route: {
    bpm: 124,
    chords: [
      { bass: 39, notes: [51, 58, 63, 58] },
      { bass: 37, notes: [49, 56, 61, 56] },
      { bass: 44, notes: [56, 63, 68, 63] },
      { bass: 46, notes: [58, 65, 70, 65] },
    ],
    bass: [0, 4, 8, 12], arp: [0, 2, 1, 3, 2, 3, 1, 2], arpEvery: 2,
    drums: 'drive', wave: 'square', vol: 0.11,
  },
  yard: {
    bpm: 104,
    chords: [
      { bass: 46, notes: [58, 62, 65, 70] },
      { bass: 43, notes: [55, 58, 62, 67] },
      { bass: 39, notes: [51, 55, 58, 63] },
      { bass: 41, notes: [53, 57, 60, 65] },
    ],
    bass: [0, 6, 8, 14], arp: [0, 1, 2, 3, 2, 1, 0, 1], arpEvery: 2,
    drums: 'brush', wave: 'triangle', vol: 0.13,
  },
  urgent: {
    bpm: 140,
    chords: [
      { bass: 39, notes: [51, 54, 58, 62] },
      { bass: 40, notes: [52, 55, 59, 63] },
      { bass: 37, notes: [49, 53, 56, 60] },
      { bass: 46, notes: [58, 62, 65, 69] },
    ],
    bass: [0, 2, 4, 6, 8, 10, 12, 14], arp: [0, 3, 1, 2, 3, 0, 2, 1], arpEvery: 2,
    drums: 'drive', wave: 'sawtooth', vol: 0.075,
  },
}

class Chiptune {
  constructor() {
    this.ctx = null
    this.muted = typeof localStorage !== 'undefined' && localStorage.getItem(MUTE_KEY) === '1'
    this.trackName = 'main'
    this.track = TRACKS.main
    this.intensity = 0
    this.step = 0
    this.nextTime = 0
    this.timer = null
    this.listeners = new Set()
  }

  onChange(fn) { this.listeners.add(fn); return () => this.listeners.delete(fn) }
  emit() { this.listeners.forEach((fn) => fn(this.muted)) }

  init() {
    if (this.ctx || typeof window === 'undefined') return
    const AC = window.AudioContext || window.webkitAudioContext
    if (!AC) return
    this.ctx = new AC()
    this.master = this.ctx.createGain()
    this.master.gain.value = this.muted ? 0 : 0.5
    this.master.connect(this.ctx.destination)
    this.music = this.ctx.createGain()
    this.music.gain.value = 0.17
    this.music.connect(this.master)
    this.sfx = this.ctx.createGain()
    this.sfx.gain.value = 0.55
    this.sfx.connect(this.master)

    const len = Math.floor(this.ctx.sampleRate * 0.4)
    this.noise = this.ctx.createBuffer(1, len, this.ctx.sampleRate)
    const d = this.noise.getChannelData(0)
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1
  }

  wake() {
    this.init()
    if (!this.ctx) return
    if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {})
    if (!this.muted) this.playMusic()
  }

  toggleMute() {
    this.muted = !this.muted
    try { localStorage.setItem(MUTE_KEY, this.muted ? '1' : '0') } catch { /* ignore */ }
    if (this.ctx) {
      this.master.gain.setTargetAtTime(this.muted ? 0 : 0.5, this.ctx.currentTime, 0.02)
      if (this.muted) this.stopMusic(); else this.playMusic()
    }
    this.emit()
  }

  // main | route | yard | urgent
  setTrack(name) {
    if (!TRACKS[name] || name === this.trackName) return
    this.trackName = name
    this.track = TRACKS[name]
    this.step = 0
    if (this.ctx) this.nextTime = this.ctx.currentTime + 0.05
  }

  // Level 1-2 = main loop, 3-4 = added harmony, 5+ = full arrangement.
  setLevel(level) { this.intensity = Math.min(2, Math.max(0, Math.floor((level - 1) / 2))) }

  playMusic() {
    this.init()
    if (!this.ctx || this.timer || this.muted) return
    this.stepDur = 60 / this.track.bpm / 4
    this.nextTime = this.ctx.currentTime + 0.05
    this.timer = setInterval(() => this.schedule(), 25)
  }

  stopMusic() {
    if (this.timer) clearInterval(this.timer)
    this.timer = null
  }

  schedule() {
    if (!this.ctx) return
    while (this.nextTime < this.ctx.currentTime + 0.12) {
      this.tick(this.step, this.nextTime)
      this.nextTime += this.stepDur
      this.step = (this.step + 1) % 64
    }
  }

  voice(freq, at, dur, type = 'square', vol = 0.2, bus = this.music, glide = null) {
    const o = this.ctx.createOscillator()
    const g = this.ctx.createGain()
    o.type = type
    o.frequency.setValueAtTime(freq, at)
    if (glide) o.frequency.exponentialRampToValueAtTime(glide, at + dur)
    g.gain.setValueAtTime(0.0001, at)
    g.gain.linearRampToValueAtTime(vol, at + 0.008)
    g.gain.exponentialRampToValueAtTime(0.0001, at + dur)
    o.connect(g).connect(bus)
    o.start(at)
    o.stop(at + dur + 0.02)
  }

  hit(at, dur = 0.05, vol = 0.12, highpass = 6000) {
    const src = this.ctx.createBufferSource()
    src.buffer = this.noise
    const f = this.ctx.createBiquadFilter()
    f.type = 'highpass'; f.frequency.value = highpass
    const g = this.ctx.createGain()
    g.gain.setValueAtTime(vol, at)
    g.gain.exponentialRampToValueAtTime(0.0001, at + dur)
    src.connect(f).connect(g).connect(this.music)
    src.start(at); src.stop(at + dur + 0.01)
  }

  tick(step, at) {
    const t = this.track
    const bar = Math.floor(step / 16)
    const s = step % 16
    const chord = t.chords[bar % t.chords.length]

    if (t.bass.includes(s)) this.voice(midi(chord.bass), at, 0.2, 'triangle', 0.34)
    if (this.intensity >= 1 && s % 4 === 2) this.voice(midi(chord.bass + 7), at, 0.1, 'triangle', 0.16)

    if (s % t.arpEvery === 0) {
      const note = chord.notes[t.arp[Math.floor(step / t.arpEvery) % t.arp.length]]
      this.voice(midi(note + (this.intensity >= 2 ? 12 : 0)), at, 0.1, t.wave, t.vol)
    }
    if (this.intensity >= 2 && s % 4 === 3) {
      this.voice(midi(chord.notes[3] + 12), at, 0.07, 'square', 0.055)
    }

    if (s === 0 || s === 10) this.voice(110, at, 0.13, 'sine', 0.3, this.music, 45)
    if (t.drums === 'drive' && (s === 4 || s === 12)) this.hit(at, 0.08, 0.1, 1800)
    if (t.drums === 'soft' && s === 8) this.hit(at, 0.06, 0.05, 2200)
    if (t.drums === 'brush' && s % 4 === 2) this.hit(at, 0.04, 0.04, 3500)
    if (s % 2 === 1) this.hit(at, 0.022, this.intensity >= 1 ? 0.045 : 0.025)
  }

  // ---- sound effects (no samples, no voices) ----
  sfxTone(freq, dur, type = 'square', vol = 0.22, delay = 0, glide = null) {
    if (!this.ctx || this.muted) return
    this.voice(freq, this.ctx.currentTime + delay, dur, type, vol, this.sfx, glide)
  }

  blip(pitch = 1) { this.sfxTone(360 * pitch, 0.045, 'square', 0.09) }
  scoop() { [466, 622, 784].forEach((f, i) => this.sfxTone(f, 0.07, 'square', 0.16, i * 0.045)) }
  coin() { [784, 1175].forEach((f, i) => this.sfxTone(f, 0.11, 'square', 0.15, i * 0.07)) }
  tap() { this.sfxTone(520, 0.035, 'square', 0.08) }
  phase() { [523, 659, 784, 1047].forEach((f, i) => this.sfxTone(f, 0.09, 'triangle', 0.15, i * 0.06)) }
  combo(tier = 1) { const base = 500 + tier * 90; [base, base * 1.25, base * 1.5].forEach((f, i) => this.sfxTone(f, 0.1, 'square', 0.13, i * 0.05)) }
  hurt() { this.sfxTone(240, 0.2, 'sawtooth', 0.18, 0, 80) }
  dog() { this.sfxTone(700, 0.08, 'square', 0.14); this.sfxTone(560, 0.1, 'square', 0.12, 0.09) }
  fanfare() { [466, 587, 698, 932, 1175].forEach((f, i) => this.sfxTone(f, 0.18, i % 2 ? 'triangle' : 'square', 0.16, i * 0.1)) }
  select() { this.sfxTone(660, 0.06, 'square', 0.12); this.sfxTone(880, 0.08, 'square', 0.1, 0.05) }
}

export const audio = new Chiptune()
