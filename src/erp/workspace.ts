/**
 * Read-only access to the company the ERP is running on.
 *
 * The ERP in the frame owns the workspace: it writes, it commits, it signs. This module only
 * ever reads, and it reads through the ERP's *own* git modules — `runtime/git/repo.js` and
 * `runtime/git/fs-opfs.js`, loaded from the copy vendored at the pinned ref. Nothing here
 * reimplements the format, so nothing here can disagree with it.
 *
 * They are loaded with a dynamic `import()` of a URL rather than a bundled import, because
 * `public/erp/` is copied in at build time (see scripts/vendor-erp.mjs) and must not be pulled
 * into this repository's module graph — the ERP is a runtime the site uses, not source it owns.
 */

/** The subset of the ERP's git surface this module uses. */
interface ErpRepo {
  head(): Promise<string | null>;
  readTreeAtHead(): Promise<Map<string, string>>;
  readBlob(oid: string): Promise<Uint8Array>;
  log(depth?: number): Promise<ErpCommit[]>;
}

/**
 * One entry of `repo.log()`, as `runtime/git/objects.js` decodes it. The author time is a
 * top-level `time` in seconds and is *not* on `author` — which is the shape git itself has, and
 * worth writing down because assuming otherwise produces a date that is silently invalid.
 */
export interface ErpCommit {
  oid: string;
  message: string;
  author: { name: string; email: string };
  time: number;
  tzOffsetMinutes?: number;
}

export interface WorkspaceHandle {
  /** Where the repository lives, in the visitor's words. */
  kind: 'opfs' | 'folder';
  label: string | null;
  repo: ErpRepo;
}

const ERP_BASE = new URL('erp/', document.baseURI).href;

/** `import()` with a computed URL: Vite must not try to resolve this at build time. */
const loadErpModule = (path: string): Promise<Record<string, unknown>> =>
  import(/* @vite-ignore */ new URL(path, ERP_BASE).href);

/**
 * Open the live workspace for reading, or return null when there is nothing to read yet —
 * which is the normal state before the visitor has logged in and the ERP has written its
 * genesis commit.
 *
 * Two places the repository can be, in the order the ERP itself prefers them: a real folder the
 * visitor picked (Chromium only), then the origin private file system. The folder handle is the
 * one the ERP stored; re-reading it is not a second grant, and a folder whose permission has
 * lapsed is skipped rather than prompted for, because a permission prompt raised by a Copilot
 * the visitor has not asked anything yet would be an ambush.
 */
export async function openWorkspaceForReading(): Promise<WorkspaceHandle | null> {
  const [{ repo }, { opfsFs }] = await Promise.all([
    loadErpModule('runtime/git/repo.js') as Promise<{ repo: (fs: unknown) => ErpRepo }>,
    loadErpModule('runtime/git/fs-opfs.js') as Promise<{ opfsFs: (d: unknown) => unknown }>,
  ]);

  const folder = await recallFolderHandle();
  if (folder && (await folder.queryPermission?.({ mode: 'read' })) === 'granted') {
    const candidate = repo(opfsFs(folder));
    if (await candidate.head()) return { kind: 'folder', label: folder.name, repo: candidate };
  }

  if (!navigator.storage?.getDirectory) return null;
  const root = await navigator.storage.getDirectory().catch(() => null);
  if (!root) return null;
  const candidate = repo(opfsFs(root));
  if (!(await candidate.head().catch(() => null))) return null;
  return { kind: 'opfs', label: null, repo: candidate };
}

/** True once the visitor has an identity in this browser — i.e. they have logged in before. */
export async function hasExistingIdentity(): Promise<boolean> {
  // runtime/identity/keystore.js keeps CryptoKey objects here, keyed by name. Reading it is how
  // the site knows to say "open your company" instead of "log in", and it is the only thing the
  // site ever asks about the visitor's key — the private half is not extractable and never
  // leaves the ERP.
  return new Promise((resolve) => {
    if (!globalThis.indexedDB) return resolve(false);
    const req = indexedDB.open('neodonkey-identity', 1);
    req.onerror = () => resolve(false);
    req.onupgradeneeded = () => {
      // Opening created the database, so there was none: no identity, and nothing to clean up
      // that the ERP will not create properly on its own first run.
      req.transaction?.abort();
      resolve(false);
    };
    req.onsuccess = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains('keys')) { db.close(); return resolve(false); }
      const query = db.transaction('keys', 'readonly').objectStore('keys').count('identity');
      query.onsuccess = () => { db.close(); resolve(query.result > 0); };
      query.onerror = () => { db.close(); resolve(false); };
    };
  });
}

interface StoredFolderHandle {
  name: string;
  queryPermission?(options: { mode: string }): Promise<string>;
}

/** The folder handle the ERP stored when the visitor picked one. Never prompts. */
function recallFolderHandle(): Promise<StoredFolderHandle | null> {
  return new Promise((resolve) => {
    if (!globalThis.indexedDB) return resolve(null);
    const req = indexedDB.open('neodonkey-workspace', 1);
    req.onerror = () => resolve(null);
    req.onupgradeneeded = () => { req.transaction?.abort(); resolve(null); };
    req.onsuccess = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains('handles')) { db.close(); return resolve(null); }
      const query = db.transaction('handles', 'readonly').objectStore('handles').get('workspace');
      query.onsuccess = () => { db.close(); resolve((query.result as StoredFolderHandle) ?? null); };
      query.onerror = () => { db.close(); resolve(null); };
    };
  });
}
