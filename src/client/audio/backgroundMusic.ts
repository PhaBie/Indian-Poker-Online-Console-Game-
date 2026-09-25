import audio from 'audio';
import speaker from '@audio/speaker';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const TRACK_PATH = fileURLToPath(
  new URL('../../../Music/Illslick_M_Leg_Indian.mp3', import.meta.url),
);
const DEFAULT_VOLUME = 20;

export function getMusicVolume(value = process.env.POKER_MUSIC_VOLUME): number {
  if (value === undefined) return DEFAULT_VOLUME;
  const volume = Number(value);
  return Number.isFinite(volume) ? Math.max(0, Math.min(100, volume)) : DEFAULT_VOLUME;
}

export async function startBackgroundMusic(
  onError: (message: string) => void = (message) =>
    process.stderr.write(`[Music] ${message}\n`),
): Promise<() => void> {
  const volume = getMusicVolume();
  if (volume === 0) return () => {};
  if (!existsSync(TRACK_PATH)) {
    onError(`ไม่พบไฟล์ ${TRACK_PATH}`);
    return () => {};
  }

  try {
    // Require the bundled native backend so playback never silently falls back
    // to an external executable or a no-op output device.
    const output = speaker({ backend: 'miniaudio' });
    output.close();

    const track = audio(TRACK_PATH);
    await track.ready;
    track.on('error', (error: unknown) => {
      onError(error instanceof Error ? error.message : String(error));
    });
    track.play({ volume: volume / 100, loop: true });
    await track.played;

    const stop = () => {
      track.stop();
      process.off('exit', stop);
    };
    process.once('exit', stop);
    return stop;
  } catch (error) {
    onError(`เล่นเพลงไม่ได้: ${error instanceof Error ? error.message : String(error)}`);
    return () => {};
  }
}
