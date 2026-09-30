import { useCallback } from 'react';
import type { SocketClient } from '../../network/socketClient';
import type { ActiveScreen } from './useAppNavigation';
import { executeUserSubmission } from './navigationActions';
import { prepareConnectionUrl } from '../../../shared/networkMode';
import type { RoomMaxPlayers } from '../screens/createRoom/types';

interface UseNavigationHandlersParams {
  readonly socketClient: SocketClient;
  readonly playerName: string;
  readonly intent: 'create' | 'join' | null;
  readonly networkMode: 'LAN' | 'INTERNET';
  readonly pendingTarget: string;
  readonly pendingMaxPlayers: RoomMaxPlayers;
  readonly setPlayerName: (name: string) => void;
  readonly setScreen: (screen: ActiveScreen) => void;
  readonly setCurrentServerUrl: (url: string) => void;
  readonly currentServerUrl: string;
  readonly onClearState: () => void;
  readonly onSetSessionInfo: (name: string, url: string) => void;
}

/**
 * Hook รวบรวมฟังก์ชันจัดการเหตุการณ์ (Event Handlers) สำหรับระบบนำทาง
 * ครอบคลุมการเชื่อมต่อ WebSocket, การตอบสนองเมื่อเชื่อมต่อสำเร็จ, และการยืนยันชื่อผู้เล่น
 */
export function useNavigationHandlers({
  socketClient,
  playerName,
  intent,
  networkMode,
  pendingTarget,
  pendingMaxPlayers,
  setPlayerName,
  setScreen,
  setCurrentServerUrl,
  currentServerUrl,
  onClearState,
  onSetSessionInfo,
}: UseNavigationHandlersParams) {
  /**
   * ส่งคำขอเชื่อมต่อเซิร์ฟเวอร์เป้าหมาย พร้อมตั้งเวลารอสูงสุด 3000 มิลลิวินาที (Timeout)
   */
  const handleConnectServer = useCallback(
    async (newUrl: string): Promise<boolean> => {
      try {
        const url = prepareConnectionUrl(newUrl, 'LAN');
        onClearState();
        setCurrentServerUrl(url);
        return await socketClient.connectWithTimeout(url, 3000);
      } catch {
        return false;
      }
    },
    [onClearState, setCurrentServerUrl, socketClient],
  );

  /**
   * ลำดับขั้นตอนเมื่อเชื่อมต่อ WebSocket สำเร็จ:
   * 1. กำหนดชื่อผู้เล่นและ URL ลงในสถานะลูกข่าย (Client State)
   * 2. หากยังไม่มีชื่อผู้เล่น จะนำทางไปหน้ากรอกชื่อ (enterName)
   * 3. หากมีเจตนาสร้างห้อง จะส่งคำสั่งสร้างห้องไปยังเซิร์ฟเวอร์
   * 4. หากมีเจตนาเข้าร่วม จะนำทางไปหน้ารายชื่อห้อง (tableLounge) และร้องขอรายการห้อง
   */
  const handleConnectedSuccess = useCallback(
    (urlToSave: string) => {
      onSetSessionInfo(playerName, urlToSave);
      if (!playerName) {
        setScreen('enterName');
      } else if (intent === 'create') {
        executeUserSubmission(
          'create',
          playerName,
          'LAN',
          '',
          socketClient,
          pendingMaxPlayers,
        );
      } else {
        setScreen('tableLounge');
        socketClient.send({ type: 'GET_ROOMS' });
      }
    },
    [pendingMaxPlayers, playerName, intent, socketClient, setScreen, onSetSessionInfo],
  );

  const handleUsernameSubmit = useCallback(
    (name: string) => {
      setPlayerName(name);
      onSetSessionInfo(name, currentServerUrl);
      if (intent === 'join') {
        setScreen('tableLounge');
        socketClient.send({ type: 'GET_ROOMS' });
      } else {
        executeUserSubmission(
          intent,
          name,
          networkMode,
          pendingTarget,
          socketClient,
          pendingMaxPlayers,
        );
      }
    },
    [
      intent,
      networkMode,
      pendingMaxPlayers,
      pendingTarget,
      socketClient,
      setPlayerName,
      setScreen,
      onSetSessionInfo,
      currentServerUrl,
    ],
  );

  const handleInitialUsernameSubmit = useCallback(
    (name: string) => {
      setPlayerName(name);
      setScreen('mainMenu');
    },
    [setPlayerName, setScreen],
  );

  return {
    handleConnectServer,
    handleConnectedSuccess,
    handleUsernameSubmit,
    handleInitialUsernameSubmit,
  };
}
