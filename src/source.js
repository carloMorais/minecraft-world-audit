// Node-only: opens a world from disk (a .mcworld/.zip archive or an extracted world folder).
import fs from 'fs';
import path from 'path';
import { ZipSource } from './sources.js';

class FolderSource {
  constructor(dir) {
    this.root = dir;
    this.kind = 'folder';
  }
  list() {
    const out = [];
    const walk = (d, rel) => {
      for (const e of fs.readdirSync(d, { withFileTypes: true })) {
        const r = rel ? `${rel}/${e.name}` : e.name;
        if (e.isDirectory()) walk(path.join(d, e.name), r);
        else out.push(r);
      }
    };
    walk(this.root, '');
    return out;
  }
  read(name) {
    const p = path.join(this.root, name);
    const resolvedP = path.resolve(p);
    const resolvedRoot = path.resolve(this.root);
    if (!resolvedP.startsWith(resolvedRoot + path.sep) && resolvedP !== resolvedRoot) {
      return null;
    }
    return fs.existsSync(p) ? fs.readFileSync(p) : null;
  }
  close() {}
}

export function openSource(target) {
  if (!fs.existsSync(target)) throw new Error(`not found: ${target}`);
  if (fs.statSync(target).isDirectory()) {
    if (fs.existsSync(path.join(target, 'level.dat'))) return new FolderSource(target);
    throw new Error(`${target}: folder has no level.dat`);
  }
  return new ZipSource(fs.readFileSync(target), target);
}
