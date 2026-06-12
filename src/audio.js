// AudioEngine — real-time musical analysis for the visual director.
//
// Sources: audio file (via <audio> element), live input (mic / line-in from a
// DJ mixer), or captured tab audio. Every frame it exposes:
//   bass / mid / high  — band energies 0..1 (plus smoothed sBass/sMid/sHigh)
//   level / intensity  — overall loudness and a slow-normalized 0..1 "section energy"
//   beat / beatPhase   — beat trigger (true for one frame) and 0..1 progress to next beat
//   bpm, beatCount, barCount, section ('groove' | 'peak' | 'breakdown')
// Events: 'beat', 'bar', 'phrase' (32 beats), 'section', 'drop', 'trackend'

export class AudioEngine {
  constructor() {
    this.ctx = null;
    this.analyser = null;
    this.freqData = null;
    this.timeData = null;
    this.currentNode = null;
    this.stream = null;
    this.sourceType = 'none';

    this.mediaEl = new Audio();
    this.mediaEl.preload = 'auto';
    this._mediaSrcNode = null;
    this._objectUrl = null;
    this.mediaEl.addEventListener('ended', () => this._emit('trackend'));

    // per-frame outputs
    this.bass = 0; this.mid = 0; this.high = 0;
    this.sBass = 0; this.sMid = 0; this.sHigh = 0;
    this.level = 0;
    this.intensity = 0;
    this.beat = false;
    this.beatPhase = 0;
    this.bpm = 0;
    this.beatCount = 0;
    this.barCount = 0;
    this.section = 'groove';

    // internals
    this._bassHist = [];
    this._lastBeatT = -10;
    this._intervals = [];
    this._envMin = 0.05;
    this._envMax = 0.2;
    this._sectionHoldUntil = 0;
    this._listeners = {};
  }

  on(evt, fn) { (this._listeners[evt] ??= []).push(fn); }
  _emit(evt, data) { (this._listeners[evt] || []).forEach((f) => f(data)); }

  get active() { return this.sourceType !== 'none'; }

  resume() { if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume(); }

