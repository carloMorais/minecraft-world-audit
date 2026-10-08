#!/usr/bin/env node
import { run } from '../src/cli.js';

try {
  process.exitCode = run(process.argv.slice(2));
} catch (e) {
  process.stderr.write(`erro: ${e.message}\n`);
  if (process.env.MCX_DEBUG) process.stderr.write(`${e.stack}\n`);
  process.exitCode = 1;
}
