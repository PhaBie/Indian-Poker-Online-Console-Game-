import { describe, expect, test } from 'bun:test';
import { createElement, useLayoutEffect, useRef } from 'react';
import { renderToString } from 'ink';
import { ClientState } from '../../../01-Source-code/client/state/ClientState';
import { SocketClient } from '../../../01-Source-code/client/network/socketClient';
import {
  resolveLeaveRoomScreen,
  resolveRoomClosedScreen,
} from '../../../01-Source-code/client/ui/navigation/navigationActions';
import {
  isPlayerPresentInRoom,
  useAppNavigation,
} from '../../../01-Source-code/client/ui/navigation/useAppNavigation';

type NavigationInstance = ReturnType<typeof useAppNavigation>;

function runNavigationSteps(
  executionSteps: Array<(navigation: NavigationInstance) => void>,
) {
  const clientState = new ClientState();
  const socketClient = new SocketClient();
  socketClient.send = () => undefined;

  function useNavigationHarness() {
    const stepTracker = useRef(0);
    const navigation = useAppNavigation({
      state: clientState.getSnapshot(),
      socketClient,
      onClearState: () => clientState.clearState(),
      onClearError: () => clientState.clearError(),
      onSetSessionInfo: () => undefined,
    });
    useLayoutEffect(() => {
      executionSteps[stepTracker.current++]?.(navigation);
    });
    return null;
  }

  renderToString(createElement(useNavigationHarness));
}

describe('15. ระบบนำทางและการเปลี่ยนหน้าจอ (Navigation UI)', () => {
  describe('เส้นทางการออกจากห้องและการปิดห้อง (Room Departure & Closure Routes)', () => {
    test('[resolveLeaveRoomScreen] 15.1 ผู้เล่นออกจากห้องรอตามบริบทต้นทาง → นำทางกลับสู่หน้าจอที่ถูกต้อง', () => {
      expect(resolveLeaveRoomScreen('create')).toBe('mainMenu');
      expect(resolveLeaveRoomScreen('join')).toBe('tableLounge');
      expect(resolveLeaveRoomScreen(null)).toBe('tableLounge');
    });

    test('[resolveRoomClosedScreen] 15.2 เซิร์ฟเวอร์ปิดห้องเล่น → นำทางผู้เล่นกลับสู่หน้าจอเริ่มต้นตามบทบาท', () => {
      expect(resolveRoomClosedScreen('create')).toBe('mainMenu');
      expect(resolveRoomClosedScreen('join')).toBe('tableLounge');
    });
  });

  describe('การซิงค์สถานะตัวตนผู้เล่นในห้อง (Room State Synchronization)', () => {
    test('[isPlayerPresentInRoom] 15.3 ผู้เล่นเป้าหมายยังคงอยู่ในรายชื่อห้อง → ซิงค์สถานะห้องถูกต้อง', () => {
      const roomPlayerList = [{ id: 'current_target_player' }];
      expect(isPlayerPresentInRoom(roomPlayerList, 'current_target_player')).toBe(true);
    });

    test('[isPlayerPresentInRoom] 15.4 ผู้เล่นออกจากห้องแล้วหรือไม่มีข้อมูลห้อง → ป้องกันการเปิดหน้าจอห้องซ้ำ', () => {
      const roomWithOtherPlayer = [{ id: 'other_player' }];
      expect(isPlayerPresentInRoom(roomWithOtherPlayer, 'current_target_player')).toBe(
        false,
      );
      expect(isPlayerPresentInRoom([], 'current_target_player')).toBe(false);
      expect(isPlayerPresentInRoom(undefined, null)).toBe(false);
    });
  });

  describe('การเปลี่ยนชื่อผู้เล่นจากล็อบบี้โต๊ะเกม (Name Change Flow)', () => {
    test('[useAppNavigation.handleChangeName] 15.5 บันทึกชื่อใหม่จากล็อบบี้ → อัปเดตชื่อผู้เล่นและกลับสู่ tableLounge โดยไม่หลุดไป mainMenu', () => {
      let hasCompletedFlow = false;
      runNavigationSteps([
        (navigation) => navigation.handleInitialUsernameSubmit('Alice'),
        (navigation) => {
          expect(navigation.screen).toBe('mainMenu');
          navigation.setScreen('tableLounge');
        },
        (navigation) => navigation.handleChangeName('lobby'),
        (navigation) => {
          expect(navigation.screen).toBe('enterName');
          navigation.handleInitialUsernameSubmit('Bobby');
        },
        (navigation) => {
          expect(navigation.screen).toBe('tableLounge');
          expect(navigation.playerName).toBe('Bobby');
          expect(navigation.resumeRoomCode).toBe(false);
          hasCompletedFlow = true;
        },
      ]);
      expect(hasCompletedFlow).toBe(true);
    });

    test('[useAppNavigation.handleChangeName] 15.6 ยกเลิกการเปลี่ยนชื่อขณะเตรียมใส่รหัสห้อง → คงชื่อเดิมและกลับสู่ tableLounge พร้อมรหัสห้องเดิม', () => {
      let hasCompletedFlow = false;
      runNavigationSteps([
        (navigation) => navigation.handleInitialUsernameSubmit('Alice'),
        (navigation) => {
          expect(navigation.screen).toBe('mainMenu');
          navigation.setScreen('tableLounge');
        },
        (navigation) => navigation.handleChangeName('code'),
        (navigation) => {
          expect(navigation.screen).toBe('enterName');
          navigation.handleBackFromUsername();
        },
        (navigation) => {
          expect(navigation.screen).toBe('tableLounge');
          expect(navigation.playerName).toBe('Alice');
          expect(navigation.resumeRoomCode).toBe(true);
          hasCompletedFlow = true;
        },
      ]);
      expect(hasCompletedFlow).toBe(true);
    });
  });
});
