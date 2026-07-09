import type { UILanguage } from '@/types';

// ============================================================================
// UI translations. Add a new language by adding an entry with the same keys.
// `t(lang, key, params?)` supports {placeholder} interpolation.
// ============================================================================

export type MessageKey = keyof typeof en;

const en = {
  // Toolbar
  'toolbar.tone': 'Tone:',
  'toolbar.model': 'Model:',
  'toolbar.translate': 'Translate',
  'toolbar.rewrite': 'Rewrite',
  'toolbar.ghostMode': 'Ghost Mode',
  'toolbar.collapse': 'Collapse',
  'toolbar.expand': 'Expand GhostTranslate',
  'toolbar.settings': 'Settings',
  'toolbar.sidePanel': 'Open side panel',
  'toolbar.freeLeft': '{left}/{limit} free translations left today',
  'toolbar.upgrade': 'Upgrade Pro',
  'toolbar.dragHint': 'Drag to move · double-click to reset',
  'toolbar.auto': 'Auto',
  'toolbar.reply': 'AI Reply',

  // AI Reply composer
  'reply.title': 'AI Reply',
  'reply.subtitle': 'Draft a reply to the message below.',
  'reply.original': 'Original message',
  'reply.originalPlaceholder': 'Paste or edit the message you want to reply to…',
  'reply.generate': 'Generate reply',
  'reply.regenerate': 'Regenerate',
  'reply.draft': 'Reply draft',
  'reply.translation': 'Translation',
  'reply.length': 'Length & style',
  'reply.length.short': 'Short',
  'reply.length.medium': 'Medium',
  'reply.length.long': 'Detailed',
  'reply.replyIn': 'Reply in',
  'reply.improve': 'Tell me how to improve…',
  'reply.insert': 'Insert',
  'reply.copy': 'Copy',
  'reply.copied': 'Copied',
  'reply.close': 'Close',
  'reply.thinking': 'Drafting…',
  'reply.empty': 'Add the message you want to reply to, then generate a draft.',

  // Suggestion box
  'suggestion.translate': 'Translation',
  'suggestion.continue': 'Continue',
  'suggestion.rewrite': 'Rewrite',
  'suggestion.suggestion': 'Suggestion',
  'suggestion.accept': 'accept',
  'suggestion.thinking': 'Thinking…',
  'suggestion.translating': 'Translating…',
  'suggestion.drag': 'Drag to move',

  // Selection popup
  'selection.translate': 'Translate',
  'selection.translating': 'Translating…',
  'selection.copy': 'Copy',
  'selection.copied': 'Copied',
  'selection.export': 'Export PDF',
  'selection.close': 'Close',
  'search.placeholder': 'Search language…',
  'search.empty': 'No languages found',
  'selection.pin': 'Pin',
  'selection.unpin': 'Unpin',
  'selection.expand': 'Expand',
  'selection.collapse': 'Collapse',
  'selection.read': 'Read',
  'selection.stop': 'Stop',
  'selection.translateTitle': 'Translate selection → {lang}',
  'selection.noResult': 'No result',
  'selection.drag': 'Drag to move',

  // Message translate (hover ghost button)
  'message.translate': 'Translate this message',

  // Toasts
  'toast.ghostOn': '👻 Ghost Mode on',
  'toast.ghostOff': 'Ghost Mode off',
  'toast.ghostUnsupported': "⚠️ Ghost Mode isn't supported in this editor. Use Translate instead.",
  'toast.copyPaste': '📋 Translation copied — press Ctrl+V to paste it here',
  'toast.copyFail': "⚠️ Couldn't copy. Select the text and copy it manually.",
  'toast.ghostTab': '👻 Ghost Mode: press Tab to apply the translation here',
  'toast.target': '🌐 Target: {lang}',
  'toast.freeLimit': 'Free daily limit reached. Upgrade to Pro for unlimited translations.',

  // Tones
  'tone.default': 'Default (fast)',
  'tone.casual': 'Casual',
  'tone.friendly': 'Friendly',
  'tone.professional': 'Professional',
  'tone.business': 'Business',
  'tone.academic': 'Academic',
  'tone.native': 'Native Speaker',
  'tone.funny': 'Funny',
  'tone.polite': 'Polite',

  // Settings page
  'settings.tagline': 'Type in your language. Communicate in any language.',
  'settings.saved': 'Saved',
  'settings.cf.title': 'Cloudflare Worker AI',
  'settings.cf.desc':
    'GhostTranslate calls your own Cloudflare Worker, which proxies Workers AI. This keeps your account token off the page. A ready-to-deploy worker is in worker/worker.js.',
  'settings.cf.endpoint': 'Worker Endpoint URL',
  'settings.cf.token': 'Worker Token (optional)',
  'settings.cf.tokenHint': 'Sent as an Authorization header. Leave blank if your worker is open.',
  'settings.cf.test': 'Test connection',
  'settings.cf.testing': 'Testing…',
  'settings.cf.connected': 'Connected — Worker responded.',
  'settings.cf.setUrlFirst': 'Set a Worker URL first.',

  'settings.defaults.title': 'Defaults',
  'settings.defaults.targetLanguage': 'Target language (typing)',
  'settings.defaults.selectionTargetLanguage': 'Target language (selection translate)',
  'settings.defaults.tone': 'Tone',
  'settings.defaults.model': 'Model',
  'settings.defaults.modelLocked': 'Set by admin',
  'settings.defaults.replyLength': 'Default reply length',
  'settings.defaults.engine': 'Translate engine',
  'engine.ai': 'AI (context + tone)',
  'engine.azure': 'Azure (fast, literal)',
  'engine.hybrid': 'Hybrid (Azure + AI polish)',

  'settings.behaviour.title': 'Behaviour',
  'settings.behaviour.uiLanguage': 'Interface language',
  'settings.behaviour.uiLanguageHint': "Language of GhostTranslate's own menus and labels.",
  'settings.behaviour.enabled': 'Extension enabled',
  'settings.behaviour.enabledHint': 'Master switch for all sites.',
  'settings.behaviour.ghost': 'Ghost Mode by default',
  'settings.behaviour.ghostHint': 'Rewrite the textbox into the target language as you type.',
  'settings.behaviour.continue': 'AI continuation',
  'settings.behaviour.continueHint':
    'Copilot-style autocomplete when already typing the target language.',
  'settings.behaviour.selection': 'Select to translate',
  'settings.behaviour.selectionHint':
    'Show a translate popup when you highlight text anywhere on the page.',
  'settings.behaviour.message': 'Hover message to translate',
  'settings.behaviour.messageHint':
    'Show a ghost button on message/text blocks when you hover them; click it to translate.',
  'settings.behaviour.reply': 'AI Reply',
  'settings.behaviour.replyHint': 'Show the AI Reply button and enable its shortcut.',
  'settings.behaviour.puter': 'Puter voice (read aloud)',
  'settings.behaviour.puterHint': 'Connect a free Puter account for high-quality text-to-speech.',
  'puter.connect': 'Connect',
  'puter.connecting': 'Connecting…',
  'puter.connected': 'Connected',
  'puter.disconnect': 'Disconnect',
  'settings.behaviour.streaming': 'Streaming',
  'settings.behaviour.streamingHint': 'Show results token-by-token for faster feedback.',
  'settings.behaviour.debounce': 'Debounce: {ms}ms',
  'settings.behaviour.debounceHint': 'Delay after you stop typing before calling the AI.',
  'settings.behaviour.ghostDebounce': 'Ghost Mode delay: {ms}ms',
  'settings.behaviour.ghostDebounceHint':
    'Wait time before Ghost Mode rewrites the textbox as you type.',
  'settings.behaviour.theme': 'Theme',
  'settings.behaviour.themeHint': 'Toolbar appearance.',
  'settings.theme.system': 'System',
  'settings.theme.light': 'Light',
  'settings.theme.dark': 'Dark',

  'settings.sites.title': 'Disabled sites',
  'settings.sites.hint': 'One hostname per line (e.g. docs.google.com).',

  'settings.shortcuts.title': 'Keyboard shortcuts',
  'settings.shortcuts.accept': 'Accept the suggestion',
  'settings.shortcuts.dismiss': 'Dismiss the suggestion',
  'settings.shortcuts.ghost': 'Toggle Ghost Mode',
  'settings.shortcuts.cycle': 'Cycle target language',
  'settings.shortcuts.reply': 'Open AI Reply',

  'settings.footer': 'GhostTranslate · v1.0.0 · Made with ❤️ by Tony Thang',

  // Sidebar navigation
  'nav.connection': 'Connection',
  'nav.account': 'Account',
  'nav.defaults': 'Defaults',
  'nav.behaviour': 'Behaviour',
  'nav.sites': 'Sites',
  'nav.shortcuts': 'Shortcuts',

  // Account / license
  'account.title': 'Subscription',
  'account.desc': 'Enter your license key to activate GhostTranslate on this device.',
  'account.licenseKey': 'License key',
  'account.activate': 'Activate',
  'account.checking': 'Checking…',
  'account.active': 'Active',
  'account.invalid': 'Invalid or expired license key.',
  'account.enterKey': 'Enter a license key first.',
  'account.plan': 'Plan',
  'account.expires': 'Expires',
  'account.noExpiry': 'Never',
  'account.benefits': 'Plan benefits',
  'account.limits': 'Limits',
  'account.freePlan': 'Free plan',
  'account.usageToday': '{used} / {limit} translations today',
  'account.buy': 'Get a license',
  'account.buyHint': "Don't have a key yet? Start a subscription:",
  'account.devices': 'Activated devices',
  'account.thisDevice': 'This device',
  'account.deactivate': 'Remove',
  'account.removing': 'Removing…',
  'account.noDevices': 'No devices activated yet.',
  'account.deviceCount': 'Devices: {used}/{limit}',
  'account.activatedOn': 'Activated {date}',
} as const;

