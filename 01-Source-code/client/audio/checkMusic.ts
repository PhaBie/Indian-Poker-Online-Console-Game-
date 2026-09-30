import { startBackgroundMusic } from './backgroundMusic';

const music = await startBackgroundMusic({
  onError: (message) => {
    process.stderr.write(`[Music] ${message}\n`);
    process.exitCode = 1;
  },
});

if (process.exitCode !== 1) {
  process.stdout.write('Playing, muting, and resuming music...\n');
  await Bun.sleep(1000);
  const positionBeforeMute = music.getPosition();
  music.setMuted(true);
  await Bun.sleep(2000);
  const positionAfterMute = music.getPosition();
  music.setMuted(false);
  await Bun.sleep(2000);
  if (positionAfterMute <= positionBeforeMute) {
    process.stderr.write('[Music] ตำแหน่งเพลงไม่เดินต่อขณะปิดเสียง\n');
    process.exitCode = 1;
  } else {
    process.stdout.write(
      `Music advanced while muted: ${positionBeforeMute.toFixed(1)}s → ${positionAfterMute.toFixed(1)}s\n`,
    );
  }
}

music.stop();
