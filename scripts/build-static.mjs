import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const distDir = path.join(rootDir, 'dist');

const copyDir = (source, target) => {
  fs.mkdirSync(target, { recursive: true });
  for (const entry of fs.readdirSync(source, { withFileTypes: true })) {
    const src = path.join(source, entry.name);
    const dst = path.join(target, entry.name);
    if (entry.isDirectory()) {
      copyDir(src, dst);
    } else {
      fs.copyFileSync(src, dst);
    }
  }
};

const ensureFile = (source, target) => {
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.copyFileSync(source, target);
};

const patchModulePath = (filePath) => {
  const text = fs.readFileSync(filePath, 'utf8');
  const updated = text.replace("../assets/vendor/cubejs.js", "./assets/vendor/cubejs.js");
  if (updated !== text) {
    fs.writeFileSync(filePath, updated, 'utf8');
  }
};

fs.rmSync(distDir, { recursive: true, force: true });

ensureFile(path.join(rootDir, 'index.html'), path.join(distDir, 'index.html'));
copyDir(path.join(rootDir, 'styles'), path.join(distDir, 'styles'));
copyDir(path.join(rootDir, 'assets'), path.join(distDir, 'assets'));

const threeSource = path.join(rootDir, 'node_modules', 'three');
const threeTarget = path.join(distDir, 'vendor', 'three');
if (fs.existsSync(threeSource)) {
  copyDir(path.join(threeSource, 'build'), path.join(threeTarget, 'build'));
  copyDir(path.join(threeSource, 'examples', 'jsm'), path.join(threeTarget, 'examples', 'jsm'));
}

const htmlText = fs.readFileSync(path.join(distDir, 'index.html'), 'utf8');
const adjustedHtml = htmlText.replace(
  '"three": "./node_modules/three/build/three.module.js"',
  '"three": "./vendor/three/build/three.module.js"'
).replace(
  '"three/addons/": "./node_modules/three/examples/jsm/"',
  '"three/addons/": "./vendor/three/examples/jsm/"'
);
fs.writeFileSync(path.join(distDir, 'index.html'), adjustedHtml, 'utf8');

for (const file of fs.readdirSync(distDir)) {
  if (file.endsWith('.js')) {
    patchModulePath(path.join(distDir, file));
  }
}

console.log(`Built static app to ${distDir}`);
