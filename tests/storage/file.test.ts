import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { FileStorage } from '../../src/storage/file.js';
import { rmSync, existsSync, readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

describe('FileStorage', () => {
  const baseDir = join(tmpdir(), 'oneira-test-storage-' + Date.now());
  let storage: FileStorage;

  beforeEach(() => {
    storage = new FileStorage(baseDir);
  });

  afterEach(() => {
    rmSync(baseDir, { recursive: true, force: true });
  });

  describe('state', () => {
    it('returns empty state when no file exists', async () => {
      const state = await storage.readState();
      expect(state.currentDreamDate).toBeNull();
      expect(state.completedPhases).toEqual([]);
      expect(state.lastDreamAt).toBeNull();
      expect(state.lucidPrompt).toBeNull();
    });

    it('writes and reads state', async () => {
      await storage.writeState({
        currentDreamDate: '2026-04-03',
        completedPhases: ['consolidation', 'synthesis'],
        lastDreamAt: '2026-04-03T23:15:00+02:00',
        lucidPrompt: null,
      });

      const state = await storage.readState();
      expect(state.currentDreamDate).toBe('2026-04-03');
      expect(state.completedPhases).toEqual(['consolidation', 'synthesis']);
    });
  });

  describe('journal', () => {
    it('returns null for non-existent journal', async () => {
      const journal = await storage.readJournal('2026-04-03');
      expect(journal).toBeNull();
    });

    it('writes and reads journal', async () => {
      await storage.writeJournal('2026-04-03', '# Dream Journal\n\nContent here');
      const journal = await storage.readJournal('2026-04-03');
      expect(journal).toBe('# Dream Journal\n\nContent here');
    });

    it('lists journals by date', async () => {
      await storage.writeJournal('2026-04-01', 'day 1');
      await storage.writeJournal('2026-04-02', 'day 2');
      const list = await storage.listJournals();
      expect(list).toContain('2026-04-01');
      expect(list).toContain('2026-04-02');
    });
  });

  describe('drafts', () => {
    it('writes draft to correct path', async () => {
      await storage.writeDraft('2026-04-03', 'pr-feat-x.md', '## Summary\n\nPR content');
      const draftPath = join(baseDir, 'drafts', '2026-04-03', 'pr-feat-x.md');
      expect(existsSync(draftPath)).toBe(true);
      expect(readFileSync(draftPath, 'utf-8')).toBe('## Summary\n\nPR content');
    });
  });

  describe('memory', () => {
    it('lists memory files', async () => {
      const memDir = join(baseDir, 'memory');
      mkdirSync(memDir, { recursive: true });
      writeFileSync(join(memDir, 'notes.md'), 'some notes');
      writeFileSync(join(memDir, 'context.md'), 'some context');

      const memoryStore = storage.getMemoryStore();
      const files = await memoryStore.list();
      expect(files).toContain('notes.md');
      expect(files).toContain('context.md');
    });

    it('reads memory file', async () => {
      const memDir = join(baseDir, 'memory');
      mkdirSync(memDir, { recursive: true });
      writeFileSync(join(memDir, 'notes.md'), 'my notes');

      const memoryStore = storage.getMemoryStore();
      const content = await memoryStore.read('notes.md');
      expect(content).toBe('my notes');
    });

    it('returns null for non-existent memory file', async () => {
      const memoryStore = storage.getMemoryStore();
      const content = await memoryStore.read('nope.md');
      expect(content).toBeNull();
    });

    it('returns empty list when no memory dir exists', async () => {
      const memoryStore = storage.getMemoryStore();
      const files = await memoryStore.list();
      expect(files).toEqual([]);
    });
  });
});
