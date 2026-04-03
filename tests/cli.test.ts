// tests/cli.test.ts
import { describe, it, expect } from 'vitest';
import { execSync } from 'node:child_process';
import { join } from 'node:path';

describe('CLI', () => {
  const cliPath = join(__dirname, '..', 'src', 'cli.ts');

  it('shows help', () => {
    const output = execSync(`npx tsx ${cliPath} --help`, {
      encoding: 'utf-8',
      cwd: join(__dirname, '..'),
    });
    expect(output).toContain('Your agent sleeps. Oneira dreams.');
    expect(output).toContain('dream');
    expect(output).toContain('init');
    expect(output).toContain('lucid');
    expect(output).toContain('journal');
    expect(output).toContain('schedule');
  });

  it('schedule prints cron instructions', () => {
    const output = execSync(`npx tsx ${cliPath} schedule`, {
      encoding: 'utf-8',
      cwd: join(__dirname, '..'),
    });
    expect(output).toContain('22');
    expect(output).toContain('cron');
  });
});
