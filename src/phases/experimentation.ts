import type { PhaseHandler } from '../types.js';
import { gatherConfigFiles, truncateContext } from './gather.js';

export const experimentation: PhaseHandler = async (ctx) => {
  const configFiles = gatherConfigFiles();

  if (configFiles === '(no config/prompt files found)') {
    return {
      phase: 'experimentation',
      journal: '## Self-Experimentation\n\nNo config or prompt files found in this project. Consider adding prompt templates or configuration files to enable experimentation in future dreams.',
      insights: [],
      nightmare: null,
      metadata: { skipped: true },
    };
  }

  const prompt = truncateContext(`ROLE: You are a self-experimentation agent proposing A/B tests for configuration and prompts during an AI agent's overnight dreaming cycle.

CONTEXT:
Config and prompt files found:
${configFiles}

${ctx.lucid ? `LUCID DREAM FOCUS: "${ctx.lucid}" - focus your experiments on this topic.\n` : ''}
CONSTRAINTS: Respond with valid JSON:
{
  "experiments": [
    {
      "name": "string - experiment name",
      "file": "string - which file to modify",
      "setup": "string - what to change",
      "variationA": "string - current state",
      "variationB": "string - proposed change",
      "expectedOutcome": "string - what improvement to expect",
      "recommendation": "change | keep current | needs more data"
    }
  ],
  "insights": ["string - actionable observations, max 2"]
}

TASK: Propose 1-2 A/B experiments for the config or prompt files found. Each experiment should have a clear hypothesis, measurable outcome, and recommendation. If files are environment configs, suggest optimization experiments. If they're prompt templates, suggest wording variations.`);

  const result = await ctx.llm.completeJSON<{
    experiments: Array<{ name: string; file: string; setup: string; variationA: string; variationB: string; expectedOutcome: string; recommendation: string }>;
    insights: string[];
  }>(prompt, {});

  const experiments = result.experiments || [];
  const journal = [
    '## Self-Experimentation',
    '',
    ...experiments.map((e, i) => [
      `### Experiment ${i + 1}: ${e.name}`,
      `**File**: ${e.file}`,
      `**Setup**: ${e.setup}`,
      `**Variation A** (current): ${e.variationA}`,
      `**Variation B** (proposed): ${e.variationB}`,
      `**Expected outcome**: ${e.expectedOutcome}`,
      `**Recommendation**: ${e.recommendation}`,
      '',
    ].join('\n')),
  ].join('\n');

  return {
    phase: 'experimentation',
    journal,
    insights: result.insights || [],
    nightmare: null,
    metadata: { experiments },
  };
};
