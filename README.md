# oneira

> Your agent sleeps. Oneira dreams.

7-phase overnight cognition for AI agents. Other tools consolidate memory while your agent sleeps. Oneira makes your agent *think* while it sleeps.

## Quick Start

```bash
npx oneira init          # creates oneira.yaml, validates API key
npx oneira dream         # run a dream cycle
npx oneira schedule      # set up nightly automation
```

## The 7 Dream Phases

1. **Memory Consolidation** - Reviews the day's work, finds stale memories and contradictions
2. **Creative Synthesis** - Randomly pairs concepts from your project, forces novel connections
3. **Hypothesis Generation** - Identifies patterns in your git history, proposes testable hypotheses
4. **Simulation & Rehearsal** - Runs "what if" failure/opportunity scenarios against your infrastructure
5. **Self-Experimentation** - Proposes A/B tests for your configs and prompts
6. **Draft Factory** - Pre-drafts PR descriptions, changelogs, and docs you'll need tomorrow
7. **Adversarial Self-Review** - Red-teams everything, scores dream quality, picks top 3 priorities

## Requirements

- Node.js >= 18
- `ANTHROPIC_API_KEY` environment variable

## Commands

| Command | Purpose |
|---------|---------|
| `oneira init` | Create config file |
| `oneira dream` | Run a dream cycle |
| `oneira dream --phases consolidation,review` | Run specific phases |
| `oneira lucid "improve test coverage"` | Focus tonight's dream on a topic |
| `oneira lucid --clear` | Clear lucid prompt |
| `oneira journal` | Print last dream journal |
| `oneira journal 2026-04-03` | Print specific date's journal |
| `oneira schedule` | Print scheduler setup instructions |

## Programmatic API

```typescript
import { Orchestrator, loadConfig, FileStorage, createAdapter, BUILTIN_PHASES, resolveProjectId } from 'oneira';

const projectId = resolveProjectId();
const config = loadConfig(process.cwd(), projectId);
const storage = new FileStorage(`~/.oneira/${projectId}`);
const llm = await createAdapter(config.provider);

const orchestrator = new Orchestrator({
  config,
  storage,
  llm,
  memory: storage.getMemoryStore(),
  phases: BUILTIN_PHASES,
});

await orchestrator.run();
```

## Configuration

Create `oneira.yaml` in your project root:

```yaml
provider: anthropic

phases:
  - consolidation
  - synthesis
  - hypothesis
  - simulation
  - experimentation
  - drafts
  - review

schedule:
  start: "22:00"
  end: "06:00"
  timezone: auto

lucid: null
```

Disable phases by removing them from the list. Reorder by changing the order.

## Lucid Dreaming

Focus all dream phases on a specific topic:

```bash
oneira lucid "How can I reduce API latency?"
oneira dream
```

The CLI-set prompt is one-shot (cleared after the dream). Set `lucid` in `oneira.yaml` for persistent focus.

## License

MIT
