import { spawn, type ChildProcess } from 'node:child_process';
import { existsSync } from 'node:fs';
import type { WakelockAdapter, WakelockHandle } from '../types.js';

class MacOSWakelockHandle implements WakelockHandle {
  private proc: ChildProcess;

  constructor(proc: ChildProcess) {
    this.proc = proc;
  }

  async release(): Promise<void> {
    if (this.isActive()) {
      this.proc.kill();
    }
  }

  isActive(): boolean {
    return !this.proc.killed && this.proc.exitCode === null;
  }
}

export class MacOSWakelockAdapter implements WakelockAdapter {
  private static readonly CAFFEINATE = '/usr/bin/caffeinate';

  async acquire(durationSeconds: number): Promise<WakelockHandle> {
    if (!this.isSupported()) {
      throw new Error('macOS wakelock not supported on this platform');
    }

    const proc = spawn(MacOSWakelockAdapter.CAFFEINATE, [
      '-i',  // prevent idle sleep
      '-s',  // prevent system sleep
      '-t', String(durationSeconds),
    ], {
      stdio: 'ignore',
      detached: true,
    });

    // Don't let the caffeinate process keep the Node event loop alive
    proc.unref();

    // Verify it started
    await new Promise<void>((resolve, reject) => {
      proc.on('error', (err) => reject(new Error(`Failed to start caffeinate: ${err.message}`)));
      // Give it a moment to fail or succeed
      setTimeout(resolve, 200);
    });

    if (proc.exitCode !== null) {
      throw new Error(`caffeinate exited immediately with code ${proc.exitCode}`);
    }

    return new MacOSWakelockHandle(proc);
  }

  isSupported(): boolean {
    return process.platform === 'darwin' && existsSync(MacOSWakelockAdapter.CAFFEINATE);
  }
}
