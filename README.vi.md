# 👻 GhostTranslate

<sub>[🇬🇧 English](./README.md) · 🇻🇳 Tiếng Việt</sub>

**Gõ bằng ngôn ngữ của bạn, giao tiếp bằng mọi ngôn ngữ — ngay trong ô nhập liệu.**

GhostTranslate là tiện ích trình duyệt (Chrome/Edge, Manifest V3) giúp dịch, viết lại và gợi ý
hoàn thành văn bản theo thời gian thực, ngay trong ô bạn đang gõ — không copy‑paste, không đổi tab.

- 🌐 Website: https://ghosttranslate.xyz
- 🧩 Chrome Web Store: https://chromewebstore.google.com/detail/ghosttranslate/dpjocbjgfihpfljppjofohoieednlhml

Repo này chứa **phần extension mã nguồn mở (client)**. Backend AI (một Cloudflare Worker) và web app
được vận hành riêng, **không** nằm trong repo này — xem mục [Quyền riêng tư](#-quyền-riêng-tư).

---

## ✨ Tính năng

- **Dịch trực tiếp** — cứ gõ, khi ngừng một nhịp sẽ hiện gợi ý. Nhấn `Tab` để áp dụng.
- **Ghost Mode** — gõ tiếng Việt, ô nhập tự chuyển sang ngôn ngữ đích ngay khi bạn gõ.
- **AI Reply** — soạn nguyên câu trả lời cho một tin nhắn chỉ bằng một cú nhấp, chỉnh được độ dài & giọng văn.
- **Viết lại & 8 tông giọng** — Chuyên nghiệp, Thân mật, Gần gũi, Kinh doanh, Học thuật, Bản ngữ, Hài hước, Lịch sự.
- **Bôi đen để dịch** — chọn văn bản bất kỳ để dịch tại chỗ.
- **Gợi ý viết tiếp** — kiểu Copilot ngay khi soạn.
- **Tự nhận diện ngôn ngữ** · **39 ngôn ngữ**.

Hoạt động trong hầu hết ô nhập trên web (email, chat, tài liệu, mạng xã hội, app chat AI, và mọi
`<textarea>` / `contenteditable`).

---

## 🔒 Quyền riêng tư

Một công cụ nằm ngay trong ô soạn thảo của bạn thì niềm tin là quan trọng nhất. Extension thực sự làm gì:

- **Không phải keylogger.** Chỉ xử lý đúng đoạn văn bản bạn **chủ động yêu cầu** dịch/viết lại trong
  trình soạn thảo được hỗ trợ. Không ghi lại mọi phím bạn gõ khắp nơi.
- **Không đụng vào ô mật khẩu.** Extension chỉ gắn vào ô văn bản thường và `contenteditable`;
  `<input type="password">` **bị loại trừ** theo thiết kế.
- **Cái được gửi đi:** đúng đoạn văn bản cần dịch/viết lại, truyền qua HTTPS tới backend của dự án
  (một Cloudflare Worker chuyển tiếp Workers AI) chỉ để tạo kết quả cho bạn.
- **Cái KHÔNG làm:** không lưu thành hồ sơ, không dùng để huấn luyện mô hình, không bán cho bên thứ ba.
- **Bạn toàn quyền:** tắt extension trên từng trang bất cứ lúc nào.

Chính sách đầy đủ: https://ghosttranslate.xyz/privacy

Vì là mã nguồn mở, bạn có thể **tự kiểm chứng** mọi điều trên trong thư mục `src/`.

---

## 🧱 Cấu trúc dự án

```
src/
├── manifest.ts            # Manifest MV3 (có kiểu)
├── background/            # Service worker: chứa AIService, stream qua Port
├── content/               # Content script (UI Shadow-DOM, pipeline gõ, editor bridge)
├── ai/                    # AIService, prompts, provider interface
├── core/                  # ngôn ngữ, nhận diện, debounce, usage
├── keyboard/              # xử lý Tab / Esc / phím tắt
├── storage/              # bọc chrome.storage
├── ui/                    # Toolbar, SuggestionBox, Toast, picker
├── settings/              # trang Cài đặt / side-panel (React)
└── config.ts              # cấu hình build công khai (URL backend)
```

Backend Worker và web app nằm ở repo riêng (private).

---

## 🛠️ Build từ mã nguồn

Yêu cầu: Node 18+.

```bash
npm install
npm run build      # xuất extension (chưa nén) ra thư mục dist/
```

Nạp vào trình duyệt:

1. Mở `chrome://extensions` (hoặc `edge://extensions`)
2. Bật **Chế độ nhà phát triển (Developer mode)**
3. **Tải tiện ích chưa đóng gói (Load unpacked)** → chọn thư mục `dist/`

### Phát triển

```bash
npm run dev        # Vite + HMR; nạp dist/ dạng unpacked, tự reload khi sửa
```

### Endpoint backend

Extension gọi tới endpoint khai trong `src/config.ts` (`WORKER_ENDPOINT`). Mặc định trỏ tới API
chính thức của GhostTranslate. Muốn chạy với backend riêng, hãy triển khai một Worker tương thích
rồi đổi URL đó và build lại.

---

## ⌨️ Phím tắt

| Phím tắt | Chức năng |
| --- | --- |
| `Tab` | Chấp nhận gợi ý |
| `Esc` | Bỏ qua gợi ý |
| `Ctrl/⌘ + Shift + G` | Bật/tắt Ghost Mode |
| `Ctrl/⌘ + Shift + K` | Đổi ngôn ngữ đích |
| `Ctrl/⌘ + Shift + R` | Mở AI Reply |

---

## 🧰 Công nghệ

React · TypeScript · Tailwind CSS · Vite · CRXJS · Chrome Extension Manifest V3

---

## 📄 Giấy phép

[GNU AGPL-3.0](./LICENSE) © 2026 Tony Thang.

Đây là giấy phép copyleft: nếu bạn phân phối bản chỉnh sửa — hoặc chạy nó như một dịch vụ mạng —
bạn phải công khai mã nguồn của mình theo cùng giấy phép. "GhostTranslate" và logo là nhãn hiệu của
tác giả; giấy phép chỉ áp dụng cho mã nguồn, không bao gồm tên/thương hiệu.
