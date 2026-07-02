#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');
const input = process.argv[2] || 'editor/AMC.tmj';
const output = process.argv[3] || 'world_data.js';

function run(args) {
  const result = spawnSync(process.execPath, args, {
    cwd: repoRoot,
    stdio: 'inherit',
    shell: false,
  });
  if (result.status !== 0) process.exit(result.status || 1);
}

run(['editor/validate-tiled-world.mjs', input]);
run(['editor/import-tiled-world.mjs', input, output]);
console.log('World build complete.');
