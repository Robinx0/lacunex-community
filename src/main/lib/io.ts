import {
  writeFileSync,
  readFileSync,
  unlinkSync,
  existsSync,
  mkdirSync,
  renameSync,
} from 'node:fs';

/**
 * Minimal file I/O abstraction. Lets services be constructed with a
 * spy/stub in tests instead of touching the real disk.
 */
export interface FileIO {
  writeFile(path: string, data: Buffer): void;
  readFile(path: string): Buffer | null;
  unlink(path: string): void;
  rename(from: string, to: string): void;
  ensureDir(path: string): void;
  exists(path: string): boolean;
}

export const NodeFileIO: FileIO = {
  writeFile: (p, data) => writeFileSync(p, data),
  readFile: (p) => (existsSync(p) ? readFileSync(p) : null),
  unlink: (p) => {
    if (existsSync(p)) unlinkSync(p);
  },
  rename: (from, to) => renameSync(from, to),
  ensureDir: (p) => mkdirSync(p, { recursive: true }),
  exists: (p) => existsSync(p),
};

/**
 * In-memory FileIO for tests. Backed by a `Map<path, Buffer>` so writes
 * are observable and reads round-trip without touching the OS.
 */
export function createInMemoryFileIO(): FileIO & { dump: () => Map<string, Buffer> } {
  const store = new Map<string, Buffer>();
  return {
    writeFile: (p, data) => {
      store.set(p, Buffer.from(data));
    },
    readFile: (p) => store.get(p) ?? null,
    unlink: (p) => {
      store.delete(p);
    },
    rename: (from, to) => {
      const buf = store.get(from);
      if (!buf) throw new Error(`rename: source not found: ${from}`);
      store.set(to, buf);
      store.delete(from);
    },
    ensureDir: () => {
      // memory doesn't need directories — keep API parity.
    },
    exists: (p) => store.has(p),
    dump: () => store,
  };
}
