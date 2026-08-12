/**
 * Security Sanitiser for Untrusted Model Outputs & A2UI Data.
 * 
 * Complies with PRD-001 R8 & AGENTS.md §3:
 * Input is JSON from a language model — untrusted by construction.
 * Ensures no script injection, no dangerous URLs, and safe DOM construction.
 */

export interface SanitisedAttr {
  name: string;
  value: string;
}

const BLOCKED_URL_PROTOCOLS = ['javascript:', 'vbscript:', 'data:text/html'];
const DANGEROUS_ATTR_PREFIXES = ['on', 'data-on'];

/**
 * Sanitises plain text content.
 * Prevents HTML tag insertion when rendering text.
 */
export function sanitiseText(rawText: unknown): string {
  if (rawText === null || rawText === undefined) {
    return '';
  }
  const str = String(rawText);
  // Escapes basic HTML entities
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

/**
 * Validates and sanitises a URL string (href, src, etc).
 * Returns '#' if the URL contains dangerous protocols like javascript:
 */
export function sanitiseUrl(rawUrl: unknown): string {
  if (typeof rawUrl !== 'string') {
    return '#';
  }
  const trimmed = rawUrl.trim().toLowerCase();
  for (const protocol of BLOCKED_URL_PROTOCOLS) {
    if (trimmed.startsWith(protocol)) {
      return '#';
    }
  }
  return rawUrl.trim();
}

/**
 * Filters element attributes to prevent event handler injection (e.g. onclick, onerror).
 */
export function sanitiseAttributes(attributes: Record<string, unknown>): Record<string, string> {
  const safeAttrs: Record<string, string> = {};
  
  for (const [key, val] of Object.entries(attributes)) {
    const lowerKey = key.trim().toLowerCase();
    
    // Drop inline event handlers like onclick, onload, etc.
    if (DANGEROUS_ATTR_PREFIXES.some(prefix => lowerKey.startsWith(prefix))) {
      continue;
    }

    if (val === null || val === undefined) {
      continue;
    }

    const strVal = String(val);

    if (lowerKey === 'href' || lowerKey === 'src' || lowerKey === 'action') {
      safeAttrs[key] = sanitiseUrl(strVal);
    } else {
      safeAttrs[key] = strVal;
    }
  }

  return safeAttrs;
}

/**
 * Sanitises an arbitrary unknown object tree to prevent malicious payloads in A2UI schema structures.
 */
export function sanitisePayload<T>(payload: T): T {
  if (typeof payload === 'string') {
    return sanitiseText(payload) as unknown as T;
  }
  if (Array.isArray(payload)) {
    return payload.map(item => sanitisePayload(item)) as unknown as T;
  }
  if (payload !== null && typeof payload === 'object') {
    const cleaned: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(payload)) {
      const safeKey = sanitiseText(key);
      cleaned[safeKey] = sanitisePayload(value);
    }
    return cleaned as T;
  }
  return payload;
}
