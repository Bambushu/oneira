import type { PhaseHandler, PhaseId } from '../types.js';
import { consolidation } from './consolidation.js';
import { synthesis } from './synthesis.js';
import { hypothesis } from './hypothesis.js';
import { simulation } from './simulation.js';
import { experimentation } from './experimentation.js';
import { drafts } from './drafts.js';
import { review } from './review.js';

export const BUILTIN_PHASES: Map<PhaseId, PhaseHandler> = new Map([
  ['consolidation', consolidation],
  ['synthesis', synthesis],
  ['hypothesis', hypothesis],
  ['simulation', simulation],
  ['experimentation', experimentation],
  ['drafts', drafts],
  ['review', review],
]);
