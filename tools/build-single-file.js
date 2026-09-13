import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(new URL('..', import.meta.url).pathname);
const outputPath = path.join(root, 'downloadable', 'DagerHunter-PC.html');

const moduleOrder = [
  'src/core/utils.js',
  'src/data/content.js',
  'src/core/save-system.js',
  'src/core/audio.js',
  'src/core/input.js',
  'src/systems/procedural-forest.js',
  'src/entities/entities.js',
  'src/ui/ui.js',
  'src/game.js',
  'src/main.js'
];

function transformModule(filePath, code) {
  return code
    .replace(/^import[\s\S]*?from\s+['"][^'"]+['"];\s*/gm, '')
    .replace(/^export\s+(const|let|var|function|class)\s+/gm, '$1 ')
    .replace(/^export\s*\{[^}]+\};\s*/gm, '')
    .replace(/\/\/#[ \t]sourceMappingURL=.*$/gm, '')
    .trim() + `\n\n// End ${filePath}\n`;
}

const css = fs.readFileSync(path.join(root, 'styles.css'), 'utf8');
const js = moduleOrder
  .map((file) => {
    const full = path.join(root, file);
    const source = fs.readFileSync(full, 'utf8');
    return `// Begin ${file}\n${transformModule(file, source)}`;
  })
  .join('\n');

const shell = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const bodyMatch = shell.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
const body = bodyMatch ? bodyMatch[1].replace(/<script[\s\S]*?<\/script>/gi, '').trim() : '';

const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover" />
    <meta name="theme-color" content="#170b25" />
    <meta name="description" content="Dager Hunter - offline PC/Android single-file build" />
    <title>Dager Hunter PC</title>
    <style>
${css}
    </style>
  </head>
  <body>
${body}
    <script>
window.__DAGER_HUNTER_SINGLE_FILE__ = true;
(function () {
'use strict';
${js.replace(/<\/script/gi, '<\\/script')}
})();
    </script>
  </body>
</html>
`;

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, html);
console.log(`Wrote ${path.relative(root, outputPath)} (${Math.round(html.length / 1024)} KB)`);
