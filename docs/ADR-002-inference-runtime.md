# ADR-002 — The inference runtime is WebLLM, not LiteRT.js

**Status:** accepted · **Date:** 2026-08-12 · **Supersedes:** ADR-001 §3 and part of PRD-001 R4/R5

---

## Context

ADR-001 chose [LiteRT.js](https://github.com/google-ai-edge/LiteRT/tree/main/litert/js) and
`docs/CONTEXT.md` recorded its API:

```js
const model = await loadAndCompile('/model.tflite', { accelerator: 'webgpu' });
```

That is the whole of it, and it is the problem. `loadAndCompile` gives you a compiled graph:
tensors in, tensors out. A language model is not a graph you call once — it is a tokeniser, a
sampling loop, a KV cache that has to survive between calls, a chat template, and a stopping
rule. LiteRT.js core ships none of those, and neither does `.tflite`. Building them here would
mean writing an inference engine on this website, which is not a thing this repository should
contain and not a thing anybody should trust it to have got right.

The runtime that does ship all of it for the browser is [WebLLM](https://webllm.mlc.ai/):
WebGPU, a compiled model library per architecture, weights from the model's own public
repository, and — the part that decides it — grammar-constrained decoding through XGrammar.

## Decision

**WebLLM is the WebGPU runtime.** It sits behind `integrations/inference.ts`, which is this
repository's own interface: `available()`, `models()`, `load()`, `generate()`, `forget()`. That
interface is what ADR-001 actually asked for — "LiteRT.js behind an interface of this
repository's own … so the runtime can be replaced without the rest of the code noticing". The
runtime was replaced. Nothing outside `integrations/` noticed, which is the evidence that the
constraint was the right one.

**A second runtime is used where it exists.** Chrome exposes an on-device model as
`LanguageModel`. Where that is present there is nothing to download at all, so
`integrations/promptApi.ts` implements the same interface over it and the Copilot offers it
first. It is entirely feature-detected; everywhere else, nothing changes.

**Output is constrained by a grammar, not by instruction.** The A2UI schema in
`src/copilot/prompting.ts` is compiled to a grammar and the sampler cannot leave it. This is
what makes a 360 MB model dependable enough to drive an interface, and it is why PRD-001 R6's
"malformed output is handled, not crashed on" is a path that is tested but rarely taken.

## What this changes in PRD-001

**R4 — the OPFS round-trip.** The requirement said: fetch weights, put them in OPFS, load from
OPFS. That instruction only existed because `loadAndCompile` accepts a `Uint8Array` and would
otherwise re-fetch every visit. WebLLM keeps weights in the browser's cache storage itself, by
exact URL, and never re-fetches. **The requirement behind it is unchanged and still met:
downloaded once, kept locally, never fetched again, deletable by the visitor.** The mechanism is
the runtime's rather than ours, which is one fewer thing this repository can get wrong.

**R5 — the model switcher.** Unchanged, and now honest: `integrations/webllm.ts` states each
model's real parameter bytes, whether it is already on this machine is a cache lookup rather
than a flag, and "Delete weights" calls the runtime's own cache eviction.

**Hugging Face CORS**, recorded as unverified in `docs/CONTEXT.md`, was verified on 2026-08-12:
`huggingface.co` returns `access-control-allow-origin` echoing the requesting origin for
`/resolve/main/` files. The download path needs no workaround.

## Consequences

**Good.** Inference that actually runs, at a size a visitor will accept: 194 MB for the smallest
offered model against the 1.35 GB the mocked catalogue used to claim. Structured output that
cannot be malformed. Two runtimes behind one interface, which is the ADR-001 property being
exercised rather than asserted.

**Costly.** A dependency of real size — WebLLM carries its own WASM and worker. It is confined
to `integrations/`, it is one `import` from replaceable, and **none of it may ever flow back
into the ERP**; that repository has zero dependencies as a structural commitment and this ADR is
not an argument against it.

**Bounded by the same facts.** WebAssembly memory still caps at 2 GB, GitHub Pages still cannot
host weights, and the gate in `src/copilot/hardwareGate.ts` still refuses a model this machine
cannot hold — now per model rather than as one fixed threshold.

## Alternatives rejected

**MediaPipe `tasks-genai`.** Google's LLM stack for the web, and the honest successor to what
ADR-001 meant by LiteRT. Rejected on the weights: the `.task` builds of the small instruction
models sit in gated Hugging Face repositories, and a demo that asks a visitor to accept a model
licence before it will answer a question is not a demo.

**Writing the decode loop over LiteRT.js core.** A tokeniser, a KV cache and a sampler, on a
marketing website, unverified. No.

**Keeping the mock.** It was worse than nothing: it claimed a 1.35 GB download that never
happened, from a URL that does not exist, and answered with canned JSON chosen by keyword
matching. Any visitor who looked would have concluded that everything else on the site was the
same kind of claim.
