import { AI_PORT, type AIRequestPayload, type RuntimeMessage, type StreamMessage } from '@/types';
import { AIService } from '@/ai/AIService';
import { storage } from '@/storage/StorageManager';
import { getActivationId, getDeviceId, getUsageId, setActivationId, getSuppressActivate, ACTIVATION_STORAGE_KEY } from '@/core/device';
import { incrementUsage } from '@/core/usage';
import { WORKER_ENDPOINT } from '@/config';

// ============================================================================
// Background Service Worker
//   - Holds the AIService (all network calls happen here, off the page).
//   - Streams AI responses to content scripts over a long-lived Port.
//   - Cancels superseded/aborted requests.
//   - Bridges chrome.commands keyboard shortcuts to the active tab.
// ============================================================================

let service: AIService | null = null;

// Clicking the toolbar icon opens the settings side panel.
chrome.sidePanel?.setPanelBehavior?.({ openPanelOnActionClick: true }).catch(() => {});

async function getService(): Promise<AIService> {
  const settings = await storage.get();
  if (!service) {
    service = new AIService(settings);
  } else {
    service.updateSettings(settings);
  }
  // Apply the per-device activation id (stored in storage.local).
  service.setActivationId(await getActivationId());
  // Free-tier usage is counted server-side per this persistent (sync) id.
  service.setDeviceId(await getUsageId());
  return service;
}

// Keep the service settings in sync when they change.
storage.subscribe((s) => {
  service?.updateSettings(s);
  void ensureActivation(s.licenseKey);
});

/**
 * Ensure THIS device is activated against the license (Polar enforces the
 * device limit). Runs once per device; no-op if already activated or no key.
 */
