import { ERPApp } from './erp/erpApp';
import { detectSystemCapabilities, checkHardwareCapability } from './copilot/hardwareGate';
import { ModelManager } from './copilot/modelManager';
import { A2UIRenderer } from './renderer/a2uiRenderer';
import { CopilotEngine } from '../integrations/copilotEngine';
import './style.css';

document.addEventListener('DOMContentLoaded', async () => {
  // 1. Mount Base ERP (Progressive Enhancement - always works)
  const erpRoot = document.getElementById('erp-root');
  if (!erpRoot) return;

  const erpApp = new ERPApp(erpRoot);
  erpApp.render();

  // 2. Instantiate Helpers
  const modelManager = new ModelManager();
  const a2uiRenderer = new A2UIRenderer();
  let copilotEngine: CopilotEngine | null = null;

  // 3. Silent Hardware Gate Check
  const sysCapabilities = await detectSystemCapabilities();
  const gateResult = checkHardwareCapability(sysCapabilities);

  const toggleContainer = document.getElementById('copilot-toggle-container');
  const toggleCheckbox = document.getElementById('copilot-checkbox') as HTMLInputElement | null;
  const copilotDrawer = document.getElementById('copilot-drawer');
  const closeBtn = document.getElementById('close-copilot-btn');
  const modelInfoContainer = document.getElementById('model-info');
  const downloadProgressContainer = document.getElementById('download-progress-container');
  const progressBarFill = document.getElementById('progress-bar-fill');
  const downloadStatus = document.getElementById('download-status');
  const messagesContainer = document.getElementById('copilot-messages');
  const copilotInput = document.getElementById('copilot-input') as HTMLInputElement | null;
  const sendBtn = document.getElementById('send-btn') as HTMLButtonElement | null;

  // PRD-001 R3: If gate passes, show toggle; if fails, remain silent
  if (gateResult.supported && toggleContainer && toggleCheckbox) {
    toggleContainer.style.display = 'flex';

    toggleCheckbox.addEventListener('change', async () => {
      if (toggleCheckbox.checked) {
        copilotDrawer?.classList.remove('hidden');
        await setupCopilotUI();
      } else {
        copilotDrawer?.classList.add('hidden');
      }
    });
  }

  if (closeBtn && toggleCheckbox && copilotDrawer) {
    closeBtn.addEventListener('click', () => {
      toggleCheckbox.checked = false;
      copilotDrawer.classList.add('hidden');
    });
  }

  async function setupCopilotUI() {
    const activeModel = modelManager.getActiveModel();

    if (modelInfoContainer) {
      modelInfoContainer.replaceChildren();

      const title = document.createElement('div');
      title.className = 'model-title';
      title.textContent = activeModel.name;

      const badge = document.createElement('span');
      badge.className = 'model-size';
      badge.textContent = activeModel.sizeFormatted;

      const desc = document.createElement('p');
      desc.className = 'model-desc';
      desc.textContent = activeModel.description;

      modelInfoContainer.appendChild(title);
      modelInfoContainer.appendChild(badge);
      modelInfoContainer.appendChild(desc);

      if (!modelManager.isModelCached(activeModel.id)) {
        const downloadBtn = document.createElement('button');
        downloadBtn.className = 'btn-send';
        downloadBtn.style.marginTop = '0.5rem';
        downloadBtn.textContent = `Download Weights (${activeModel.sizeFormatted})`;

        downloadBtn.addEventListener('click', async () => {
          downloadBtn.style.display = 'none';
          if (downloadProgressContainer) downloadProgressContainer.style.display = 'block';

          const weights = await modelManager.downloadAndCacheModel(activeModel.id, progress => {
            if (progressBarFill) progressBarFill.style.width = `${progress.percentage}%`;
            if (downloadStatus) downloadStatus.textContent = `Downloading weights... ${progress.percentage}% (${(progress.bytesDownloaded / (1024 * 1024)).toFixed(0)} MB / ${activeModel.sizeMB} MB)`;
          });

          await initEngine(weights);
        });

        modelInfoContainer.appendChild(downloadBtn);
      } else {
        const statusMsg = document.createElement('p');
        statusMsg.className = 'a2ui-notice a2ui-notice-success';
        statusMsg.style.marginTop = '0.5rem';
        statusMsg.textContent = 'Weights cached in OPFS — ready for local WebGPU inference.';
        modelInfoContainer.appendChild(statusMsg);

        await initEngine();
      }
    }
  }

  async function initEngine(weights?: Uint8Array) {
    copilotEngine = new CopilotEngine({ modelId: modelManager.getActiveModel().id });
    await copilotEngine.initialize(weights);

    if (copilotInput) copilotInput.disabled = false;
    if (sendBtn) sendBtn.disabled = false;

    // Post welcome message in drawer
    if (messagesContainer && messagesContainer.children.length === 0) {
      const welcomeBubble = document.createElement('div');
      welcomeBubble.className = 'chat-bubble chat-assistant';
      welcomeBubble.textContent = 'Copilot active. Ask questions about your local company records (e.g., "Which invoices last month were largest?")';
      messagesContainer.appendChild(welcomeBubble);
    }
  }

  async function handleUserQuery() {
    if (!copilotInput || !copilotEngine || !copilotInput.value.trim() || !messagesContainer) return;

    const userText = copilotInput.value.trim();
    copilotInput.value = '';

    // Append User Message Bubble
    const userBubble = document.createElement('div');
    userBubble.className = 'chat-bubble chat-user';
    userBubble.textContent = userText;
    messagesContainer.appendChild(userBubble);

    // Append Assistant Response Container
    const assistantBubble = document.createElement('div');
    assistantBubble.className = 'chat-bubble chat-assistant';
    assistantBubble.textContent = 'Thinking and rendering A2UI...';
    messagesContainer.appendChild(assistantBubble);

    messagesContainer.scrollTop = messagesContainer.scrollHeight;

    // Gather ERP Context
    const store = erpApp.getStore();
    const context = {
      activeModule: erpApp.getCurrentView(),
      summaryMetrics: store.getSummaryMetrics(),
      visibleEntities: store.getInvoices() as unknown as Record<string, unknown>[],
    };

    try {
      const a2uiPayload = await copilotEngine.generate(userText, context);
      assistantBubble.replaceChildren();
      a2uiRenderer.render(a2uiPayload, assistantBubble);
    } catch (err) {
      assistantBubble.replaceChildren();
      const errNotice = document.createElement('div');
      errNotice.className = 'a2ui-notice a2ui-notice-error';
      errNotice.textContent = (err as Error).message || 'Failed to generate response.';
      assistantBubble.appendChild(errNotice);
    }

    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }

  sendBtn?.addEventListener('click', handleUserQuery);
  copilotInput?.addEventListener('keydown', e => {
    if (e.key === 'Enter') handleUserQuery();
  });
});
