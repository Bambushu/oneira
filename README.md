<p align="center">
  <h1 align="center">oneira</h1>
  <p align="center">
    <em>Your agent sleeps. Oneira dreams.</em>
  </p>
  <p align="center">
    <a href="https://www.npmjs.com/package/oneira"><img src="https://img.shields.io/npm/v/oneira?color=blue&label=npm" alt="npm"></a>
    <a href="https://github.com/Bambushu/oneira/blob/main/LICENSE"><img src="https://img.shields.io/github/license/Bambushu/oneira" alt="MIT License"></a>
    <a href="https://github.com/Bambushu/oneira"><img src="https://img.shields.io/badge/tests-51%20passing-brightgreen" alt="Tests"></a>
    <a href="https://github.com/Bambushu/oneira"><img src="https://img.shields.io/badge/status-early%20release-orange" alt="Status"></a>
  </p>
</p>

**7-phase overnight cognition for AI agents.** Other tools consolidate memory while your agent sleeps. Oneira makes your agent *think* while it sleeps.

```
22:00  Phase 1  Memory Consolidation     What happened today? What's stale?
23:00  Phase 2  Creative Synthesis        Random pairings. Novel connections.
00:00  Phase 3  Hypothesis Generation     "I wonder if..." with experiment designs.
01:00  Phase 4  Simulation & Rehearsal    What if X fails? What if traffic doubles?
02:00  Phase 5  Self-Experimentation      A/B test your own prompts and configs.
03:00  Phase 6  Draft Factory             PR descriptions, changelogs, docs - ready.
05:00  Phase 7  Adversarial Self-Review   Red-team everything. Top 3 priorities.
 ---------------------------------------------------------------
06:00          Morning Gift              Wake up to what matters.
```

## Quick Start

```bash
npx oneira init          # creates oneira.yaml, validates API key
npx oneira dream         # run a dream cycle
npx oneira schedule      # set up nightly automation
```

Three commands. Then your agent dreams every night.

## Sample Dream Output

<details>
<summary><strong>Morning Gift</strong> (what you wake up to)</summary>

```
Top priorities for today:
1. Fix currency mismatch in checkout - EUR shown but GBP charged (critical)
2. PR #47 has been open 9 days with no review - merge or close
3. Hypothesis: deploys on Tuesday correlate with 2x more hotfixes

Drafts ready: 2 (PR description for feat/auth, changelog for v2.3)
Total insights: 11
Dream quality: 8/10
```

</details>

<details>
<summary><strong>Creative Synthesis</strong> (novel cross-domain ideas)</summary>

```markdown
### Pair 1: auth-module x rate-limiter
**What if:** Rate limiting was identity-aware? Premium users get higher
limits automatically based on auth tier, no config needed.
- Novelty: 7/10
- Feasibility: 9/10
- **Combined: 16 KEEP**

### Pair 2: test-suite x deployment-pipeline
**What if:** Tests that fail most often auto-run first in CI?
Prioritize by historical flakiness score.
- Novelty: 6/10
- Feasibility: 8/10
- **Combined: 14 KEEP**
```

</details>

<details>
<summary><strong>Hypothesis Generation</strong> (data-driven pattern recognition)</summary>

```markdown
### Hypothesis 1: "I wonder if PR size correlates with review time?"
**Evidence**: Last 30 PRs show 3 files avg = 1 day review, 12 files avg = 5 days
**Experiment**: Track PR size vs merge time for next 2 weeks
**Timeline**: Check by April 17
```

</details>

## How It Works

```
                    oneira.yaml
                        |
                   Orchestrator
                   /    |    \
            Config   Storage   LLM Adapter
               |       |           |
          phases[]  ~/.oneira/  Anthropic API
               |    {project}/
   +-----------+----------+
   |     |     |     |    |    |    |
  P1    P2    P3    P4   P5   P6   P7   -->  Dream Journal
   |     |     |     |    |    |    |         + Morning Gift
   +-----+----+-----+----+----+----+
                     |
              PhaseContext in
              PhaseResult out
              (stateless, no I/O)
```

Every phase is a pure function. Context in, result out. The orchestrator handles all file I/O, state tracking, and journal assembly. Phases never touch disk.

## Lucid Dreaming

Focus all phases on a specific topic:

```bash
oneira lucid "How can I reduce API latency?"
oneira dream
```

Every phase - consolidation, synthesis, hypotheses, simulations - all oriented around your question. Like setting a dream intention before bed.

CLI prompts are one-shot (cleared after the dream). Set `lucid` in `oneira.yaml` for persistent focus.

## Commands

| Command | Purpose |
|---------|---------|
| `oneira init` | Create config, validate API key |
| `oneira dream` | Run a full dream cycle |
| `oneira dream --phases consolidation,review` | Run specific phases only |
| `oneira lucid "topic"` | Focus next dream on a topic |
| `oneira lucid --clear` | Clear lucid prompt |
| `oneira journal` | Print last dream journal |
| `oneira journal 2026-04-03` | Print specific date |
| `oneira schedule` | Print cron setup instructions |

## Configuration

```yaml
# oneira.yaml
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

Disable phases by removing them. Reorder by changing the order.

## Programmatic API

```typescript
import {
  Orchestrator, loadConfig, FileStorage,
  createAdapter, BUILTIN_PHASES, resolveProjectId
} from 'oneira';

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

## Why Not Just Memory Consolidation?

| | Letta | openclaw-autodream | agent-dream | **Oneira** |
|---|---|---|---|---|
| Memory consolidation | Yes | Yes | Yes | Yes |
| Creative synthesis | - | - | - | **Yes** |
| Hypothesis generation | - | - | - | **Yes** |
| Simulation & rehearsal | - | - | - | **Yes** |
| Self-experimentation | - | - | - | **Yes** |
| Draft factory | - | - | - | **Yes** |
| Adversarial review | - | - | - | **Yes** |
| Framework-agnostic | - | - | Yes | **Yes** |
| Configurable phases | - | - | - | **Yes** |
| Lucid dreaming | - | - | - | **Yes** |

Memory consolidation is phase 1 of 7. The other six are where the value is.

## Requirements

- Node.js >= 18
- `ANTHROPIC_API_KEY` environment variable
- A git repository (for git-based phases)

## Project Isolation

Each git repo gets its own namespace (`~/.oneira/{hash}/`). Multiple projects dream independently without collisions.

## Resilience

- **Crash recovery**: Resumes from the last completed phase (idempotent via journal headers)
- **Partial runs**: `--phases` flag for ad-hoc runs that don't affect the nightly cycle
- **Nightmare detection**: Critical issues print to stderr immediately, don't wait for morning
- **Sparse input**: Phases with insufficient data return honest "not enough data" instead of hallucinating

## License

MIT

---

<p align="center">
  <em>"Your AI agent is idle 16 hours a day. We fixed that."</em>
</p>
