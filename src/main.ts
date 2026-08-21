/* Force rebuild 1787148501 */
/**
 * The site: a marketing page, a log-in button, and the ERP behind it.
 *
 * There is deliberately very little here. The ERP is the runtime from the pinned ref and it
 * runs itself; the Copilot is a drawer that reads the same repository; this file only decides
 * which of the two the visitor is looking at.
 */

import { CopilotPanel } from './copilot/copilotPanel';
import { hasExistingIdentity } from './erp/workspace';

// No webfont is loaded, on purpose. This product ships zero dependencies, and a page that pulled
// three font files in order to say so would be arguing with itself. The type stack lives in
// brand/tokens.css. See brand/STYLEGUIDE.md section 4.


const ERP_URL = new URL('erp/index.html', document.baseURI).href;

/** The ref in erp.pin.json, substituted at build time. */
declare const __ERP_REF__: string;

function boot(): void {
  const landing = document.getElementById('landing-root');
  const app = document.getElementById('app-root');
  const frame = document.getElementById('erp-frame') as HTMLIFrameElement | null;
  const drawer = document.getElementById('copilot-drawer');
  const toggleContainer = document.getElementById('copilot-toggle-container');
  const toggle = document.getElementById('copilot-checkbox') as HTMLInputElement | null;
  if (!landing || !app || !frame || !drawer || !toggle || !toggleContainer) return;

  // ---- the Copilot: a silent check, then an offer or nothing at all (PRD-001 R3) ----
  const copilot = new CopilotPanel(drawer);

  toggle.addEventListener('change', () => {
    if (toggle.checked) void copilot.open();
    else copilot.close();
  });

  document.getElementById('close-copilot-btn')?.addEventListener('click', () => {
    toggle.checked = false;
    copilot.close();
  });

  // ---- landing <-> ERP ----
  const pinLabel = document.getElementById('erp-pin');
  if (pinLabel) {
    pinLabel.textContent = `NeoDonkey-ERP @ ${__ERP_REF__}`;
    pinLabel.title = 'The pinned ref this demo runs, from erp.pin.json';
    pinLabel.hidden = false;
  }

  let opened = false;

  const enter = (): void => {
    // The frame has no `src` until now: a visitor reading the landing page has not asked for an
    // ERP, and starting one would write to their storage before they said yes.
    if (!opened) { frame.src = ERP_URL; opened = true; }
    landing.hidden = true;
    app.hidden = false;
    window.scrollTo(0, 0);
    void copilot.probe().then((offered) => {
      // Failure is silent: no toggle, no apology, no explanation of what they are missing.
      if (offered) toggleContainer.hidden = false;
    });
  };

  const leave = (): void => {
    app.hidden = true;
    landing.hidden = false;
    window.scrollTo(0, 0);
  };

  for (const button of document.querySelectorAll('[data-login]')) {
    button.addEventListener('click', enter);
  }
  document.getElementById('back-to-landing-btn')?.addEventListener('click', leave);

  // A visitor who has been here before has a key in this browser, so "log in" is the wrong word
  // for what the button does — there is nobody to log in to, and their company is already here.
  void hasExistingIdentity().then((returning) => {
    if (!returning) return;
    for (const button of document.querySelectorAll('[data-login]')) {
      button.textContent = 'Open your company';
    }
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}
