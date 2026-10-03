import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {cp,mkdir,writeFile,rm} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('..',import.meta.url));
const run=promisify(execFile);
await rm(new URL('../.build',import.meta.url),{recursive:true,force:true});
for (const [script,args] of [['node_modules/typescript/bin/tsc',[]],['node_modules/vite/bin/vite.js',['build']]]) {
  const result=await run(process.execPath,[script,...args],{cwd:root,maxBuffer:10*1024*1024});
  if(result.stdout)process.stdout.write(result.stdout);
  if(result.stderr)process.stderr.write(result.stderr);
}
await mkdir(new URL('../dist/lib',import.meta.url),{recursive:true});
await cp(new URL('../.build/shared/bookmarks.js',import.meta.url),new URL('../dist/lib/bookmarks.mjs',import.meta.url));
await cp(new URL('../.build/shared/types.js',import.meta.url),new URL('../dist/lib/types.js',import.meta.url));
await writeFile(new URL('../dist/_headers',import.meta.url),"/*\n  X-Content-Type-Options: nosniff\n  Referrer-Policy: no-referrer\n  Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' https: data:; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'\n");
console.log('Built React client and TypeScript Node service. No private data included.');
