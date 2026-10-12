// Optional maintenance helper. No build is required to run TravelHub.
const fs = require('node:fs');
const path = require('node:path');
const base = path.resolve(__dirname, '..');
const index = fs.readFileSync(path.join(base, 'index.html'), 'utf8');
const start = index.indexOf('<div id="arrival-guide"');
const end = index.indexOf('\n        </section>', start);
if (start < 0 || end < 0) throw new Error('Arrival guide not found');
const guide = index.slice(start, end)
  .replace('class="arrival-guide"', 'class="arrival-guide" data-offline')
  .replace(/<a\b[^>]*data-offline-download[^>]*>[\s\S]*?<\/a>/, '')
  .replace('Baixe e abra o arquivo HTML antes de viajar.', 'Este é o guia offline. Guarde este arquivo no celular e abra-o no navegador.');
const css = fs.readFileSync(path.join(base, 'assets/css/transportes.css'), 'utf8');
const js = fs.readFileSync(path.join(base, 'assets/js/transportes.js'), 'utf8');
const html = `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>TravelHub — Chegada ao Japão · offline</title><style>
:root{color-scheme:light;--bg:#f3f5f9;--panel:#fff;--panel-2:#f5f6f9;--line:#dfe3eb;--text:#202432;--muted:#666d7b;--blue:#4263d9;--blue-bright:#3155d4;--font:system-ui,sans-serif;--display:system-ui,sans-serif}
@media(prefers-color-scheme:dark){:root{color-scheme:dark;--bg:#101114;--panel:#17191d;--panel-2:#1b1d22;--line:#282a30;--text:#ececf0;--muted:#8c8d97;--blue:#6485ff;--blue-bright:#7894ff}}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--text);font:15px var(--font)}main{max-width:1000px;padding:24px 14px;margin:auto}button,input{font:inherit}
${css}</style></head><body><main>${guide}</main><script>${js.replace(/<\/script/gi, '<\\/script')}</script></body></html>\n`;
fs.writeFileSync(path.join(base, 'chegada-japao-offline.html'), html, 'utf8');
console.log('Generated chegada-japao-offline.html');
