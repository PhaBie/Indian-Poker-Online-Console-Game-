import { startBackgroundMusic } from './backgroundMusic';

const stopMusic = await startBackgroundMusic((message) => {
  process.stderr.write(`[Music] ${message}\n`);
  process.exitCode = 1;
});

if (process.exitCode !== 1) {
  process.stdout.write('Playing music for 5 seconds...\n');
  await Bun.sleep(5000);
}

stopMusic();
