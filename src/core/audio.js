export class AudioManager {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.ambientGain = null;
    this.enabled = true;
    this.unlocked = false;
  }

  async unlock() {
    if (this.unlocked || !this.enabled) return;
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) {
      this.enabled = false;
      return;
    }
    this.ctx = new AudioContext();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.55;
    this.master.connect(this.ctx.destination);
    if (this.ctx.state === 'suspended') await this.ctx.resume();
    this.unlocked = true;
    this.startAmbient();
  }

  setMuted(muted) {
    this.enabled = !muted;
    if (this.master) this.master.gain.value = muted ? 0 : 0.55;
  }

  now() {
    return this.ctx ? this.ctx.currentTime : 0;
  }

  tone({ frequency = 440, duration = 0.08, type = 'sine', gain = 0.12, start = 0, endFrequency = null, pan = 0 } = {}) {
    if (!this.unlocked || !this.enabled) return;
    const t = this.now() + start;
    const osc = this.ctx.createOscillator();
    const amp = this.ctx.createGain();
    const stereo = this.ctx.createStereoPanner ? this.ctx.createStereoPanner() : null;
    osc.type = type;
    osc.frequency.setValueAtTime(frequency, t);
    if (endFrequency) osc.frequency.exponentialRampToValueAtTime(Math.max(20, endFrequency), t + duration);
    amp.gain.setValueAtTime(0.0001, t);
    amp.gain.exponentialRampToValueAtTime(gain, t + 0.01);
    amp.gain.exponentialRampToValueAtTime(0.0001, t + duration);
    if (stereo) {
      stereo.pan.value = pan;
      osc.connect(amp).connect(stereo).connect(this.master);
    } else {
      osc.connect(amp).connect(this.master);
    }
    osc.start(t);
    osc.stop(t + duration + 0.02);
  }

  noise({ duration = 0.08, gain = 0.1, start = 0, filter = 1400, pan = 0 } = {}) {
    if (!this.unlocked || !this.enabled) return;
    const t = this.now() + start;
    const bufferSize = Math.max(1, Math.floor(this.ctx.sampleRate * duration));
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i += 1) {
      data[i] = Math.random() * 2 - 1;
    }
    const source = this.ctx.createBufferSource();
    source.buffer = buffer;
    const amp = this.ctx.createGain();
    const biquad = this.ctx.createBiquadFilter();
    const stereo = this.ctx.createStereoPanner ? this.ctx.createStereoPanner() : null;
    biquad.type = 'bandpass';
    biquad.frequency.value = filter;
    biquad.Q.value = 0.8;
    amp.gain.setValueAtTime(0.0001, t);
    amp.gain.exponentialRampToValueAtTime(gain, t + 0.008);
    amp.gain.exponentialRampToValueAtTime(0.0001, t + duration);
    if (stereo) {
      stereo.pan.value = pan;
      source.connect(biquad).connect(amp).connect(stereo).connect(this.master);
    } else {
      source.connect(biquad).connect(amp).connect(this.master);
    }
    source.start(t);
    source.stop(t + duration + 0.02);
  }

  play(name, intensity = 1) {
    if (!this.unlocked || !this.enabled) return;
    const gain = Math.min(1.6, Math.max(0.35, intensity));
    switch (name) {
      case 'light':
        this.noise({ duration: 0.055, gain: 0.055 * gain, filter: 2300 });
        this.tone({ frequency: 640, endFrequency: 300, type: 'triangle', duration: 0.07, gain: 0.035 * gain });
        break;
      case 'heavy':
        this.noise({ duration: 0.08, gain: 0.08 * gain, filter: 1300 });
        this.tone({ frequency: 190, endFrequency: 90, type: 'sawtooth', duration: 0.12, gain: 0.05 * gain });
        break;
      case 'hit':
        this.noise({ duration: 0.065, gain: 0.08 * gain, filter: 900 });
        this.tone({ frequency: 130, endFrequency: 80, type: 'square', duration: 0.055, gain: 0.035 * gain });
        break;
      case 'crit':
        this.tone({ frequency: 840, endFrequency: 520, type: 'triangle', duration: 0.1, gain: 0.07 * gain });
        this.tone({ frequency: 1280, endFrequency: 720, type: 'sine', duration: 0.09, gain: 0.04 * gain, start: 0.02 });
        break;
      case 'parry':
        this.noise({ duration: 0.12, gain: 0.13 * gain, filter: 4200 });
        this.tone({ frequency: 1500, endFrequency: 460, type: 'sine', duration: 0.18, gain: 0.11 * gain });
        this.tone({ frequency: 95, endFrequency: 55, type: 'sawtooth', duration: 0.18, gain: 0.08 * gain });
        break;
      case 'block':
        this.noise({ duration: 0.07, gain: 0.065 * gain, filter: 600 });
        this.tone({ frequency: 260, endFrequency: 170, type: 'triangle', duration: 0.08, gain: 0.035 * gain });
        break;
      case 'dash':
        this.noise({ duration: 0.13, gain: 0.07 * gain, filter: 3200 });
        this.tone({ frequency: 500, endFrequency: 210, type: 'sine', duration: 0.12, gain: 0.035 * gain });
        break;
      case 'special':
        this.tone({ frequency: 180, endFrequency: 80, type: 'sawtooth', duration: 0.22, gain: 0.08 * gain });
        this.noise({ duration: 0.18, gain: 0.09 * gain, filter: 1800, start: 0.04 });
        this.tone({ frequency: 770, endFrequency: 1130, type: 'triangle', duration: 0.16, gain: 0.06 * gain, start: 0.06 });
        break;
      case 'loot':
        this.tone({ frequency: 700, type: 'triangle', duration: 0.08, gain: 0.05 * gain });
        this.tone({ frequency: 1040, type: 'sine', duration: 0.11, gain: 0.04 * gain, start: 0.06 });
        break;
      case 'ui':
        this.tone({ frequency: 360, endFrequency: 520, type: 'triangle', duration: 0.07, gain: 0.04 * gain });
        break;
      case 'enemy':
        this.tone({ frequency: 110, endFrequency: 70, type: 'sawtooth', duration: 0.14, gain: 0.055 * gain });
        break;
      case 'death':
        this.tone({ frequency: 150, endFrequency: 40, type: 'sawtooth', duration: 0.6, gain: 0.08 * gain });
        this.noise({ duration: 0.35, gain: 0.08 * gain, filter: 300 });
        break;
      default:
        this.tone({ frequency: 440, duration: 0.05, gain: 0.03 * gain });
    }
  }

  startAmbient() {
    if (!this.unlocked || this.ambientGain) return;
    this.ambientGain = this.ctx.createGain();
    this.ambientGain.gain.value = 0.035;
    this.ambientGain.connect(this.master);

    const oscA = this.ctx.createOscillator();
    const oscB = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 360;
    oscA.type = 'sine';
    oscB.type = 'triangle';
    oscA.frequency.value = 58;
    oscB.frequency.value = 87;
    oscA.connect(filter);
    oscB.connect(filter);
    filter.connect(this.ambientGain);
    oscA.start();
    oscB.start();

    // Slow gain pulse for fantasy ambience without streaming audio assets.
    const pulse = () => {
      if (!this.ctx || !this.ambientGain) return;
      const t = this.now();
      this.ambientGain.gain.cancelScheduledValues(t);
      this.ambientGain.gain.setValueAtTime(this.ambientGain.gain.value, t);
      this.ambientGain.gain.linearRampToValueAtTime(0.018 + Math.random() * 0.025, t + 3 + Math.random() * 2);
      window.setTimeout(pulse, 3000 + Math.random() * 2000);
    };
    pulse();
  }
}
