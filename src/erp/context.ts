/**
 * What the Copilot is allowed to know: a snapshot of the live company, read out of the
 * repository at HEAD.
 *
 * Nothing in this file names a business concept. It reads `documents/<entity>/<id>.json`, and
 * every entity name, every field name and every aggregate below comes from what is in the
 * repository — the same code produces "invoice" for one company and "vessel" for another,
 * because it never knew either. That is the same rule the renderer is held to (PRD-001 R7), and
 * it applies here for the same reason: the model supplies meaning, the code supplies structure.
 */

import type { WorkspaceHandle } from './workspace';

export interface FieldSummary {
  name: string;
  /** How many documents of this entity carry the field at all. */
  present: number;
  kind: 'number' | 'text' | 'mixed';
  /** For numeric fields, over the documents that have one. */
  total?: number;
  min?: number;
  max?: number;
  /** For low-cardinality text fields — the shape of a status, a code, a country. */
  values?: { value: string; count: number }[];
}

export interface EntitySummary {
  name: string;
  count: number;
  fields: FieldSummary[];
  /** A few whole documents, so the model can see the shape rather than guess it. */
  samples: Record<string, unknown>[];
}

export interface WorkspaceSnapshot {
  head: { oid: string; message: string; author: string; when: string | null } | null;
  commits: number;
  peers: { name?: string; email?: string }[];
  entities: EntitySummary[];
  documents: number;
  /**
   * The company's own description, by the folder it is filed under: `information` are its record
   * types, `processes` its rules, `organisation` its roles, and whatever else a company has
   * chosen to write down. Read as names, never interpreted — a company that files things under
   * `vessels` gets `vessels`.
   */
  model: { group: string; names: string[] }[];
  storage: 'opfs' | 'folder';
  label: string | null;
}

const DOCUMENT = /^documents\/([^/]+)\/(.+)\.json$/;
const MODEL_FILE = /^operating-model\/([^/]+)\/(.+)\.md$/;
const SAMPLES_PER_ENTITY = 3;
const MAX_DISTINCT_VALUES = 8;

/** Read the workspace at HEAD and reduce it to something a small model can hold in context. */
export async function snapshotWorkspace(workspace: WorkspaceHandle): Promise<WorkspaceSnapshot> {
  const { repo } = workspace;
  const tree = await repo.readTreeAtHead();
  const decoder = new TextDecoder();

  const byEntity = new Map<string, Record<string, unknown>[]>();
  const byGroup = new Map<string, string[]>();
  const peers: { name?: string; email?: string }[] = [];

  for (const [path, oid] of tree) {
    const isPeer = path.startsWith('peers/') && path.endsWith('.json');
    const match = DOCUMENT.exec(path);

    // The operating model is read by name only. Its text is the company's own prose and runs to
    // hundreds of kilobytes; the names are what tell a reader — or a model — what kind of
    // company this is, and they fit in a prompt.
    const modelFile = MODEL_FILE.exec(path);
    if (modelFile && !modelFile[2].startsWith('_')) {
      byGroup.set(modelFile[1], [...(byGroup.get(modelFile[1]) ?? []), modelFile[2]]);
      continue;
    }

    if (!match && !isPeer) continue;

    const parsed = parseJson(decoder.decode(await repo.readBlob(oid)));
    if (!parsed) continue;

    if (isPeer) {
      peers.push({ name: str(parsed.name), email: str(parsed.email) });
      continue;
    }
    const entity = match![1];
    const list = byEntity.get(entity) ?? [];
    list.push({ id: match![2], ...parsed });
    byEntity.set(entity, list);
  }

  const log = await repo.log(50).catch(() => []);
  const head = log[0]
    ? {
      oid: log[0].oid.slice(0, 7),
      message: log[0].message.trim().split('\n')[0],
      author: log[0].author.name,
      when: instant(log[0].time),
    }
    : null;

  const entities = [...byEntity.entries()]
    .map(([name, documents]) => summariseEntity(name, documents))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));

  return {
    head,
    commits: log.length,
    peers,
    entities,
    documents: entities.reduce((sum, e) => sum + e.count, 0),
    model: [...byGroup.entries()]
      .map(([group, names]) => ({ group, names: names.sort() }))
      .sort((a, b) => b.names.length - a.names.length),
    storage: workspace.kind,
    label: workspace.label,
  };
}

interface FieldBucket {
  present: number;
  numbers: number[];
  texts: Map<string, number>;
}

