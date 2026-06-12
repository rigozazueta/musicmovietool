// Fetches the AI-painted sky backdrops into public/skies/ (skipped if already
// present; failures are non-fatal — scenes fall back to procedural skies).
// Runs automatically via the predev / prebuild npm hooks.
//
// To use your own artwork instead, drop 2560x1080-ish images at
// public/skies/{dunes,temple,fleet}.png and they win (existing files are kept).

import { mkdir, writeFile, access } from 'node:fs/promises';

const CDN = 'https://d8j0ntlcm91z4.cloudfront.net/user_337odgb07MYQJoGWGrBKV5au8Aw';
const SKIES = {
  'dunes.png': `${CDN}/hf_20260612_184722_1bf8d079-73ee-4a71-a075-445f2a04bc71.png`,
  'temple.png': `${CDN}/hf_20260612_184724_9abad84b-c583-4b72-a391-63f69cf84f19.png`,
  'fleet.png': `${CDN}/hf_20260612_184728_4895e6dd-666f-4ca4-a5c3-e7da5c741302.png`,
};

await mkdir('public/skies', { recursive: true });

for (const [name, url] of Object.entries(SKIES)) {
  const path = `public/skies/${name}`;
  try {
    await access(path);
    console.log(`skies: ${name} already present`);
    continue;
  } catch { /* not downloaded yet */ }
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    await writeFile(path, Buffer.from(await res.arrayBuffer()));
    console.log(`skies: fetched ${name}`);
  } catch (e) {
    console.warn(`skies: could not fetch ${name} (${e.message}) — procedural sky will be used`);
  }
}
