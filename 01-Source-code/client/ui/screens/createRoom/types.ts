import type { SocketClient } from '../../../network/socketClient';

export type NetworkConnectionMode = 'LAN' | 'INTERNET';
export type RoomMaxPlayers = 2 | 3 | 4;

export interface CreateRoomScreenProps {
  readonly socketClient: SocketClient;
  readonly onBack: () => void;
  readonly roomId: string | null;
  readonly serverUrl: string;
  readonly playerName?: string;
  readonly initialMode?: NetworkConnectionMode;
  readonly onModeSelect?: (
    mode: NetworkConnectionMode,
    maxPlayers: RoomMaxPlayers,
  ) => void;
}

export interface CreateRoomCardProps {
  readonly step: 'mode' | 'settings';
  readonly selectedMode: NetworkConnectionMode;
  readonly maxPlayers: RoomMaxPlayers;
  readonly isSubmitting: boolean;
  readonly paddingX: number;
}