async function ensureActivation(licenseKey: string) {
  if (!licenseKey) return;
  if (await getActivationId()) return;
  if (await getSuppressActivate()) return; // user removed this device on purpose
  try {
    const deviceId = await getDeviceId();
    const res = await fetch(WORKER_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${licenseKey}` },
      body: JSON.stringify({ activate: true, deviceId, label: 'GhostTranslate' }),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok && data.ok !== false && data.activationId) {
      await setActivationId(data.activationId); // fires onChanged → updates service
    }
  } catch {
    // Offline or limit reached — AI requests will still validate the key.
  }
}

// Keep the activation id in sync when the user (re)activates a device.
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && changes[ACTIVATION_STORAGE_KEY]) {
    service?.setActivationId((changes[ACTIVATION_STORAGE_KEY].newValue as string) ?? null);
  }
});

// ---- Streaming port: one port per content-script frame --------------------
chrome.runtime.onConnect.addListener((port) => {
  if (port.name !== AI_PORT) return;

  const activeForPort = new Set<string>();

  port.onMessage.addListener(async (msg: { type: 'run'; payload: AIRequestPayload } | { type: 'cancel'; requestId: string }) => {
    const svc = await getService();

    if (msg.type === 'cancel') {
      svc.cancel(msg.requestId);
      activeForPort.delete(msg.requestId);
      return;
    }

    if (msg.type === 'run') {
      const { payload } = msg;
      activeForPort.add(payload.requestId);

      // Count free-plan translations (no activated license) toward the cap —
      // but only when the request actually COMPLETES. Live typing supersedes
      // (cancels) the previous request on each keystroke; counting on 'done'
      // means a typing burst costs ~1 use per finished translation instead of
      // one per keystroke.
      let shouldCount = false;
      if (payload.action === 'translate') {
        const act = await getActivationId();
        shouldCount = !act;
      }

      const emit = (out: StreamMessage) => {
        try {
          port.postMessage(out);
        } catch {
          // Port closed; ignore.
        }
        if (out.type === 'done' || out.type === 'error') {
          if (out.type === 'done' && shouldCount && out.requestId === payload.requestId) {
            shouldCount = false;
            void incrementUsage();
          }
          activeForPort.delete(out.requestId);
        }
      };

      await svc.run(payload, emit);
    }
  });

  port.onDisconnect.addListener(() => {
    // Abort everything this port started.
    if (service) for (const id of activeForPort) service.cancel(id);
    activeForPort.clear();
  });
});

// ---- One-shot runtime messages --------------------------------------------
chrome.runtime.onMessage.addListener((msg: RuntimeMessage, _sender, sendResponse) => {
  (async () => {
    switch (msg.type) {
      case 'GET_SETTINGS': {
        sendResponse(await storage.get());
        break;
      }
      case 'SET_SETTINGS': {
        const next = await storage.set(msg.settings);
        // Broadcast to all tabs so toolbars update live.
        broadcast({ type: 'SETTINGS_UPDATED', settings: next });
        sendResponse(next);
        break;
      }
      case 'CANCEL_REQUEST': {
        service?.cancel(msg.requestId);
        sendResponse({ ok: true });
        break;
      }
      case 'TTS': {
        // Proxy to the worker from here so the request carries the
        // chrome-extension Origin the worker trusts (a page fetch wouldn't).
        try {
          const settings = await storage.get();
          const activationId = await getActivationId();
          const res = await fetch(WORKER_ENDPOINT, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(settings.licenseKey ? { Authorization: `Bearer ${settings.licenseKey}` } : {}),
              ...(activationId ? { 'X-Activation-Id': activationId } : {}),
            },
            body: JSON.stringify({ tts: true, text: msg.text, lang: msg.lang }),
          });
          if (!res.ok) {
            const err = await res.text().catch(() => '');
            sendResponse({ ok: false, error: err.slice(0, 200) });
            break;
          }
          const buf = await res.arrayBuffer();
          // chrome.runtime messaging is JSON-only (no ArrayBuffer), so base64 it.
          const bytes = new Uint8Array(buf);
          let bin = '';
          for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
          sendResponse({ ok: true, audioB64: btoa(bin) });
        } catch (e) {
          sendResponse({ ok: false, error: String(e) });
        }
        break;
      }
      case 'OPEN_OPTIONS': {
        chrome.runtime.openOptionsPage();
        sendResponse({ ok: true });
        break;
      }
      case 'OPEN_SIDE_PANEL': {
        // Must be triggered from the user gesture forwarded by the content
        // script. Open the side panel for the sender's tab/window.
        try {
          const tabId = _sender.tab?.id;
          const windowId = _sender.tab?.windowId;
          if (windowId != null) {
            await chrome.sidePanel.open({ windowId });
          } else if (tabId != null) {
            await chrome.sidePanel.open({ tabId });
          }
          sendResponse({ ok: true });
        } catch {
          // Fallback to the options page if the side panel can't be opened.
          chrome.runtime.openOptionsPage();
          sendResponse({ ok: false });
        }
        break;
      }
      default:
        sendResponse({ ok: false });
    }
  })();
  return true; // async response
});

async function broadcast(message: RuntimeMessage) {
  const tabs = await chrome.tabs.query({});
  for (const tab of tabs) {
    if (tab.id != null) chrome.tabs.sendMessage(tab.id, message).catch(() => {});
  }
}

// ---- Keyboard commands (global shortcuts) ---------------------------------
chrome.commands.onCommand.addListener(async (command) => {
  if (
    command !== 'toggle-ghost-mode' &&
    command !== 'cycle-target-language' &&
    command !== 'open-ai-reply'
  )
    return;
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab?.id != null) {
    chrome.tabs.sendMessage(tab.id, { type: 'COMMAND', command }).catch(() => {});
  }
});

// First install -> open settings so the user can paste their Worker URL.
chrome.runtime.onInstalled.addListener(async (details) => {
  if (details.reason === 'install') {
    const settings = await storage.get();
    if (!settings.licenseKey) {
      chrome.runtime.openOptionsPage();
    }
  }
});

// On service-worker startup, make sure this device is activated.
void (async () => {
  const s = await storage.get();
  await ensureActivation(s.licenseKey);
})();
