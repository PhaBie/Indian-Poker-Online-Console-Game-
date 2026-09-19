import { useSyncExternalStore, useMemo } from 'react';
import type { ClientState } from '../../state/ClientState';

export function useClientState(clientState: ClientState) {
  // useSyncExternalStore needs a stable subscribe function
  const subscribe = useMemo(() => clientState.subscribe.bind(clientState), [clientState]);

  return useSyncExternalStore(subscribe, () => clientState.getSnapshot());
}
