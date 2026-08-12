# neodonkey.github.io

The NeoDonkey website. Served at **https://neodonkey.github.io/**.

This is **not the product.** The product is
[NeoDonkey-ERP](https://github.com/NeoDonkey/NeoDonkey-ERP) — an ERP with no server, no cloud, no
vendor and no dependencies, where a company lives in a git folder and the software runs in the
browser from that same folder.

That ERP is headless, and ships a deliberately plain vanilla UI. This site is **one head among
many**: a place to try the ERP in ten seconds without cloning anything, and to show what a richer
head can do.

## What is here

Two things, and nothing else:

1. **The real ERP**, behind the log-in button. Not a screenshot and not a reimplementation: the
   runtime from a pinned ref of the ERP repository, copied in at build time by
   `scripts/vendor-erp.mjs` and running in a frame with its own stylesheet. Its own first screen
   is the log-in — a name, and an Ed25519 key pair generated on the visitor's machine.
2. **A Copilot** that runs a language model **in the visitor's browser** — no server, no API,
   nothing leaving their machine — reads the company out of the git repository the ERP just
   wrote, and answers by generating an interface.

| | |
|---|---|
| [`docs/CONTEXT.md`](docs/CONTEXT.md) | **Read first.** How this relates to the ERP, which rules apply, and what was already established before building. |
| [`docs/ADR-001-in-browser-copilot.md`](docs/ADR-001-in-browser-copilot.md) | The decision and why it does not violate the ERP's constitution. |
| [`docs/ADR-002-inference-runtime.md`](docs/ADR-002-inference-runtime.md) | Why the runtime is WebLLM and not LiteRT.js, and what that changes in the PRD. |
| [`docs/PRD-001-in-browser-copilot.md`](docs/PRD-001-in-browser-copilot.md) | The requirements. |

Where the visitor's hardware cannot run a model, none of this appears and the plain ERP remains.
That is the design.

## Running it

```bash
pnpm install
pnpm dev        # copies the pinned ERP into public/erp/, then serves the site
pnpm verify     # typecheck + tests
pnpm build      # same copy step, then the static site into dist/
```

`public/erp/` is a build output and is not committed. `erp.pin.json` decides which ref goes in
there; change that file, not the copy.

## The rules here are not the ERP's rules

The ERP has zero dependencies and no build step, as a structural commitment. **Here you may use
npm packages, a bundler and a build step.**

That is the point rather than an exception: a head carrying an LLM runtime while the core carries
nothing is the headless architecture demonstrating itself.

**The traffic is one-way.** Nothing adopted here is an argument for adopting it in the ERP.

## Status

The site is built and the demo is real: the ERP boots, generates a key, writes a signed genesis
commit and seeds the ERP's own operating model — 36 record types and 48 rules — into a git
repository in the browser. The Copilot runs a quantised model on the visitor's GPU and renders
its answers through the A2UI renderer in `src/renderer/`.

**Known gap.** A workspace opened through the ERP's own browser onboarding starts with no
documents in it and grants its first peer no roles, so there is nothing for the Copilot to read
until someone creates records. Making the demo open on a company that has been trading needs the
site to own the `open()` call — see the issue log before starting that.

## Licence

EUPL-1.2, as the ERP.
