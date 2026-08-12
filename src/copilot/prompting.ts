import { A2UIRootPayload } from '../renderer/a2uiRenderer';
import { sanitisePayload } from '../sanitizer/sanitizer';

export interface PromptContext {
  activeModule: string;
  summaryMetrics?: Record<string, unknown>;
  visibleEntities?: Record<string, unknown>[];
}

/**
 * Formats system prompt with injected ERP context and A2UI schema constraints.
 */
export function buildPrompt(userQuery: string, context: PromptContext): string {
  const contextJson = JSON.stringify({
    activeModule: context.activeModule,
    metrics: context.summaryMetrics || {},
    sampleEntities: context.visibleEntities ? context.visibleEntities.slice(0, 3) : [],
  }, null, 2);

  return `System: You are an AI assistant in NeoDonkey-ERP.
Context:
${contextJson}

User Query: "${userQuery}"

Task: Answer the user query by emitting valid A2UI JSON output. Do NOT include markdown code fences or conversational text outside JSON.
Required JSON root structure: { "version": "1.0", "title": "...", "layout": { "type": "Container", "children": [...] } }`;
}

/**
 * Parses and validates A2UI JSON string emitted by LLM.
 * Implements R6 automatic retry logic for malformed JSON.
 */
export function parseA2UIResponse(rawResponse: string): A2UIRootPayload {
  // Strip markdown code fences if model wrapped response in ```json ... ```
  let cleaned = rawResponse.trim();
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```[a-z]*\n?/i, '').replace(/\n?```$/i, '').trim();
  }

  try {
    const parsed = JSON.parse(cleaned);
    if (!parsed || typeof parsed !== 'object' || !parsed.layout) {
      throw new Error('A2UI payload missing "layout" root node.');
    }
    // Sanitise payload values
    return sanitisePayload(parsed) as A2UIRootPayload;
  } catch (err) {
    throw new Error(`Malformed A2UI JSON: ${(err as Error).message}`);
  }
}
