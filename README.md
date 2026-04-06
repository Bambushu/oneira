# oneira

**A CLI that gives your AI agent an overnight thinking cycle.**

Oneira runs a 7-phase dream over your repo while you sleep, then leaves you a morning brief with bugs worth fixing, hypotheses worth testing, and drafts worth shipping.

[![npm version](https://img.shields.io/npm/v/oneira?label=npm)](https://www.npmjs.com/package/oneira)
[![Node >=18](https://img.shields.io/badge/node-%3E%3D18-339933)](https://nodejs.org/)
[![MIT License](https://img.shields.io/github/license/Bambushu/oneira)](https://github.com/Bambushu/oneira/blob/main/LICENSE)
[![Status: early release](https://img.shields.io/badge/status-early%20release-orange)](https://github.com/Bambushu/oneira)

<p align="center">
  <img src="assets/terminal-demo.svg" alt="oneira dream cycle" width="680">
</p>

Most agent tooling helps with memory. Oneira helps with reflection.

Instead of only summarizing what happened, it uses the quiet hours to:

- consolidate what changed
- make novel connections across your code and history
- generate hypotheses and lightweight experiments
- simulate failure modes before they happen
- draft useful artifacts for the next day
- red-team the highest-risk decisions

If you work in a repo every day, the output should feel less like a log and more like a sharp staff engineer's morning note.

## What You Wake Up To

```
$ oneira journal

  Morning Gift - April 3, 2026

  1. Currency bug in checkout                          [revenue-impacting]
     UI shows EUR, payment intent defaults to GBP.
     -> inspect checkout/formatTotal.ts vs payments/createIntent.ts

  2. PR #47 is stalling                          [9 days, 3 reviewers idle]
     Touches auth, billing, and middleware in one diff.
     -> split middleware extraction into its own PR first

  3. Tuesday deploys cause 2x hotfixes                       [hypothesis]
     6 of last 8 hotfixes landed within 24h of Tuesday releases.
     -> compare hotfix rate for smaller Wed/Thu deploys over 2 weeks

  Drafts ready:  PR description for feat/auth-session-rotation
                 Changelog entry for v0.4.0

  Dream quality: 8/10  |  11 insights  |  0 nightmares
```

Each priority tells you what, why it matters, and what to do next.

## Why It Exists

AI agents spend a lot of time idle between runs. Oneira turns that idle time into a scheduled cognition pass over the project.

```text
repo state + git history + prior journals + optional lucid prompt
                              |
                              v
                     [ oneira orchestrator ]
                              |
    +--------------+----------+----------+----------+----------+----------+----------+
    |              |                     |                     |                     |
    v              v                     v                     v                     v
consolidation  synthesis           hypothesis            simulation         experimentation
                                                                                 |
                                                                                 v
                                                                       drafts + self-review
                                                                                 |
                                                                                 v
                                                                          Morning Gift
```

Each phase is stateless and pure: context in, result out. The orchestrator handles storage, journaling, and recovery.

## Install

```bash
npm install -D oneira @anthropic-ai/sdk
export ANTHROPIC_API_KEY=your_key_here
```

Requirements:

- Node.js 18+
- a git repository
- an Anthropic API key

## Quick Start

```bash
npx oneira init
npx oneira dream
npx oneira schedule
```

`oneira init` creates `oneira.yaml` in your repo.

`oneira dream` runs the full overnight cycle immediately.

`oneira schedule` prints the cron command to run it every night.

## The 7 Phases

```text
1. Memory Consolidation   What changed? What is stale? What should be remembered?
2. Creative Synthesis     Which unrelated pieces now connect in a useful way?
3. Hypothesis Generation  What patterns might be true, and how would we test them?
4. Simulation             What breaks if traffic spikes, a dependency fails, or scope expands?
5. Self-Experimentation   Which prompts, configs, or workflows are worth A/B testing?
6. Draft Factory          What can be pre-written before the human opens the editor?
7. Self-Review            What is risky, weak, or misleading in the current plan?
```

Memory is only the first phase. The value comes from what happens after memory.

## Lucid Dreaming

You can point the whole cycle at a specific question:

```bash
npx oneira lucid "How can I reduce API latency without adding more infrastructure?"
npx oneira dream
```

That prompt is stored for the next dream, then cleared unless you set `lucid` in `oneira.yaml`.

## Commands

| Command | What it does |
| --- | --- |
| `npx oneira init` | Create `oneira.yaml` and validate the API key if present |
| `npx oneira dream` | Run the full dream cycle |
| `npx oneira dream --phases consolidation,review` | Run only selected phases |
| `npx oneira lucid "topic"` | Set the next dream's focus |
| `npx oneira lucid --clear` | Clear the current lucid prompt |
| `npx oneira journal` | Print the latest dream journal |
| `npx oneira journal 2026-04-03` | Print a specific journal by date |
| `npx oneira schedule` | Print scheduler setup instructions |

## Configuration

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

catchUp:
  policy: bounded        # none | bounded | unlimited
  maxPhasesPerHeartbeat: 2
  chainablePairs:
    - [drafts, review]   # only these phases can run back-to-back

wakelock: auto           # auto | macos | none

lucid: null
```

Remove phases to disable them. Reorder phases if you want a different sequence.

### Catch-Up Policy

When phases run across multiple heartbeats (the normal mode), the catch-up policy controls what happens if heartbeats are missed:

- **`none`** -- one phase per heartbeat, always. Missed phases stay missed.
- **`bounded`** (default) -- allows chaining only for explicitly listed phase pairs. Everything else waits for a fresh heartbeat. This protects creative quality: divergent phases like synthesis and hypothesis benefit from temporal separation.
- **`unlimited`** -- all phases can run in a single heartbeat. Fast recovery, but creative quality degrades from context pressure and anchoring.

`chainablePairs` defines which phases may run back-to-back. The default is empty (no chaining). A common setup is `[drafts, review]` since reviewing drafts you just wrote benefits from having them in context.

### Wakelock

Oneira can prevent the host machine from sleeping during dream hours:

- **`auto`** (default) -- uses `caffeinate` on macOS, no-op elsewhere
- **`macos`** -- force macOS caffeinate adapter
- **`none`** -- disable sleep prevention

The wakelock is acquired at the start of `run()` and released when it completes. If it fails, the dream continues without sleep prevention.

## What Makes Oneira Different

This is not positioned as a better chatbot or a better memory layer. It is a scheduled cognition loop for repos.

| Capability | Typical agent memory tooling | Oneira |
| --- | --- | --- |
| Summarize and consolidate prior context | Yes | Yes |
| Generate new hypotheses from project history | Rarely | Yes |
| Simulate failure modes before the next work session | Rarely | Yes |
| Draft changelogs, PR text, or docs automatically | Sometimes | Yes |
| Run as a structured multi-phase overnight pipeline | Rarely | Yes |
| Focus an entire run around one question | Rarely | Yes |

If all you need is memory consolidation, Oneira is probably too much. If you want your agent to come back with ideas, drafts, and objections, this is the point.

## Programmatic API

```ts
import {
  BUILTIN_PHASES,
  createAdapter,
  createWakelockAdapter,
  FileStorage,
  loadConfig,
  Orchestrator,
  resolveProjectId,
} from 'oneira';

const projectId = resolveProjectId();
const config = loadConfig(process.cwd(), projectId);
const storage = new FileStorage(`~/.oneira/${projectId}`);
const llm = await createAdapter(config.provider);
const wakelock = createWakelockAdapter(config.wakelock);

const orchestrator = new Orchestrator({
  config,
  storage,
  llm,
  memory: storage.getMemoryStore(),
  phases: BUILTIN_PHASES,
  wakelock,
});

await orchestrator.run();
```

## Bring Your Own Agent Platform

Oneira doesn't care how you trigger it. It's an npm package, not a standalone agent. Plug it into whatever scheduler or agent platform you use:

**System cron:**
```bash
npx oneira schedule
# prints: 0 22 * * * cd /your/repo && npx oneira dream
```

**Any agent with cron support** (Hermes, OpenClaw, custom):
```
Schedule: 0 22 * * *
Prompt: "Run the dream cycle for this project"
Script: npx oneira dream
```

**Custom LLM adapter:**
```ts
import type { LLMAdapter } from 'oneira';

const myAdapter: LLMAdapter = {
  async complete(prompt) {
    // call your preferred LLM
    return await myLLM.generate(prompt);
  },
  async completeJSON(prompt, schema) {
    // return parsed JSON matching the schema
    return await myLLM.generateJSON(prompt, schema);
  },
};

const orchestrator = new Orchestrator({
  config, storage, memory,
  llm: myAdapter,
  phases: BUILTIN_PHASES,
});
```

**Custom wakelock adapter** (Linux example):
```ts
import type { WakelockAdapter, WakelockHandle } from 'oneira';

const systemdWakelock: WakelockAdapter = {
  isSupported: () => process.platform === 'linux',
  async acquire(seconds) {
    const proc = spawn('systemd-inhibit', ['--what=idle:sleep', `--who=oneira`, 'sleep', String(seconds)]);
    return {
      isActive: () => proc.exitCode === null,
      release: async () => proc.kill(),
    };
  },
};
```

The three adapter interfaces (`LLMAdapter`, `WakelockAdapter`, `StorageAdapter`) are the only integration points. Everything else is handled by the orchestrator.

## Storage and Resilience

- Each git repo gets its own namespace under `~/.oneira/{project-id}`
- Crash recovery resumes from the last completed phase
- Partial runs via `--phases` do not corrupt the nightly cycle
- Critical issues can surface immediately instead of waiting for the morning brief
- Sparse input returns "not enough data" instead of pretending certainty

## Contributing

Issues and pull requests are welcome. For local development:

```bash
npm install
npm test
```

## Links

- [npm package](https://www.npmjs.com/package/oneira)
- [License](https://github.com/Bambushu/oneira/blob/main/LICENSE)

## License

MIT
