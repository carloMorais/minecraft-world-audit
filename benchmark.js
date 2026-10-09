import { performance } from 'perf_hooks';
import { storageReport } from './src/extract/analysis.js';

// Setup mock data
const bases = [];
for (let i = 0; i < 100; i++) {
  const chunks = [];
  for (let c = 0; c < 50; c++) {
    chunks.push([i * 10 + c, i * 10 + c]);
  }
  bases.push({ id: `base_${i}`, dimension: 'overworld', chunkList: chunks });
}

const blockEntities = [];
for (let i = 0; i < 50000; i++) {
  blockEntities.push({
    id: 'Chest',
    dimension: 'overworld',
    position: [Math.random() * 1000 * 16, 64, Math.random() * 1000 * 16],
    items: []
  });
}

const start = performance.now();
storageReport(blockEntities, bases);
const end = performance.now();

console.log(`Execution time: ${(end - start).toFixed(2)} ms`);
