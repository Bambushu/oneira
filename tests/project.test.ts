import { describe, it, expect } from 'vitest';
import { deriveProjectId, getGitRoot } from '../src/project.js';

describe('deriveProjectId', () => {
  it('returns an 8-char hex string for a path', () => {
    const id = deriveProjectId('/Users/test/my-project');
    expect(id).toMatch(/^[a-f0-9]{8}$/);
  });

  it('returns same hash for same path', () => {
    const a = deriveProjectId('/Users/test/my-project');
    const b = deriveProjectId('/Users/test/my-project');
    expect(a).toBe(b);
  });

  it('returns different hash for different paths', () => {
    const a = deriveProjectId('/Users/test/project-a');
    const b = deriveProjectId('/Users/test/project-b');
    expect(a).not.toBe(b);
  });

  it('returns "default" when path is null', () => {
    const id = deriveProjectId(null);
    expect(id).toBe('default');
  });
});

describe('getGitRoot', () => {
  it('returns a path when inside a git repo', () => {
    const root = getGitRoot();
    expect(root).toBeTruthy();
    expect(root).toContain('oneira');
  });
});
