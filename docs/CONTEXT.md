# Context — read this first

What this repository is, how it relates to the ERP, and which rules apply here. If you are about
to write code in this repository, this file is the shortest path to not getting it wrong.

---

## What this is

The NeoDonkey website, served at **https://neodonkey.github.io/**. It is marketing and a live
demonstration — **it is not the product.**

The product is [NeoDonkey-ERP](https://github.com/NeoDonkey/NeoDonkey-ERP): an ERP with no server,
no cloud, no vendor and no dependencies, where a company lives in a git folder and the software
runs in the browser from that same folder.

That ERP is **headless**. It ships with a deliberately basic vanilla UI, and that UI stays exactly
as it is. This website is **one possible head among many** — it exists so somebody can try the ERP
in ten seconds without cloning a repository, and to show what a richer head can do.

That distinction is the single most important thing in this file, because it is what makes the
work here permissible at all.

---

## The rules here are not the ERP's rules

The ERP has non-negotiables that are structural commitments: zero dependencies, no build step, no
`node:*` outside one file, no business vocabulary in the runtime. **Those do not apply to this
repository.** Here you may use npm packages, a bundler, and a build step.

This is not an exception grudgingly granted. It is the point. The ERP's Principle 3 requires that
every foreign library be one-click replaceable, and the manifesto explicitly contemplates bundling
WASM components behind an interface. A head that carries an LLM runtime while the core carries
nothing is the architecture working as designed — it demonstrates the headless claim rather than
asserting it.

**But the traffic is one-way.** Nothing from this repository may flow back into the ERP. No
dependency, no build step, no convenience adopted here is an argument for adopting it there. If
you find yourself reasoning "we already use X on the website", stop.

---

## How the ERP gets into this site

The ERP runtime is plain ES modules with relative imports and no build step, so it can be used as
it is. Copy it in at deploy time from a **pinned ref** of `NeoDonkey/NeoDonkey-ERP` rather than
tracking its `main`, so the site always demonstrates a known version and never breaks because
someone merged something upstream an hour ago.

Do not fork or vendor a modified copy. If the ERP needs a change to be usable as a library, that
is an issue in the ERP repository, not a patch here.

**How it is done here.** `erp.pin.json` names the ref; `scripts/vendor-erp.mjs` fetches that ref
and copies `index.html`, `runtime/`, `operating-model/`, the manifest and the service worker into
`public/erp/`, which is a build output and is in `.gitignore`. `pnpm dev` and `pnpm build` both
run it first. The site then loads `erp/index.html` in a frame, so the ERP keeps its own
stylesheet and its own relative paths and this site does not restyle it.

Two things are worth knowing before changing any of that:

**The ERP publishes no tags yet, so the pin is a commit SHA.** Move it to a tag the moment one
exists.

**`_files` is generated, and it is not a patch.** `runtime/ui/storage.js` asks for
`_files?under=operating-model` to find out which operating-model files exist, because HTTP has no
directory listing; `serve.mjs` answers it in the ERP repository and a static host cannot. The
vendor script writes a static `public/erp/_files` with the same shape, so the demo opens on the
ERP's real operating model — 93 documents, 48 rules — instead of the built-in starter. Not one
vendored byte is modified.

**Do not let a dev server answer 200 for a missing file.** The ERP fetches `release.json` and
treats any 200 as a release manifest; served an `index.html` by a single-page fallback, it
concludes the runtime was signed by an unknown key and refuses to boot — correctly. `appType:
'mpa'` in `vite.config.ts` is what keeps that from happening.

---

## What is being built

See `docs/ADR-001-in-browser-copilot.md` for the decision and `docs/PRD-001-in-browser-copilot.md`
for the requirements. In one paragraph:

A visitor lands on the site, gets a local dummy company in their browser, and uses the ERP with
the standard vanilla UI. In the background the page checks whether the machine can run a small
language model. If it can, a Copilot can be switched on: a quantised model is downloaded once,
cached in OPFS, and runs entirely on the visitor's own hardware. It answers questions about the
local company data and emits [A2UI](https://a2ui.org/) JSON, which a renderer in this repository
turns into DOM. Nothing leaves the browser.

If the machine cannot run it, nothing is offered and the standard UI remains — which is the whole
point of progressive enhancement, not a consolation prize.

---

## Facts established before this repository existed

Checked on 2026-08-12. Do not re-litigate these without new evidence; do verify anything marked
*unverified* before depending on it.

**The model never lives in this repository.** The runtime fetches it once, at run time, and keeps
it locally afterwards.

> **Superseded on 2026-08-12 — see `docs/ADR-002-inference-runtime.md`.** The API recorded here
> was LiteRT.js's `loadAndCompile('/model.tflite', { accelerator: 'webgpu' })`, with a note to
> pass a `Uint8Array` from OPFS. That call compiles a graph; it is not an LLM runtime — there is
> no tokeniser, no KV cache and no sampling loop in it, and `.tflite` carries none of them
> either. The runtime is now WebLLM, which keeps the weights in cache storage itself. The
> requirement is unchanged: fetched once, kept on this machine, never re-fetched, deletable.

**GitHub Pages cannot host the weights.** 1 GB per site, **100 MB per file**, 100 GB of traffic a
month. A 2B quantised model is larger than that in one file. The runtime's own WASM files are
small and belong here; the weights come from Hugging Face, Kaggle or another CDN.

**WebAssembly runtime memory is capped at 2 GB.** That bounds model size regardless of where the
weights are hosted, and it is the constraint that decides which models can be offered at all.

**Hugging Face CORS: verified, 2026-08-12.** `huggingface.co` returns
`access-control-allow-origin` echoing the requesting origin on `/resolve/main/` files — checked
with an explicit `Origin: https://neodonkey.github.io` against the four model repositories the
site offers. The historical report of missing CORS headers no longer holds, and the download path
needs no workaround.

**A2UI needs no library.** It is Apache 2.0, currently v0.9.1 with v1.0 in release candidate.
Reference renderers exist for several frameworks, and payloads can be rendered by your own code.
The renderer here should be written, not imported — it is a few hundred lines and it is the part
most worth owning.

---

## Two design rules for the renderer

**It must not know what a business is.** No `invoice`, no `article`, no `supplier` in the renderer.
It renders components; the model supplies the meaning. The ERP has an open defect for exactly this
mistake in its own UI (`COMPROMISES.md` #13, business field names hard-coded in
`runtime/ui/fields.js`) — do not reproduce it here.

**Sanitisation is a feature with its own tests, not a line in the renderer.** The input is JSON
produced by a language model: untrusted by construction. There must be a test that feeds hostile
payloads and asserts that nothing executes. A security requirement carried as a sub-bullet of a
feature is the first thing dropped when the feature runs late.
