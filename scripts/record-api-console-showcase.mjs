#!/usr/bin/env node
/**
 * Records the /showcase auto-play tour via Playwright recordVideo + ffmpeg.
 *
 * Playwright captures ~25fps (not configurable). Screenshot loops freeze the tour.
 *
 * Usage: npm run record:api-console-showcase
 */
import { spawn } from 'node:child_process';
import { existsSync, readdirSync } from 'node:fs';
import { mkdir, readdir, rename, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDir = path.join(root, 'docs', 'assets');
const tempVideoDir = path.join(root, 'tmp', `showcase-video-${process.pid}`);
const baseURL = process.env['SHOWCASE_BASE_URL'] ?? 'http://localhost:4202';
const showcaseURL = `${baseURL}/showcase?capture=1`;
const RECORD_MS = Number(process.env['SHOWCASE_RECORD_MS'] ?? 36_000);
const VIEWPORT = { width: 1075, height: 648 };

function wingetFfmpegCandidates() {
  const packagesRoot = path.join(
    process.env['LOCALAPPDATA'] ?? '',
    'Microsoft/WinGet/Packages',
  );
  if (!existsSync(packagesRoot)) {
    return [];
  }

  return readdirSync(packagesRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && entry.name.startsWith('Gyan.FFmpeg_'))
    .flatMap((entry) => {
      const packageRoot = path.join(packagesRoot, entry.name);
      return readdirSync(packageRoot, { withFileTypes: true })
        .filter((child) => child.isDirectory() && child.name.startsWith('ffmpeg-'))
        .map((child) => path.join(packageRoot, child.name, 'bin/ffmpeg.exe'))
        .filter((candidate) => existsSync(candidate));
    });
}

function resolveFfmpeg() {
  for (const candidate of [
    process.env['FFMPEG_PATH'],
    ...wingetFfmpegCandidates(),
    'ffmpeg',
  ].filter(Boolean)) {
    if (candidate !== 'ffmpeg' && existsSync(candidate)) {
      return candidate;
    }
  }
  return 'ffmpeg';
}

async function waitForServer(url, timeoutMs = 180_000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      if ((await fetch(url)).ok) {
        return;
      }
    } catch {
      // retry
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  throw new Error(`Server not ready: ${url}`);
}

async function ensureServer() {
  try {
    if ((await fetch(showcaseURL)).ok) {
      return null;
    }
  } catch {
    // start server
  }
  const server = spawn('npx nx run api-console:serve', [], {
    cwd: root,
    shell: true,
    stdio: 'pipe',
  });
  await waitForServer(showcaseURL);
  return server;
}

function runFfmpeg(args) {
  return new Promise((resolve, reject) => {
    const ffmpeg = spawn(resolveFfmpeg(), args, { stdio: 'ignore' });
    ffmpeg.on('error', reject);
    ffmpeg.on('exit', (code) =>
      code === 0 ? resolve() : reject(new Error(`ffmpeg exit ${code}`)),
    );
  });
}

async function formatBytes(filePath) {
  const { size } = await stat(filePath);
  return size < 1024 * 1024
    ? `${(size / 1024).toFixed(1)} KB`
    : `${(size / (1024 * 1024)).toFixed(2)} MB`;
}

async function main() {
  await mkdir(outDir, { recursive: true });
  await mkdir(tempVideoDir, { recursive: true });

  const server = await ensureServer();
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: VIEWPORT,
    deviceScaleFactor: 2,
    colorScheme: 'dark',
    recordVideo: { dir: tempVideoDir, size: VIEWPORT },
  });

  const page = await context.newPage();
  await page.goto(showcaseURL, { waitUntil: 'networkidle' });
  const frame = page.locator('.showcase-frame-window');
  await frame.waitFor();
  const box = await frame.boundingBox();
  if (!box || box.width < 1 || box.height < 1) {
    throw new Error('Showcase frame has no measurable bounds');
  }
  const clipW = Math.round(box.width);
  const clipH = Math.round(box.height);
  if (clipW !== VIEWPORT.width || clipH !== VIEWPORT.height) {
    console.warn(
      `Frame is ${clipW}x${clipH}, viewport is ${VIEWPORT.width}x${VIEWPORT.height}`,
    );
  }
  await page.waitForTimeout(400);
  await page.waitForTimeout(RECORD_MS);

  await context.close();
  await browser.close();

  const webmFile = (await readdir(tempVideoDir)).find((f) => f.endsWith('.webm'));
  if (!webmFile) {
    throw new Error('No Playwright .webm produced');
  }

  const destWebm = path.join(outDir, 'api-console-showcase.webm');
  const destMp4 = path.join(outDir, 'api-console-showcase.mp4');
  const sourceWebm = path.join(tempVideoDir, webmFile);
  const cropW = VIEWPORT.width;
  const cropH = VIEWPORT.height;
  const recordSeconds = String(RECORD_MS / 1000);

  await runFfmpeg([
    '-y',
    '-i',
    sourceWebm,
    '-t',
    recordSeconds,
    '-c',
    'copy',
    destWebm,
  ]);
  await runFfmpeg([
    '-y',
    '-i',
    sourceWebm,
    '-t',
    recordSeconds,
    '-vf',
    `crop=${cropW}:${cropH}:0:0,scale=trunc(iw/2)*2:trunc(ih/2)*2`,
    '-c:v',
    'libx264',
    '-preset',
    'slow',
    '-crf',
    '15',
    '-r',
    '25',
    '-pix_fmt',
    'yuv420p',
    '-movflags',
    '+faststart',
    destMp4,
  ]);

  if (server) {
    server.kill();
  }

  console.log(`WebM: ${destWebm} (${await formatBytes(destWebm)}) ~25fps`);
  console.log(`MP4:  ${destMp4} (${await formatBytes(destMp4)})`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
