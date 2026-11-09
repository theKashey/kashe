// Consumes the packed tarball the way a user does: CommonJS, ES modules and types, every entry.
// Run it after a build. The runtime checks forbid code generation, as edge runtimes do.
import {execFileSync} from 'node:child_process';
import {mkdtempSync, rmSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join, resolve} from 'node:path';

const root = resolve(import.meta.dirname, '..');
const dir = mkdtempSync(join(tmpdir(), 'kashe-package-'));
const run = (command, ...args) => execFileSync(command, args, {cwd: dir, stdio: 'inherit'});

const uses = `
  const sum = kashe((a, b) => [a, b]);
  const key = {};
  if (sum(key, 1) !== sum(key, 1) || sum.length !== 2) throw new Error('kashe does not memoize');
  if (typeof asyncLocalStorageModel !== 'function') throw new Error('no asyncLocalStorageModel');
`;

try {
    const [{filename}] = JSON.parse(execFileSync(
        'npm', ['pack', '--json', '--pack-destination', dir], {cwd: root, encoding: 'utf8'},
    ));

    writeFileSync(join(dir, 'package.json'), '{"private": true}');
    run('npm', 'install', '--no-audit', '--no-fund', '--silent', join(dir, filename));

    writeFileSync(join(dir, 'consumer.cjs'), `
      const {kashe} = require('kashe');
      const {asyncLocalStorageModel} = require('kashe/async-local-storage-cache');
      ${uses}
    `);
    writeFileSync(join(dir, 'consumer.mjs'), `
      import {kashe} from 'kashe';
      import {asyncLocalStorageModel} from 'kashe/async-local-storage-cache';
      ${uses}
    `);
    writeFileSync(join(dir, 'consumer.ts'), `
      import {configureCacheModel, kashe} from 'kashe';
      import {asyncLocalStorageModel} from 'kashe/async-local-storage-cache';

      configureCacheModel(asyncLocalStorageModel);
      const length: number = kashe((value: string[]) => value.length)([]);
      export {length};
    `);

    run(process.execPath, '--disallow-code-generation-from-strings', 'consumer.cjs');
    run(process.execPath, '--disallow-code-generation-from-strings', 'consumer.mjs');

    for (const [module, moduleResolution] of [['esnext', 'bundler'], ['node16', 'node16']]) {
        run(
            process.execPath, join(root, 'node_modules/typescript/bin/tsc'),
            '--noEmit', '--strict', '--target', 'es2020',
            '--module', module, '--moduleResolution', moduleResolution, 'consumer.ts',
        );
    }

    console.log('package: CommonJS, ES modules and types consume the tarball');
} finally {
    rmSync(dir, {recursive: true, force: true});
}
