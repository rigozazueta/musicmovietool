// End-to-end bridge check: boots the bridge on ephemeral ports, connects a
// WebSocket client (as the app would), sends every message shape, and decodes
// the OSC datagrams off a UDP listener. Run: node scripts/test-bridge.mjs

import dgram from 'node:dgram';
import { startBridge } from './osc-bridge.mjs';

function readPaddedString(buf, off) {
  let end = off;
  while (buf[end] !== 0) end++;
  const s = buf.toString('ascii', off, end);
  return [s, off + Math.ceil((end - off + 1) / 4) * 4];
}

function decodeOsc(buf) {
  let [addr, off] = readPaddedString(buf, 0);
  let tags;
  [tags, off] = readPaddedString(buf, off);
  const args = [];
  for (const t of tags.slice(1)) {
    if (t === 'f') { args.push(buf.readFloatBE(off)); off += 4; }
    else if (t === 'i') { args.push(buf.readInt32BE(off)); off += 4; }
    else if (t === 's') { let s; [s, off] = readPaddedString(buf, off); args.push(s); }
  }
  return { addr, args };
}

const waitFor = (cond, ms) => new Promise((res, rej) => {
  const t0 = Date.now();
  const tick = () => cond() ? res() : Date.now() - t0 > ms ? rej(new Error('timeout')) : setTimeout(tick, 20);
  tick();
});

const udp = dgram.createSocket('udp4');
await new Promise((r) => udp.bind(0, '127.0.0.1', r));
const received = [];
udp.on('message', (b) => received.push(decodeOsc(b)));

const bridge = startBridge({ wsPort: 0, oscHost: '127.0.0.1', oscPort: udp.address().port, quiet: true });
await new Promise((r) => bridge.wss.on('listening', r));

const ws = new WebSocket(`ws://127.0.0.1:${bridge.wss.address().port}`);
await new Promise((res, rej) => { ws.onopen = res; ws.onerror = () => rej(new Error('ws connect failed')); });
ws.send(JSON.stringify({ a: '/mm/audio', f: [124, 0.5, 0.25, 0.125, 0.8, 0.1] }));
ws.send(JSON.stringify({ a: '/mm/beat', i: 33 }));
ws.send(JSON.stringify({ a: '/mm/section', s: 'peak' }));
ws.send(JSON.stringify({ a: '/mm/drop' }));

let failed = false;
try {
  await waitFor(() => received.length >= 4, 3000);
  const by = Object.fromEntries(received.map((m) => [m.addr, m.args]));
  const close = (a, b) => Math.abs(a - b) < 1e-4;
  if (!close(by['/mm/audio'][0], 124) || !close(by['/mm/audio'][4], 0.8)) throw new Error('bad floats');
  if (by['/mm/beat'][0] !== 33) throw new Error('bad int');
  if (by['/mm/section'][0] !== 'peak') throw new Error('bad string');
  if (by['/mm/drop'].length !== 0) throw new Error('drop should carry no args');
  console.log('ok   osc bridge — 4 message shapes relayed and decoded');
} catch (e) {
  failed = true;
  console.error('FAIL osc bridge:', e.message);
}

ws.close();
bridge.close();
udp.close();
process.exit(failed ? 1 : 0);
