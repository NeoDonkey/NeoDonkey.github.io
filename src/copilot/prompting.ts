/**
 * What the model is told, and what it is allowed to say back — PRD-001 R6.
 *
 * The interesting half is the schema. It is handed to the runtime as a grammar, so the model
 * cannot emit a token that would leave the output invalid: there is no "the model wrote prose
 * around the JSON" case, because that string is unreachable. The parser below still checks,
 * because a runtime that quietly ignores the constraint would otherwise be discovered by a
 * visitor rather than by us.
 *
 * The schema is deliberately one flat list of components rather than a recursive tree. Nesting
 * costs a small model far more than it buys a reader, and a grammar it can satisfy on the first
 * attempt is worth more here than one that can express a layout nobody asked for.
 */

import type { A2UIComponent, A2UIRootPayload } from '../renderer/a2uiRenderer';
import { sanitisePayload } from '../sanitizer/sanitizer';

export const A2UI_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['title', 'layout'],
  properties: {
    title: { type: 'string' },
    layout: {
      type: 'object',
      additionalProperties: false,
      required: ['type', 'children'],
      properties: {
        type: { const: 'Container' },
        children: {
          type: 'array',
          minItems: 1,
          maxItems: 6,
          items: {
            type: 'object',
            additionalProperties: false,
            required: ['type'],
            properties: {
              type: { enum: ['Heading', 'Text', 'Metric', 'Table', 'Chart', 'Notice'] },
              text: { type: 'string' },
              label: { type: 'string' },
              value: { type: 'string' },
              change: { type: 'string' },
              title: { type: 'string' },
              message: { type: 'string' },
              level: { enum: ['info', 'success', 'warning', 'error'] },
              caption: { type: 'string' },
              headers: { type: 'array', items: { type: 'string' }, maxItems: 6 },
              rows: {
                type: 'array',
                maxItems: 12,
                items: { type: 'array', items: { type: 'string' }, maxItems: 6 },
              },
              chartType: { enum: ['bar', 'line'] },
              data: {
                type: 'array',
                maxItems: 12,
                items: {
                  type: 'object',
                  additionalProperties: false,
                  required: ['label', 'value'],
                  properties: { label: { type: 'string' }, value: { type: 'number' } },
                },
              },
            },
          },
        },
      },
    },
  },
} as const;

/**
 * The system prompt. The company summary goes here rather than into the question, so the
 * runtime can keep it in the prefix across turns.
 */
export function buildSystemPrompt(companyDescription: string): string {
  return [
    'You build small interfaces from a company\'s own records. You answer only with a JSON',
    'object matching the schema you were given: a title, and a Container whose children are',
    'the components that answer the question.',
    '',
    'Rules:',
    '- Use only numbers and names that appear in the records below. Never invent a figure.',
    '- A company that has described its record types, processes and roles but holds no documents',
    '  yet is not empty: answer from the description.',
    '- Prefer a Table or a Chart over a paragraph when the answer is more than one number.',
    '- Use Metric for a single headline figure, with the unit written into the value.',
    '- If the records do not contain the answer, say so in one Notice with level "warning".',
    '- Keep it to at most four components. No preamble, no apology, no restating the question.',
    '',
    'The records:',
    '',
    companyDescription,
  ].join('\n');
}

export class MalformedOutputError extends Error {}

/**
 * Turn what the model said into a payload the renderer will accept, or refuse it.
 *
 * Nothing here trusts its input: this is a string produced by a language model, so it is
 * treated exactly as a string that arrived over the network would be (PRD-001 R8).
 */
export function parseA2UIResponse(raw: string): A2UIRootPayload {
  const text = unwrap(raw);
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch (err) {
    throw new MalformedOutputError(`not JSON: ${(err as Error).message}`);
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new MalformedOutputError('the output was not an object');
  }

  const payload = parsed as { title?: unknown; layout?: unknown };
  const layout = payload.layout as { type?: unknown; children?: unknown } | undefined;
  if (!layout || typeof layout !== 'object' || !Array.isArray(layout.children)) {
    throw new MalformedOutputError('no layout with children');
  }

  const children = layout.children.filter(isComponent);
  if (children.length === 0) throw new MalformedOutputError('every component was unusable');

  return sanitisePayload<A2UIRootPayload>({
    version: '1.0',
    title: typeof payload.title === 'string' ? payload.title : undefined,
    layout: { type: 'Container', children },
  });
}

const RENDERABLE = new Set(['Heading', 'Text', 'Metric', 'Table', 'Chart', 'Notice']);

function isComponent(value: unknown): value is A2UIComponent {
  return Boolean(value)
    && typeof value === 'object'
    && RENDERABLE.has((value as { type?: string }).type ?? '');
}

/**
 * Some runtimes hand back the JSON wrapped in a markdown fence even when they were asked not
 * to. Unwrapping it is one line; refusing it would cost the visitor a retry for a difference
 * that is not theirs.
 */
function unwrap(raw: string): string {
  const text = raw.trim();
  if (!text.startsWith('```')) return text;
  return text.replace(/^```[a-zA-Z]*\r?\n?/, '').replace(/```\s*$/, '').trim();
}
