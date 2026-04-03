import type { PhaseHandler } from '../types.js';
import { gatherPackageJson, gatherGitFileChangeFrequency, gatherInfraFiles, truncateContext } from './gather.js';
import { execSync } from 'node:child_process';

function gatherNpmAudit(): string {
  try {
    const output = execSync('npm audit --json 2>/dev/null | head -100', {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
      shell: '/bin/sh',
      timeout: 10000,
    }).trim();
    return output || '(no vulnerabilities or npm audit not available)';
  } catch {
    return '(npm audit not available)';
  }
}

export const simulation: PhaseHandler = async (ctx) => {
  const pkg = gatherPackageJson();
  const hotspots = gatherGitFileChangeFrequency(7);
  const infra = gatherInfraFiles();
  const audit = gatherNpmAudit();

  const prompt = truncateContext(`ROLE: You are a simulation and rehearsal agent running "what if" scenarios during an AI agent's overnight dreaming cycle.

CONTEXT:
Package dependencies:
${pkg}

Git hotspots (most changed files, 7 days):
${hotspots}

Infrastructure files:
${infra}

npm audit output:
${audit}

${ctx.lucid ? `LUCID DREAM FOCUS: "${ctx.lucid}" - focus your scenarios on this topic.\n` : ''}
CONSTRAINTS: Respond with valid JSON:
{
  "scenarios": [
    {
      "title": "string - What if X?",
      "type": "failure | opportunity | decision",
      "impact": "string - what breaks or changes",
      "mitigation": "string - what to do about it",
      "readiness": "Ready | Partially ready | Not ready"
    }
  ],
  "vulnerabilities": ["string - any dependency vulnerabilities found"],
  "insights": ["string - actionable observations, max 3"]
}

TASK: Run 3-5 "what if" scenarios. Include at least one failure rehearsal (what breaks if X goes down), one opportunity rehearsal (what if usage doubles), and one decision rehearsal (what's the critical path for the next change). Check dependencies for vulnerabilities. Cite specific files and dependencies.`);

  const result = await ctx.llm.completeJSON<{
    scenarios: Array<{ title: string; type: string; impact: string; mitigation: string; readiness: string }>;
    vulnerabilities: string[];
    insights: string[];
  }>(prompt, {});

  const scenarios = result.scenarios || [];
  const journal = [
    '## Simulation & Rehearsal',
    '',
    ...scenarios.map((s, i) => [
      `### Scenario ${i + 1}: ${s.title}`,
      `**Type**: ${s.type}`,
      `**Impact**: ${s.impact}`,
      `**Mitigation**: ${s.mitigation}`,
      `**Readiness**: ${s.readiness}`,
      '',
    ].join('\n')),
    ...(result.vulnerabilities?.length ? ['### Dependency Vulnerabilities', ...result.vulnerabilities.map((v) => `- ${v}`)] : []),
  ].join('\n');

  return {
    phase: 'simulation',
    journal,
    insights: result.insights || [],
    nightmare: result.vulnerabilities?.some((v) => v.toLowerCase().includes('critical')) ? `Critical vulnerability found: ${result.vulnerabilities[0]}` : null,
    metadata: { scenarios, vulnerabilities: result.vulnerabilities || [] },
  };
};
