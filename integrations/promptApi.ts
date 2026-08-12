/**
 * The model the browser already has.
 *
 * Chrome ships an on-device model behind `LanguageModel`. Where it is present there is nothing
 * for this site to download, nothing to host and nothing to cache — the weights belong to the
 * browser, not to us, and the privacy property is the same one the whole design is built on:
 * the text of the question never leaves the machine.
 *
 * Everything here is feature-detected and every option is passed inside a try. This is a young
 * API on one engine; a site that assumed its exact shape would break on the next release, and
 * the fallback for all of it is the WebGPU runtime that does not need the browser's help.
 */

import type { GenerateOptions, InferenceBackend, LoadProgress, ModelChoice } from './inference';

interface LanguageModelSession {
  prompt(input: string, options?: { responseConstraint?: object; signal?: AbortSignal }): Promise<string>;
  promptStreaming?(input: string, options?: { responseConstraint?: object }): AsyncIterable<string>;
  destroy?(): void;
}

interface LanguageModelApi {
  availability(): Promise<'unavailable' | 'downloadable' | 'downloading' | 'available'>;
  create(options?: {
    initialPrompts?: { role: string; content: string }[];
    monitor?: (m: EventTarget) => void;
  }): Promise<LanguageModelSession>;
}

const api = (): LanguageModelApi | null =>
  (globalThis as { LanguageModel?: LanguageModelApi }).LanguageModel ?? null;

export const BUILT_IN_MODEL_ID = 'browser-built-in';

export class PromptApiBackend implements InferenceBackend {
  public readonly id = 'prompt-api';
  public readonly label = "This browser's own model";

  private session: LanguageModelSession | null = null;
  private system = '';

  public async available(): Promise<boolean> {
    const model = api();
    if (!model) return false;
    const state = await model.availability().catch(() => 'unavailable' as const);
    return state !== 'unavailable';
  }

  public models(): ModelChoice[] {
    return [{
      id: BUILT_IN_MODEL_ID,
      family: 'browser-built-in',
      name: 'Your browser’s built-in model',
      good: 'Already on this machine. Nothing to download, and it starts in about a second.',
      downloadMB: 0,
      vramMB: 0,
      needsShaderF16: false,
    }];
  }

  public async cached(): Promise<boolean> {
    return (await api()?.availability().catch(() => 'unavailable')) === 'available';
  }

  public async load(_modelId: string, onProgress: (p: LoadProgress) => void): Promise<void> {
    const model = api();
    if (!model) throw new Error('this browser has no built-in model');

    onProgress({ ratio: null, text: 'Opening the built-in model…' });
    this.session = await model.create({
      ...(this.system ? { initialPrompts: [{ role: 'system', content: this.system }] } : {}),
      monitor: (m) => m.addEventListener('downloadprogress', (event) => {
        const loaded = (event as Event & { loaded?: number }).loaded;
        onProgress({
          ratio: typeof loaded === 'number' ? loaded : null,
          text: 'The browser is fetching its model…',
        });
      }),
    });
    onProgress({ ratio: 1, text: 'Ready.' });
  }

  public async generate(system: string, user: string, options: GenerateOptions = {}): Promise<string> {
    // The system prompt can only be set when the session is created, and it changes whenever the
    // company does. Recreating the session is cheap here — there are no weights to move.
    if (system !== this.system || !this.session) {
      this.system = system;
      await this.unload();
      await this.load(BUILT_IN_MODEL_ID, () => undefined);
    }
    const session = this.session;
    if (!session) throw new Error('the built-in model did not open');

    const constrained = options.schema ? { responseConstraint: options.schema } : {};
    try {
      return await session.prompt(user, { ...constrained, ...(options.signal ? { signal: options.signal } : {}) });
    } catch (err) {
      // An engine that does not know `responseConstraint` rejects the whole call. Ask again
      // without it and let the parser deal with whatever comes back — that path exists anyway.
      if (!options.schema) throw err;
      return session.prompt(user);
    }
  }

  public async forget(): Promise<void> {
    // The weights are the browser's. Removing them is a browser setting, and a site that could
    // delete them on the visitor's behalf would be a site with more reach than it should have.
  }

  public async unload(): Promise<void> {
    this.session?.destroy?.();
    this.session = null;
  }
}
