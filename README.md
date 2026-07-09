# 👻 GhostTranslate

<sub>🇬🇧 English · [🇻🇳 Tiếng Việt](./README.vi.md)</sub>

**Type in your language, communicate in any language — right inside any text box.**

GhostTranslate is a Chrome/Edge (Manifest V3) extension that translates, rewrites and
autocompletes text in real time, directly in the field you're typing in — no copy‑paste,
no switching tabs.

- 🌐 Website: https://ghosttranslate.xyz
- 🧩 Chrome Web Store: https://chromewebstore.google.com/detail/ghosttranslate/dpjocbjgfihpfljppjofohoieednlhml

This repository contains the **open‑source browser extension (client)**. The AI backend
(a Cloudflare Worker) and the web app are operated separately and are **not** part of this
repo — see [Privacy](#-privacy) below.

---

## ✨ Features

- **Live translation** — keep typing; a suggestion appears when you pause. Press `Tab` to accept.
- **Ghost Mode** — type in your language and the field updates to the target language as you go.
- **AI Reply** — draft a full reply to a message in one click, with adjustable length & tone.
- **Rewrite & 8 tones** — Professional, Casual, Friendly, Business, Academic, Native, Funny, Polite.
- **Highlight to translate** — select text anywhere to translate it in place.
- **Autocomplete** — Copilot‑style continuations while you write.
- **Auto language detection** · **39 languages**.

Works in most editable fields on the web (email, chat, docs, social, AI chat apps, and any
`<textarea>` / `contenteditable`).

---

## 🔒 Privacy

Trust matters for a tool that lives in your text boxes. What the extension actually does:

- **Not a keylogger.** It only processes the text you actively ask it to translate/rewrite in
  a supported editor. It does **not** record everything you type across the web.
- **Password fields are never touched.** The extension only attaches to normal text inputs and
  `contenteditable` areas — `<input type="password">` is excluded by design.
- **What is sent:** the specific text to translate/rewrite is sent over HTTPS to the project's
  own backend (a Cloudflare Worker proxying Workers AI) purely to generate your result.
- **What is not done:** your text is **not** stored as a profile, **not** used to train models,
  and **not** sold to third parties.
- **You're in control:** turn the extension off per‑site any time.

Full policy: https://ghosttranslate.xyz/privacy

Because it's open source, you can verify all of the above yourself in `src/`.

---

## 🧱 Project structure

```
src/
├── manifest.ts            # MV3 manifest (typed)
├── background/            # Service worker: owns AIService, streams over Ports
├── content/               # Content script (Shadow-DOM UI, typing pipeline, editor bridge)
├── ai/                    # AIService, prompts, provider interface
├── core/                  # languages, detection, debounce, usage
├── keyboard/              # Tab / Esc / shortcut handling
├── storage/               # chrome.storage wrapper
├── ui/                    # Toolbar, SuggestionBox, Toast, pickers
├── settings/              # Options / side-panel page (React)
└── config.ts              # Public build-time config (backend endpoint URL)
```

The backend Worker and web app are kept in separate, private repositories.

---

## 🛠️ Build from source

Requirements: Node 18+.

```bash
npm install
npm run build      # outputs the unpacked extension to dist/
```

Load it in the browser:

1. Open `chrome://extensions` (or `edge://extensions`)
2. Enable **Developer mode**
3. **Load unpacked** → select the `dist/` folder

### Development

```bash
npm run dev        # Vite + HMR; load dist/ as unpacked and it reloads on change
```

### Backend endpoint

The extension calls a backend endpoint defined in `src/config.ts` (`WORKER_ENDPOINT`).
By default it points to the official GhostTranslate API. To run against your own backend,
deploy a compatible Worker and change that URL, then rebuild.

---

## ⌨️ Keyboard shortcuts

| Shortcut | Action |
| --- | --- |
| `Tab` | Accept the current suggestion |
| `Esc` | Dismiss the suggestion |
| `Ctrl/⌘ + Shift + G` | Toggle Ghost Mode |
| `Ctrl/⌘ + Shift + K` | Cycle target language |
| `Ctrl/⌘ + Shift + R` | Open AI Reply |

---

## 🧰 Tech

React · TypeScript · Tailwind CSS · Vite · CRXJS · Chrome Extension Manifest V3

---

## 📄 License

[GNU AGPL-3.0](./LICENSE) © 2026 Tony Thang.

This is copyleft: if you distribute a modified version — or run it as a network service —
you must make your source code available under the same license. "GhostTranslate" and its
logo are trademarks of the author; the license covers the source code only, not the
name/branding.
