import test from 'node:test';
import assert from 'node:assert';
import path from 'path';
import fs from 'fs';
import { openSource } from '../src/source.js';

test('FolderSource prevents path traversal', () => {
  const testDir = path.join(import.meta.dirname, 'temp_world');
  fs.mkdirSync(testDir, { recursive: true });
  fs.writeFileSync(path.join(testDir, 'level.dat'), 'dummy');
  fs.writeFileSync(path.join(testDir, 'safe.txt'), 'safe content');

  const source = openSource(testDir);

  // Read valid file
  const safeContent = source.read('safe.txt');
  assert.strictEqual(safeContent.toString(), 'safe content');

  // Attempt path traversal
  const outsideContent = source.read('../source.test.js');
  assert.strictEqual(outsideContent, null);

  // Clean up
  fs.rmSync(testDir, { recursive: true, force: true });
});
