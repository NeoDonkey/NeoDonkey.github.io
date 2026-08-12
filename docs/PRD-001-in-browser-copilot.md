# PRD-001 — In-browser Copilot and context-driven UI

**Decision:** `docs/ADR-001-in-browser-copilot.md` · **Constraints:** `docs/CONTEXT.md`
**Date:** 2026-08-12

---

## Overview

An AI Copilot on https://neodonkey.github.io/ that runs a language model locally through LiteRT.js
and generates interface from natural language using A2UI — offered only where the visitor's
hardware supports it, and absent everywhere else.

## User story

> As someone who has just heard about NeoDonkey, I want to open the site, have a company to play
> with immediately, and click around a real ERP without installing anything. If my machine can
> handle it, I want to switch on a Copilot, ask it questions in my own words, and watch the
> interface build itself around the answer.

## Flow

1. **Landing.** The visitor opens the site. No sign-up, no email, no server.
2. **A company appears.** A dummy company is generated and committed into a git repository in
   OPFS, in their browser. It is theirs; it never leaves.
3. **The ERP runs.** The standard vanilla UI from the ERP repository, against that local company.
   This step must be complete and satisfying on its own — everything after it is optional.
4. **A quiet check.** WebGPU and storage quota, in the background, with no interface for it.
5. **An offer, or nothing.** If capable: a toggle appears — *Enable Copilot*. If not: no toggle, no
   apology, no explanation of what they are missing.
6. **One download.** On activation, weights are fetched once and cached in OPFS, with visible
   progress and a size stated before it starts.
7. **Conversation.** The visitor asks something — *"which invoices last month were largest?"*
8. **The interface answers.** The model reads the local data, emits A2UI JSON, and the renderer
   builds the table, the chart, the form. Nothing is sent anywhere.

## Requirements

### R1 — Deployment

GitHub Pages from this repository, reachable at `https://neodonkey.github.io/`. No server, no
build output that requires one.

### R2 — The ERP, embedded

The runtime is copied in at deploy time from a **pinned tag** of `NeoDonkey/NeoDonkey-ERP`, not
from its `main`. The site demonstrates a known version and does not break because something was
merged upstream. No modified copy, no fork: if the ERP needs a change to be usable as a library,
that is an issue in the ERP repository.

### R3 — Hardware gate

Check `navigator.gpu` and `navigator.storage.estimate()`. Require enough free space for the
default model plus margin. Failure is silent: the standard UI, no toggle, no message.

The gate is a pure function of a capability object, so it can be tested against fabricated
capabilities rather than only on whatever machine happens to run the tests.

### R4 — Inference

LiteRT.js behind an interface of this repository's own — `generate(prompt, context)` in, tokens
out — so the runtime can be replaced without the rest of the code noticing.

`loadAndCompile` accepts a `Uint8Array`. **Use that form:** fetch the weights, store them in OPFS,
and load from OPFS on every later visit. Do not re-fetch from the network on each load.

Respect the 2 GB WebAssembly memory cap when choosing which models may be offered. Prefer WebGPU;
fall back to CPU where it is absent but the check otherwise passed.

### R5 — Model management

A default quantised model, and a switcher for others. For each: name, size, and what it is good
at, shown *before* the download starts. Cached in OPFS, listed with their sizes, individually
deletable. A visitor who changes their mind must be able to get their disk space back.

Verify Hugging Face CORS behaviour before depending on it (`docs/CONTEXT.md`).

### R6 — Prompting

Inject the current ERP state — open module, selected entity, visible data — as context. Constrain
output to A2UI JSON only. Malformed output is handled, not crashed on: retry once, then say
plainly that it did not work.

### R7 — The renderer

Parse A2UI and build DOM in this repository's own code. No renderer library.

**It must not know what a business is.** No `invoice`, no `article`, no `supplier` anywhere in it.
It renders components; the model supplies meaning. The ERP has an open defect for exactly this
mistake (`COMPROMISES.md` #13); do not reproduce it.

### R8 — Sanitisation

Its own requirement, with its own tests, not a line inside R7.

The input is JSON from a language model — untrusted by construction. No `innerHTML` with model
output, no attribute that can carry script, no `javascript:` URL, no event handler from data. A
test feeds hostile payloads and asserts that nothing executes. This requirement is not descoped
if the feature runs late.

## Out of scope

Editing company data through the Copilot — it reads and displays. Writes go through the ERP's
rules, and routing them through a language model is a different decision with different stakes.

Any inference that is not local. Any account, login or server.

## How this is verified

- The gate returns the same decision for a fabricated capability object, on any machine.
- A model loads from OPFS on second visit with no network request for weights.
- A canned A2UI payload renders to the expected DOM, asserted node by node — this works with no
  model present and should be built before one exists.
- Hostile payloads execute nothing.
- On a machine without WebGPU, the site is the plain ERP and offers no Copilot.
- The site loads and the ERP is usable with the Copilot never switched on.
