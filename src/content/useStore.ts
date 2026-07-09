import { useSyncExternalStore } from 'react';
import { store, type UIState } from '@/content/store';

export function useStore<T>(selector: (s: UIState) => T): T {
  return useSyncExternalStore(
    store.subscribe,
    () => selector(store.getState()),
  );
}

export function useFullStore(): UIState {
  return useSyncExternalStore(store.subscribe, store.getState);
}
