import { useState, useEffect } from 'react';
import { useInput } from 'ink';
import type { RoomBrowserScreenProps } from './types';

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
