import { useState, useEffect } from 'react';
import { useInput } from 'ink';
import type { RoomBrowserScreenProps } from './types';

/**
 * Hook ควบคุมการเลือกและสั่งการในหน้ารายการห้อง (Room Browser Controller)
 * - ร้องขอรายการห้องใหม่ (onRefresh) ทันทีที่เข้าสู่หน้าจอ
 * - ควบคุมตำแหน่งแถวที่เลือก (selectedIndex) ไม่ให้เกินขอบเขตจำนวนห้องปัจจุบัน
 * - ดักจับปุ่มกด: ลูกศรขึ้น/ลง เพื่อเลื่อนรายการ, Enter เพื่อเข้าห้อง, N เพื่อเปลี่ยนชื่อ, C เพื่อกรอกรหัสห้อง และ Escape เพื่อย้อนกลับ
 */
export function useRoomBrowserController({
  rooms,
  onJoinRoom,
  isEnteringCode = false,
  onChangeName,
  onEnterRoomCode = () => undefined,
  onRefresh,
  onBack,
}: RoomBrowserScreenProps) {
  const [selectedIndex, setSelectedIndex] = useState<number>(0);

  useEffect(() => {
    onRefresh();
  }, [onRefresh]);

  useEffect(() => {
    if (selectedIndex >= rooms.length && rooms.length > 0) {
      setSelectedIndex(rooms.length - 1);
    }
  }, [rooms.length, selectedIndex]);

  useInput((input, key) => {
    if (isEnteringCode) return;

    if (key.upArrow) {
      setSelectedIndex((prev) => Math.max(0, prev - 1));
    } else if (key.downArrow) {
      setSelectedIndex((prev) => Math.min(Math.max(0, rooms.length - 1), prev + 1));
    } else if (key.return) {
      if (rooms.length > 0 && rooms[selectedIndex]) {
        onJoinRoom(rooms[selectedIndex].roomId);
      }
    } else if (input.toLowerCase() === 'n') {
      onChangeName();
    } else if (input.toLowerCase() === 'c') {
      onEnterRoomCode();
    } else if (key.escape) {
      onBack();
    }
  });

  return { selectedIndex };
}
