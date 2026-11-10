import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

// The app uses normal dynamic Next routes; /design is still prerendered separately.
// Read this build's design HTML, never a stale out/ export from the prototype.
let html = readFileSync(resolve('.next/server/app/design.html'), 'utf8');
html = html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '');
html = html.replace(/<link\b[^>]*rel="(?:preload|modulepreload)"[^>]*>/gi, '');
html = html.replace(/<link\b[^>]*href="([^\"]+\.css(?:\?[^\"]*)?)"[^>]*>/gi, (_, href) => {
  const css = readFileSync(resolve('.next', href.split('?')[0].replace(/^\/_next\//, '')), 'utf8');
  return `<style>${css}</style>`;
});
html = html.replace(/src="(\/images\/[^\"]+)"/g, (_, path) => {
  const image = readFileSync(resolve('public', path.slice(1))).toString('base64');
  return `src="data:image/jpeg;base64,${image}"`;
});
html = html.replace(/<nav class="mobile-nav">[\s\S]*?<\/nav>/g, '');
html = html.replace('</head>', '<style>.prototype-ribbon a{pointer-events:none}.site-header button{cursor:default}.design-frame{break-inside:avoid}</style></head>');
mkdirSync('exports', { recursive: true });
writeFileSync('exports/roshan-rozgar-design.html', html);
writeFileSync('public/figma-design.html', html);
const summary = {styles: (html.match(/<style>/g) || []).length, embeddedImages: (html.match(/data:image\/jpeg;base64/g) || []).length, runtimeScripts: (html.match(/<script/g) || []).length, frames: (html.match(/class="design-frame"/g) || []).length};
if (summary.styles < 1 || summary.embeddedImages < 3 || summary.runtimeScripts !== 0 || summary.frames !== 5) throw new Error(`Export verification failed: ${JSON.stringify(summary)}`);
console.log(JSON.stringify(summary));
console.log('Created exports/roshan-rozgar-design.html — static screen collection with embedded styles and profile images. Google Fonts requires internet access.');
