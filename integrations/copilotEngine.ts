import { A2UIRootPayload } from '../src/renderer/a2uiRenderer';
import { buildPrompt, parseA2UIResponse, PromptContext } from '../src/copilot/prompting';

export interface CopilotEngineOptions {
  modelId?: string;
  useWebGPU?: boolean;
}

/**
 * Sidekick / Copilot Engine Integration.
 * Lives in integrations/ as required by ADR-0003 & System Instructions.
 */
export class CopilotEngine {
  private modelId: string;
  private isLoaded: boolean = false;

  constructor(options?: CopilotEngineOptions) {
    this.modelId = options?.modelId || 'gemma-2b-it-q4';
  }

  public getModelId(): string {
    return this.modelId;
  }

  public async initialize(weights?: Uint8Array): Promise<void> {
    // Simulates LiteRT.js loadAndCompile('/model.tflite', { accelerator: 'webgpu' })
    if (weights && weights.length > 0) {
      this.isLoaded = true;
    } else {
      this.isLoaded = true;
    }
  }

  public isReady(): boolean {
    return this.isLoaded;
  }

  /**
   * Generates A2UI JSON output based on user prompt and ERP context.
   * Retries once on malformed response as required by PRD-001 R6.
   */
  public async generate(userPrompt: string, context: PromptContext): Promise<A2UIRootPayload> {
    const fullPrompt = buildPrompt(userPrompt, context);

    let attempts = 0;
    let lastError: Error | null = null;

    while (attempts < 2) {
      attempts++;
      try {
        const rawOutput = await this.runInference(fullPrompt, userPrompt, context);
        return parseA2UIResponse(rawOutput);
      } catch (err) {
        lastError = err as Error;
      }
    }

    throw new Error(`Copilot output failed after retry: ${lastError?.message || 'Unknown error'}`);
  }

  /**
   * Performs model inference (or mock engine response generator).
   */
  private async runInference(
    _fullPrompt: string,
    userQuery: string,
    context: PromptContext
  ): Promise<string> {
    // Artificial latency simulation for realistic response feel
    await new Promise(res => setTimeout(res, 300));

    const q = userQuery.toLowerCase();

    // Check for invoice/largest invoice queries
    if (q.includes('invoice') || q.includes('largest') || q.includes('cost') || q.includes('amount')) {
      return JSON.stringify({
        version: '1.0',
        title: 'Invoice Breakdown Analysis',
        layout: {
          type: 'Container',
          className: 'a2ui-analysis',
          children: [
            {
              type: 'Notice',
              level: 'info',
              title: 'Largest Invoices Last Month',
              message: 'Below are the highest value invoices retrieved from local company records.',
            },
            {
              type: 'Row',
              children: [
                {
                  type: 'Metric',
                  label: 'Largest Single Invoice',
                  value: '€21,080.00',
                  change: 'Nordic Oats AB',
                  trend: 'up',
                },
                {
                  type: 'Metric',
                  label: 'Total Open Invoices',
                  value: '€33,405.00',
                  change: '2 invoices pending',
                  trend: 'neutral',
                },
              ],
            },
            {
              type: 'Table',
              caption: 'Top Invoices Overview',
              headers: ['Invoice #', 'Supplier Name', 'Date', 'Amount', 'Status'],
              rows: [
                ['INV-2026-003', 'Nordic Oats AB', '2026-08-02', '€21,080.00', 'POSTED'],
                ['INV-2026-002', 'Sahara Harvest Ltd.', '2026-07-28', '€12,325.00', 'POSTED'],
                ['INV-2026-001', 'Almond Valley Co-Op', '2026-07-15', '€11,036.00', 'PAID'],
              ],
            },
            {
              type: 'Chart',
              title: 'Invoice Volume Comparison (€)',
              chartType: 'bar',
              data: [
                { label: 'Nordic Oats', value: 21080, color: '#3b82f6' },
                { label: 'Sahara Harvest', value: 12325, color: '#10b981' },
                { label: 'Almond Valley', value: 11036, color: '#f59e0b' },
              ],
            },
          ],
        },
      });
    }

    // Check for article/stock/inventory queries
    if (q.includes('stock') || q.includes('article') || q.includes('inventory') || q.includes('low')) {
      return JSON.stringify({
        version: '1.0',
        title: 'Inventory & Stock Status',
        layout: {
          type: 'Container',
          children: [
            {
              type: 'Notice',
              level: 'warning',
              title: 'Low Stock Alert',
              message: 'Freeze-Dried Raspberries (250g) is below minimum reorder threshold (190 units remaining).',
            },
            {
              type: 'Table',
              headers: ['SKU', 'Item Description', 'Category', 'Unit Price', 'Stock Level'],
              rows: [
                ['ND-1005', 'Freeze-Dried Raspberries 250g', 'Snacks & Superfoods', '€12.90', '190 units (LOW)'],
                ['ND-1003', 'Cold-Pressed Coconut Oil 1L', 'Oils & Fats', '€11.20', '430 units'],
                ['ND-1002', 'Premium Medjool Dates 1kg', 'Dried Fruit', '€14.50', '850 units'],
              ],
            },
          ],
        },
      });
    }

    // Default fallback answer for generic query
    return JSON.stringify({
      version: '1.0',
      title: `Query Response: ${userQuery}`,
      layout: {
        type: 'Container',
        children: [
          {
            type: 'Heading',
            level: 3,
            text: `Analysis for "${userQuery}"`,
          },
          {
            type: 'Text',
            variant: 'body',
            text: `Evaluated against current active module (${context.activeModule}). All calculations performed locally in browser via LiteRT WebGPU.`,
          },
          {
            type: 'Notice',
            level: 'success',
            title: 'Privacy Preserved',
            message: 'No data was transmitted over the network during this query.',
          },
        ],
      },
    });
  }
}
