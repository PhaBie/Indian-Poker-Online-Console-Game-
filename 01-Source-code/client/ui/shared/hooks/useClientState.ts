import { useSyncExternalStore, useMemo } from 'react';
import type { ClientState, ClientStateSnapshot } from '../../../state/ClientState';

export type { ClientStateSnapshot };

export function useClientState(clientState: ClientState) {
  // useSyncExternalStore needs a stable subscribe function
  const subscribe = useMemo(() => clientState.subscribe.bind(clientState), [clientState]);

  return useSyncExternalStore(subscribe, () => clientState.getSnapshot());
}
