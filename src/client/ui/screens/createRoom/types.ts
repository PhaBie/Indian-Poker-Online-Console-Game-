import type { SocketClient } from '../../../network/socketClient';

export type NetworkConnectionMode = 'LAN' | 'INTERNET';

export interface CreateRoomScreenProps {
  readonly socketClient: SocketClient;
  readonly onBack: () => void;
  readonly roomId: string | null;
  readonly serverUrl: string;
  readonly playerName?: string;
  readonly initialMode?: NetworkConnectionMode;
  readonly onModeSelect?: (mode: NetworkConnectionMode) => void;
}

export interface CreateRoomCardProps {
  readonly selectedMode: NetworkConnectionMode;
  readonly isSubmitting: boolean;
  readonly paddingX: number;
}
