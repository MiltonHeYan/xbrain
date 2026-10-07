// Uses a built-in image_gen artwork and exact, unmodified brand SVG paths.
// Run: NODE_PATH=/path/to/resvg/node_modules node docs/assets/hero/compose-hero-v2.cjs
const fs=require('node:fs');const path=require('node:path');const {Resvg}=require('@resvg/resvg-js');
const root=__dirname;
function logo(file,x,y,size){const s=fs.readFileSync(path.join(root,file),'utf8');const view=s.match(/viewBox="([^"]+)"/)[1];const fill=s.match(/<svg[^>]*fill="([^"]+)"/)[1];const body=s.slice(s.indexOf('>')+1,s.lastIndexOf('</svg>'));return `<svg x="${x}" y="${y}" width="${size}" height="${size}" viewBox="${view}" fill="${fill}">${body}</svg>`;}
const art=fs.readFileSync(path.join(root,'hero-v2-generated.png')).toString('base64');
const text=(x,y,s,size,weight=400)=>`<text x="${x}" y="${y}" font-family="Arial" font-size="${size}" font-weight="${weight}" fill="#111">${s}</text>`;
const svg=`<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="1536" height="1024" viewBox="0 0 1536 1024"><rect width="1536" height="1024" fill="white"/><image width="1536" height="1024" xlink:href="data:image/png;base64,${art}"/>
<rect x="0" y="0" width="1536" height="170" fill="white"/>
${text(64,54,'xrecall',28,700)}${text(64,128,'Your bookmarks. Ready for real work.',56,700)}
<rect x="237" y="499" width="76" height="76" rx="2" fill="black"/>${logo('x-official.svg',252,514,46)}
${logo('../agents/cursor.svg',1237,528,40)}${logo('../agents/openai.svg',1349,528,40)}
<rect x="0" y="875" width="1536" height="149" fill="white"/>
${text(135,936,'Save',42,700)}${text(608,936,'Distill locally',42,700)}${text(1130,936,'Recall &amp; cite',42,700)}
${text(370,998,'Local by default · Agent-led · Original sources kept',26)}
</svg>`;
fs.writeFileSync(path.join(root,'xrecall-hero-v2.png'),new Resvg(svg,{font:{loadSystemFonts:true,defaultFontFamily:'Arial'}}).render().asPng());
