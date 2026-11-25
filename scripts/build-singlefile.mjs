import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import * as esbuild from 'esbuild';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const distDir = path.join(rootDir, 'dist');
const indexPath = path.join(distDir, 'index.html');
const outHtmlPath = path.join(distDir, 'skyward-spike.html');

if (!fs.existsSync(indexPath)) {
  console.error('dist/index.html not found. Run vite build first.');
  process.exit(1);
}

let html = fs.readFileSync(indexPath, 'utf8');

// Build base64 data URLs for all image assets under src/assets/images
const imageReplacements = new Map();
const srcImagesDir = path.join(rootDir, 'src', 'assets', 'images');
if (fs.existsSync(srcImagesDir)) {
  for (const file of fs.readdirSync(srcImagesDir)) {
    const fullPath = path.join(srcImagesDir, file);
    if (!fs.statSync(fullPath).isFile()) continue;
    const ext = path.extname(file).toLowerCase();
    const mime =
      ext === '.png'
        ? 'image/png'
        : ext === '.webp'
        ? 'image/webp'
        : ext === '.svg'
        ? 'image/svg+xml'
        : 'image/jpeg';
    const b64 = fs.readFileSync(fullPath).toString('base64');
    imageReplacements.set(`/src/assets/images/${file}`, `data:${mime};base64,${b64}`);
  }
}

// Inline CSS links pointing to /assets/...
const cssRegex = /<link[^>]+rel="stylesheet"[^>]+href="([^"]+)"[^>]*>/gi;
const inlineStyles = [];
html = html.replace(cssRegex, (fullTag, href) => {
  if (!href.startsWith('/assets/')) return fullTag;
  const cssPath = path.join(distDir, href.replace(/^\//, ''));
  if (!fs.existsSync(cssPath)) return fullTag;
  const cssContent = fs.readFileSync(cssPath, 'utf8').replace(/<\/style/gi, '<\\/style');
  inlineStyles.push(`<style>\n${cssContent}\n</style>`);
  return '';
});

if (inlineStyles.length > 0) {
  const joinedStyles = inlineStyles.join('\n');
  html = html.replace('</head>', () => `${joinedStyles}\n  </head>`);
}

// Inline JS module scripts pointing to /assets/... as classic IIFE scripts so file:// works cleanly
const scriptRegex = /<script[^>]+src="([^"]+)"[^>]*><\/script>/gi;
const inlineScripts = [];
html = html.replace(scriptRegex, (fullTag, src) => {
  if (!src.startsWith('/assets/')) return fullTag;
  const jsPath = path.join(distDir, src.replace(/^\//, ''));
  if (!fs.existsSync(jsPath)) return fullTag;

  let jsContent = fs.readFileSync(jsPath, 'utf8');
  for (const [assetPath, dataUri] of imageReplacements.entries()) {
    jsContent = jsContent.split(assetPath).join(dataUri);
  }

  const transformed = esbuild.transformSync(jsContent, {
    format: 'iife',
    target: 'es2020',
    loader: 'js',
    minify: false,
  });

  const safeJs = transformed.code.replace(/<\/script/gi, '<\\/script');
  inlineScripts.push(`<script>\n${safeJs}\n</script>`);
  return '';
});

if (inlineScripts.length > 0) {
  const joinedScripts = inlineScripts.join('\n');
  html = html.replace('</body>', () => `${joinedScripts}\n  </body>`);
}

fs.writeFileSync(outHtmlPath, html, 'utf8');
const sizeMb = (fs.statSync(outHtmlPath).size / (1024 * 1024)).toFixed(2);
console.log(`Built single-file HTML: ${outHtmlPath} (${sizeMb} MB)`);
