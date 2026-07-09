import { defineManifest } from '@crxjs/vite-plugin';
import pkg from '../package.json';

export default defineManifest({
  manifest_version: 3,
  name: 'GhostTranslate',
  version: pkg.version,
  description: 'Real-time AI translation, rewriting and autocomplete in any text box — type in your language, send in theirs.',
  icons: {
    16: 'icons/icon-16.png',
    32: 'icons/icon-32.png',
    48: 'icons/icon-48.png',
    128: 'icons/icon-128.png',
  },
  action: {
    default_title: 'GhostTranslate',
  },
  side_panel: {
    default_path: 'settings.html',
  },
  background: {
    service_worker: 'src/background/index.ts',
    type: 'module',
  },
  content_scripts: [
    {
      matches: ['<all_urls>'],
      js: ['src/content/index.tsx'],
      run_at: 'document_idle',
      all_frames: true,
      match_about_blank: true,
    },
  ],
  options_page: 'settings.html',
  permissions: ['storage', 'sidePanel'],
  host_permissions: ['<all_urls>'],
  commands: {
    'toggle-ghost-mode': {
      suggested_key: {
        default: 'Ctrl+Shift+G',
        mac: 'Command+Shift+G',
      },
      description: 'Toggle Ghost Mode on/off',
    },
    'cycle-target-language': {
      suggested_key: {
        default: 'Ctrl+Shift+K',
        mac: 'Command+Shift+K',
      },
      description: 'Cycle the target language',
    },
    'open-ai-reply': {
      suggested_key: {
        default: 'Ctrl+Shift+R',
        mac: 'Command+Shift+R',
      },
      description: 'Open AI Reply composer',
    },
  },
  web_accessible_resources: [
    {
      resources: ['icons/*', 'assets/*'],
      matches: ['<all_urls>'],
    },
  ],
});
