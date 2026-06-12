// Fetches the AI-generated art into public/ (skipped if already present;
// failures are non-fatal — scenes fall back to procedural visuals).
// Runs automatically via the predev / prebuild npm hooks.
//
// To use your own artwork instead, drop files at the same paths — existing
// files always win. Skies: ~2560x1080 stills. Videos: 16:9 mp4 loops.

import { mkdir, writeFile, access } from 'node:fs/promises';
import { dirname } from 'node:path';

const CDN = 'https://d8j0ntlcm91z4.cloudfront.net/user_337odgb07MYQJoGWGrBKV5au8Aw';
const ASSETS = {
  // painted sky domes (Dunes / Temple / Fleet chapters)
  'public/skies/dunes.png': `${CDN}/hf_20260612_184722_1bf8d079-73ee-4a71-a075-445f2a04bc71.png`,
  'public/skies/temple.png': `${CDN}/hf_20260612_184724_9abad84b-c583-4b72-a391-63f69cf84f19.png`,
  'public/skies/fleet.png': `${CDN}/hf_20260612_184728_4895e6dd-666f-4ca4-a5c3-e7da5c741302.png`,
  // film loops for THE MONOLITH chapter
  'public/videos/awaken.mp4': `${CDN}/hf_20260612_204322_7fe077b9-0b96-4595-a290-26034c1eb48a.mp4`,
  'public/videos/crowd.mp4': `${CDN}/hf_20260612_204325_cfe5f7d6-c49c-4d4c-b180-fe76076af65f.mp4`,
  'public/videos/nebula.mp4': `${CDN}/hf_20260612_204345_4898648a-4f49-4d03-8c0e-587136cf5716.mp4`,
  'public/videos/hyper.mp4': `${CDN}/hf_20260612_204330_1ce97cc2-2ff5-4ccf-b55a-45b4380f2e71.mp4`,
};

for (const [path, url] of Object.entries(ASSETS)) {
  try {
    await access(path);
    console.log(`assets: ${path} already present`);
    continue;
  } catch { /* not downloaded yet */ }
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, Buffer.from(await res.arrayBuffer()));
    console.log(`assets: fetched ${path}`);
  } catch (e) {
    console.warn(`assets: could not fetch ${path} (${e.message}) — procedural fallback will be used`);
  }
}
