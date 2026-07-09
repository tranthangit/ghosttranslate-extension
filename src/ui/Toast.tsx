import { useStore } from '@/content/useStore';

/** Transient centred banner for Ghost Mode / language toggles. */
export function Toast() {
  const toast = useStore((s) => s.toast);
  if (!toast) return null;
  return (
    <div className="fixed left-1/2 -translate-x-1/2 top-6 z-[2147483647] animate-gw-fade-in">
      <div className="gw-glass rounded-full px-4 py-2 text-[13px] font-semibold whitespace-nowrap">
        {toast}
      </div>
    </div>
  );
}
