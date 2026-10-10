import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const distDir = path.join(rootDir, 'dist');
const requiredFiles = [
  'index.html',
  'main.js',
  'cube.js',
  'cube-solver.js',
  'assets/vendor/cubejs.js',
  'styles/main.css',
  'styles/timer.css',
  'styles/cube.css',
  'vendor/three/build/three.module.js',
  'vendor/three/examples/jsm/controls/OrbitControls.js'
];

for (const file of requiredFiles) {
  if (!fs.existsSync(path.join(distDir, file))) {
    throw new Error(`Production output is missing required file: dist/${file}`);
  }
}

const html = fs.readFileSync(path.join(distDir, 'index.html'), 'utf8');
if (!html.includes('src="./main.js"')) {
  throw new Error('Production HTML does not load ./main.js.');
}
if (html.includes('./dist/main.js') || html.includes('./node_modules/')) {
  throw new Error('Production HTML contains a development-only asset path.');
}

const solverModule = fs.readFileSync(path.join(distDir, 'cube-solver.js'), 'utf8');
if (!solverModule.includes("'./assets/vendor/cubejs.js'")) {
  throw new Error('The cube solver vendor import is not rooted in the production output.');
}

console.log(`Validated ${requiredFiles.length} required production files and browser entry paths.`);