# Working on this repository

Conventions for anyone — or anything — making changes here. Read this before the first edit, then
read `docs/CONTEXT.md`, which is shorter than it looks and will save you from the two mistakes
that matter.

---

## 1. Know which repository you are in

This is the **website**: https://neodonkey.github.io/. It is marketing and a live demonstration.

The **product** is [NeoDonkey-ERP](https://github.com/NeoDonkey/NeoDonkey-ERP), and it has
non-negotiables that are structural commitments — zero dependencies, no build step, no business
vocabulary in the runtime.

**Those do not apply here.** In this repository you may use npm packages, a bundler and a build
step. That is deliberate: the ERP is headless, and a head that carries an LLM runtime while the
core carries nothing is the architecture working as designed.

**But nothing flows back.** No dependency, no build step, no convenience adopted here is ever an
argument for adopting it in the ERP. If you catch yourself reasoning "the website already does
X" — stop.

---

## 2. What is being built

`docs/ADR-001-in-browser-copilot.md` is the decision. `docs/PRD-001-in-browser-copilot.md` is the
requirements. `docs/CONTEXT.md` holds the facts established before any of it was written — model
loading, size caps, hosting limits, an unverified CORS question. Check those before designing
around them; they were checked on 2026-08-12 and cost real time to establish.

---

## 3. Rules that do apply here

1. **The plain site must work with nothing switched on.** A visitor with no WebGPU, or who never
   enables the Copilot, gets a complete and satisfying ERP. Everything else is progressive
   enhancement, and enhancement that breaks the base is not enhancement.
2. **The renderer must not know what a business is.** No `invoice`, no `article`, no `supplier` in
   it. It renders components; the model supplies meaning. The ERP has an open defect for exactly
   this mistake — do not reproduce it here.
3. **Model output is untrusted input.** It is JSON from a language model. No `innerHTML` with it,
   no attribute that can carry script, no `javascript:` URL, no handler from data. Sanitisation
   has its own tests and is not descoped when something runs late.
4. **Nothing leaves the visitor's browser.** No telemetry, no analytics that phone home, no
   inference over the network. The one exception is the model weights, downloaded once and cached
   in OPFS — and that exception is in the ADR because it is the only part of the story that is not
   self-contained.
5. **No secrets in this repository.** It is public and it has no server. Anything that would need
   an API key does not belong in the design.
6. **Do not modify the ERP from here.** Its runtime is copied in at deploy time from a pinned tag.
   If it needs a change to be usable as a library, open an issue in that repository.

---

## 4. Verifying

`pnpm verify` is typecheck plus tests, and CI runs it before it will deploy. What is covered:

- the hardware gate, as a pure function of a capability object — the same decision on any machine
- a canned A2UI payload rendering to expected DOM, with no model present
- hostile payloads executing nothing, including prototype keys and unbounded nesting

**A change is not done because it looks right in a browser — and it is not done if it has only
been type-checked either.** Three of the things this site claims cannot be asserted by a unit
test: that the ERP boots, that a model loads onto the GPU, and that an answer renders. Drive a
real browser before saying any of those work. The ERP repository's `docs/_browser-verify.mjs`
shows how to do it with no dependencies at all.

Two failures worth knowing about before you rediscover them:

- A dev server with a single-page fallback answers 200 for `erp/release.json` and the ERP refuses
  to boot, correctly. `appType: 'mpa'`.
- The ERP's onboarding offers "Choose a folder" first. Automation that clicks the button matching
  "start" opens a native picker and hangs.

---

## 5. Commits and pull requests

Commits here are authored under one identity. Configure it before committing:

```bash
git config --local user.name  "Daniel Pammé"
git config --local user.email "226692358+danielfrommunich@users.noreply.github.com"
```

Branch named for the change. Commit messages in the imperative mood, saying what changes and why.
No filler, no restating the diff, no emoji, no attribution trailers. One pull request per change,
and say in it what you did not finish.
