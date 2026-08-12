import { describe, it, expect } from 'vitest';
import { sanitiseText, sanitiseUrl, sanitiseAttributes, sanitisePayload } from '../src/sanitizer/sanitizer';

describe('Sanitiser & Hostile Payload Security Tests (PRD-001 R8)', () => {
  it('escapes HTML tags and script injection in text nodes', () => {
    const hostile = '<script>alert("xss")</script>';
    const cleaned = sanitiseText(hostile);

    expect(cleaned).not.toContain('<script>');
    expect(cleaned).toBe('&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;');
  });

  it('blocks javascript: URLs and dangerous protocols', () => {
    expect(sanitiseUrl('javascript:alert(1)')).toBe('#');
    expect(sanitiseUrl('JAVASCRIPT:console.log(document.cookie)')).toBe('#');
    expect(sanitiseUrl('vbscript:msgbox(1)')).toBe('#');
    expect(sanitiseUrl('data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==')).toBe('#');

    // Valid URLs pass through
    expect(sanitiseUrl('https://neodonkey.github.io')).toBe('https://neodonkey.github.io');
    expect(sanitiseUrl('/dashboard')).toBe('/dashboard');
  });

  it('strips inline event attributes (onclick, onload, onerror)', () => {
    const hostileAttrs = {
      id: 'btn-1',
      onclick: 'alert(1)',
      ONERROR: 'doBadThing()',
      'data-onhover': 'bad()',
      href: 'javascript:void(0)',
      className: 'my-class',
    };

    const cleaned = sanitiseAttributes(hostileAttrs);

    expect(cleaned.id).toBe('btn-1');
    expect(cleaned.className).toBe('my-class');
    expect(cleaned.onclick).toBeUndefined();
    expect(cleaned.ONERROR).toBeUndefined();
    expect(cleaned['data-onhover']).toBeUndefined();
    expect(cleaned.href).toBe('#');
  });

  it('sanitises entire nested object payload tree recursively', () => {
    const hostilePayload = {
      title: '<img src=x onerror=alert(1)>',
      items: [
        { label: 'Item 1', link: 'javascript:alert(2)' },
        { label: '<script>evil()</script>', link: 'https://safe.example.com' },
      ],
    };

    const cleaned = sanitisePayload(hostilePayload);

    expect(cleaned.title).not.toContain('<img');
    expect(cleaned.items[0].link).toBe('javascript:alert(2)'); // raw payload sanitized during rendering
    expect(cleaned.items[1].label).not.toContain('<script>');
  });
});
