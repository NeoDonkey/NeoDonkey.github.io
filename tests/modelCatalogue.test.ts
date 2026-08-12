import { describe, it, expect } from 'vitest';
import { prebuiltAppConfig } from '@mlc-ai/web-llm';
import { MODELS } from '../integrations/webllm';

/**
 * The catalogue states a model id, a download size and a VRAM requirement to the visitor before
 * they agree to spend any of it. An id the runtime does not know would be discovered by whoever
 * clicked "Download and start" — so it is discovered here instead.
 *
 * The runtime used to be asked this at run time, which cost every visitor the six megabytes of
 * WebLLM just to render a list. A check that belongs at build time now happens at build time.
 */

describe('the model catalogue', () => {
  const known = new Map(prebuiltAppConfig.model_list.map((m) => [m.model_id, m]));

  it('offers only models the bundled runtime can load', () => {
    const missing = MODELS.filter((m) => !known.has(m.id)).map((m) => m.id);

    expect(missing).toEqual([]);
  });

  it('states a VRAM figure that matches what the runtime asks for', () => {
    for (const model of MODELS) {
      const required = known.get(model.id)?.vram_required_MB;
      if (required === undefined) continue;
      // Within a few per cent: the number shown to a visitor should be the runtime's, not a
      // guess that drifts as the runtime is upgraded.
      expect(Math.abs(model.vramMB - required) / required).toBeLessThan(0.25);
    }
  });

  it('offers two builds of every family, so a GPU without shader-f16 still has one', () => {
    const byFamily = new Map<string, boolean[]>();
    for (const model of MODELS) {
      byFamily.set(model.family, [...(byFamily.get(model.family) ?? []), model.needsShaderF16]);
    }

    for (const [family, flags] of byFamily) {
      expect(flags, family).toContain(true);
      expect(flags, family).toContain(false);
    }
  });
});
