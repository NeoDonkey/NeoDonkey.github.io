/**
 * The Copilot drawer: choosing a model, downloading it once, and the conversation.
 *
 * Everything the visitor is told here is true at the moment it is shown — the download size is
 * the model's real parameter bytes, "already on this machine" is a cache lookup rather than a
 * flag we set, and the line under each answer says which commit it was computed from. A demo
 * that overstates any of that is worse than no demo, because the claim being demonstrated is
 * precisely that nothing is happening somewhere else.
 */

import type { InferenceBackend, ModelChoice } from '../../integrations/inference';
import { A2UIRenderer } from '../renderer/a2uiRenderer';
import { Copilot, type Offer } from './copilot';

const el = <K extends keyof HTMLElementTagNameMap>(
  tag: K, className?: string, text?: string,
): HTMLElementTagNameMap[K] => {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
};

export class CopilotPanel {
  private readonly copilot = new Copilot();
  private readonly renderer = new A2UIRenderer();

  private readonly drawer: HTMLElement;
  private readonly status: HTMLElement;
  private readonly setup: HTMLElement;
  private readonly messages: HTMLElement;
  private readonly input: HTMLInputElement;
  private readonly send: HTMLButtonElement;
  private readonly foot: HTMLElement;

  private offers: Offer[] = [];
  private busy = false;

