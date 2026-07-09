import { useEffect, useState } from 'react';
import { Toolbar } from '@/ui/Toolbar';
import { SuggestionBox } from '@/ui/SuggestionBox';
import { SelectionPopup } from '@/ui/SelectionPopup';
import { ReplyPanel } from '@/ui/ReplyPanel';
import { Toast } from '@/ui/Toast';
import { useStore } from '@/content/useStore';

/** Root of the in-page UI. Applies dark mode based on settings/system. */
export function ContentApp() {
  const theme = useStore((s) => s.settings.theme);
  const [systemDark, setSystemDark] = useState(
    () => window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false,
  );

  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = (e: MediaQueryListEvent) => setSystemDark(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  const dark = theme === 'dark' || (theme === 'system' && systemDark);

  return (
    <div className={`gw-root ${dark ? 'gw-dark' : ''}`}>
      <Toolbar />
      <SuggestionBox />
      <SelectionPopup />
      <ReplyPanel />
      <Toast />
    </div>
  );
}
