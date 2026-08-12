/**
 * The interface every inference runtime is used through — PRD-001 R4.
 *
 * Everything the site knows about running a language model is these few methods. The runtime
 * behind them is replaceable without the Copilot, the renderer or the ERP noticing, which is
 * the property the ADR asked for and the only reason a dependency this large is allowed here
 * at all. See docs/ADR-002-inference-runtime.md for which runtimes exist and why.
 */

export interface ModelChoice {
  id: string;
  /**
   * Which model this is, ignoring how it was built for a particular GPU. Two entries sharing a
   * family are the same choice to a visitor, and only one of them is ever offered.
   */
  family: string;
  name: string;
  /** What it is good at, in the visitor's language, shown before anything is downloaded. */
  good: string;
  /** One-time download, in megabytes. Stated before it starts (PRD-001 R5). */
  downloadMB: number;
  /** Graphics memory the runtime asks for. The gate refuses a model the device cannot hold. */
  vramMB: number;
  /** Whether this build needs 16-bit shader support, which not every GPU has. */
  needsShaderF16: boolean;
}

export interface LoadProgress {
  /** 0 to 1, or null while the runtime is doing something it cannot measure. */
  ratio: number | null;
  text: string;
}

export interface GenerateOptions {
  /** A JSON schema the output is constrained to. Not a request — a grammar. */
  schema?: object;
  onToken?: (chunk: string) => void;
  signal?: AbortSignal;
}

export interface InferenceBackend {
  readonly id: string;
  /** Shown next to the Copilot when it is running. */
  readonly label: string;
  /** Whether this runtime can run here at all, decided by asking rather than sniffing. */
  available(): Promise<boolean>;
  /** Models this runtime offers. Empty when the runtime brings its own and offers no choice. */
  models(): ModelChoice[];
  /** Whether the weights are already on this machine, so no download is needed. */
  cached(modelId: string): Promise<boolean>;
  load(modelId: string, onProgress: (p: LoadProgress) => void): Promise<void>;
  generate(system: string, user: string, options?: GenerateOptions): Promise<string>;
  /** Give the disk space back (PRD-001 R5). */
  forget(modelId: string): Promise<void>;
  unload(): Promise<void>;
}
