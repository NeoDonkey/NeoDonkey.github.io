/**
 * The worker the model actually runs in.
 *
 * Decoding a token blocks whatever thread it happens on. On the main thread that means the ERP
 * beside the Copilot stops scrolling while the answer is written, which would make the local
 * model look worse than it is — so the engine lives here and the page talks to it by message.
 */

import { WebWorkerMLCEngineHandler } from '@mlc-ai/web-llm';

const handler = new WebWorkerMLCEngineHandler();
self.onmessage = (event: MessageEvent) => handler.onmessage(event);
