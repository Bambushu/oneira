import { createHash } from 'node:crypto';
import { execSync } from 'node:child_process';

export function deriveProjectId(repoRoot: string | null): string {
  if (!repoRoot) return 'default';
  const hash = createHash('sha256').update(repoRoot).digest('hex');
  return hash.slice(0, 8);
}

export function getGitRoot(): string | null {
  try {
    const root = execSync('git rev-parse --show-toplevel', {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    }).trim();
    return root || null;
  } catch {
    return null;
  }
}

export function resolveProjectId(): string {
  return deriveProjectId(getGitRoot());
}
