import { execSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const MAX_TOKEN_CHARS = 32000; // ~8K tokens at 4 chars/token

export function gatherGitLog(days: number = 7, limit: number = 50): string {
  try {
    return execSync(
      `git log --oneline --since="${days} days ago" -${limit}`,
      { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] }
    ).trim();
  } catch {
    return '(no git history available)';
  }
}

export function gatherGitStatus(): string {
  try {
    return execSync('git status --short', {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    }).trim();
  } catch {
    return '(not a git repo)';
  }
}

export function gatherGitBranchesWithoutMerge(): string {
  try {
    return execSync('git branch --no-merged main 2>/dev/null || git branch --no-merged master 2>/dev/null || echo "(no unmerged branches)"', {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
      shell: '/bin/sh',
    }).trim();
  } catch {
    return '(no unmerged branches)';
  }
}

export function gatherGitFileChangeFrequency(days: number = 7): string {
  try {
    return execSync(
      `git log --since="${days} days ago" --name-only --pretty=format: | sort | uniq -c | sort -rn | head -20`,
      { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'], shell: '/bin/sh' }
    ).trim();
  } catch {
    return '(no git history)';
  }
}

export function gatherDirectoryTree(maxDepth: number = 3): string {
  const cwd = process.cwd();
  const lines: string[] = [];
  const ignorePatterns = ['node_modules', '.git', 'dist', '.next', '__pycache__', '.venv', 'venv'];

  function walk(dir: string, depth: number, prefix: string): void {
    if (depth > maxDepth || lines.length > 100) return;
    let entries: string[];
    try {
      entries = readdirSync(dir).filter((e) => !e.startsWith('.') && !ignorePatterns.includes(e));
    } catch {
      return;
    }
    for (const entry of entries.slice(0, 20)) {
      const fullPath = join(dir, entry);
      const relPath = relative(cwd, fullPath);
      try {
        const stat = statSync(fullPath);
        if (stat.isDirectory()) {
          lines.push(`${prefix}${entry}/`);
          walk(fullPath, depth + 1, prefix + '  ');
        } else {
          lines.push(`${prefix}${entry}`);
        }
      } catch {
        // skip
      }
    }
  }

  walk(cwd, 0, '');
  return lines.join('\n');
}

export function gatherPackageJson(): string {
  const pkgPath = join(process.cwd(), 'package.json');
  if (!existsSync(pkgPath)) return '(no package.json found)';
  try {
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
    return JSON.stringify({
      name: pkg.name,
      version: pkg.version,
      dependencies: pkg.dependencies,
      devDependencies: pkg.devDependencies,
    }, null, 2);
  } catch {
    return '(could not parse package.json)';
  }
}

export function gatherReadme(): string {
  for (const name of ['README.md', 'readme.md', 'README']) {
    const readmePath = join(process.cwd(), name);
    if (existsSync(readmePath)) {
      const content = readFileSync(readmePath, 'utf-8');
      return content.slice(0, MAX_TOKEN_CHARS);
    }
  }
  return '(no README found)';
}

export function gatherInfraFiles(): string {
  const infraNames = [
    'Dockerfile', 'docker-compose.yml', 'docker-compose.yaml',
    'vercel.json', '.github/workflows', 'Procfile',
    'fly.toml', 'railway.json', 'render.yaml',
  ];
  const found: string[] = [];
  for (const name of infraNames) {
    const p = join(process.cwd(), name);
    if (existsSync(p)) {
      try {
        const stat = statSync(p);
        if (stat.isFile()) {
          const content = readFileSync(p, 'utf-8').slice(0, 2000);
          found.push(`--- ${name} ---\n${content}`);
        } else if (stat.isDirectory()) {
          const files = readdirSync(p).slice(0, 5);
          found.push(`--- ${name}/ --- (${files.join(', ')})`);
        }
      } catch {
        // skip
      }
    }
  }
  return found.length > 0 ? found.join('\n\n') : '(no infrastructure files found)';
}

export function gatherConfigFiles(): string {
  const patterns = ['.env.example', '.env.local'];
  const cwd = process.cwd();
  const found: string[] = [];

  // Find YAML, config, prompt files
  try {
    const entries = readdirSync(cwd).filter((f) => {
      const lower = f.toLowerCase();
      return (
        lower.endsWith('.yaml') ||
        lower.endsWith('.yml') ||
        lower.includes('config') ||
        lower.includes('prompt') ||
        lower.includes('template') ||
        patterns.includes(lower)
      );
    });
    for (const entry of entries.slice(0, 10)) {
      try {
        const content = readFileSync(join(cwd, entry), 'utf-8').slice(0, 2000);
        found.push(`--- ${entry} ---\n${content}`);
      } catch {
        // skip
      }
    }
  } catch {
    // skip
  }

  return found.length > 0 ? found.join('\n\n') : '(no config/prompt files found)';
}

export function truncateContext(text: string): string {
  if (text.length <= MAX_TOKEN_CHARS) return text;
  return text.slice(0, MAX_TOKEN_CHARS) + '\n\n[truncated to fit token budget]';
}