const vi: Record<MessageKey, string> = {
  // Toolbar
  'toolbar.tone': 'Tông:',
  'toolbar.model': 'Mô hình:',
  'toolbar.translate': 'Dịch',
  'toolbar.rewrite': 'Viết lại',
  'toolbar.ghostMode': 'Ghost Mode',
  'toolbar.collapse': 'Thu gọn',
  'toolbar.expand': 'Mở rộng GhostTranslate',
  'toolbar.settings': 'Cài đặt',
  'toolbar.sidePanel': 'Mở bảng bên',
  'toolbar.freeLeft': 'Còn {left}/{limit} lượt dịch free hôm nay',
  'toolbar.upgrade': 'Nâng cấp Pro',
  'toolbar.dragHint': 'Kéo để di chuyển · nhấp đúp để đặt lại',
  'toolbar.auto': 'Tự động',
  'toolbar.reply': 'AI Trả lời',

  // AI Reply composer
  'reply.title': 'AI Trả lời',
  'reply.subtitle': 'Soạn câu trả lời cho tin nhắn bên dưới.',
  'reply.original': 'Tin nhắn gốc',
  'reply.originalPlaceholder': 'Dán hoặc sửa nội dung tin nhắn bạn muốn trả lời…',
  'reply.generate': 'Tạo câu trả lời',
  'reply.regenerate': 'Tạo lại',
  'reply.draft': 'Bản nháp trả lời',
  'reply.translation': 'Bản dịch',
  'reply.length': 'Độ dài & văn phong',
  'reply.length.short': 'Ngắn',
  'reply.length.medium': 'Vừa',
  'reply.length.long': 'Chi tiết',
  'reply.replyIn': 'Trả lời bằng',
  'reply.improve': 'Cho tôi biết cách cải thiện…',
  'reply.insert': 'Chèn',
  'reply.copy': 'Sao chép',
  'reply.copied': 'Đã chép',
  'reply.close': 'Đóng',
  'reply.thinking': 'Đang soạn…',
  'reply.empty': 'Thêm tin nhắn bạn muốn trả lời, rồi tạo bản nháp.',

  // Suggestion box
  'suggestion.translate': 'Bản dịch',
  'suggestion.continue': 'Viết tiếp',
  'suggestion.rewrite': 'Viết lại',
  'suggestion.suggestion': 'Gợi ý',
  'suggestion.accept': 'chấp nhận',
  'suggestion.thinking': 'Đang xử lý…',
  'suggestion.translating': 'Đang dịch…',
  'suggestion.drag': 'Kéo để di chuyển',

  // Selection popup
  'selection.translate': 'Dịch',
  'selection.translating': 'Đang dịch…',
  'selection.copy': 'Sao chép',
  'selection.copied': 'Đã chép',
  'selection.export': 'Xuất PDF',
  'selection.close': 'Đóng',
  'search.placeholder': 'Tìm ngôn ngữ…',
  'search.empty': 'Không tìm thấy ngôn ngữ',
  'selection.pin': 'Ghim',
  'selection.unpin': 'Bỏ ghim',
  'selection.expand': 'Mở rộng',
  'selection.collapse': 'Thu gọn',
  'selection.read': 'Đọc',
  'selection.stop': 'Dừng',
  'selection.translateTitle': 'Dịch đoạn đã chọn → {lang}',
  'selection.noResult': 'Không có kết quả',
  'selection.drag': 'Kéo để di chuyển',

  // Message translate (hover ghost button)
  'message.translate': 'Dịch tin nhắn này',

  // Toasts
  'toast.ghostOn': '👻 Đã bật Ghost Mode',
  'toast.ghostOff': 'Đã tắt Ghost Mode',
  'toast.ghostUnsupported': '⚠️ Trình soạn này không hỗ trợ Ghost Mode. Hãy dùng nút Dịch.',
  'toast.copyPaste': '📋 Đã sao chép bản dịch — nhấn Ctrl+V để dán vào đây',
  'toast.copyFail': '⚠️ Không sao chép được. Hãy bôi chọn và sao chép thủ công.',
  'toast.ghostTab': '👻 Ghost Mode: nhấn Tab để áp bản dịch ở trang này',
  'toast.target': '🌐 Dịch sang: {lang}',
  'toast.freeLimit': 'Đã hết lượt dịch free hôm nay. Nâng cấp Pro để dịch không giới hạn.',

  // Tones
  'tone.default': 'Mặc định (nhanh)',
  'tone.casual': 'Thân mật',
  'tone.friendly': 'Thân thiện',
  'tone.professional': 'Chuyên nghiệp',
  'tone.business': 'Công việc',
  'tone.academic': 'Học thuật',
  'tone.native': 'Bản xứ',
  'tone.funny': 'Hài hước',
  'tone.polite': 'Lịch sự',

  // Settings page
  'settings.tagline': 'Gõ bằng ngôn ngữ của bạn. Giao tiếp bằng mọi ngôn ngữ.',
  'settings.saved': 'Đã lưu',
  'settings.cf.title': 'Cloudflare Worker AI',
  'settings.cf.desc':
    'GhostTranslate gọi tới Cloudflare Worker của riêng bạn để chuyển tiếp Workers AI. Cách này giúp token tài khoản không bị lộ trên trang. Có sẵn worker để triển khai trong worker/worker.js.',
  'settings.cf.endpoint': 'URL Worker Endpoint',
  'settings.cf.token': 'Worker Token (tùy chọn)',
  'settings.cf.tokenHint': 'Được gửi trong header Authorization. Để trống nếu worker không yêu cầu.',
  'settings.cf.test': 'Kiểm tra kết nối',
  'settings.cf.testing': 'Đang kiểm tra…',
  'settings.cf.connected': 'Đã kết nối — Worker phản hồi.',
  'settings.cf.setUrlFirst': 'Hãy nhập URL Worker trước.',

  'settings.defaults.title': 'Mặc định',
  'settings.defaults.targetLanguage': 'Ngôn ngữ đích (khi gõ)',
  'settings.defaults.selectionTargetLanguage': 'Ngôn ngữ đích (bôi đen để dịch)',
  'settings.defaults.tone': 'Tông giọng',
  'settings.defaults.model': 'Mô hình',
  'settings.defaults.modelLocked': 'Do admin đặt',
  'settings.defaults.replyLength': 'Văn phong câu trả lời mặc định',
  'settings.defaults.engine': 'Bộ máy dịch',
  'engine.ai': 'AI (ngữ cảnh + tông giọng)',
  'engine.azure': 'Azure (nhanh, sát nghĩa)',
  'engine.hybrid': 'Kết hợp (Azure dịch + AI chuốt)',

  'settings.behaviour.title': 'Hành vi',
  'settings.behaviour.uiLanguage': 'Ngôn ngữ giao diện',
  'settings.behaviour.uiLanguageHint': 'Ngôn ngữ cho menu và nhãn của chính GhostTranslate.',
  'settings.behaviour.enabled': 'Bật tiện ích',
  'settings.behaviour.enabledHint': 'Công tắc chính cho mọi trang.',
  'settings.behaviour.ghost': 'Bật Ghost Mode mặc định',
  'settings.behaviour.ghostHint': 'Tự đổi nội dung ô nhập sang ngôn ngữ đích khi bạn gõ.',
  'settings.behaviour.continue': 'Viết tiếp bằng AI',
  'settings.behaviour.continueHint': 'Gợi ý viết tiếp kiểu Copilot khi bạn đang gõ đúng ngôn ngữ đích.',
  'settings.behaviour.selection': 'Bôi đen để dịch',
  'settings.behaviour.selectionHint': 'Hiện khung dịch khi bạn bôi đen bất kỳ đoạn văn bản nào trên trang.',
  'settings.behaviour.message': 'Di chuột vào tin nhắn để dịch',
  'settings.behaviour.messageHint':
    'Hiện nút ghost ở góc khung tin nhắn/văn bản khi bạn di chuột vào; bấm để dịch đoạn đó.',
  'settings.behaviour.reply': 'AI Trả lời',
  'settings.behaviour.replyHint': 'Hiện nút AI Trả lời và bật phím tắt.',
  'settings.behaviour.puter': 'Giọng đọc Puter',
  'settings.behaviour.puterHint': 'Kết nối tài khoản Puter miễn phí để dùng giọng đọc chất lượng cao.',
  'puter.connect': 'Kết nối',
  'puter.connecting': 'Đang kết nối…',
  'puter.connected': 'Đã kết nối',
  'puter.disconnect': 'Ngắt kết nối',
  'settings.behaviour.streaming': 'Truyền theo luồng',
  'settings.behaviour.streamingHint': 'Hiển thị kết quả từng chữ để phản hồi nhanh hơn.',
  'settings.behaviour.debounce': 'Độ trễ: {ms}ms',
  'settings.behaviour.debounceHint': 'Thời gian chờ sau khi bạn ngừng gõ trước khi gọi AI.',
  'settings.behaviour.ghostDebounce': 'Độ trễ Ghost Mode: {ms}ms',
  'settings.behaviour.ghostDebounceHint':
    'Thời gian chờ trước khi Ghost Mode viết lại ô nhập khi bạn gõ.',
  'settings.behaviour.theme': 'Giao diện',
  'settings.behaviour.themeHint': 'Diện mạo thanh công cụ.',
  'settings.theme.system': 'Theo hệ thống',
  'settings.theme.light': 'Sáng',
  'settings.theme.dark': 'Tối',

  'settings.sites.title': 'Trang đã tắt',
  'settings.sites.hint': 'Mỗi dòng một tên miền (vd: docs.google.com).',

  'settings.shortcuts.title': 'Phím tắt',
  'settings.shortcuts.accept': 'Chấp nhận gợi ý',
  'settings.shortcuts.dismiss': 'Bỏ qua gợi ý',
  'settings.shortcuts.ghost': 'Bật/tắt Ghost Mode',
  'settings.shortcuts.cycle': 'Đổi ngôn ngữ đích',
  'settings.shortcuts.reply': 'Mở AI Trả lời',

  'settings.footer': 'GhostTranslate · v1.0.0 · Made with ❤️ by Tony Thang',

  // Sidebar navigation
  'nav.connection': 'Kết nối',
  'nav.account': 'Tài khoản',
  'nav.defaults': 'Mặc định',
  'nav.behaviour': 'Hành vi',
  'nav.sites': 'Trang web',
  'nav.shortcuts': 'Phím tắt',

  // Account / license
  'account.title': 'Gói đăng ký',
  'account.desc': 'Nhập license key để kích hoạt GhostTranslate trên thiết bị này.',
  'account.licenseKey': 'License key',
  'account.activate': 'Kích hoạt',
  'account.checking': 'Đang kiểm tra…',
  'account.active': 'Đang hoạt động',
  'account.invalid': 'License key không hợp lệ hoặc đã hết hạn.',
  'account.enterKey': 'Hãy nhập license key trước.',
  'account.plan': 'Gói',
  'account.expires': 'Hết hạn',
  'account.noExpiry': 'Không giới hạn',
  'account.benefits': 'Quyền lợi gói',
  'account.limits': 'Giới hạn',
  'account.freePlan': 'Gói Free',
  'account.usageToday': '{used} / {limit} lượt dịch hôm nay',
  'account.buy': 'Mua license',
  'account.buyHint': 'Chưa có key? Bắt đầu đăng ký tại:',
  'account.devices': 'Thiết bị đã kích hoạt',
  'account.thisDevice': 'Thiết bị này',
  'account.deactivate': 'Gỡ',
  'account.removing': 'Đang gỡ…',
  'account.noDevices': 'Chưa có thiết bị nào được kích hoạt.',
  'account.deviceCount': 'Thiết bị: {used}/{limit}',
  'account.activatedOn': 'Kích hoạt {date}',
};

const MESSAGES: Record<UILanguage, Record<MessageKey, string>> = { en, vi };

export const UI_LANGUAGES: { value: UILanguage; label: string }[] = [
  { value: 'en', label: 'English' },
  { value: 'vi', label: 'Tiếng Việt' },
];

/** Translate a key, interpolating {placeholders} from params. */
export function t(lang: UILanguage, key: MessageKey, params?: Record<string, string | number>): string {
  const table = MESSAGES[lang] ?? MESSAGES.en;
  let str = table[key] ?? MESSAGES.en[key] ?? key;
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      str = str.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
    }
  }
  return str;
}