  constructor(drawer: HTMLElement) {
    this.drawer = drawer;
    this.status = drawer.querySelector('#copilot-status') as HTMLElement;
    this.setup = drawer.querySelector('#copilot-setup') as HTMLElement;
    this.messages = drawer.querySelector('#copilot-messages') as HTMLElement;
    this.input = drawer.querySelector('#copilot-input') as HTMLInputElement;
    this.send = drawer.querySelector('#copilot-send') as HTMLButtonElement;
    this.foot = drawer.querySelector('.copilot-drawer__foot') as HTMLElement;

    this.send.addEventListener('click', () => void this.ask());
    this.input.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); void this.ask(); }
    });
  }

  /** Whether anything can be offered here at all. Silence is a valid answer (PRD-001 R3). */
  public async probe(): Promise<boolean> {
    this.offers = await this.copilot.offers().catch(() => []);
    return this.offers.length > 0;
  }

  public async open(): Promise<void> {
    this.drawer.hidden = false;
    if (!this.copilot.runtime) await this.showModelChoice();
  }

  public close(): void {
    this.drawer.hidden = true;
  }

  // -------------------------------------------------------------------------------------------
  // choosing a model
  // -------------------------------------------------------------------------------------------

  private async showModelChoice(): Promise<void> {
    this.setup.replaceChildren();
    this.setup.hidden = false;
    this.foot.hidden = true;

    const intro = el('p', 'copilot-setup__lead',
      'Pick a model. It is downloaded once, kept in this browser, and runs on your own graphics '
      + 'hardware — your question and your records never leave the machine.');
    this.setup.appendChild(intro);

    for (const offer of this.offers) {
      for (const model of offer.models) {
        this.setup.appendChild(await this.modelCard(offer.backend, model));
      }
    }
  }

  private async modelCard(backend: InferenceBackend, model: ModelChoice): Promise<HTMLElement> {
    const card = el('article', 'model-card');

    const head = el('div', 'model-card__head');
    head.appendChild(el('h4', 'model-card__name', model.name));
    const cached = await backend.cached(model.id).catch(() => false);
    head.appendChild(el('span', 'model-card__size',
      cached ? 'already on this machine'
        : model.downloadMB === 0 ? 'nothing to download' : `${model.downloadMB} MB download`));
    card.appendChild(head);

    card.appendChild(el('p', 'model-card__good', model.good));
    card.appendChild(el('p', 'model-card__runtime', backend.label));

    const actions = el('div', 'model-card__actions');
    const start = el('button', 'btn btn-primary btn-sm',
      cached || model.downloadMB === 0 ? 'Start' : `Download and start`);
    start.addEventListener('click', () => void this.activate(backend, model));
    actions.appendChild(start);

    if (cached && model.downloadMB > 0) {
      const remove = el('button', 'btn btn-ghost btn-sm', 'Delete weights');
      remove.addEventListener('click', async () => {
        remove.disabled = true;
        await backend.forget(model.id).catch(() => undefined);
        await this.showModelChoice();
      });
      actions.appendChild(remove);
    }

    card.appendChild(actions);
    return card;
  }

  private async activate(backend: InferenceBackend, model: ModelChoice): Promise<void> {
    this.setup.replaceChildren();

    const label = el('p', 'copilot-progress__label', `Preparing ${model.name}…`);
    const track = el('div', 'progress-bar-track');
    const fill = el('div', 'progress-bar-fill');
    track.appendChild(fill);
    this.setup.append(label, track);
    this.status.textContent = 'loading';

    try {
      await this.copilot.use(backend, model.id, (progress) => {
        label.textContent = progress.text;
        if (progress.ratio === null) {
          fill.classList.add('progress-bar-fill--indeterminate');
        } else {
          fill.classList.remove('progress-bar-fill--indeterminate');
          fill.style.width = `${Math.round(progress.ratio * 100)}%`;
        }
      });
    } catch (err) {
      label.textContent = '';
      this.status.textContent = 'not running';
      this.setup.appendChild(this.problem(err as Error));
      const again = el('button', 'btn btn-secondary btn-sm', 'Choose another model');
      again.addEventListener('click', () => void this.showModelChoice());
      this.setup.appendChild(again);
      return;
    }

    this.setup.hidden = true;
    this.foot.hidden = false;
    this.status.textContent = `${model.name} · on this device`;
    this.input.disabled = false;
    this.send.disabled = false;
    this.input.focus();

    if (this.messages.childElementCount === 0) this.welcome();
  }

  // -------------------------------------------------------------------------------------------
  // the conversation
  // -------------------------------------------------------------------------------------------

  private welcome(): void {
    const bubble = el('div', 'chat-bubble chat-assistant');
    bubble.appendChild(el('p', undefined,
      'Ask about the company open next door. I read the repository at its current commit and '
      + 'build the answer as an interface.'));

    const chips = el('div', 'chat-suggestions');
    for (const suggestion of [
      'What is in this company?',
      'Show me the largest amounts as a chart',
      'Which records need attention?',
    ]) {
      const chip = el('button', 'chat-chip', suggestion);
      chip.addEventListener('click', () => { this.input.value = suggestion; void this.ask(); });
      chips.appendChild(chip);
    }
    bubble.appendChild(chips);
    this.messages.appendChild(bubble);
  }

  private async ask(): Promise<void> {
    const question = this.input.value.trim();
    if (!question || this.busy) return;

    this.busy = true;
    this.input.value = '';
    this.input.disabled = true;
    this.send.disabled = true;

    const asked = el('div', 'chat-bubble chat-user', question);
    this.messages.appendChild(asked);

    const answer = el('div', 'chat-bubble chat-assistant');
    const thinking = el('p', 'chat-thinking', 'Reading the repository…');
    answer.appendChild(thinking);
    this.messages.appendChild(answer);
    this.scroll();

    try {
      let tokens = 0;
      const result = await this.copilot.ask(question, () => {
        tokens += 1;
        thinking.textContent = `Generating on your GPU — ${tokens} tokens…`;
      });

      answer.replaceChildren();
      this.renderer.render(result.payload, answer);

      const documents = result.snapshot?.documents ?? 0;
      const commit = result.snapshot?.head?.oid;
      answer.appendChild(el('p', 'chat-provenance',
        `${(result.elapsedMs / 1000).toFixed(1)}s on this device`
        + (commit ? ` · ${documents} documents at commit ${commit}` : '')
        + ' · nothing sent anywhere'));
    } catch (err) {
      answer.replaceChildren();
      answer.appendChild(this.problem(err as Error));
    } finally {
      this.busy = false;
      this.input.disabled = false;
      this.send.disabled = false;
      this.input.focus();
      this.scroll();
    }
  }

  private problem(err: Error): HTMLElement {
    const notice = el('div', 'a2ui-notice a2ui-notice-error');
    notice.appendChild(el('strong', 'a2ui-notice-title', 'That did not work'));
    notice.appendChild(el('p', 'a2ui-notice-message', err.message || String(err)));
    return notice;
  }

  private scroll(): void {
    this.messages.scrollTop = this.messages.scrollHeight;
  }
}
