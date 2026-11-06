/** Original quiet pentatonic phrases, synthesized after a user gesture. */
export class AmbientMusic {
  constructor() { this.context = null; this.timer = null; this.enabled = false; this.phrase = 0; }
  async setEnabled(enabled) {
    this.enabled = enabled;
    if (!enabled) { this.pause(); return; }
    const Audio = globalThis.AudioContext || globalThis.webkitAudioContext;
    if (!Audio) { this.enabled = false; throw new Error('此浏览器暂不支持合成背景音。'); }
    this.context ||= new Audio();
    await this.context.resume(); this.play();
  }
  play() {
    if (!this.enabled || this.timer || !this.context || document.hidden) return;
    const notes = [196, 220, 261.63, 293.66, 329.63, 392];
    const phrase = () => {
      const pattern = [[0, 2, 3, 5], [3, 2, 1, 0], [1, 3, 5, 2], [5, 3, 2, 0]][this.phrase++ % 4];
      pattern.forEach((note, i) => {
        const start = this.context.currentTime + 0.02 + i * 0.8;
        const oscillator = this.context.createOscillator(), gain = this.context.createGain(); oscillator.type = 'sine'; oscillator.frequency.value = notes[note];
        gain.gain.setValueAtTime(0, start); gain.gain.linearRampToValueAtTime(0.032, start + 0.05); gain.gain.exponentialRampToValueAtTime(0.0001, start + 2.5);
        oscillator.connect(gain); gain.connect(this.context.destination); oscillator.start(start); oscillator.stop(start + 2.6);
        oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); };
      });
    };
    phrase(); this.timer = setInterval(phrase, 6200);
  }
  pause() { if (this.timer) clearInterval(this.timer); this.timer = null; if (this.context?.state === 'running') void this.context.suspend(); }
  async resume() { if (this.enabled && this.context) { await this.context.resume(); this.play(); } }
}
