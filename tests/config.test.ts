import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { loadConfig, resolveTimezone } from '../src/config.js';
import { writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

describe('resolveTimezone', () => {
  it('returns system timezone for "auto"', () => {
    const tz = resolveTimezone('auto');
    expect(tz).toBeTruthy();
    expect(tz).not.toBe('auto');
  });

  it('passes through explicit timezones', () => {
    expect(resolveTimezone('Europe/Amsterdam')).toBe('Europe/Amsterdam');
  });
});

describe('loadConfig', () => {
  const tmpDir = join(tmpdir(), 'oneira-test-config-' + Date.now());

  beforeEach(() => {
    mkdirSync(tmpDir, { recursive: true });
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it('loads config from yaml file', () => {
    const yamlContent = `provider: anthropic\nphases:\n  - consolidation\n  - review\n`;
    writeFileSync(join(tmpDir, 'oneira.yaml'), yamlContent);

    const config = loadConfig(tmpDir, 'test-project');
    expect(config.provider).toBe('anthropic');
    expect(config.phases).toEqual(['consolidation', 'review']);
    expect(config.project).toBe('test-project');
  });

  it('uses defaults when yaml has minimal content', () => {
    writeFileSync(join(tmpDir, 'oneira.yaml'), 'provider: anthropic\n');

    const config = loadConfig(tmpDir, 'test-project');
    expect(config.phases).toHaveLength(7);
    expect(config.schedule.start).toBe('22:00');
    expect(config.storage).toBe('file');
  });

  it('throws when no config file found', () => {
    expect(() => loadConfig(tmpDir, 'test-project')).toThrow('No config found');
  });
});
