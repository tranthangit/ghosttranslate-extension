import { createRoot } from 'react-dom/client';
import { StrictMode } from 'react';
import { ContentApp } from '@/content/ContentApp';
import { GhostTranslateController } from '@/content/controller';
import { store } from '@/content/store';
// Imported as a string so we can inject it into the Shadow DOM (keeps the
// host page's styles untouched and protects our UI from page CSS).
import css from '@/content/styles.css?inline';

const HOST_ID = 'ghosttranslate-host';
let uiMounted = false;

/** Create the Shadow DOM host + React root. Called lazily on first use. */
function mountUI() {
  if (uiMounted || document.getElementById(HOST_ID)) return;
  uiMounted = true;

  const host = document.createElement('div');
  host.id = HOST_ID;
  host.style.cssText = 'all: initial; position: fixed; z-index: 2147483647; top: 0; left: 0;';
  (document.body ?? document.documentElement).appendChild(host);

  const shadow = host.attachShadow({ mode: 'open' });

  const style = document.createElement('style');
  style.textContent = css;
  shadow.appendChild(style);

  const container = document.createElement('div');
  shadow.appendChild(container);

  createRoot(container).render(
    <StrictMode>
      <ContentApp />
    </StrictMode>,
  );
}

function start() {
  const controller = new GhostTranslateController();
  void controller.init();

  // Lazily mount the in-page UI only when there is something to show (an editor
  // focused or text selected). This keeps the countless idle iframes on pages
  // like Facebook (ads, trackers, embeds) cheap, since the content script now
  // runs in every frame (all_frames).
  store.subscribe(() => {
    const s = store.getState();
    if (s.toolbarVisible || s.selection) mountUI();
  });
}

// Don't run inside our own settings page / extension pages.
if (location.protocol !== 'chrome-extension:') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, { once: true });
  } else {
    start();
  }
}
