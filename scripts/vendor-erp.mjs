#!/usr/bin/env node
// scripts/vendor-erp.mjs — copy the ERP runtime into public/erp/ at build time.
//
// PRD-001 R2: the runtime is copied in from a *pinned* ref of NeoDonkey/NeoDonkey-ERP, never
// from its main, and never as a modified copy. Everything this script writes is either a byte
// copy of a file from that ref or the one primitive a static host cannot provide (see `_files`
// below). If the ERP needs a change to be usable this way, that is an issue in the ERP.
//
// The vendored tree is not committed here — it is a build output, and .gitignore says so. That
// is what keeps "no fork, no vendored modification" true rather than merely intended.
//
// Zero npm dependencies: fetch is global, tar ships with macOS and every CI image we use.

import { execFile } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdtemp, mkdir, rm, readFile, writeFile, cp, readdir, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

const run = promisify(execFile);
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const target = join(root, 'public', 'erp');
const stampFile = join(target, '.pin');

const pin = JSON.parse(await readFile(join(root, 'erp.pin.json'), 'utf8'));
const force = process.argv.includes('--force');

const stamp = `${pin.repository}@${pin.ref}`;
if (!force && existsSync(stampFile) && (await readFile(stampFile, 'utf8')).trim() === stamp) {
  console.log(`erp: public/erp is already ${stamp}`);
  process.exit(0);
}

const tarball = `https://codeload.github.com/${pin.repository}/tar.gz/${pin.ref}`;
console.log(`erp: fetching ${stamp}`);

const work = await mkdtemp(join(tmpdir(), 'neodonkey-erp-'));
try {
  const res = await fetch(tarball);
  if (!res.ok) throw new Error(`${tarball} returned ${res.status} ${res.statusText}`);
  const bytes = Buffer.from(await res.arrayBuffer());
  const archive = join(work, 'erp.tar.gz');
  await writeFile(archive, bytes);
  console.log(`erp: ${(bytes.length / 1024 / 1024).toFixed(1)} MB, sha256 `
    + createHash('sha256').update(bytes).digest('hex').slice(0, 16));

  // Extract the whole archive and copy out what we want afterwards, rather than asking tar to
  // filter: the include/exclude flags differ between GNU tar and the bsdtar on macOS, and a
  // build step that works on one machine and silently copies nothing on the other is worse
  // than a few megabytes of temporary files. --strip-components=1 drops the
  // `NeoDonkey-ERP-<ref>/` wrapper GitHub adds, which both tars do agree on.
  await run('tar', ['-xzf', archive, '-C', work, '--strip-components=1']);

  await rm(target, { recursive: true, force: true });
  await mkdir(target, { recursive: true });

  for (const entry of pin.copy) {
    const from = join(work, entry);
    if (!existsSync(from)) throw new Error(`${entry} is not in ${stamp}`);
    await cp(from, join(target, entry), { recursive: true });
  }

  // The one thing a static host cannot answer. runtime/ui/storage.js asks
  // `GET _files?under=operating-model` for the list of operating-model files to seed a fresh
  // workspace with, because HTTP has no directory listing; serve.mjs answers it in the ERP
  // repository and GitHub Pages cannot. A static JSON file at the same path answers the same
  // question with the same shape — query strings are ignored by static hosts — so the demo
  // opens on the ERP's real operating model instead of the built-in starter.
  //
  // This is host configuration, not a patch to the ERP: not one vendored byte is changed.
  const modelFiles = (await walk(join(target, 'operating-model')))
    .filter((p) => p.endsWith('.md'))
    .map((p) => `operating-model/${relative(join(target, 'operating-model'), p).split('\\').join('/')}`)
    .sort();
  if (modelFiles.length === 0) throw new Error('the pinned ref has no operating-model/*.md files');
  await writeFile(join(target, '_files'),
    JSON.stringify({ root: 'operating-model', files: modelFiles }, null, 2) + '\n');

  await writeFile(stampFile, `${stamp}\n`);
  const count = (await walk(target)).length;
  console.log(`erp: ${count} files in public/erp (${modelFiles.length} operating-model documents)`);
} finally {
  await rm(work, { recursive: true, force: true });
}

async function walk(dir) {
  const out = [];
  for (const name of await readdir(dir)) {
    const path = join(dir, name);
    if ((await stat(path)).isDirectory()) out.push(...await walk(path));
    else out.push(path);
  }
  return out;
}
