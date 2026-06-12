// LINK: streams the live analysis to the local OSC bridge
// (scripts/osc-bridge.mjs) so Unreal Engine, TouchDesigner, Resolume or Notch
// can render off the same musical brain. Continuous values go at 30 Hz;
// musical events (beat / bar / phrase / drop / section) are sent the frame
// they happen. Loopback WebSockets are allowed even from the https build.

export class SyncOutput {
  constructor(audio) {
    this.audio = audio;
    this.enabled = false;
    this.connected = false;
    this.ws = null;
    this.onStatus = null;
    this._acc = 0;
    this._retry = 0;
    audio.on('beat', (n) => this._send({ a: '/mm/beat', i: n }));
    audio.on('bar', (n) => this._send({ a: '/mm/bar', i: n }));
    audio.on('phrase', (n) => this._send({ a: '/mm/phrase', i: n }));
    audio.on('drop', () => this._send({ a: '/mm/drop' }));
    audio.on('section', (s) => this._send({ a: '/mm/section', s }));
  }

  toggle() {
    if (this.enabled) this.disable();
    else this.enable();
    return this.enabled;
  }

  enable() {
    this.enabled = true;
    this._open();
  }

  disable() {
    this.enabled = false;
    clearTimeout(this._retry);
    if (this.ws) this.ws.close();
    this.ws = null;
    this.connected = false;
  }

  _open() {
    if (!this.enabled || this.ws) return;
    const ws = new WebSocket('ws://127.0.0.1:7400');
    this.ws = ws;
    ws.onopen = () => {
      this.connected = true;
      this.onStatus?.(true);
    };
    ws.onclose = () => {
      const was = this.connected;
      this.connected = false;
      this.ws = null;
      if (was) this.onStatus?.(false);
      // keep trying while armed — the bridge may start after the app
      if (this.enabled) this._retry = setTimeout(() => this._open(), 2000);
    };
    ws.onerror = () => ws.close();
  }

  update(dt) {
    if (!this.connected) return;
    this._acc += dt;
    if (this._acc < 1 / 30) return;
    this._acc = 0;
    const a = this.audio;
    // combined frame for engines, individual addresses for easy VJ mapping
    this._send({ a: '/mm/audio', f: [a.bpm, a.sBass, a.sMid, a.sHigh, a.intensity, a.beatPhase] });
    this._send({ a: '/mm/bpm', f: [a.bpm] });
    this._send({ a: '/mm/bass', f: [a.sBass] });
    this._send({ a: '/mm/mid', f: [a.sMid] });
    this._send({ a: '/mm/high', f: [a.sHigh] });
    this._send({ a: '/mm/intensity', f: [a.intensity] });
  }

  _send(o) {
    if (this.connected) this.ws.send(JSON.stringify(o));
  }
}
