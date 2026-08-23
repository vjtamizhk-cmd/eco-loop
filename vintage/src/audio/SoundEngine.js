// Web Audio API procedural sound engine for Pen Fight & Authentic Classroom Ambience
class SoundEngine {
  constructor() {
    this.ctx = null;
    this.isMuted = false;
    this.masterGain = null;
    this.ambientGain = null;
    this.isAmbiencePlaying = false;
    this.ambientTimer = null;
    this.chatterNodes = [];

    // Automatically initialize / resume on first user interaction anywhere in window
    if (typeof window !== 'undefined') {
      const unlockAudio = () => {
        this.init();
        this.resume();
      };
      window.addEventListener('click', unlockAudio, { passive: true });
      window.addEventListener('keydown', unlockAudio, { passive: true });
      window.addEventListener('pointerdown', unlockAudio, { passive: true });
      window.addEventListener('touchstart', unlockAudio, { passive: true });
    }
  }

  init() {
    if (this.ctx) {
      this.resume();
      return;
    }
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioContext();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = this.isMuted ? 0 : 0.85;
      this.masterGain.connect(this.ctx.destination);

      this.startClassroomAmbience();
    } catch (e) {
      console.warn("Web Audio API not supported", e);
    }
  }

  resume() {
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().then(() => {
        if (!this.isAmbiencePlaying) {
          this.startClassroomAmbience();
        }
      }).catch(err => console.warn(err));
    } else if (!this.isAmbiencePlaying && this.ctx) {
      this.startClassroomAmbience();
    }
  }

  setMuted(muted) {
    this.isMuted = muted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(muted ? 0 : 0.85, this.ctx.currentTime, 0.05);
    }
    if (this.ambientGain && this.ctx) {
      this.ambientGain.gain.setTargetAtTime(muted ? 0 : 0.40, this.ctx.currentTime, 0.05);
    }
  }

  toggleMute() {
    this.setMuted(!this.isMuted);
    return this.isMuted;
  }

  // Authentic 90s School Classroom Ambience (Children Talking/Murmurs, Fan Hum, Desk Rustle)
  startClassroomAmbience() {
    if (!this.ctx || this.isAmbiencePlaying) return;
    this.isAmbiencePlaying = true;

    try {
      this.ambientGain = this.ctx.createGain();
      this.ambientGain.gain.setValueAtTime(0.01, this.ctx.currentTime);
      this.ambientGain.gain.linearRampToValueAtTime(this.isMuted ? 0 : 0.40, this.ctx.currentTime + 1.5);
      this.ambientGain.connect(this.masterGain);

      // 1. Room Tone & Soft Classroom Breeze (Continuous Pink Noise Buffer)
      const bufferSize = this.ctx.sampleRate * 4.0;
      const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        b0 = 0.99886 * b0 + white * 0.0555179;
        b1 = 0.99332 * b1 + white * 0.0750759;
        b2 = 0.96900 * b2 + white * 0.1538520;
        b3 = 0.86650 * b3 + white * 0.3104856;
        b4 = 0.55000 * b4 + white * 0.5329522;
        b5 = -0.7616 * b5 - white * 0.0168980;
        output[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.08;
        b6 = white * 0.115926;
      }

      const roomNoise = this.ctx.createBufferSource();
      roomNoise.buffer = noiseBuffer;
      roomNoise.loop = true;

      const roomFilter = this.ctx.createBiquadFilter();
      roomFilter.type = 'lowpass';
      roomFilter.frequency.value = 520;

      roomNoise.connect(roomFilter);
      roomFilter.connect(this.ambientGain);
      roomNoise.start();

      // 2. Ceiling Fan Soft Hum (60Hz + 120Hz warmth)
      const fanOsc = this.ctx.createOscillator();
      fanOsc.type = 'sine';
      fanOsc.frequency.value = 58;
      const fanGain = this.ctx.createGain();
      fanGain.gain.value = 0.04;
      fanOsc.connect(fanGain);
      fanGain.connect(this.ambientGain);
      fanOsc.start();

      // 3. Children Chatter & Murmur Formants (Vocal tract frequency modulators)
      const formants = [
        { f: 420, q: 3.2, gain: 0.22, speed: 0.22, modDepth: 140 }, // Vowel body murmur
        { f: 880, q: 3.8, gain: 0.18, speed: 0.35, modDepth: 220 }, // Children speech formants
        { f: 1450, q: 4.2, gain: 0.14, speed: 0.48, modDepth: 310 }, // Whisper chatter
        { f: 2200, q: 3.0, gain: 0.09, speed: 0.28, modDepth: 260 }  // Paper rustle / desk clicks
      ];

      formants.forEach((form, idx) => {
        const chatterSource = this.ctx.createBufferSource();
        chatterSource.buffer = noiseBuffer;
        chatterSource.loop = true;

        const bpFilter = this.ctx.createBiquadFilter();
        bpFilter.type = 'bandpass';
        bpFilter.frequency.value = form.f;
        bpFilter.Q.value = form.q;

        // Syllable modulation LFO
        const lfo = this.ctx.createOscillator();
        lfo.type = idx % 2 === 0 ? 'sine' : 'triangle';
        lfo.frequency.value = form.speed;

        const lfoGain = this.ctx.createGain();
        lfoGain.gain.value = form.modDepth;
        lfo.connect(lfoGain);
        lfoGain.connect(bpFilter.frequency);
        lfo.start();

        const formGain = this.ctx.createGain();
        formGain.gain.value = form.gain;

        chatterSource.connect(bpFilter);
        bpFilter.connect(formGain);
        formGain.connect(this.ambientGain);
        chatterSource.start();
      });

      // 4. Periodic Classroom Atmosphere Micro-events
      this.scheduleClassroomEvent();
    } catch (e) {
      console.warn("Classroom ambience init error", e);
    }
  }

  scheduleClassroomEvent() {
    if (!this.isAmbiencePlaying) return;
    const nextInterval = 12000 + Math.random() * 16000; // Every 12-28s
    this.ambientTimer = setTimeout(() => {
      if (this.ctx && !this.isMuted) {
        const roll = Math.random();
        if (roll < 0.35) {
          this.playSubtleClassroomMurmur();
        } else if (roll < 0.65) {
          this.playDeskRustle();
        } else {
          this.playDistantBellChime();
        }
      }
      this.scheduleClassroomEvent();
    }, nextInterval);
  }

  // Soft distant classroom whisper / chatter swell
  playSubtleClassroomMurmur() {
    if (!this.ctx || this.isMuted) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(360 + Math.random() * 140, t);
    osc.frequency.linearRampToValueAtTime(310, t + 1.4);

    gain.gain.setValueAtTime(0.001, t);
    gain.gain.linearRampToValueAtTime(0.06, t + 0.6);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 1.8);

    osc.connect(gain);
    gain.connect(this.ambientGain || this.masterGain);
    osc.start(t);
    osc.stop(t + 1.9);
  }

  // Notebook paper page turn / subtle desk shuffle
  playDeskRustle() {
    if (!this.ctx || this.isMuted) return;
    const t = this.ctx.currentTime;
    const bufferSize = this.ctx.sampleRate * 0.25;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.sin((i / bufferSize) * Math.PI);
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 1800;
    filter.Q.value = 1.2;

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.05, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.24);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.ambientGain || this.masterGain);
    noise.start(t);
    noise.stop(t + 0.25);
  }

  // Distant nostalgic school bell chime
  playDistantBellChime() {
    if (!this.ctx || this.isMuted) return;
    const t = this.ctx.currentTime;
    [659.25, 523.25].forEach((freq, idx) => {
      const noteTime = t + idx * 0.28;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, noteTime);

      gain.gain.setValueAtTime(0.04, noteTime);
      gain.gain.exponentialRampToValueAtTime(0.001, noteTime + 1.4);

      osc.connect(gain);
      gain.connect(this.ambientGain || this.masterGain);
      osc.start(noteTime);
      osc.stop(noteTime + 1.5);
    });
  }

  // Realistic plastic/wood impact clack
  playClack(intensity = 1.0) {
    if (this.isMuted || !this.ctx) return;
    this.resume();
    const t = this.ctx.currentTime;
    const gain = Math.min(1.0, Math.max(0.1, intensity));

    // High snap (plastic click)
    const osc = this.ctx.createOscillator();
    const oscGain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(800 + Math.random() * 400, t);
    osc.frequency.exponentialRampToValueAtTime(120, t + 0.04);

    oscGain.gain.setValueAtTime(0.6 * gain, t);
    oscGain.gain.exponentialRampToValueAtTime(0.001, t + 0.04);

    osc.connect(oscGain);
    oscGain.connect(this.masterGain);
    osc.start(t);
    osc.stop(t + 0.05);

    // Wooden desk resonance thump
    const woodOsc = this.ctx.createOscillator();
    const woodGain = this.ctx.createGain();
    woodOsc.type = 'sine';
    woodOsc.frequency.setValueAtTime(220 + Math.random() * 50, t);
    woodOsc.frequency.exponentialRampToValueAtTime(60, t + 0.08);

    woodGain.gain.setValueAtTime(0.5 * gain, t);
    woodGain.gain.exponentialRampToValueAtTime(0.001, t + 0.09);

    woodOsc.connect(woodGain);
    woodGain.connect(this.masterGain);
    woodOsc.start(t);
    woodOsc.stop(t + 0.1);

    // Noise burst for sharp contact
    const bufferSize = this.ctx.sampleRate * 0.03;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.2));
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    const noiseFilter = this.ctx.createBiquadFilter();
    noiseFilter.type = 'bandpass';
    noiseFilter.frequency.value = 2400;
    noiseFilter.Q.value = 2.0;

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0.3 * gain, t);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, t + 0.03);

    noise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(this.masterGain);
    noise.start(t);
    noise.stop(t + 0.03);
  }

  // Whoosh sound when flicked
  playFlick(power = 1.0) {
    if (this.isMuted || !this.ctx) return;
    this.resume();
    const t = this.ctx.currentTime;
    const p = Math.min(1.0, Math.max(0.2, power));

    const bufferSize = this.ctx.sampleRate * 0.15;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(250 + p * 300, t);
    filter.frequency.exponentialRampToValueAtTime(800 + p * 1200, t + 0.06);
    filter.frequency.exponentialRampToValueAtTime(150, t + 0.14);
    filter.Q.value = 1.5;

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.01, t);
    gain.gain.linearRampToValueAtTime(0.4 * p, t + 0.04);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.14);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);
    noise.start(t);
    noise.stop(t + 0.15);
  }

  // Pen falling off desk into floor thud
  playDrop() {
    if (this.isMuted || !this.ctx) return;
    this.resume();
    const t = this.ctx.currentTime;

    // Floor thud
    const osc = this.ctx.createOscillator();
    const oscGain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(120, t);
    osc.frequency.exponentialRampToValueAtTime(35, t + 0.18);

    oscGain.gain.setValueAtTime(0.8, t);
    oscGain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);

    osc.connect(oscGain);
    oscGain.connect(this.masterGain);
    osc.start(t);
    osc.stop(t + 0.22);

    // Secondary rattle bounce
    setTimeout(() => {
      if (this.isMuted || !this.ctx) return;
      const t2 = this.ctx.currentTime;
      const bounce = this.ctx.createOscillator();
      const bounceGain = this.ctx.createGain();
      bounce.type = 'triangle';
      bounce.frequency.setValueAtTime(320, t2);
      bounce.frequency.exponentialRampToValueAtTime(80, t2 + 0.08);
      bounceGain.gain.setValueAtTime(0.3, t2);
      bounceGain.gain.exponentialRampToValueAtTime(0.001, t2 + 0.08);
      bounce.connect(bounceGain);
      bounceGain.connect(this.masterGain);
      bounce.start(t2);
      bounce.stop(t2 + 0.09);
    }, 120);
  }

  // Classic School Bell chime (Double metallic gong)
  playSchoolBell() {
    if (this.isMuted || !this.ctx) return;
    this.resume();
    const tones = [523.25, 659.25, 783.99, 1046.50]; // C Major chord
    tones.forEach((freq, idx) => {
      const t = this.ctx.currentTime + idx * 0.08;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t);

      gain.gain.setValueAtTime(0.25, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 1.2);

      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(t);
      osc.stop(t + 1.3);
    });
  }

  // Victory Fanfare / Cheering chime
  playVictory() {
    if (this.isMuted || !this.ctx) return;
    this.resume();
    const notes = [
      { f: 523.25, d: 0.12, offset: 0 },     // C5
      { f: 659.25, d: 0.12, offset: 0.12 },  // E5
      { f: 783.99, d: 0.12, offset: 0.24 },  // G5
      { f: 1046.50, d: 0.45, offset: 0.36 }, // C6
    ];

    notes.forEach(n => {
      const t = this.ctx.currentTime + n.offset;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(n.f, t);

      gain.gain.setValueAtTime(0.35, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + n.d);

      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(t);
      osc.stop(t + n.d + 0.05);
    });
  }

  // UI Button Click sound
  playClick() {
    if (this.isMuted || !this.ctx) return;
    this.resume();
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(900, t);
    osc.frequency.exponentialRampToValueAtTime(450, t + 0.03);

    gain.gain.setValueAtTime(0.2, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.03);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(t);
    osc.stop(t + 0.04);
  }
}

export const sound = new SoundEngine();
