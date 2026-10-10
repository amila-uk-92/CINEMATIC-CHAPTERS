import Database from 'better-sqlite3';
import { mkdir, cp, rm } from 'node:fs/promises';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const stage = path.join(root, '.data', 'deployment', 'stage');
await mkdir(stage, { recursive: true });
for (const entry of ['app', 'components', 'lib', 'migrations', 'public', 'scripts', 'tests', 'package.json', 'package-lock.json', 'next.config.ts', 'next-env.d.ts', 'tsconfig.json']) {
  await cp(path.join(root, entry), path.join(stage, entry), { recursive: true });
}
await mkdir(path.join(stage, 'deploy-data'), { recursive: true });
const snapshot = path.join(stage, 'deploy-data', 'chapters.sqlite');
await rm(snapshot, { force: true });
const source = new Database(path.join(root, '.data', 'chapters.sqlite'), { readonly: true });
await source.backup(snapshot);
source.close();
// Local login sessions must not become usable on the production host.
const deployed = new Database(snapshot);
deployed.prepare('DELETE FROM session').run();
deployed.pragma('wal_checkpoint(TRUNCATE)');
deployed.close();
await cp(path.join(root, '.data', 'objects'), path.join(stage, 'deploy-data', 'objects'), { recursive: true });
const archive = path.join(root, '.data', 'deployment', 'chapters-deploy.tar.gz');
const result = spawnSync('tar', ['-czf', archive, '-C', stage, '.'], { stdio: 'inherit' });
if (result.status !== 0) throw new Error('Deployment archive failed');
console.log('Prepared deployment archive with a consistent database snapshot.');
