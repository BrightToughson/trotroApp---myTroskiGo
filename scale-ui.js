const fs = require('fs');
const path = require('path');

const targetDirs = [
  path.join(__dirname, 'app'),
  path.join(__dirname, 'components')
];

const MULTIPLIER = 0.85;

const propsToScale = [
  'fontSize', 'lineHeight', 'letterSpacing',
  'padding', 'paddingTop', 'paddingBottom', 'paddingLeft', 'paddingRight', 'paddingHorizontal', 'paddingVertical',
  'margin', 'marginTop', 'marginBottom', 'marginLeft', 'marginRight', 'marginHorizontal', 'marginVertical',
  'width', 'height', 'minWidth', 'minHeight', 'maxWidth', 'maxHeight',
  'borderRadius', 'borderTopLeftRadius', 'borderTopRightRadius', 'borderBottomLeftRadius', 'borderBottomRightRadius',
  'borderWidth', 'gap', 'top', 'bottom', 'left', 'right',
  'size', 'iconSize'
];

function scaleValue(val) {
  let num = parseFloat(val);
  if (isNaN(num)) return val;
  if (num <= 1) return val; 
  
  let newNum = num * MULTIPLIER;
  
  if (Number.isInteger(num)) {
    newNum = Math.round(newNum);
  } else {
    newNum = parseFloat(newNum.toFixed(1));
  }
  
  return newNum.toString();
}

function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let originalContent = content;

  const lines = content.split('\n');
  const propPattern = new RegExp(`\\b(?:${propsToScale.join('|')})\\b`);
  
  for (let i = 0; i < lines.length; i++) {
    if (propPattern.test(lines[i])) {
      let line = lines[i];
      propsToScale.forEach(prop => {
        let pattern = new RegExp(`\\b(${prop})\\s*(:|\\=)\\s*(.*?)([,;}\\n\\r]|$)`, 'g');
        line = line.replace(pattern, (match, p1, sep, valStr, end) => {
          let newValStr = valStr.replace(/\\b([0-9]+(?:\\.[0-9]+)?)\\b(?!%)/g, (numStr) => {
            return scaleValue(numStr);
          });
          return `${p1}${sep} ${newValStr}${end}`;
        });
      });
      lines[i] = line;
    }
  }

  const newContent = lines.join('\n');
  if (newContent !== originalContent) {
    fs.writeFileSync(filePath, newContent, 'utf8');
    console.log(`Updated: ${filePath}`);
  }
}

function walkDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      walkDir(fullPath);
    } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
      processFile(fullPath);
    }
  }
}

targetDirs.forEach(dir => {
  if (fs.existsSync(dir)) {
    walkDir(dir);
  }
});
console.log('Scaling complete.');
