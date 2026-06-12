#!/usr/bin/env node
// MUSICMOVIE → OSC bridge.
// Browsers can't send UDP, so this tiny relay accepts the web app's WebSocket
// stream (the LINK button) and rebroadcasts it as OSC — the live-show protocol
// Unreal Engine, TouchDesigner, Resolume, Notch and MadMapper all understand.
//
//   npm run bridge                                          # ws :7400 → osc 127.0.0.1:8000
//   node scripts/osc-bridge.mjs --osc-host 192.168.1.50 --osc-port 9000
//
// Wire protocol from the app, one JSON object per WebSocket message:
//   {"a":"/mm/audio","f":[bpm,bass,mid,high,intensity,phase]}   floats
//   {"a":"/mm/beat","i":129}                                    int32
//   {"a":"/mm/section","s":"peak"}                              string
//   {"a":"/mm/drop"}                                            no args

import dgram from 'node:dgram';
import { pathToFileURL } from 'node:url';
import { WebSocketServer } from 'ws';

function oscString(s) {
  const len = Buffer.byteLength(s, 'ascii') + 1; // null terminator
  const padded = Math.ceil(len / 4) * 4; // OSC pads strings to 4 bytes
  const b = Buffer.alloc(padded);
  b.write(s, 0, 'ascii');
  return b;
}

// args: [{ type: 'f' | 'i' | 's', value }]
export function encodeOsc(address, args = []) {
  const parts = [oscString(address), oscString(',' + args.map((a) => a.type).join(''))];
  for (const a of args) {
    if (a.type === 'f') {
      const b = Buffer.alloc(4);
      b.writeFloatBE(Number(a.value) || 0);
      parts.push(b);
    } else if (a.type === 'i') {
      const b = Buffer.alloc(4);
      b.writeInt32BE(a.value | 0);
      parts.push(b);
    } else if (a.type === 's') {
      parts.push(oscString(String(a.value)));
    }
  }
  return Buffer.concat(parts);
}

export function startBridge({ wsPort = 7400, oscHost = '127.0.0.1', oscPort = 8000, quiet = false } = {}) {
  const log = quiet ? () => {} : console.log;
  const udp = dgram.createSocket('udp4');
  const wss = new WebSocketServer({ host: '127.0.0.1', port: wsPort });

  wss.on('listening', () => {
    log(`bridge: ws://127.0.0.1:${wss.address().port}  →  osc udp://${oscHost}:${oscPort}`);
    log('bridge: click LINK in MUSICMOVIE to start streaming');
  });

  wss.on('connection', (sock) => {
    log('bridge: MUSICMOVIE connected');
    sock.on('message', (data) => {
      let m;
      try { m = JSON.parse(data); } catch { return; }
      if (typeof m.a !== 'string' || !m.a.startsWith('/')) return;
      const args = [];
      if (Array.isArray(m.f)) for (const v of m.f) args.push({ type: 'f', value: v });
      if (typeof m.i === 'number') args.push({ type: 'i', value: m.i });
      if (typeof m.s === 'string') args.push({ type: 's', value: m.s });
      udp.send(encodeOsc(m.a, args), oscPort, oscHost);
    });
    sock.on('close', () => log('bridge: app disconnected'));
  });

  return { wss, udp, close() { wss.close(); udp.close(); } };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const arg = (name, dflt) => {
    const i = process.argv.indexOf(name);
    return i > -1 && process.argv[i + 1] ? process.argv[i + 1] : dflt;
  };
  startBridge({
    wsPort: Number(arg('--ws-port', 7400)),
    oscHost: arg('--osc-host', '127.0.0.1'),
    oscPort: Number(arg('--osc-port', 8000)),
  });
}
