export interface OneiraConfig {
  provider: 'anthropic';
  phases: PhaseId[];
  schedule: {
    start: string;
    end: string;
    timezone: string;
  };
  storage: 'file';
  lucid: string | null;
  project: string;
}

export type PhaseId =
  | 'consolidation'
  | 'synthesis'
  | 'hypothesis'
  | 'simulation'
  | 'experimentation'
  | 'drafts'
  | 'review';

export const PHASE_IDS: PhaseId[] = [
  'consolidation',
  'synthesis',
  'hypothesis',
  'simulation',
  'experimentation',
  'drafts',
  'review',
];

export const PHASE_JOURNAL_HEADERS: Record<PhaseId, string> = {
  consolidation: '## Memory Consolidation',
  synthesis: '## Creative Synthesis',
  hypothesis: '## Hypotheses',
  simulation: '## Simulation & Rehearsal',
  experimentation: '## Self-Experimentation',
  drafts: '## Draft Factory',
  review: '## Self-Review',
};

export interface PhaseContext {
  config: OneiraConfig;
  date: string;
  memory: MemoryStore;
  journal: JournalEntry[];
  llm: LLMAdapter;
  lucid: string | null;
}

export interface PhaseResult {
  phase: PhaseId;
  journal: string;
  insights: string[];
  nightmare: string | null;
  metadata: Record<string, unknown>;
}

export type PhaseHandler = (ctx: PhaseContext) => Promise<PhaseResult>;

export interface JournalEntry {
  phase: PhaseId;
  content: string;
  insights: string[];
  nightmare: string | null;
  metadata: Record<string, unknown>;
}

export interface DreamState {
  currentDreamDate: string | null;
  completedPhases: PhaseId[];
  lastDreamAt: string | null;
  lucidPrompt: string | null;
}

export interface MemoryStore {
  list(): Promise<string[]>;
  read(name: string): Promise<string | null>;
}

export interface LLMAdapter {
  complete(prompt: string, options?: LLMOptions): Promise<string>;
  completeJSON<T>(prompt: string, schema: Record<string, unknown>, options?: LLMOptions): Promise<T>;
}

export interface LLMOptions {
  maxTokens?: number;
  temperature?: number;
  model?: string;
}

export interface StorageAdapter {
  readState(): Promise<DreamState>;
  writeState(state: DreamState): Promise<void>;
  readJournal(date: string): Promise<string | null>;
  writeJournal(date: string, content: string): Promise<void>;
  listJournals(): Promise<string[]>;
  writeDraft(date: string, name: string, content: string): Promise<void>;
}

export interface Draft {
  type: 'pr' | 'changelog' | 'doc';
  name: string;
  content: string;
}

export const DEFAULT_CONFIG: Omit<OneiraConfig, 'project'> = {
  provider: 'anthropic',
  phases: [...PHASE_IDS],
  schedule: {
    start: '22:00',
    end: '06:00',
    timezone: 'auto',
  },
  storage: 'file',
  lucid: null,
};
