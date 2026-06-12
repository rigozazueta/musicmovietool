// MIDI clock sync (Web MIDI, Chrome/Edge). DJM mixers, CDJs, Ableton and
// Traktor all send MIDI clock: 24 ticks per quarter note (0xF8). When ticks
// are flowing, the AudioEngine swaps its detected beat grid for this one —
// sample-accurate sync for live DJ sets while the audio input still supplies
// band energy and intensity.

export class MidiClock {
  constructor() {
    this.supported = !!navigator.requestMIDIAccess;
    this.enabled = false;
    this.bpm = 0;
    this.tickCount = 0;
    this._tickGaps = [];
    this._lastTickAt = 0;
    this._beatDur = 0.5;
    this._pendingBeats = 0;
  }

  async enable() {
    if (!this.supported) throw new Error('Web MIDI not supported — use Chrome or Edge');
    this.access = await navigator.requestMIDIAccess();
    const bindAll = () => {
      for (const input of this.access.inputs.values()) {
        input.onmidimessage = (e) => this._onMessage(e);
      }
    };
    bindAll();
    this.access.onstatechange = bindAll; // hot-plugging gear mid-set
    this.enabled = true;
  }

  // clock considered live if a tick arrived within the last second
  get fresh() {
    return this.enabled && performance.now() / 1000 - this._lastTickAt < 1;
  }

  consumeBeats() {
    const n = this._pendingBeats;
    this._pendingBeats = 0;
    return n;
  }

  // 0..1 progress through the current beat, interpolated between ticks
  phase() {
    if (!this.fresh) return 0;
    const now = performance.now() / 1000;
    const tickDur = this._beatDur / 24;
    const frac = Math.min((now - this._lastTickAt) / tickDur, 1);
    return Math.min((this.tickCount % 24 + frac) / 24, 1);
  }

  _onMessage(e) {
    const status = e.data[0];
    if (status === 0xf8) { // timing clock
      const now = (e.timeStamp || performance.now()) / 1000;
      const gap = now - this._lastTickAt;
      this._lastTickAt = now;
      if (gap > 0.008 && gap < 0.12) { // 20.8–312 BPM per-tick window
        this._tickGaps.push(gap);
        if (this._tickGaps.length > 48) this._tickGaps.shift();
        if (this._tickGaps.length >= 12) {
          const sorted = [...this._tickGaps].sort((a, b) => a - b);
          this._beatDur = sorted[sorted.length >> 1] * 24;
          const bpm = 60 / this._beatDur;
          this.bpm = this.bpm > 0 ? this.bpm * 0.9 + bpm * 0.1 : bpm;
        }
      }
      this.tickCount++;
      if (this.tickCount % 24 === 0) this._pendingBeats++;
    } else if (status === 0xfa) { // start: realign to beat 1
      this.tickCount = 0;
      this._pendingBeats = 0;
    }
  }
}
