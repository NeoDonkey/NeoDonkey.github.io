import { describe, it, expect } from 'vitest';
import { plainText, sanitiseUrl, sanitiseAttributes, sanitisePayload } from '../src/sanitizer/sanitizer';

/**
 * PRD-001 R8. The input is JSON from a language model, so these are the tests that decide
 * whether the site is safe to run a model in front of at all — not a sub-bullet of the renderer.
 */

describe('text destined for the document', () => {
  it('does not escape ordinary punctuation', () => {
    // The renderer writes with textContent, so escaping here would only show the visitor
    // "Meyer &amp; Sohn" — a bug that has shipped in a hundred products for this exact reason.
    expect(plainText('Meyer & Sohn — "Gmbh"')).toBe('Meyer & Sohn — "Gmbh"');
  });

  it('leaves markup as characters rather than as markup', () => {
    expect(plainText('<script>alert(1)</script>')).toBe('<script>alert(1)</script>');
  });

  it('removes control and direction-override characters', () => {
    expect(plainText('total‮000,1​ EUR')).toBe('total000,1 EUR');
  });

  it('caps a runaway generation', () => {
    expect(plainText('x'.repeat(50_000)).length).toBeLessThan(2100);
  });
});

describe('URLs', () => {
  it('refuses every scheme that can execute', () => {
    expect(sanitiseUrl('javascript:alert(1)')).toBe('#');
    expect(sanitiseUrl('JAVASCRIPT:alert(1)')).toBe('#');
    expect(sanitiseUrl('vbscript:msgbox(1)')).toBe('#');
    expect(sanitiseUrl('data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==')).toBe('#');
    expect(sanitiseUrl('file:///etc/passwd')).toBe('#');
  });

  it('is not fooled by whitespace inside the scheme', () => {
    expect(sanitiseUrl('java\nscript:alert(1)')).toBe('#');
    expect(sanitiseUrl('  javascript:alert(1)  ')).toBe('#');
  });

  it('allows the schemes a link may reasonably use', () => {
    expect(sanitiseUrl('https://neodonkey.github.io')).toBe('https://neodonkey.github.io');
    expect(sanitiseUrl('mailto:hallo@example.org')).toBe('mailto:hallo@example.org');
    expect(sanitiseUrl('/somewhere')).toBe('/somewhere');
  });

  it('refuses anything that is not a string', () => {
    expect(sanitiseUrl(null)).toBe('#');
    expect(sanitiseUrl({ toString: () => 'https://ok.example' })).toBe('#');
  });
});

describe('attributes', () => {
  it('drops every handler and neutralises every URL', () => {
    const cleaned = sanitiseAttributes({
      id: 'btn-1',
      onclick: 'alert(1)',
      ONERROR: 'evil()',
      'data-onhover': 'evil()',
      href: 'javascript:void(0)',
      formaction: 'javascript:void(0)',
      className: 'my-class',
    });

    expect(cleaned.id).toBe('btn-1');
    expect(cleaned.className).toBe('my-class');
    expect(cleaned.onclick).toBeUndefined();
    expect(cleaned.ONERROR).toBeUndefined();
    expect(cleaned['data-onhover']).toBeUndefined();
    expect(cleaned.href).toBe('#');
    expect(cleaned.formaction).toBe('#');
  });
});

describe('a hostile payload', () => {
  it('keeps its text and loses everything that could run', () => {
    const hostile = {
      type: 'Button',
      label: '<img src=x onerror=alert(1)>',
      onclick: 'alert(1)',
      actionUrl: 'javascript:alert(2)',
      children: [{ type: 'Text', text: 'fine', onmouseover: 'alert(3)' }],
    };

    const clean = sanitisePayload(hostile) as Record<string, unknown>;

    expect(clean.label).toBe('<img src=x onerror=alert(1)>');
    expect(clean.onclick).toBeUndefined();
    expect(clean.actionUrl).toBe('#');
    expect((clean.children as Record<string, unknown>[])[0].onmouseover).toBeUndefined();
    expect((clean.children as Record<string, unknown>[])[0].text).toBe('fine');
  });

  it('cannot reach an object prototype', () => {
    const poisoned = JSON.parse('{"__proto__": {"polluted": true}, "type": "Text"}');

    const clean = sanitisePayload(poisoned) as Record<string, unknown>;

    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
    expect(Object.getPrototypeOf(clean)).toBe(Object.prototype);
    expect(clean.type).toBe('Text');
  });

  it('cannot recurse without end', () => {
    let deep: Record<string, unknown> = { type: 'Text', text: 'bottom' };
    for (let i = 0; i < 200; i++) deep = { type: 'Container', children: [deep] };

    expect(() => sanitisePayload(deep)).not.toThrow();
  });
});
