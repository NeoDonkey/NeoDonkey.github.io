# ADR-001 — In-browser LLM Copilot and context-driven UI

**Status:** accepted · **Date:** 2026-08-12 · **Deployment:** https://neodonkey.github.io/

---

## Context

The NeoDonkey website is served from GitHub Pages and has no server of any kind. It exists so a
visitor can try the ERP without cloning a repository.

[NeoDonkey-ERP](https://github.com/NeoDonkey/NeoDonkey-ERP) is headless. Its own vanilla UI is
deliberately plain and stays that way. This site is one head among many that could exist, and it
is the place to show what a richer head can do — which is why the work belongs here and not in
the ERP.

To demonstrate that, we want a Copilot that generates interface from natural language. To keep the
site serverless and the visitor's data private, inference must run entirely in their browser.

## Decision

A local-first generative UI, added by **progressive enhancement**:

1. **Hardware gate.** On load, check WebGPU availability and the OPFS storage quota.
2. **Fallback first.** If the check fails, the visitor keeps the standard vanilla UI and is offered
   nothing. This is the design, not a degraded mode.
3. **In-browser inference.** If the check passes, initialise
   [LiteRT.js](https://github.com/google-ai-edge/LiteRT/tree/main/litert/js) — Google's native
   runtime compiled to WebAssembly, running `.tflite` models over WebGPU with an XNNPACK CPU
   fallback.
4. **Model management.** A small quantised model is offered by default, fetched once and cached in
   OPFS. A switcher lets the visitor choose another. Weights are never in this repository and are
   never served from GitHub Pages.
5. **Generative rendering.** The model emits [A2UI](https://a2ui.org/) JSON. A renderer written in
   this repository — not imported — turns it into DOM, with sanitisation covered by its own tests.

## Why this does not violate the ERP's constitution

The ERP forbids dependencies as a structural commitment. That commitment is about the ERP.

Manifesto Principle 3 requires that every foreign library be **one-click replaceable**, and the
manifesto itself contemplates bundling WASM components behind an interface. The absolute reading —
"no npm packages, not one" — lives in the ERP's `docs/CONTRACT.md`, scoped in its own words to
v0.1, and it governs the ERP.

A head that carries an LLM runtime while the core carries nothing is the headless architecture
demonstrating itself. The constraint that matters is kept: LiteRT sits behind an interface in this
repository and can be replaced without the ERP noticing, because the ERP does not know it exists.

**The traffic is one-way.** Nothing adopted here is an argument for adopting it in the ERP.

## Consequences

**Good.** No inference cost, ever. No visitor data leaves their machine. A demonstration of the
headless claim that is more convincing than any sentence about it. And a plain vanilla UI standing
next to it, running on hardware that cannot do any of this.

**Costly.** A large one-time download. Dependence on WebGPU, which not every visitor has. A build
step and a dependency tree in this repository that must never leak into the ERP. Model weights
hosted by a third party, which is the one part of the story that is not self-contained — mitigated
by caching in OPFS, so it is true once rather than every visit.

**Bounded by facts, not preference.** WebAssembly runtime memory caps at 2 GB, which decides which
models can be offered at all. GitHub Pages allows 100 MB per file, which is why weights are hosted
elsewhere. Both are in `docs/CONTEXT.md` with the rest of what was established before building.

## Alternatives rejected

**Server-side inference.** Ends the serverless property and introduces a cost that scales with
attention — the opposite of what a project like this should want when it goes viral.

**A hosted model API.** Same objection, plus every visitor's questions about their company data
travelling to a third party. That contradicts the thing the ERP is for.

**Putting this in the ERP.** Would make an LLM runtime part of a product whose central promise is
that it has no dependencies. The ERP stays headless; heads carry the weight.
