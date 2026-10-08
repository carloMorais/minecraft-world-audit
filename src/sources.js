// Environment-independent world sources (work in Node and in the browser).
// A source exposes list() -> relative paths, read(name) -> Buffer|null, close().
import { ZipArchive } from './format/zip.js';

/** A .mcworld / .zip archive already loaded in memory. */
export class ZipSource {
  constructor(data, label) {
    this.zip = new ZipArchive(data, label);
    this.prefix = this.zip.rootPrefix();
    this.kind = 'archive';
  }
  list() {
    return [...this.zip.entries.keys()]
      .filter(n => n.startsWith(this.prefix))
      .map(n => n.slice(this.prefix.length));
  }
  read(name) { return this.zip.read(this.prefix + name); }
  close() { this.zip.close(); }
}

/** A set of files already in memory, e.g. a world folder picked in the browser: Map(relPath -> Buffer). */
export class MapSource {
  constructor(files) {
    this.files = files;
    this.kind = 'folder';
  }
  list() { return [...this.files.keys()]; }
  read(name) { return this.files.get(name) ?? null; }
  close() { this.files.clear(); }
}
