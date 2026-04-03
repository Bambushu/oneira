import {
  readFileSync,
  writeFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
} from 'node:fs';
import { join, basename } from 'node:path';
import type { StorageAdapter, DreamState, MemoryStore } from '../types.js';

export class FileStorage implements StorageAdapter {
  private readonly baseDir: string;

  constructor(baseDir: string) {
    this.baseDir = baseDir;
  }

  async readState(): Promise<DreamState> {
    const path = join(this.baseDir, 'state.json');
    if (!existsSync(path)) {
      return {
        currentDreamDate: null,
        completedPhases: [],
        lastDreamAt: null,
        lucidPrompt: null,
      };
    }
    const raw = readFileSync(path, 'utf-8');
    return JSON.parse(raw);
  }

  async writeState(state: DreamState): Promise<void> {
    mkdirSync(this.baseDir, { recursive: true });
    const path = join(this.baseDir, 'state.json');
    writeFileSync(path, JSON.stringify(state, null, 2) + '\n');
  }

  async readJournal(date: string): Promise<string | null> {
    const path = join(this.baseDir, 'dreams', `${date}.md`);
    if (!existsSync(path)) return null;
    return readFileSync(path, 'utf-8');
  }

  async writeJournal(date: string, content: string): Promise<void> {
    const dir = join(this.baseDir, 'dreams');
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, `${date}.md`), content);
  }

  async listJournals(): Promise<string[]> {
    const dir = join(this.baseDir, 'dreams');
    if (!existsSync(dir)) return [];
    return readdirSync(dir)
      .filter((f) => f.endsWith('.md'))
      .map((f) => basename(f, '.md'))
      .sort();
  }

  async writeDraft(date: string, name: string, content: string): Promise<void> {
    const dir = join(this.baseDir, 'drafts', date);
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, name), content);
  }

  getMemoryStore(): MemoryStore {
    const memDir = join(this.baseDir, 'memory');
    return {
      async list(): Promise<string[]> {
        if (!existsSync(memDir)) return [];
        return readdirSync(memDir).filter((f) => !f.startsWith('.'));
      },
      async read(name: string): Promise<string | null> {
        const path = join(memDir, name);
        if (!existsSync(path)) return null;
        return readFileSync(path, 'utf-8');
      },
    };
  }
}
