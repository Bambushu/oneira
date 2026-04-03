import { describe, it, expect } from 'vitest';
import {
  PHASE_IDS,
  PHASE_JOURNAL_HEADERS,
  DEFAULT_CONFIG,
} from '../src/types.js';

describe('types', () => {
  it('has 7 phase IDs', () => {
    expect(PHASE_IDS).toHaveLength(7);
  });

  it('has journal headers for every phase', () => {
    for (const id of PHASE_IDS) {
      expect(PHASE_JOURNAL_HEADERS[id]).toBeDefined();
      expect(PHASE_JOURNAL_HEADERS[id]).toMatch(/^## /);
    }
  });

  it('default config has all phases in order', () => {
    expect(DEFAULT_CONFIG.phases).toEqual(PHASE_IDS);
  });

  it('phase IDs are in canonical order', () => {
    expect(PHASE_IDS).toEqual([
      'consolidation',
      'synthesis',
      'hypothesis',
      'simulation',
      'experimentation',
      'drafts',
      'review',
    ]);
  });
});
