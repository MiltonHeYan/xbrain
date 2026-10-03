// Compatibility entrypoint: real React components, DOM simulation (not visual QA).
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const args=['run'];
if(process.argv[2])args.push('--reporter=json','--outputFile='+process.argv[2]);
const result=spawnSync(process.execPath,['node_modules/vitest/vitest.mjs',...args],{cwd:fileURLToPath(new URL('..',import.meta.url)),stdio:'inherit'});
process.exitCode=result.status??1;
