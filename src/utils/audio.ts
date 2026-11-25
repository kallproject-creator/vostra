class SoundEngine {
  private ctx: AudioContext | null = null;
  private muted: boolean = false;

  public setMuted(muted: boolean) {
    this.muted = muted;
  }

  public isMuted(): boolean {
    return this.muted;
  }

  private getCtx(): AudioContext | null {
    if (this.muted) return null;
    if (typeof window === 'undefined') return null;
    try {
      if (!this.ctx || this.ctx.state === 'closed') {
        const AudioCtx =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (AudioCtx) {
          this.ctx = new AudioCtx();
        }
      }
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }
      return this.ctx;
    } catch {
      return null;
    }
  }

  public playBallHit(intensity: 'soft' | 'medium' | 'heavy' = 'medium') {
    const ctx = this.getCtx();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    const startFreq = intensity === 'heavy' ? 240 : intensity === 'medium' ? 190 : 150;
    const endFreq = intensity === 'heavy' ? 45 : 65;
    const dur = intensity === 'heavy' ? 0.16 : 0.11;
    const vol = intensity === 'heavy' ? 0.28 : intensity === 'medium' ? 0.18 : 0.12;

    osc.type = intensity === 'heavy' ? 'triangle' : 'sine';
    osc.frequency.setValueAtTime(startFreq, now);
    osc.frequency.exponentialRampToValueAtTime(endFreq, now + dur);

    gain.gain.setValueAtTime(vol, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + dur);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + dur);

    if (intensity === 'heavy') {
      // Crisp slap transient
      const bufferSize = ctx.sampleRate * 0.06;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.25));
      }
      const noise = ctx.createBufferSource();
      noise.buffer = buffer;
      const nGain = ctx.createGain();
      nGain.gain.setValueAtTime(0.2, now);
      nGain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
      noise.connect(nGain);
      nGain.connect(ctx.destination);
      noise.start(now);
    }
  }

  public playWhistle(kind: 'point' | 'start' | 'end' = 'point') {
    const ctx = this.getCtx();
    if (!ctx) return;

    const now = ctx.currentTime;
    const playTweet = (offset: number, duration: number, freq: number) => {
      const osc = ctx.createOscillator();
      const lfo = ctx.createOscillator();
      const lfoGain = ctx.createGain();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + offset);

      lfo.frequency.setValueAtTime(38, now + offset);
      lfoGain.gain.setValueAtTime(75, now + offset);
      lfo.connect(lfoGain);
      lfoGain.connect(osc.frequency);

      gain.gain.setValueAtTime(0.001, now + offset);
      gain.gain.linearRampToValueAtTime(0.11, now + offset + 0.02);
      gain.gain.setValueAtTime(0.11, now + offset + duration - 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, now + offset + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + offset);
      lfo.start(now + offset);
      osc.stop(now + offset + duration);
      lfo.stop(now + offset + duration);
    };

    if (kind === 'point') {
      playTweet(0, 0.24, 2750);
    } else if (kind === 'start') {
      playTweet(0, 0.16, 2650);
      playTweet(0.22, 0.28, 2850);
    } else {
      playTweet(0, 0.14, 2750);
      playTweet(0.18, 0.14, 2750);
      playTweet(0.36, 0.42, 2900);
    }
  }

  public playUltimateCutscene() {
    const ctx = this.getCtx();
    if (!ctx) return;

    const now = ctx.currentTime;
    // Dramatic rising power chord
    const freqs = [110, 165, 220, 330];
    freqs.forEach((f, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = idx % 2 === 0 ? 'sawtooth' : 'triangle';
      osc.frequency.setValueAtTime(f * 0.75, now);
      osc.frequency.exponentialRampToValueAtTime(f * 1.5, now + 0.65);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.07, now + 0.18);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 1.2);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 1.25);
    });
  }

  public playDialogueBlip(pitchMod = 1) {
    const ctx = this.getCtx();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(420 * pitchMod, now);
    gain.gain.setValueAtTime(0.035, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.045);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.05);
  }

  public playGachaReveal(rank: string) {
    const ctx = this.getCtx();
    if (!ctx) return;
    const now = ctx.currentTime;
    const notes =
      rank === 'S+'
        ? [523.25, 659.25, 783.99, 1046.5, 1318.5, 1567.98]
        : rank === 'S' || rank === 'A'
        ? [440, 554.37, 659.25, 880]
        : [349.23, 440, 523.25];

    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = rank === 'S+' ? 'triangle' : 'sine';
      osc.frequency.setValueAtTime(freq, now + i * 0.09);
      gain.gain.setValueAtTime(0.001, now + i * 0.09);
      gain.gain.linearRampToValueAtTime(0.12, now + i * 0.09 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.09 + 0.45);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + i * 0.09);
      osc.stop(now + i * 0.09 + 0.48);
    });
  }

  public playClick() {
    const ctx = this.getCtx();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(640, now);
    osc.frequency.exponentialRampToValueAtTime(420, now + 0.04);
    gain.gain.setValueAtTime(0.06, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.045);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.05);
  }
}

export const soundEngine = new SoundEngine();
