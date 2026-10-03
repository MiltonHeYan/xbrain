import {cp,mkdir,rm,writeFile} from 'node:fs/promises';
await rm('dist',{recursive:true,force:true});await mkdir('dist/lib',{recursive:true});await cp('public','dist',{recursive:true});await cp('lib/bookmarks.mjs','dist/lib/bookmarks.mjs');
await writeFile('dist/_headers','/*\n  X-Content-Type-Options: nosniff\n  Referrer-Policy: no-referrer\n  Content-Security-Policy: default-src \'self\'; script-src \'self\'; style-src \'self\' \'unsafe-inline\'; img-src \'self\' https: http: data:; connect-src \'self\'; object-src \'none\'; base-uri \'none\'\n');
console.log('Static demo built in dist/ (synthetic content only).');
