const fs = require('fs');
const path = require('path');

const getAllFiles = (dir, ext) => {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = dir + '/' + file;
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      results = results.concat(getAllFiles(file, ext));
    } else if (file.endsWith(ext) || file.endsWith('.ts')) {
      results.push(file);
    }
  });
  return results;
};

const files = [...getAllFiles('app', '.tsx'), ...getAllFiles('components', '.tsx')];
const usedIcons = new Set();

files.forEach(f => {
  const content = fs.readFileSync(f, 'utf8');
  // Match <WebIcon ... name="icon-name"
  const matches = content.matchAll(/<WebIcon[^>]*name=[\"']([a-zA-Z0-9-]+)[\"']/g);
  for (const match of matches) {
    usedIcons.add(match[1]);
  }
});

const webIconContent = fs.readFileSync('components/WebIcon.tsx', 'utf8');
const svgMapRegex = /\"([a-zA-Z0-9-]+)\":/g;
const svgMapRegex2 = /([a-zA-Z0-9-]+):/g;

const definedIcons = new Set();
let match;
while ((match = svgMapRegex.exec(webIconContent)) !== null) {
  definedIcons.add(match[1]);
}
while ((match = svgMapRegex2.exec(webIconContent)) !== null) {
  definedIcons.add(match[1]);
}

const missingIcons = [...usedIcons].filter(icon => !definedIcons.has(icon));
console.log('MISSING:', missingIcons.join(', '));
