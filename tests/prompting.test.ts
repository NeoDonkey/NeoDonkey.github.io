import { describe, it, expect } from 'vitest';
import {
  A2UI_SCHEMA, buildSystemPrompt, MalformedOutputError, parseA2UIResponse,
} from '../src/copilot/prompting';

/**
 * PRD-001 R6. The grammar makes most of these unreachable in production — which is exactly why
 * they are worth having: the day a runtime quietly ignores the constraint, this is what notices.
 */

const wellFormed = JSON.stringify({
  title: 'Open amounts',
  layout: {
    type: 'Container',
    children: [
      { type: 'Metric', label: 'Open total', value: '33 405.00 EUR' },
      { type: 'Table', headers: ['Supplier', 'Amount'], rows: [['Nordic Oats', '21 080.00']] },
    ],
  },
});

describe('reading what the model said', () => {
  it('accepts a well-formed answer', () => {
    const payload = parseA2UIResponse(wellFormed);

    expect(payload.title).toBe('Open amounts');
    expect(payload.layout.type).toBe('Container');
    expect((payload.layout as { children: unknown[] }).children).toHaveLength(2);
  });

  it('unwraps a markdown fence rather than spending a retry on it', () => {
    expect(parseA2UIResponse('```json\n' + wellFormed + '\n```').title).toBe('Open amounts');
  });

  it('refuses output that is not JSON', () => {
    expect(() => parseA2UIResponse('I think the answer is 42.')).toThrow(MalformedOutputError);
  });

  it('refuses a payload with no layout', () => {
    expect(() => parseA2UIResponse('{"title":"x"}')).toThrow(MalformedOutputError);
  });

  it('drops components it cannot render, and refuses when none are left', () => {
    const mixed = JSON.stringify({
      title: 'x',
      layout: { type: 'Container', children: [{ type: 'Iframe', src: 'https://evil.example' }, { type: 'Text', text: 'ok' }] },
    });
    expect((parseA2UIResponse(mixed).layout as { children: { type: string }[] }).children)
      .toEqual([{ type: 'Text', text: 'ok' }]);

    const allBad = JSON.stringify({ title: 'x', layout: { type: 'Container', children: [{ type: 'Script' }] } });
    expect(() => parseA2UIResponse(allBad)).toThrow(MalformedOutputError);
  });

  it('sanitises on the way through', () => {
    const hostile = JSON.stringify({
      title: 'x',
      layout: {
        type: 'Container',
        children: [{ type: 'Text', text: 'fine', onclick: 'alert(1)' }],
      },
    });

    const layout = parseA2UIResponse(hostile).layout as unknown as { children: Record<string, unknown>[] };
    const child = layout.children[0];
    expect(child.onclick).toBeUndefined();
  });
});

describe('what the model is told', () => {
  it('puts the company where the model will read it, and forbids inventing figures', () => {
    const prompt = buildSystemPrompt('## vessel (2)\n- displacement: number | total 2000');

    expect(prompt).toContain('## vessel (2)');
    expect(prompt).toContain('Never invent a figure');
  });

  it('constrains output to a container of flat components', () => {
    const children = A2UI_SCHEMA.properties.layout.properties.children;

    expect(children.items.properties.type.enum).toContain('Table');
    // Nothing in the schema may contain another component: a grammar a small model can satisfy
    // first time is worth more than one that can express a layout nobody asked for.
    expect(JSON.stringify(children.items)).not.toContain('children');
  });
});
