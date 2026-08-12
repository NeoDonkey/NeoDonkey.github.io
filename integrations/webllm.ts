/**
 * WebGPU inference, through MLC's WebLLM.
 *
 * The model is compiled to WebGPU shaders and runs on the visitor's own graphics hardware.
 * Weights are fetched once from the model's public repository and kept in the browser's cache
 * storage; a second visit compiles from that copy and asks the network for nothing.
 *
 * Output is constrained by a grammar built from a JSON schema, not by asking the model nicely.
 * That is what makes a model this small dependable enough to drive an interface: it cannot emit
 * a token that would break the schema, so "the model returned prose instead of JSON" is not a
 * failure mode this code has to have an opinion about.
 *
 * **The runtime is imported lazily and that is not an optimisation.** WebLLM is six megabytes
 * of WebAssembly and glue. A visitor reading the landing page, or using the ERP with the Copilot
 * switched off, must not pay for it — that is what "progressive enhancement" has to mean if it
 * means anything (ADR-001). So `available()` and `models()` answer without it, and the module
 * arrives when the visitor opens the drawer.
 */

import type { MLCEngineInterface } from '@mlc-ai/web-llm';
import type { GenerateOptions, InferenceBackend, LoadProgress, ModelChoice } from './inference';

/** The one place the runtime is pulled in. Vite gives it its own chunk. */
const runtime = () => import('@mlc-ai/web-llm');

/**
 * The models offered, smallest first. Download sizes are the published parameter bytes of each
 * build, not an estimate; VRAM is what the runtime itself asks for. Both are stated to the
 * visitor before anything starts (PRD-001 R5).
 *
 * Two builds of each: `q4f16` needs a GPU with 16-bit shader support and is meaningfully
 * smaller, `q4f32` runs anywhere WebGPU does. The gate picks one per family; the visitor never
 * sees the distinction, because "which quantisation does your graphics driver support" is not a
 * question anybody came here to answer.
 *
 * That every id here is one the runtime actually has a compiled library for is asserted by
 * tests/modelCatalogue.test.ts, so a typo fails the build rather than a visitor's download.
 */
export const MODELS: ModelChoice[] = [
  {
    id: 'SmolLM2-360M-Instruct-q4f16_1-MLC',
    family: 'smollm2-360m',
    name: 'SmolLM2 360M',
    good: 'Quickest to try. Answers in a second or two; keeps to short tables and summaries.',
    downloadMB: 194, vramMB: 380, needsShaderF16: true,
  },
  {
    id: 'SmolLM2-360M-Instruct-q4f32_1-MLC',
    family: 'smollm2-360m',
    name: 'SmolLM2 360M',
    good: 'Quickest to try. Answers in a second or two; keeps to short tables and summaries.',
    downloadMB: 216, vramMB: 580, needsShaderF16: false,
  },
  {
    id: 'Llama-3.2-1B-Instruct-q4f16_1-MLC',
    family: 'llama-3.2-1b',
    name: 'Llama 3.2 1B',
    good: 'A good balance. Reads the whole company summary and writes readable tables and charts.',
    downloadMB: 663, vramMB: 880, needsShaderF16: true,
  },
  {
    id: 'Llama-3.2-1B-Instruct-q4f32_1-MLC',
    family: 'llama-3.2-1b',
    name: 'Llama 3.2 1B',
    good: 'A good balance. Reads the whole company summary and writes readable tables and charts.',
    downloadMB: 737, vramMB: 1130, needsShaderF16: false,
  },
  {
    id: 'Qwen2.5-1.5B-Instruct-q4f16_1-MLC',
    family: 'qwen2.5-1.5b',
    name: 'Qwen 2.5 1.5B',
    good: 'The most careful of the three with numbers and with following an instruction exactly.',
    downloadMB: 828, vramMB: 1630, needsShaderF16: true,
  },
  {
    id: 'Qwen2.5-1.5B-Instruct-q4f32_1-MLC',
    family: 'qwen2.5-1.5b',
    name: 'Qwen 2.5 1.5B',
    good: 'The most careful of the three with numbers and with following an instruction exactly.',
    downloadMB: 921, vramMB: 1880, needsShaderF16: false,
  },
];

export class WebLLMBackend implements InferenceBackend {
  public readonly id = 'webllm';
  public readonly label = 'WebGPU · on this device';

  private engine: MLCEngineInterface | null = null;
  private worker: Worker | null = null;
  private loaded: string | null = null;

  /** Answered by the browser, not by the runtime: nothing is downloaded to find this out. */
  public async available(): Promise<boolean> {
    return Boolean(navigator.gpu && await navigator.gpu.requestAdapter().catch(() => null));
  }

  public models(): ModelChoice[] {
    return MODELS;
  }

  public async cached(modelId: string): Promise<boolean> {
    const { hasModelInCache, prebuiltAppConfig } = await runtime();
    return hasModelInCache(modelId, prebuiltAppConfig).catch(() => false);
  }

  public async load(modelId: string, onProgress: (p: LoadProgress) => void): Promise<void> {
    if (this.loaded === modelId && this.engine) return;
    await this.unload();

    const { CreateWebWorkerMLCEngine } = await runtime();
    this.worker = new Worker(new URL('./webllm.worker.ts', import.meta.url), { type: 'module' });
    this.engine = await CreateWebWorkerMLCEngine(this.worker, modelId, {
      initProgressCallback: (report) => onProgress({
        ratio: Number.isFinite(report.progress) ? report.progress : null,
        text: report.text,
      }),
    });
    this.loaded = modelId;
  }

  public async generate(system: string, user: string, options: GenerateOptions = {}): Promise<string> {
    if (!this.engine) throw new Error('no model is loaded');

    const request = {
      messages: [
        { role: 'system' as const, content: system },
        { role: 'user' as const, content: user },
      ],
      // Low but not zero: at zero a small model repeats a phrasing it has already used when the
      // same question is asked twice, which reads as broken rather than deterministic.
      temperature: 0.2,
      max_tokens: 1200,
      ...(options.schema
        ? { response_format: { type: 'json_object' as const, schema: JSON.stringify(options.schema) } }
        : {}),
    };

    if (!options.onToken) {
      const done = await this.engine.chat.completions.create({ ...request, stream: false });
      return done.choices[0]?.message?.content ?? '';
    }

    const stream = await this.engine.chat.completions.create({ ...request, stream: true });
    let text = '';
    for await (const chunk of stream) {
      if (options.signal?.aborted) break;
      const delta = chunk.choices[0]?.delta?.content ?? '';
      if (delta) { text += delta; options.onToken(delta); }
    }
    return text;
  }

  public async forget(modelId: string): Promise<void> {
    if (this.loaded === modelId) await this.unload();
    const { deleteModelAllInfoInCache, prebuiltAppConfig } = await runtime();
    await deleteModelAllInfoInCache(modelId, prebuiltAppConfig);
  }

  public async unload(): Promise<void> {
    await this.engine?.unload().catch(() => undefined);
    this.worker?.terminate();
    this.engine = null;
    this.worker = null;
    this.loaded = null;
  }
}