  _ensureCtx() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      this.analyser = this.ctx.createAnalyser();
      this.analyser.fftSize = 2048;
      this.analyser.smoothingTimeConstant = 0.45;
      this.freqData = new Uint8Array(this.analyser.frequencyBinCount);
      this.timeData = new Uint8Array(this.analyser.fftSize);
    }
    this.resume();
  }

  // ---------- sources ----------

  async useFile(file) {
    this._ensureCtx();
    this._teardownStream();
    if (!this._mediaSrcNode) {
      this._mediaSrcNode = this.ctx.createMediaElementSource(this.mediaEl);
    }
    this._connect(this._mediaSrcNode, /* monitor */ true);
    if (this._objectUrl) URL.revokeObjectURL(this._objectUrl);
    this._objectUrl = URL.createObjectURL(file);
    this.mediaEl.src = this._objectUrl;
    this.sourceType = 'file';
    this._resetMusicState();
    await this.mediaEl.play();
  }

  async useMic() {
    this._ensureCtx();
    // disable browser voice processing — it destroys music dynamics
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
    });
    this._setStream(stream, 'mic');
  }

  async useTab() {
    this._ensureCtx();
    const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
    if (!stream.getAudioTracks().length) {
      stream.getTracks().forEach((t) => t.stop());
      throw new Error('No audio in capture — pick a tab and tick "share tab audio".');
    }
    this._setStream(stream, 'tab');
  }

  _setStream(stream, type) {
    this.mediaEl.pause();
    this._teardownStream();
    this.stream = stream;
    const node = this.ctx.createMediaStreamSource(stream);
    // analyser only — no monitoring, the room is already loud
    this._connect(node, false);
    this.sourceType = type;
    this._resetMusicState();
    stream.getAudioTracks()[0].addEventListener('ended', () => {
      if (this.stream === stream) { this._teardownStream(); this.sourceType = 'none'; }
    });
  }

  _connect(node, monitor) {
    if (this.currentNode) this.currentNode.disconnect();
    this.currentNode = node;
    node.connect(this.analyser);
    this.analyser.disconnect();
    if (monitor) this.analyser.connect(this.ctx.destination);
  }

  _teardownStream() {
    if (this.stream) {
      this.stream.getTracks().forEach((t) => t.stop());
      this.stream = null;
    }
  }

  _resetMusicState() {
    this._bassHist.length = 0;
    this._intervals.length = 0;
    this.bpm = 0;
    this.beatCount = 0;
    this.barCount = 0;
    this._envMin = 0.05;
    this._envMax = 0.2;
    this.section = 'groove';
  }

  togglePlay() {
    if (this.sourceType !== 'file') return;
    this.resume();
    if (this.mediaEl.paused) this.mediaEl.play();
    else this.mediaEl.pause();
  }

  // ---------- per-frame analysis ----------

  _band(loHz, hiHz) {
    const nyquist = this.ctx.sampleRate / 2;
    const n = this.freqData.length;
    let lo = Math.max(1, Math.round((loHz / nyquist) * n));
    let hi = Math.min(n - 1, Math.round((hiHz / nyquist) * n));
    let sum = 0;
    for (let i = lo; i <= hi; i++) sum += this.freqData[i];
    return sum / ((hi - lo + 1) * 255);
  }

  update(dt) {
    this.beat = false;
    if (!this.analyser || this.sourceType === 'none') {
      // decay toward silence so visuals settle gracefully
      this.sBass *= 0.95; this.sMid *= 0.95; this.sHigh *= 0.95;
      this.level *= 0.95; this.intensity *= 0.98;
      return;
    }

    const now = this.ctx.currentTime;
    this.analyser.getByteFrequencyData(this.freqData);
    this.analyser.getByteTimeDomainData(this.timeData);

    this.bass = this._band(25, 150);     // kick drum fundamental
    this.mid = this._band(250, 2000);    // synths, vocals, claps
    this.high = this._band(4000, 12000); // hats, air
    this.sBass += (this.bass - this.sBass) * Math.min(1, dt * 14);
    this.sMid += (this.mid - this.sMid) * Math.min(1, dt * 10);
    this.sHigh += (this.high - this.sHigh) * Math.min(1, dt * 10);

    let sum = 0;
    for (let i = 0; i < this.timeData.length; i += 2) {
      const v = (this.timeData[i] - 128) / 128;
      sum += v * v;
    }
    this.level = Math.sqrt(sum / (this.timeData.length / 2));

    this._detectBeat(now);
    this._trackIntensity(dt, now);

    // 0..1 progress between beats — drives dance animation between hits
    const interval = this.bpm > 0 ? 60 / this.bpm : 0.5;
    this.beatPhase = Math.min((now - this._lastBeatT) / interval, 1);
  }

  _detectBeat(now) {
    const hist = this._bassHist;
    hist.push({ t: now, e: this.bass });
    while (hist.length && now - hist[0].t > 1.1) hist.shift();
    if (hist.length < 10) return;

    let avg = 0;
    for (const h of hist) avg += h.e;
    avg /= hist.length;

    const sinceLast = now - this._lastBeatT;
    // four-on-the-floor: kick energy spikes above its rolling average.
    // refractory 0.27s allows up to ~220 BPM; floor avoids beats in silence.
    if (this.bass > Math.max(0.09, avg * 1.32) && sinceLast > 0.27) {
      if (sinceLast > 0.27 && sinceLast < 1.4) {
        this._intervals.push(sinceLast);
        if (this._intervals.length > 16) this._intervals.shift();
        this._updateBpm();
      }
      this._lastBeatT = now;
      this.beat = true;
      this.beatCount++;
      this._emit('beat', this.beatCount);
      if (this.beatCount % 4 === 0) {
        this.barCount++;
        this._emit('bar', this.barCount);
      }
      if (this.beatCount % 32 === 0) this._emit('phrase', this.beatCount / 32);
    }
  }

  _updateBpm() {
    if (this._intervals.length < 4) return;
    const sorted = [...this._intervals].sort((a, b) => a - b);
    const median = sorted[sorted.length >> 1];
    let bpm = 60 / median;
    while (bpm > 165) bpm /= 2; // fold octave errors into house range
    while (bpm < 84) bpm *= 2;
    this.bpm = this.bpm > 0 ? this.bpm * 0.85 + bpm * 0.15 : bpm;
  }

  _trackIntensity(dt, now) {
    // slow-adapting min/max envelope → intensity is relative to *this* track,
    // so quiet mixes and loud masters both use the full 0..1 range
    this._envMax = Math.max(this.level, this._envMax - dt * 0.012);
    this._envMin = Math.min(this.level, this._envMin + dt * 0.012);
    const span = this._envMax - this._envMin;
    const target = span > 0.01 ? (this.level - this._envMin) / span : 0.5;
    this.intensity += (target - this.intensity) * Math.min(1, dt * 1.6);

    let next = 'groove';
    if (this.intensity > 0.74) next = 'peak';
    else if (this.intensity < 0.3) next = 'breakdown';

    if (next !== this.section && now > this._sectionHoldUntil) {
      const wasBreakdown = this.section === 'breakdown';
      this.section = next;
      this._sectionHoldUntil = now + 5;
      this._emit('section', next);
      if (next === 'peak' && wasBreakdown) this._emit('drop');
    }
  }
}
