# neodonkey.github.io

The NeoDonkey website. Served at **https://neodonkey.github.io/**.

This is **not the product.** The product is
[NeoDonkey-ERP](https://github.com/NeoDonkey/NeoDonkey-ERP) — an ERP with no server, no cloud, no
vendor and no dependencies, where a company lives in a git folder and the software runs in the
browser from that same folder.

That ERP is headless, and ships a deliberately plain vanilla UI. This site is **one head among
many**: a place to try the ERP in ten seconds without cloning anything, and to show what a richer
head can do.

## What is being built here

A Copilot that runs a language model **in the visitor's browser** — no server, no API, nothing
leaving their machine — and generates interface from natural language.

| | |
|---|---|
| [`docs/CONTEXT.md`](docs/CONTEXT.md) | **Read first.** How this relates to the ERP, which rules apply, and what was already established before building. |
| [`docs/ADR-001-in-browser-copilot.md`](docs/ADR-001-in-browser-copilot.md) | The decision and why it does not violate the ERP's constitution. |
| [`docs/PRD-001-in-browser-copilot.md`](docs/PRD-001-in-browser-copilot.md) | The requirements. |

Where the visitor's hardware cannot run a model, none of this appears and the plain ERP remains.
That is the design.

## The rules here are not the ERP's rules

The ERP has zero dependencies and no build step, as a structural commitment. **Here you may use
npm packages, a bundler and a build step.**

That is the point rather than an exception: a head carrying an LLM runtime while the core carries
nothing is the headless architecture demonstrating itself.

**The traffic is one-way.** Nothing adopted here is an argument for adopting it in the ERP.

## Status

Nothing is built yet. The specification is written; the site is not.

## Licence

EUPL-1.2, as the ERP.
