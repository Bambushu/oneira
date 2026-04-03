import type { PhaseHandler } from '../types.js';
import { gatherGitLog, gatherGitFileChangeFrequency, truncateContext } from './gather.js';

export const hypothesis: PhaseHandler = async (ctx) => {
  const gitLog = gatherGitLog(7, 50);
  const changeFreq = gatherGitFileChangeFrequency(7);

  const prompt = truncateContext(`ROLE: You are a hypothesis generation agent identifying testable patterns during an AI agent's overnight dreaming cycle.

CONTEXT:
Git log (7 days):
${gitLog}

File change frequency (7 days):
${changeFreq}

${ctx.lucid ? `LUCID DREAM FOCUS: "${ctx.lucid}" - focus your hypotheses on this topic.\n` : ''}
CONSTRAINTS: Respond with valid JSON:
{
  "hypotheses": [
    {
      "question": "string - I wonder if...",
      "evidence": "string - specific commits/files that triggered this",
      "experiment": "string - how to test it",
      "timeline": "string - when to check results"
    }
  ],
  "insights": ["string - actionable observations, max 3"]
}

TASK: Analyze the git history and file change patterns. Generate 2-3 testable hypotheses. Each must cite specific commits or files as evidence and include a concrete experiment design. If git history is sparse, generate hypotheses about the project structure or development patterns.`);

  const result = await ctx.llm.completeJSON<{
    hypotheses: Array<{ question: string; evidence: string; experiment: string; timeline: string }>;
    insights: string[];
  }>(prompt, {});

  const hypotheses = result.hypotheses || [];
  const journal = [
    '## Hypotheses',
    '',
    ...hypotheses.map((h, i) => [
      `### Hypothesis ${i + 1}: "${h.question}"`,
      `**Evidence**: ${h.evidence}`,
      `**Experiment**: ${h.experiment}`,
      `**Timeline**: ${h.timeline}`,
      '',
    ].join('\n')),
  ].join('\n');

  return {
    phase: 'hypothesis',
    journal,
    insights: result.insights || [],
    nightmare: null,
    metadata: { hypotheses },
  };
};
