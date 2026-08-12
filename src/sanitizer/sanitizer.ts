/**
 * The model's output is untrusted input — PRD-001 R8.
 *
 * It is JSON produced by a language model, which makes it exactly as trustworthy as a string
 * that arrived from a stranger over the network, and it is treated that way here rather than
 * anywhere further downstream. This file is a feature with its own tests, not a line inside the
 * renderer, because a security requirement carried as a sub-bullet of a feature is the first
 * thing dropped when the feature runs late.
 *
 * The defence is structural rather than textual: the renderer writes every string with
 * `textContent` and never with `innerHTML`, so escaping text here would not add safety — it
 * would only put `&amp;` in front of visitors whose company is called "Meyer & Sohn". What this
 * file removes is the things that could *carry* behaviour: keys that become event handlers,
 * keys that reach an object's prototype, and URLs in a scheme that executes.
 */

/** Anything longer is a runaway generation, not an answer. */
const MAX_TEXT = 2000;
const MAX_DEPTH = 12;

/** Schemes a link may use. An allowlist, because the list of dangerous schemes has no end. */
const ALLOWED_PROTOCOLS = new Set(['http:', 'https:', 'mailto:']);

/** Keys that reach the prototype chain rather than the object they appear to be on. */
const POISONED_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

const EVENT_HANDLER = /^(on|data-on)/i;

/**
 * A string safe to hand to `textContent`: control characters and the invisible ones removed,
 * length capped. No HTML escaping — see the note at the top of this file.
 */
export function plainText(raw: unknown): string {
  if (raw === null || raw === undefined) return '';
  const text = String(raw)
    // C0/C1 controls except tab and newline, plus the zero-width and direction-override
    // characters that make one string look like another.
    .replace(/[\u0000-\u0008\u000B-\u001F\u007F-\u009F\u200B-\u200F\u202A-\u202E\u2066-\u2069]/g, '');
  return text.length > MAX_TEXT ? `${text.slice(0, MAX_TEXT)}…` : text;
}

/**
 * A URL safe to put in an href, or '#'. Relative URLs are resolved against this page only to
 * find out what they would mean; the caller gets back what it passed in.
 */
export function sanitiseUrl(raw: unknown): string {
  if (typeof raw !== 'string') return '#';
  const trimmed = raw.trim();
  if (trimmed === '') return '#';
  try {
    const base = typeof location === 'undefined' ? 'https://neodonkey.github.io/' : location.href;
    const resolved = new URL(trimmed, base);
    return ALLOWED_PROTOCOLS.has(resolved.protocol) ? trimmed : '#';
  } catch {
    return '#';
  }
}

/** Attributes with everything that could execute removed. */
export function sanitiseAttributes(attributes: Record<string, unknown>): Record<string, string> {
  const safe: Record<string, string> = Object.create(null);

  for (const [key, value] of Object.entries(attributes)) {
    const name = key.trim();
    const lower = name.toLowerCase();
    if (EVENT_HANDLER.test(lower) || POISONED_KEYS.has(lower)) continue;
    if (value === null || value === undefined) continue;

    safe[name] = lower === 'href' || lower === 'src' || lower === 'action' || lower === 'formaction'
      ? sanitiseUrl(String(value))
      : plainText(value);
  }

  return { ...safe };
}

/**
 * A payload with nothing left in it that could execute: no handler keys, no prototype keys, no
 * unbounded depth, every string flattened to text and every URL-shaped field checked.
 */
export function sanitisePayload<T>(payload: T): T {
  return walk(payload, 0) as T;
}

const URL_KEYS = new Set(['actionurl', 'href', 'src', 'url', 'action', 'formaction']);

function walk(value: unknown, depth: number): unknown {
  if (depth > MAX_DEPTH) return null;
  if (typeof value === 'string') return plainText(value);
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  if (typeof value === 'boolean' || value === null || value === undefined) return value ?? null;
  // A function cannot survive JSON.parse, so one here means the payload was built in code that
  // should not have been trusted either.
  if (typeof value !== 'object') return null;
  if (Array.isArray(value)) return value.map((item) => walk(item, depth + 1));

  const clean: Record<string, unknown> = {};
  for (const [key, item] of Object.entries(value)) {
    const lower = key.toLowerCase();
    if (EVENT_HANDLER.test(lower) || POISONED_KEYS.has(lower)) continue;
    // Assigned by definition rather than by `clean[key] =`, so a key this list has not thought
    // of still cannot become a setter or a prototype.
    Object.defineProperty(clean, key, {
      value: URL_KEYS.has(lower) ? sanitiseUrl(item) : walk(item, depth + 1),
      enumerable: true, writable: true, configurable: true,
    });
  }
  return clean;
}
