/**
 * Hardware Gate Module
 * 
 * Complies with PRD-001 R3:
 * Pure function evaluating WebGPU availability and OPFS free storage.
 * Failure is silent: plain UI remains, no toggle, no error message.
 */

export interface SystemCapabilities {
  hasWebGPU: boolean;
  storageFreeBytes: number;
}

export const MIN_REQUIRED_STORAGE_BYTES = 2.5 * 1024 * 1024 * 1024; // 2.5 GB

export interface HardwareGateResult {
  supported: boolean;
  reason?: string;
}

/**
 * Pure hardware capability checker.
 */
export function checkHardwareCapability(sys: SystemCapabilities): HardwareGateResult {
  if (!sys.hasWebGPU) {
    return {
      supported: false,
      reason: 'WebGPU accelerator is not available on this system.',
    };
  }

  if (sys.storageFreeBytes < MIN_REQUIRED_STORAGE_BYTES) {
    return {
      supported: false,
      reason: `Insufficient storage space. Required: 2.5 GB, Available: ${(sys.storageFreeBytes / (1024 * 1024 * 1024)).toFixed(2)} GB.`,
    };
  }

  return {
    supported: true,
  };
}

/**
 * Inspects browser environment to build SystemCapabilities object.
 */
export async function detectSystemCapabilities(): Promise<SystemCapabilities> {
  const hasWebGPU = typeof navigator !== 'undefined' && 'gpu' in navigator && !!navigator.gpu;

  let storageFreeBytes = 0;
  if (typeof navigator !== 'undefined' && navigator.storage && navigator.storage.estimate) {
    try {
      const estimate = await navigator.storage.estimate();
      if (typeof estimate.quota === 'number' && typeof estimate.usage === 'number') {
        storageFreeBytes = Math.max(0, estimate.quota - estimate.usage);
      }
    } catch {
      storageFreeBytes = 0;
    }
  }

  return {
    hasWebGPU,
    storageFreeBytes,
  };
}
