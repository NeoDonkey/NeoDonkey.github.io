/**
 * The Copilot: a question in, an interface out, nothing over the network.
 *
 * This is the only place that knows all three halves — the runtime that generates, the
 * workspace that supplies the facts, and the schema that constrains the answer. Each of them is
 * replaceable without the other two noticing, which is the whole reason the seams are where
 * they are.
 */

import type { InferenceBackend, LoadProgress, ModelChoice } from '../../integrations/inference';
import { PromptApiBackend } from '../../integrations/promptApi';
import { WebLLMBackend } from '../../integrations/webllm';
import { snapshotWorkspace, describeSnapshot, type WorkspaceSnapshot } from '../erp/context';
import { openWorkspaceForReading } from '../erp/workspace';
import type { A2UIRootPayload } from '../renderer/a2uiRenderer';
import { checkHardwareCapability, detectSystemCapabilities } from './hardwareGate';
import { A2UI_SCHEMA, buildSystemPrompt, MalformedOutputError, parseA2UIResponse } from './prompting';

export interface Offer {
  backend: InferenceBackend;
  models: ModelChoice[];
}

export interface Answer {
  payload: A2UIRootPayload;
  /** What the answer was computed from, so the panel can say so honestly. */
  snapshot: WorkspaceSnapshot | null;
  elapsedMs: number;
}

export class Copilot {
  private active: InferenceBackend | null = null;
  private lastSystemPrompt = '';

  /**
   * What this machine can be offered, or an empty list — PRD-001 R3. Every runtime is asked
   * whether it can run here, and the gate then decides which of their models actually fit. An
   * empty result is not an error and produces no interface.
   */
  public async offers(): Promise<Offer[]> {
    const candidates: InferenceBackend[] = [new PromptApiBackend(), new WebLLMBackend()];
    const capabilities = await detectSystemCapabilities();
    const offers: Offer[] = [];

    for (const backend of candidates) {
      if (!await backend.available().catch(() => false)) continue;
      const models = backend.models();
      // A runtime that brings its own weights (the browser's built-in model) has nothing to
      // download and nothing for the storage gate to weigh, so it is offered as it is.
      const gated = models.every((m) => m.downloadMB === 0)
        ? models
        : checkHardwareCapability(capabilities, models).models;
      if (gated.length) offers.push({ backend, models: gated });
    }

    return offers;
  }

  public async use(
    backend: InferenceBackend,
    modelId: string,
    onProgress: (p: LoadProgress) => void,
  ): Promise<void> {
    if (this.active && this.active !== backend) await this.active.unload();
    await backend.load(modelId, onProgress);
    this.active = backend;
  }

  public get runtime(): InferenceBackend | null {
    return this.active;
  }

  /**
   * Answer a question about the company as it is on disk right now.
   *
   * The workspace is re-read for every question rather than cached: the ERP beside this is a
   * live application, and an answer computed from what the company looked like when the drawer
   * was opened would be wrong in exactly the way that destroys trust in a tool like this.
   *
   * Malformed output is retried once and then reported plainly (PRD-001 R6).
   */
  public async ask(question: string, onToken?: (chunk: string) => void): Promise<Answer> {
    const backend = this.active;
    if (!backend) throw new Error('no runtime is loaded');

    const started = performance.now();
    const workspace = await openWorkspaceForReading().catch(() => null);
    const snapshot = workspace ? await snapshotWorkspace(workspace) : null;

    this.lastSystemPrompt = buildSystemPrompt(snapshot
      ? describeSnapshot(snapshot)
      : 'There is no company open in this browser yet, so there are no records to read.');

    let lastError: Error | null = null;
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const raw = await backend.generate(this.lastSystemPrompt, question, {
          schema: A2UI_SCHEMA,
          onToken: attempt === 0 ? onToken : undefined,
        });
        return { payload: parseA2UIResponse(raw), snapshot, elapsedMs: performance.now() - started };
      } catch (err) {
        lastError = err as Error;
        if (!(err instanceof MalformedOutputError)) break;
      }
    }

    throw new Error(lastError instanceof MalformedOutputError
      ? 'The model did not produce an interface this time. Asking again usually works.'
      : lastError?.message ?? 'The Copilot could not answer.');
  }

  public async stop(): Promise<void> {
    await this.active?.unload();
    this.active = null;
  }
}
