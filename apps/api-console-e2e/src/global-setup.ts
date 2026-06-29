import { workspaceRoot } from '@nx/devkit';
import { spawnSync } from 'node:child_process';

async function globalSetup(): Promise<void> {
  const preflight = spawnSync(
    process.execPath,
    ['scripts/e2e-api-console-preflight.mjs'],
    { stdio: 'inherit', cwd: workspaceRoot },
  );
  if (preflight.status !== 0) {
    throw new Error(
      'API console preflight failed. Run: npm run e2e:api-console:preflight',
    );
  }
}

export default globalSetup;
