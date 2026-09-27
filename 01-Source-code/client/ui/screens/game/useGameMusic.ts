import { useEffect, useRef, useState } from 'react';
import { useInput, type Key } from 'ink';
import {
  startBackgroundMusic,
  type BackgroundMusicPlayer,
} from '../../../audio/backgroundMusic';

export function isMusicToggleInput(
  input: string,
  key: Pick<Key, 'ctrl' | 'meta'>,
): boolean {
  return input.toLowerCase() === 'm' && !key.ctrl && !key.meta;
}

export function useGameMusic(): boolean {
  const [isMuted, setIsMuted] = useState(false);
  const mutedRef = useRef(false);
  const playerRef = useRef<BackgroundMusicPlayer | null>(null);

  useEffect(() => {
    let isMounted = true;
    void startBackgroundMusic({ getIsMuted: () => mutedRef.current }).then((player) => {
      if (!isMounted) {
        player.stop();
        return;
      }
      playerRef.current = player;
      player.setMuted(mutedRef.current);
    });

    return () => {
      isMounted = false;
      playerRef.current?.stop();
      playerRef.current = null;
    };
  }, []);

  useInput((input, key) => {
    if (!isMusicToggleInput(input, key)) return;
    mutedRef.current = !mutedRef.current;
    playerRef.current?.setMuted(mutedRef.current);
    setIsMuted(mutedRef.current);
  });

  return isMuted;
}
