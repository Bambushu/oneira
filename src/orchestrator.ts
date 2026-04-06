import type {
  OneiraConfig,
  PhaseHandler,
  PhaseId,
  PhaseResult,
  StorageAdapter,
  LLMAdapter,
  MemoryStore,
  JournalEntry,
  DreamState,
  Draft,
  WakelockAdapter,
  WakelockHandle,
} from './types.js';
import { PHASE_JOURNAL_HEADERS, DEFAULT_CATCHUP } from './types.js';

export function calculateDreamDate(now: Date): string {
  const hour = now.getHours();
  const date = new Date(now);
  if (hour < 6) {
    date.setDate(date.getDate() - 1);
  }
  return date.toISOString().slice(0, 10);
}

export interface HeartbeatResult {
  phasesRun: PhaseId[];
  stoppedReason: 'all_done' | 'outside_hours' | 'catchup_limit' | 'no_chain' | 'budget' | 'policy_none';
}

interface OrchestratorOptions {
  config: OneiraConfig;
  storage: StorageAdapter;
  llm: LLMAdapter;
  memory: MemoryStore;
  phases: Map<PhaseId, PhaseHandler>;
  wakelock?: WakelockAdapter;
  now?: Date;
  partialRun?: boolean;
}

export class Orchestrator {
  private config: OneiraConfig;
  private storage: StorageAdapter;
  private llm: LLMAdapter;
  private memory: MemoryStore;
  private phases: Map<PhaseId, PhaseHandler>;
  private wakelock?: WakelockAdapter;
  private now: Date;
  private partialRun: boolean;

  constructor(options: OrchestratorOptions) {
    this.config = options.config;
    this.storage = options.storage;
    this.llm = options.llm;
    this.memory = options.memory;
    this.phases = options.phases;
    this.wakelock = options.wakelock;
    this.now = options.now || new Date();
    this.partialRun = options.partialRun || false;
  }

  async run(): Promise<void> {
    // Acquire wakelock if available
    let wakelockHandle: WakelockHandle | null = null;
    if (this.wakelock?.isSupported()) {
      try {
        // Calculate dream window duration from config schedule
        const [startH] = this.config.schedule.start.split(':').map(Number);
        const [endH] = this.config.schedule.end.split(':').map(Number);
        const hours = endH > startH ? endH - startH : (24 - startH + endH);
        const durationSeconds = hours * 3600 + 900; // + 15 min margin
        wakelockHandle = await this.wakelock.acquire(durationSeconds);
        process.stdout.write(`Wakelock acquired (${hours}h ${Math.round(durationSeconds / 60)}m)\n`);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        process.stderr.write(`[WARN] Wakelock failed: ${msg}. Continuing without sleep prevention.\n`);
      }
    }

    try {
      await this._runDream();
    } finally {
      if (wakelockHandle?.isActive()) {
        await wakelockHandle.release();
        process.stdout.write('Wakelock released.\n');
      }
    }
  }

