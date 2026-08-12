import { describe, it, expect } from 'vitest';
import { describeSnapshot, snapshotWorkspace } from '../src/erp/context';
import type { WorkspaceHandle } from '../src/erp/workspace';

/**
 * The Copilot's context, built from a repository this code did not write.
 *
 * The stub below is the ERP's git surface as `runtime/git/repo.js` actually returns it — in
 * particular a commit's author time is a top-level `time` in seconds and is not on `author`.
 * Assuming otherwise produced an "Invalid time value" that no type could have caught and that
 * only appeared once a model was loaded and a question asked.
 */

const encoder = new TextEncoder();

function fakeWorkspace(files: Record<string, unknown>, commits = [
  { oid: 'a'.repeat(40), message: 'Sarah Weber starts a company\n\nGenesis.', author: { name: 'Sarah Weber', email: 'sarah@local' }, time: 1_770_000_000 },
]): WorkspaceHandle {
  const blobs = new Map<string, Uint8Array>();
  const tree = new Map<string, string>();
  let n = 0;
  for (const [path, content] of Object.entries(files)) {
    const oid = `oid-${n++}`;
    tree.set(path, oid);
    blobs.set(oid, encoder.encode(typeof content === 'string' ? content : JSON.stringify(content)));
  }

  return {
    kind: 'opfs',
    label: null,
    repo: {
      head: async () => commits[0]?.oid ?? null,
      readTreeAtHead: async () => tree,
      readBlob: async (oid: string) => blobs.get(oid)!,
      log: async (depth = Infinity) => commits.slice(0, depth),
    },
  };
}

describe('the snapshot handed to the model', () => {
  it('groups documents by the entity in their path, whatever that entity is', async () => {
    const snapshot = await snapshotWorkspace(fakeWorkspace({
      'documents/vessel/V-1.json': { name: 'Aurora', displacement: 1200, status: 'at-sea' },
      'documents/vessel/V-2.json': { name: 'Borealis', displacement: 800, status: 'in-dock' },
      'documents/berth/B-1.json': { name: 'Quay 4', occupied: 'yes' },
      'peers/sarah@local.json': { name: 'Sarah Weber', email: 'sarah@local' },
      'operating-model/information/vessel.md': '# Vessel',
    }));

    expect(snapshot.documents).toBe(3);
    expect(snapshot.entities.map((e) => e.name)).toEqual(['vessel', 'berth']);
    expect(snapshot.peers).toEqual([{ name: 'Sarah Weber', email: 'sarah@local' }]);
  });

  it('reads the commit time from where git actually puts it', async () => {
    const snapshot = await snapshotWorkspace(fakeWorkspace({}));

    expect(snapshot.head?.oid).toBe('aaaaaaa');
    expect(snapshot.head?.message).toBe('Sarah Weber starts a company');
    expect(snapshot.head?.when).toBe('2026-02-02 02:40');
  });

  it('reports a time it cannot make sense of as missing, not as Invalid Date', async () => {
    const broken = fakeWorkspace({}, [
      { oid: 'b'.repeat(40), message: 'x', author: { name: 'A', email: 'a@b' }, time: NaN },
    ]);

    const snapshot = await snapshotWorkspace(broken);

    expect(snapshot.head?.when).toBeNull();
    expect(describeSnapshot(snapshot)).not.toContain('Invalid');
  });

  it('totals numeric fields, including money written with its currency', async () => {
    const snapshot = await snapshotWorkspace(fakeWorkspace({
      'documents/charge/C-1.json': { amount: '1200.50 EUR', raised: '2026-07-15', state: 'open' },
      'documents/charge/C-2.json': { amount: '300.25 EUR', raised: '2026-07-16', state: 'open' },
      'documents/charge/C-3.json': { amount: '99.25 EUR', raised: '2026-07-17', state: 'settled' },
    }));

    const amount = snapshot.entities[0].fields.find((f) => f.name === 'amount');
    expect(amount?.kind).toBe('number');
    expect(amount?.total).toBe(1600);
    expect(amount?.max).toBe(1200.5);

    // A date is not a number, however much it looks like digits.
    expect(snapshot.entities[0].fields.find((f) => f.name === 'raised')?.kind).toBe('text');

    const state = snapshot.entities[0].fields.find((f) => f.name === 'state');
    expect(state?.values).toEqual([{ value: 'open', count: 2 }, { value: 'settled', count: 1 }]);
  });

  it('survives a document that is not an object, and one that is not JSON', async () => {
    const snapshot = await snapshotWorkspace(fakeWorkspace({
      'documents/thing/T-1.json': '[1, 2, 3]',
      'documents/thing/T-2.json': 'not json at all {',
      'documents/thing/T-3.json': { name: 'fine' },
    }));

    expect(snapshot.entities[0].count).toBe(1);
  });

  it('stays inside its character budget', async () => {
    const many = Object.fromEntries(Array.from({ length: 400 }, (_, i) => [
      `documents/thing/T-${i}.json`,
      { name: `Thing ${i}`, note: 'x'.repeat(200), amount: i },
    ]));

    const text = describeSnapshot(await snapshotWorkspace(fakeWorkspace(many)), 4000);

    expect(text.length).toBeLessThanOrEqual(4020);
  });

  it('says plainly when a workspace holds no documents yet', async () => {
    const text = describeSnapshot(await snapshotWorkspace(fakeWorkspace({})));

    expect(text).toContain('0 documents across 0 record types');
  });
});

describe('the company description', () => {
  it('is read by name, grouped by the folder the company filed it under', async () => {
    const snapshot = await snapshotWorkspace(fakeWorkspace({
      'operating-model/information/vessel.md': '# Vessel',
      'operating-model/information/berth.md': '# Berth',
      'operating-model/processes/docking.md': '# Docking',
      'operating-model/information/_chart-internal.md': '# Not a record type',
      'operating-model/README.md': '# Read me',
    }));

    expect(snapshot.model).toEqual([
      { group: 'information', names: ['berth', 'vessel'] },
      { group: 'processes', names: ['docking'] },
    ]);
  });

  it('means a workspace with no documents still has something to answer from', async () => {
    const snapshot = await snapshotWorkspace(fakeWorkspace({
      'operating-model/information/vessel.md': '# Vessel',
      'operating-model/organisation/harbourmaster.md': '# Harbourmaster',
    }));

    const text = describeSnapshot(snapshot);
    expect(text).toContain('vessel');
    expect(text).toContain('harbourmaster');
  });
});
