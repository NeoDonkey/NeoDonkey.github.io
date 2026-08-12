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
it is. Copy it in at deploy time from a **pinned tag** of `NeoDonkey/NeoDonkey-ERP` rather than
tracking its `main`, so the site always demonstrates a known version and never breaks because
someone merged something upstream an hour ago.

Do not fork or vendor a modified copy. If the ERP needs a change to be usable as a library, that
is an issue in the ERP repository, not a patch here.

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

**The model never lives in this repository.** LiteRT.js fetches it at runtime:

```js
const model = await loadAndCompile('/model.tflite', { accelerator: 'webgpu' });
```

It also accepts a `Uint8Array`, which is the form to use here: fetch the weights once, store them
in OPFS, and load from OPFS on every later visit. That satisfies the caching requirement and makes
the second visit independent of whoever hosts the weights.

**GitHub Pages cannot host the weights.** 1 GB per site, **100 MB per file**, 100 GB of traffic a
month. A 2B quantised model is larger than that in one file. The runtime's own WASM files are
small and belong here; the weights come from Hugging Face, Kaggle or another CDN.

**WebAssembly runtime memory is capped at 2 GB.** That bounds model size regardless of where the
weights are hosted, and it is the constraint that decides which models can be offered at all.

**Hugging Face CORS is unverified.** There is a historical report of model files served without
`Access-Control-Allow-Origin`, which would break a browser-side fetch. Verify against the actual
host before building the download path on it. Fetching to a `Uint8Array` yourself gives you
somewhere to put a workaround if it is still true.

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