  private async _runDream(): Promise<void> {
    const dreamDate = calculateDreamDate(this.now);
    let state: DreamState;

    if (this.partialRun) {
      // Partial runs don't touch state
      state = {
        currentDreamDate: dreamDate,
        completedPhases: [],
        lastDreamAt: null,
        lucidPrompt: null,
      };
    } else {
      state = await this.storage.readState();

      // Start or resume cycle
      if (state.currentDreamDate !== dreamDate) {
        state = {
          currentDreamDate: dreamDate,
          completedPhases: [],
          lastDreamAt: null,
          lucidPrompt: state.lucidPrompt,
        };
        await this.storage.writeState(state);
      }
    }

    // Resolve lucid prompt: state (one-shot) wins over config (persistent)
    const lucid = state.lucidPrompt || this.config.lucid;

    // Load existing journal or start fresh
    let journalContent = await this.storage.readJournal(dreamDate);
    if (!journalContent) {
      const totalEnabled = this.config.phases.length;
      journalContent = [
        `# Oneira Dream Journal - ${dreamDate}`,
        '',
        '## Dream Quality',
        'Score: ?/10',
        `Phases completed: 0/${totalEnabled}`,
        'Actionable insights: 0',
        '',
        '## Nightmares',
        'None',
        '',
        '---',
        '',
      ].join('\n');
    }

    const journalEntries: JournalEntry[] = [];
    const allInsights: string[] = [];
    const allDrafts: Draft[] = [];
    let phasesRunThisHeartbeat = 0;
    let lastPhaseRun: PhaseId | null = null;

    // Run each enabled phase in order
    for (const phaseId of this.config.phases) {
      if (state.completedPhases.includes(phaseId)) continue;

      // Catch-up gate: after the first phase, check if we're allowed to continue
      if (phasesRunThisHeartbeat > 0 && !this.partialRun) {
        const gate = this.shouldContinue(lastPhaseRun!, phaseId, phasesRunThisHeartbeat);
        if (gate !== null) {
          process.stdout.write(`Stopping heartbeat: ${gate}. Next phase (${phaseId}) will run on next heartbeat.\n`);
          break;
        }
      }

      // Idempotency: check if journal already has this phase's header
      const header = PHASE_JOURNAL_HEADERS[phaseId];
      if (journalContent.includes(header)) {
        if (!this.partialRun) {
          state.completedPhases.push(phaseId);
          await this.storage.writeState(state);
        }
        continue;
      }

      const handler = this.phases.get(phaseId);
      if (!handler) continue;

      const ctx = {
        config: this.config,
        date: dreamDate,
        memory: this.memory,
        journal: journalEntries,
        llm: this.llm,
        lucid,
      };

      let result: PhaseResult;
      try {
        result = await handler(ctx);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        process.stderr.write(`[ERROR] Phase ${phaseId} failed: ${message}\n`);
        journalContent += `${header}\n\nPhase failed: ${message}\n\n`;
        await this.storage.writeJournal(dreamDate, journalContent);
        if (!this.partialRun) {
          state.completedPhases.push(phaseId);
          state.lastDreamAt = new Date().toISOString();
          await this.storage.writeState(state);
        }
        process.stdout.write(`Dream phase ${phaseId} failed. ${state.completedPhases.length}/${this.config.phases.length} phases done.\n`);
        phasesRunThisHeartbeat++;
        lastPhaseRun = phaseId;
        continue;
      }

      journalEntries.push({
        phase: result.phase,
        content: result.journal,
        insights: result.insights,
        nightmare: result.nightmare,
        metadata: result.metadata,
      });

      allInsights.push(...result.insights);

      if (result.metadata.drafts && Array.isArray(result.metadata.drafts)) {
        allDrafts.push(...(result.metadata.drafts as Draft[]));
      }

      journalContent += result.journal + '\n\n';

      if (result.nightmare) {
        process.stderr.write(`\n[NIGHTMARE] ${result.nightmare}\n\n`);
      }

      await this.storage.writeJournal(dreamDate, journalContent);

      if (!this.partialRun) {
        state.completedPhases.push(phaseId);
        state.lastDreamAt = new Date().toISOString();
        await this.storage.writeState(state);
      }

      phasesRunThisHeartbeat++;
      lastPhaseRun = phaseId;
      process.stdout.write(`Dream phase ${phaseId} complete. ${state.completedPhases.length}/${this.config.phases.length} phases done.\n`);
    }

    // Write drafts
    for (const draft of allDrafts) {
      await this.storage.writeDraft(dreamDate, `${draft.type}-${draft.name}.md`, draft.content);
    }

    if (!this.partialRun) {
      // Compile and append Morning Gift
      const priorities = this.extractPriorities(journalEntries);
      const morningGift = this.compileMorningGift(allInsights, priorities, allDrafts, lucid);
      journalContent += morningGift;

      // Update journal header with final scores
      const completedCount = state.completedPhases.length;
      const totalPhases = this.config.phases.length;
      journalContent = journalContent
        .replace('Score: ?/10', `Score: ${this.estimateQuality(journalEntries)}/10`)
        .replace(`Phases completed: 0/${totalPhases}`, `Phases completed: ${completedCount}/${totalPhases}`)
        .replace('Actionable insights: 0', `Actionable insights: ${allInsights.length}`);

      await this.storage.writeJournal(dreamDate, journalContent);

      // Clear one-shot lucid prompt from state
      if (state.lucidPrompt) {
        state.lucidPrompt = null;
        await this.storage.writeState(state);
      }

      process.stdout.write('\n' + morningGift);
    }
  }

  /**
   * Check if the orchestrator should continue to the next phase in the same heartbeat.
   * Returns null if OK to continue, or a reason string if it should stop.
   */
  private shouldContinue(lastPhase: PhaseId, nextPhase: PhaseId, phasesRun: number): string | null {
    const catchUp = this.config.catchUp || DEFAULT_CATCHUP;

    if (catchUp.policy === 'none') {
      return 'policy_none';
    }

    if (catchUp.policy === 'unlimited') {
      return null;
    }

    // policy === 'bounded'
    if (phasesRun >= catchUp.maxPhasesPerHeartbeat) {
      return 'catchup_limit';
    }

    const isChainable = catchUp.chainablePairs.some(
      ([a, b]) => a === lastPhase && b === nextPhase
    );

    if (!isChainable) {
      return 'no_chain';
    }

    return null;
  }

  private extractPriorities(entries: JournalEntry[]): string[] {
    const reviewEntry = entries.find((e) => e.phase === 'review');
    if (reviewEntry?.metadata.priorities && Array.isArray(reviewEntry.metadata.priorities)) {
      return reviewEntry.metadata.priorities as string[];
    }
    const allInsights = entries.flatMap((e) => e.insights);
    return allInsights.slice(0, 3);
  }

  private compileMorningGift(
    insights: string[],
    priorities: string[],
    drafts: Draft[],
    lucid: string | null
  ): string {
    const lines = [
      '---',
      '',
      '## Morning Gift',
      '',
      'Top priorities for today:',
    ];

    if (priorities.length > 0) {
      priorities.forEach((p, i) => lines.push(`${i + 1}. ${p}`));
    } else {
      lines.push('(No priorities identified)');
    }

    lines.push('');
    lines.push(`Drafts ready: ${drafts.length}`);
    lines.push(`Total insights: ${insights.length}`);
    lines.push(`Lucid dream: ${lucid || 'None'}`);
    lines.push('');

    return lines.join('\n');
  }

  private estimateQuality(entries: JournalEntry[]): number {
    if (entries.length === 0) return 0;
    const insightCount = entries.reduce((sum, e) => sum + e.insights.length, 0);
    const nightmareCount = entries.filter((e) => e.nightmare).length;
    const score = Math.min(10, Math.max(1, 5 + Math.floor(insightCount / 2) - nightmareCount));
    return score;
  }
}
