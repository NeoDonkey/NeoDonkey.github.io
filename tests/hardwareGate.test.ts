import { describe, it, expect } from 'vitest';
import { checkHardwareCapability, type SystemCapabilities } from '../src/copilot/hardwareGate';
import type { ModelChoice } from '../integrations/inference';

/**
 * PRD-001 R3. The point of these is that they run the same on any machine: the gate is a
 * function of a capability object, so a laptop with no WebGPU can still prove what the gate
 * does on a workstation that has it.
 */

const GB = 1024 * 1024 * 1024;

const tiny: ModelChoice = {
  id: 'tiny', family: 'tiny', name: 'Tiny', good: '', downloadMB: 200, vramMB: 400, needsShaderF16: false,
};
const halfPrecision: ModelChoice = {
  id: 'f16', family: 'f16', name: 'Half precision', good: '', downloadMB: 200, vramMB: 400, needsShaderF16: true,
};
const large: ModelChoice = {
  id: 'large', family: 'large', name: 'Large', good: '', downloadMB: 6000, vramMB: 9000, needsShaderF16: false,
};

const capable: SystemCapabilities = {
  hasWebGPU: true,
  shaderF16: true,
  maxBufferBytes: 2 * GB,
  storageFreeBytes: 8 * GB,
};

describe('the hardware gate', () => {
  it('offers the models a capable machine can run', () => {
    const result = checkHardwareCapability(capable, [large, tiny, halfPrecision]);

    expect(result.supported).toBe(true);
    expect(result.models.map((m) => m.id)).toEqual(['tiny', 'f16']);
  });

  it('offers nothing without WebGPU, whatever else the machine has', () => {
    const result = checkHardwareCapability({ ...capable, hasWebGPU: false }, [tiny]);

    expect(result.supported).toBe(false);
    expect(result.models).toEqual([]);
  });

  it('drops half-precision builds on a GPU without shader-f16', () => {
    const result = checkHardwareCapability({ ...capable, shaderF16: false }, [tiny, halfPrecision]);

    expect(result.models.map((m) => m.id)).toEqual(['tiny']);
  });

  it('refuses a model that would not fit in the storage left', () => {
    // 250 MB free against a 200 MB download: it fits, but with no room for the headroom a
    // browser needs before it starts evicting the origin.
    const cramped = { ...capable, storageFreeBytes: 250 * 1024 * 1024 };

    expect(checkHardwareCapability(cramped, [tiny]).supported).toBe(false);
  });

  it('does not gate on an adapter limit it was not told', () => {
    const unknownLimits = { ...capable, maxBufferBytes: 0 };

    expect(checkHardwareCapability(unknownLimits, [tiny]).supported).toBe(true);
  });

  it('says no when no runtime offered anything', () => {
    const result = checkHardwareCapability(capable, []);

    expect(result.supported).toBe(false);
    expect(result.reason).toContain('no runtime');
  });

  it('sorts the offer so the cheapest download comes first', () => {
    const middling: ModelChoice = { ...tiny, id: 'middling', family: 'middling', downloadMB: 700, vramMB: 900 };
    const result = checkHardwareCapability(capable, [middling, tiny]);

    expect(result.models.map((m) => m.id)).toEqual(['tiny', 'middling']);
  });

  it('offers one build per model, not one per quantisation', () => {
    // The same model, built twice for two kinds of GPU. A machine that can run both should be
    // asked to choose once, not twice.
    const f16Build: ModelChoice = { ...tiny, id: 'x-f16', family: 'x', downloadMB: 200, needsShaderF16: true };
    const f32Build: ModelChoice = { ...tiny, id: 'x-f32', family: 'x', downloadMB: 240, needsShaderF16: false };

    expect(checkHardwareCapability(capable, [f32Build, f16Build]).models.map((m) => m.id))
      .toEqual(['x-f16']);
    expect(checkHardwareCapability({ ...capable, shaderF16: false }, [f32Build, f16Build]).models.map((m) => m.id))
      .toEqual(['x-f32']);
  });
});
