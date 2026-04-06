import type { WakelockAdapter, WakelockHandle } from '../types.js';

const NOOP_HANDLE: WakelockHandle = {
  async release() {},
  isActive() { return false; },
};

export class NoopWakelockAdapter implements WakelockAdapter {
  async acquire(_durationSeconds: number): Promise<WakelockHandle> {
    return NOOP_HANDLE;
  }

  isSupported(): boolean {
    return false;
  }
}
