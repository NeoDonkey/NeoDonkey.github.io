/**
 * Whether this machine is offered a Copilot at all — PRD-001 R3.
 *
 * A pure function of a capability object, so the decision can be tested against a machine
 * nobody owns rather than only against whichever laptop runs the tests.
 *
 * Failure is silent by design. A visitor whose hardware cannot do this gets the ERP and no
 * toggle, no apology and no paragraph about what they are missing — the plain site is the
 * product, not a consolation prize.
 */

import type { ModelChoice } from '../../integrations/inference';

export interface SystemCapabilities {
  hasWebGPU: boolean;
  /** 16-bit shaders. Absent on some older GPUs and on most software adapters. */
  shaderF16: boolean;
  /** The largest single buffer the adapter will bind, in bytes. 0 when unknown. */
  maxBufferBytes: number;
  /** Free bytes the origin may still use, from `navigator.storage.estimate()`. */
  storageFreeBytes: number;
}

export interface HardwareGateResult {
  supported: boolean;
  /** Never shown to the visitor. It exists so a developer can find out why. */
  reason?: string;
  /** The models this machine can actually run, cheapest first. */
  models: ModelChoice[];
}

/** Weights need room to be written, and the browser evicts an origin that fills its quota. */
const HEADROOM = 1.5;

/**
 * Decide, from capabilities alone.
 *
 * @param caps  what the machine can do
 * @param offered  every model any available runtime knows how to run
 */
export function checkHardwareCapability(
  caps: SystemCapabilities,
  offered: ModelChoice[] = [],
): HardwareGateResult {
  if (!caps.hasWebGPU) {
    return { supported: false, reason: 'no WebGPU adapter', models: [] };
  }

  const runnable = dedupe(offered
    .filter((m) => !m.needsShaderF16 || caps.shaderF16)
    // A model whose weights cannot be bound cannot be run, however much disk is free. 0 means
    // the adapter did not say, and refusing on an unknown would gate out working machines.
    .filter((m) => caps.maxBufferBytes === 0 || m.vramMB * 1024 * 1024 <= caps.maxBufferBytes * 8)
    .filter((m) => caps.storageFreeBytes >= m.downloadMB * 1024 * 1024 * HEADROOM)
    .sort((a, b) => a.downloadMB - b.downloadMB));

  if (runnable.length === 0) {
    return {
      supported: false,
      reason: offered.length === 0
        ? 'no runtime offered a model'
        : `no offered model fits: ${Math.round(caps.storageFreeBytes / 1024 / 1024)} MB free, `
          + `shader-f16 ${caps.shaderF16 ? 'yes' : 'no'}`,
      models: [],
    };
  }

  return { supported: true, models: runnable };
}

/**
 * One build per model. The catalogue carries a half-precision and a single-precision build of
 * each; on a GPU that can run both, offering both would ask the visitor to choose between two
 * rows with the same name and a different number of megabytes, which is not a choice — it is a
 * quiz about their graphics driver. The cheaper one wins, because the list is already sorted.
 */
function dedupe(models: ModelChoice[]): ModelChoice[] {
  const seen = new Set<string>();
  return models.filter((m) => !seen.has(m.family) && seen.add(m.family));
}

/** Ask the machine what it can do. The only impure half, and it does nothing but read. */
export async function detectSystemCapabilities(): Promise<SystemCapabilities> {
  const caps: SystemCapabilities = {
    hasWebGPU: false,
    shaderF16: false,
    maxBufferBytes: 0,
    storageFreeBytes: 0,
  };

  if (typeof navigator !== 'undefined' && navigator.gpu) {
    const adapter = await navigator.gpu.requestAdapter().catch(() => null);
    if (adapter) {
      caps.hasWebGPU = true;
      caps.shaderF16 = adapter.features.has('shader-f16');
      caps.maxBufferBytes = adapter.limits.maxStorageBufferBindingSize ?? 0;
    }
  }

  if (typeof navigator !== 'undefined' && navigator.storage?.estimate) {
    const estimate = await navigator.storage.estimate().catch(() => null);
    if (estimate && typeof estimate.quota === 'number') {
      caps.storageFreeBytes = Math.max(0, estimate.quota - (estimate.usage ?? 0));
    }
  }

  return caps;
}
