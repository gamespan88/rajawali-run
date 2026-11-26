// Rajawali Run — hand-in program (Node 22, standard library only).
// The game is this directory's game/ folder: plain static files a desktop
// browser plays offline. This program copies game/ and screenshots/ to
// /output and writes /output/dossier.json, the summary the judge reads,
// using the vendored make.fun library. Outside the grader's container,
// MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// The scorer's own caps, checked before anything is copied: refuse
// anything the scorer would refuse — fewer than 3 or more than 4
// screenshots, or one over 256 KiB; more than 993 files and directories
// in game/ or 48 MiB of game files in all; a path under game/ longer
// than 1000 UTF-8 bytes.
const MAX_SHOTS = 4;
const MAX_SHOT_BYTES = 256 * 1024;
const MAX_GAME_FILES = 993;
const MAX_GAME_BYTES = 48 * 1024 * 1024;
const MAX_PATH_BYTES = 1000;

function walk(dir: string, base: string, acc: { files: number; bytes: number }): void {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    const rel = base ? `${base}/${name}` : name;
    if (Buffer.byteLength(rel, 'utf8') > MAX_PATH_BYTES) {
      throw new Error(`path too long: ${rel}`);
    }
    const info = statSync(full);
    if (info.isDirectory()) {
      acc.files += 1; // directories count against the 993 cap too
      walk(full, rel, acc);
    } else {
      acc.files += 1;
      acc.bytes += info.size;
    }
  }
}

const gameDir = join(here, 'game');
const gameStats = { files: 0, bytes: 0 };
walk(gameDir, '', gameStats);
if (gameStats.files > MAX_GAME_FILES) {
  throw new Error(`game/ holds ${gameStats.files} files and directories, over the ${MAX_GAME_FILES} cap`);
}
if (gameStats.bytes > MAX_GAME_BYTES) {
  throw new Error(`game/ is ${gameStats.bytes} bytes, over the ${MAX_GAME_BYTES} cap`);
}

const shotsDir = join(here, 'screenshots');
const shotNames = existsSync(shotsDir)
  ? readdirSync(shotsDir).filter((n) => !n.startsWith('.')).sort()
  : [];
if (shotNames.length < 3 || shotNames.length > MAX_SHOTS) {
  throw new Error(`screenshots/ must hold 3 or 4 images, found ${shotNames.length}`);
}
for (const name of shotNames) {
  const size = statSync(join(shotsDir, name)).size;
  if (size > MAX_SHOT_BYTES) {
    throw new Error(`screenshot ${name} is ${size} bytes, over the ${MAX_SHOT_BYTES} cap`);
  }
}

mkdirSync(out, { recursive: true });
cpSync(gameDir, join(out, 'game'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
cpSync(shotsDir, join(out, 'screenshots'), { recursive: true });

// The dossier is built from the handed-in copy, with the scorer's caps.
const dossier = buildDossier(out, {
  text_max_bytes: 163840,
  screenshots: { max: MAX_SHOTS, max_bytes: MAX_SHOT_BYTES },
  game_max_files: MAX_GAME_FILES,
  game_max_bytes: MAX_GAME_BYTES,
  game_path_max_bytes: MAX_PATH_BYTES,
});
writeFileSync(join(out, 'dossier.json'), dossier);
console.log(`handed in: ${gameStats.files} game files, ${shotNames.length} screenshots, dossier ${dossier.length} bytes`);
