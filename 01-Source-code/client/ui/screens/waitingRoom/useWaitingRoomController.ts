import { useState, useCallback, useEffect } from 'react';
import { useInput } from 'ink';

interface UseWaitingRoomControllerParams {
  readonly isHost: boolean;
  readonly onStart: () => void;
  readonly onToggleReady: () => void;
  readonly onLeave: () => void;
  readonly serverError?: string | null;
}

/**
 * Hook ควบคุมเหตุการณ์และปุ่มคำสั่งในห้องพักรอ (Waiting Room Controller)
 * - จัดการแสดงผลข้อผิดพลาดและเคลียร์ข้อความทิ้งอัตโนมัติภายใน 3 วินาที (Auto-dismiss)
 * - ดักจับปุ่มกด:
 *   - R: สลับสถานะพร้อม (Ready / Unready)
 *   - S: สั่งเริ่มเกม (เฉพาะหัวหน้าห้อง / Host เท่านั้น หากลูกห้องกดจะแจ้งเตือน)
 *   - Escape / L / Q: ออกจากห้องเกม (Leave Room)
 */
export function useWaitingRoomController({
  isHost,
  onStart,
  onToggleReady,
  onLeave,
  serverError,
}: UseWaitingRoomControllerParams) {
  const [errorMessage, setErrorMessage] = useState<string>('');

  const triggerError = useCallback((message: string) => {
    setErrorMessage(message);
    setTimeout(() => {
      setErrorMessage('');
    }, 3000);
  }, []);

  useEffect(() => {
    if (!serverError) return;
    setErrorMessage(serverError);
    const timer = setTimeout(() => {
      setErrorMessage('');
    }, 3000);
    return () => clearTimeout(timer);
  }, [serverError]);

  useInput((input, key) => {
    const normalizedKey = input.toLowerCase();

    if (key.escape || normalizedKey === 'l' || normalizedKey === 'q') {
      onLeave();
    } else if (normalizedKey === 'r') {
      onToggleReady();
    } else if (normalizedKey === 's') {
      if (isHost) {
        onStart();
      } else {
        triggerError('Only the Host can start the game');
      }
    }
  });

  return { errorMessage };
}
