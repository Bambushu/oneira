import type { PhaseHandler } from '../types.js';
import { gatherGitLog, truncateContext } from './gather.js';

export const review: PhaseHandler = async (ctx) => {
  const recentCommits = gatherGitLog(1, 20);

  // Gather previous phase outputs
  const previousPhases = ctx.journal
    .map((j) => `### ${j.phase}\n${j.content.slice(0, 1000)}`)
    .join('\n\n');

  const prompt = truncateContext(`ROLE: You are an adversarial self-review agent red-teaming today's work and dream output during an AI agent's overnight dreaming cycle.

CONTEXT:
Recent commits (24h):
${recentCommits}

Previous dream phase outputs:
${previousPhases || '(no previous phases)'}

${ctx.lucid ? `LUCID DREAM FOCUS: "${ctx.lucid}" - evaluate how well other phases addressed this topic.\n` : ''}
CONSTRAINTS: Respond with valid JSON:
{
  "grades": {
    "codeQuality": "string - grade and explanation",
    "dreamInsights": "string - are they novel or restated?",
    "consistency": "string - any contradictions between phases?"
  },
  "issues": [
    {
      "severity": "critical | high | medium | low",
      "description": "string - what's wrong",
      "suggestion": "string - how to fix it"
    }
  ],
  "priorities": ["string - top 3 actions for tomorrow, ranked by urgency"],
  "qualityScore": "number 1-10",
  "insights": ["string - meta-observations about the dream cycle, max 2"]
}

TASK: Red-team everything. Are the insights from other phases actually novel or just restated facts? Any bugs or security issues in recent commits? Any contradictions between phase recommendations? Score the overall dream quality 1-10. Most importantly: produce the top 3 priorities for tomorrow morning, ranked by urgency and actionability.`);

  const result = await ctx.llm.completeJSON<{
    grades: { codeQuality: string; dreamInsights: string; consistency: string };
    issues: Array<{ severity: string; description: string; suggestion: string }>;
    priorities: string[];
    qualityScore: number;
    insights: string[];
  }>(prompt, {});

  const issues = result.issues || [];
  const journal = [
    '## Self-Review',
    '',
    '### Performance Assessment',
    `- **Code quality**: ${result.grades?.codeQuality || 'N/A'}`,
    `- **Dream insights**: ${result.grades?.dreamInsights || 'N/A'}`,
    `- **Consistency**: ${result.grades?.consistency || 'N/A'}`,
    '',
    ...(issues.length > 0 ? [
      '### Issues Found',
      ...issues.map((issue, i) => `${i + 1}. [${issue.severity}] ${issue.description} -- ${issue.suggestion}`),
    ] : ['### Issues Found', 'None']),
    '',
    `### Dream Quality: ${result.qualityScore || '?'}/10`,
  ].join('\n');

  const criticalIssue = issues.find((i) => i.severity === 'critical');

  return {
    phase: 'review',
    journal,
    insights: result.insights || [],
    nightmare: criticalIssue ? `[CRITICAL] ${criticalIssue.description}` : null,
    metadata: {
      priorities: result.priorities || [],
      qualityScore: result.qualityScore || 5,
      issues,
      grades: result.grades,
    },
  };
};
