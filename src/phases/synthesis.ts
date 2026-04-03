import type { PhaseHandler } from '../types.js';
import { gatherDirectoryTree, gatherPackageJson, gatherReadme, truncateContext } from './gather.js';

export const synthesis: PhaseHandler = async (ctx) => {
  const tree = gatherDirectoryTree(3);
  const pkg = gatherPackageJson();
  const readme = gatherReadme();

  const prompt = truncateContext(`ROLE: You are a creative synthesis agent generating novel cross-domain ideas during an AI agent's overnight dreaming cycle.

CONTEXT:
Project structure:
${tree}

Package info:
${pkg}

README (first 2000 chars):
${readme.slice(0, 2000)}

${ctx.lucid ? `LUCID DREAM FOCUS: "${ctx.lucid}" - focus your creative pairings on this topic.\n` : ''}
CONSTRAINTS: Respond with valid JSON:
{
  "pairs": [
    {
      "a": "string - first domain/module/concept",
      "b": "string - second domain/module/concept",
      "idea": "string - creative connection between them",
      "novelty": "number 1-10",
      "feasibility": "number 1-10",
      "combined": "number - novelty + feasibility",
      "keep": "boolean - true if combined >= 12"
    }
  ],
  "insights": ["string - actionable creative ideas, max 3"]
}

TASK: Identify 3 pairs of modules, dependencies, or concepts from this project. For each pair, force a creative connection. Score novelty and feasibility. Only keep ideas scoring 12+ combined. If the project is too small for meaningful pairings, pair project concepts with common industry patterns.`);

  const result = await ctx.llm.completeJSON<{
    pairs: Array<{ a: string; b: string; idea: string; novelty: number; feasibility: number; combined: number; keep: boolean }>;
    insights: string[];
  }>(prompt, {});

  const pairs = result.pairs || [];
  const journal = [
    '## Creative Synthesis',
    '',
    ...pairs.map((p, i) => [
      `### Pair ${i + 1}: ${p.a} x ${p.b}`,
      `**What if:** ${p.idea}`,
      `- Novelty: ${p.novelty}/10`,
      `- Feasibility: ${p.feasibility}/10`,
      `- **Combined: ${p.combined} ${p.keep ? 'KEEP' : 'DISCARD'}**`,
      '',
    ].join('\n')),
  ].join('\n');

  return {
    phase: 'synthesis',
    journal,
    insights: result.insights || [],
    nightmare: null,
    metadata: { pairs },
  };
};
