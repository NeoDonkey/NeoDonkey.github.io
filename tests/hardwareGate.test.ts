import { describe, it, expect } from 'vitest';
import { checkHardwareCapability, MIN_REQUIRED_STORAGE_BYTES } from '../src/copilot/hardwareGate';

describe('Hardware Gate Pure Function Tests (PRD-001 R3)', () => {
  it('should pass hardware gate when WebGPU is available and storage space is sufficient', () => {
    const result = checkHardwareCapability({
      hasWebGPU: true,
      storageFreeBytes: MIN_REQUIRED_STORAGE_BYTES + 100 * 1024 * 1024, // 2.6 GB free
    });

    expect(result.supported).toBe(true);
    expect(result.reason).toBeUndefined();
  });

  it('should fail silently when WebGPU is not available', () => {
    const result = checkHardwareCapability({
      hasWebGPU: false,
      storageFreeBytes: MIN_REQUIRED_STORAGE_BYTES + 100 * 1024 * 1024,
    });

    expect(result.supported).toBe(false);
    expect(result.reason).toContain('WebGPU accelerator is not available');
  });

  it('should fail silently when free storage is below required threshold', () => {
    const result = checkHardwareCapability({
      hasWebGPU: true,
      storageFreeBytes: 1 * 1024 * 1024 * 1024, // Only 1.0 GB free
    });

    expect(result.supported).toBe(false);
    expect(result.reason).toContain('Insufficient storage space');
  });
});
