import type { PhaseHandler, Draft } from '../types.js';
import { gatherGitBranchesWithoutMerge, gatherGitLog, truncateContext } from './gather.js';

export const drafts: PhaseHandler = async (ctx) => {
  const branches = gatherGitBranchesWithoutMerge();
  const recentCommits = gatherGitLog(3, 20);

  const prompt = truncateContext(`ROLE: You are a draft factory agent pre-producing useful artifacts during an AI agent's overnight dreaming cycle.

CONTEXT:
Unmerged branches:
${branches}

Recent commits (3 days):
${recentCommits}

${ctx.lucid ? `LUCID DREAM FOCUS: "${ctx.lucid}" - focus your drafts on this topic.\n` : ''}
CONSTRAINTS: Respond with valid JSON:
{
  "drafts": [
    {
      "type": "pr | changelog | doc",
      "name": "string - descriptive filename without extension",
      "description": "string - what this draft is for",
      "content": "string - the full draft content in markdown"
    }
  ],
  "insights": ["string - actionable observations, max 2"]
}

TASK: Based on unmerged branches and recent commits, produce 1-3 useful draft artifacts. For branches: draft a PR description. For recent commits without docs: draft a changelog entry. For undocumented features: draft documentation stubs. Each draft should be ready for human review and editing. If no branches or commits provide material, say so.`);

  const result = await ctx.llm.completeJSON<{
    drafts: Array<{ type: 'pr' | 'changelog' | 'doc'; name: string; description: string; content: string }>;
    insights: string[];
  }>(prompt, {});

  const draftList: Draft[] = (result.drafts || []).map((d) => ({
    type: d.type,
    name: d.name,
    content: d.content,
  }));

  const journal = [
    '## Draft Factory',
    '',
    ...(draftList.length > 0
      ? draftList.map((d, i) => [
          `### Draft ${i + 1}: ${d.name}`,
          `**Type**: ${d.type}`,
          `**Location**: ~/.oneira/{project}/drafts/${ctx.date}/${d.type}-${d.name}.md`,
          '',
        ].join('\n'))
      : ['No draft material found from recent branches or commits.']),
  ].join('\n');

  return {
    phase: 'drafts',
    journal,
    insights: result.insights || [],
    nightmare: null,
    metadata: { drafts: draftList },
  };
};
