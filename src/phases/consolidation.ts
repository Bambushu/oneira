import type { PhaseHandler, PhaseResult } from '../types.js';
import { gatherGitLog, gatherGitStatus, truncateContext } from './gather.js';

export const consolidation: PhaseHandler = async (ctx) => {
  // Gather memory files
  const memFiles = await ctx.memory.list();
  const memContents: string[] = [];
  for (const file of memFiles.slice(0, 20)) {
    const content = await ctx.memory.read(file);
    if (content) {
      memContents.push(`--- ${file} ---\n${content.slice(0, 2000)}`);
    }
  }

  const gitLog = gatherGitLog(1, 20);
  const gitStatus = gatherGitStatus();

  const memorySection = memContents.length > 0
    ? memContents.join('\n\n')
    : '(No memory files found. This is the first run. Using git history and status as the only data source.)';

  const prompt = truncateContext(`ROLE: You are a memory consolidation agent reviewing a day's activity for an AI agent's overnight dreaming cycle.

CONTEXT:
Memory files:
${memorySection}

Recent git activity (24h):
${gitLog}

Current git status:
${gitStatus}

${ctx.lucid ? `LUCID DREAM FOCUS: "${ctx.lucid}" - focus your consolidation analysis on this topic.\n` : ''}
CONSTRAINTS: Respond with valid JSON matching this schema:
{
  "activitySummary": "string - brief summary of what was worked on today",
  "strengthened": ["string - memories confirmed by recent activity"],
  "stale": ["string - memories not referenced, possibly outdated"],
  "contradictions": ["string - conflicts between memory and current state"],
  "gaps": ["string - important activity not captured in any memory file"],
  "insights": ["string - actionable observations, max 3"]
}

TASK: Analyze the memory files and git activity. Identify what was worked on, which memories are strengthened or stale, any contradictions, and gaps. If no memory files exist, analyze git history and suggest what should be tracked.`);

  const result = await ctx.llm.completeJSON<{
    activitySummary: string;
    strengthened: string[];
    stale: string[];
    contradictions: string[];
    gaps: string[];
    insights: string[];
  }>(prompt, {});

  const journal = [
    '## Memory Consolidation',
    '',
    `### Activity Summary`,
    result.activitySummary || '(no activity detected)',
    '',
    '### Memory Strength Analysis',
    `- **Strengthened**: ${(result.strengthened || []).join(', ') || 'None'}`,
    `- **Stale**: ${(result.stale || []).join(', ') || 'None'}`,
    `- **Contradictions**: ${(result.contradictions || []).join(', ') || 'None'}`,
    '',
    ...(result.gaps?.length ? ['### Memory Gaps', ...result.gaps.map((g) => `- ${g}`)] : []),
  ].join('\n');

  return {
    phase: 'consolidation',
    journal,
    insights: result.insights || [],
    nightmare: null,
    metadata: { ...result },
  };
};