function summariseEntity(name: string, documents: Record<string, unknown>[]): EntitySummary {
  const fields = new Map<string, FieldBucket>();

  for (const doc of documents) {
    for (const [field, raw] of Object.entries(doc)) {
      if (raw === null || raw === undefined || typeof raw === 'object') continue;
      const bucket: FieldBucket = fields.get(field)
        ?? { present: 0, numbers: [], texts: new Map<string, number>() };
      bucket.present += 1;
      const numeric = asNumber(raw);
      if (numeric !== null) bucket.numbers.push(numeric);
      else {
        const text = String(raw);
        bucket.texts.set(text, (bucket.texts.get(text) ?? 0) + 1);
      }
      fields.set(field, bucket);
    }
  }

  const summaries: FieldSummary[] = [...fields.entries()].map(([field, bucket]) => {
    const kind = bucket.numbers.length && bucket.texts.size ? 'mixed'
      : bucket.numbers.length ? 'number' : 'text';
    const summary: FieldSummary = { name: field, present: bucket.present, kind };
    if (bucket.numbers.length) {
      summary.total = round(bucket.numbers.reduce((a, b) => a + b, 0));
      summary.min = round(Math.min(...bucket.numbers));
      summary.max = round(Math.max(...bucket.numbers));
    }
    // Only worth stating when the field behaves like a category rather than free text: a status
    // with four values tells the model something, a description with forty does not.
    if (bucket.texts.size > 0 && bucket.texts.size <= MAX_DISTINCT_VALUES) {
      summary.values = [...bucket.texts.entries()]
        .sort((a, b) => b[1] - a[1])
        .map(([value, count]) => ({ value, count }));
    }
    return summary;
  });

  return { name, count: documents.length, fields: summaries, samples: documents.slice(0, SAMPLES_PER_ENTITY) };
}

/**
 * The snapshot as the text handed to the model. Kept under a character budget because the
 * models this runs on have a four-thousand-token window and a context that overruns it is not
 * a richer answer, it is a truncated prompt.
 */
export function describeSnapshot(snapshot: WorkspaceSnapshot, budget = 6000): string {
  const lines: string[] = [];
  lines.push('# The company in this browser');
  if (snapshot.head) {
    lines.push(`HEAD ${snapshot.head.oid} "${snapshot.head.message}" by ${snapshot.head.author}`
      + `${snapshot.head.when ? ` at ${snapshot.head.when}` : ''} `
      + `(${snapshot.commits} commits read)`);
  }
  lines.push(`${snapshot.documents} documents across ${snapshot.entities.length} record types.`);
  if (snapshot.peers.length) {
    lines.push(`People: ${snapshot.peers.map((p) => p.name ?? p.email).join(', ')}`);
  }

  // What the company says it is, before anything has happened in it. Without this a workspace
  // that has been opened but not yet worked in reads as empty, when in fact it holds a complete
  // description of a business — which is the thing most worth being able to ask about.
  for (const { group, names } of snapshot.model) {
    lines.push('', `## ${group} the company has described (${names.length})`, names.join(', '));
  }

  for (const entity of snapshot.entities) {
    lines.push('', `## ${entity.name} (${entity.count})`);
    for (const field of entity.fields) {
      const parts = [`- ${field.name}: ${field.kind}`];
      if (field.total !== undefined) parts.push(`total ${field.total}, min ${field.min}, max ${field.max}`);
      if (field.values) parts.push(field.values.map((v) => `${v.value} x${v.count}`).join(', '));
      lines.push(parts.join(' | '));
    }
    for (const sample of entity.samples) {
      lines.push(`  e.g. ${JSON.stringify(sample)}`);
    }
    if (lines.join('\n').length > budget) break;
  }

  const text = lines.join('\n');
  return text.length > budget ? `${text.slice(0, budget)}\n…(truncated)` : text;
}

function parseJson(text: string): Record<string, unknown> | null {
  try {
    const value: unknown = JSON.parse(text);
    return value && typeof value === 'object' && !Array.isArray(value)
      ? value as Record<string, unknown>
      : null;
  } catch {
    return null;
  }
}

/**
 * A number, or a quantity written as text. The ERP writes money as a decimal string with its
 * currency beside it, so "1234.56 EUR" is a number with a unit and "2026-07-15" is not a number
 * at all — anchoring the pattern is what keeps dates out of the sums.
 */
function asNumber(raw: unknown): number | null {
  if (typeof raw === 'number') return Number.isFinite(raw) ? raw : null;
  if (typeof raw !== 'string') return null;
  const match = /^\s*(-?\d+(?:\.\d+)?)(?:\s+[A-Za-z]{3})?\s*$/.exec(raw);
  return match ? Number(match[1]) : null;
}

/**
 * Seconds since the epoch, as a minute-resolution timestamp — or null when the commit carries
 * something that is not a time. A snapshot is read from a repository this code did not write, so
 * a value it cannot make sense of is reported as missing rather than as `Invalid Date`.
 */
function instant(seconds: unknown): string | null {
  if (typeof seconds !== 'number' || !Number.isFinite(seconds)) return null;
  const date = new Date(seconds * 1000);
  return Number.isNaN(date.getTime()) ? null : date.toISOString().slice(0, 16).replace('T', ' ');
}

const round = (n: number): number => Math.round(n * 100) / 100;
const str = (v: unknown): string | undefined => (typeof v === 'string' ? v : undefined);
