const fs = require('fs');
const path = require('path');

const componentsDir = path.join(__dirname, 'components');

const files = fs.readdirSync(componentsDir).filter(f => f.endsWith('.tsx') && !f.endsWith('.web.tsx'));

files.forEach(file => {
    const stat = fs.statSync(path.join(componentsDir, file));
    if (stat.isDirectory()) return;

    const baseName = file.replace('.tsx', '');
    const folderPath = path.join(componentsDir, baseName);
    
    // Create directory if it doesn't exist
    if (!fs.existsSync(folderPath)) {
        fs.mkdirSync(folderPath);
    }
    
    const oldPath = path.join(componentsDir, file);
    const newPath = path.join(folderPath, 'index.tsx');
    
    // Read content
    let content = fs.readFileSync(oldPath, 'utf8');
    
    // Update relative imports
    // Matches: from "./xxx" or from '../xxx' or import "./xxx" etc.
    // Replace: './' with '../' and '../' with '../../'
    content = content.replace(/(from|import)\s+(['"])(\.\.?\/)/g, (match, p1, p2, p3) => {
        const newPrefix = p3.startsWith('..') ? '../../' : '../';
        return `${p1} ${p2}${newPrefix}`;
    });

    // Also update require('./xxx')
    content = content.replace(/require\s*\(\s*(['"])(\.\.?\/)/g, (match, p1, p2) => {
        const newPrefix = p2.startsWith('..') ? '../../' : '../';
        return `require(${p1}${newPrefix}`;
    });
    
    // Write new content to new location
    fs.writeFileSync(newPath, content, 'utf8');
    
    // Delete old file
    fs.unlinkSync(oldPath);
    
    // Check for .web.tsx
    const webFile = `${baseName}.web.tsx`;
    const oldWebPath = path.join(componentsDir, webFile);
    if (fs.existsSync(oldWebPath)) {
        const newWebPath = path.join(folderPath, 'index.web.tsx');
        let webContent = fs.readFileSync(oldWebPath, 'utf8');
        webContent = webContent.replace(/(from|import)\s+(['"])(\.\.?\/)/g, (match, p1, p2, p3) => {
            const newPrefix = p3.startsWith('..') ? '../../' : '../';
            return `${p1} ${p2}${newPrefix}`;
        });
        webContent = webContent.replace(/require\s*\(\s*(['"])(\.\.?\/)/g, (match, p1, p2) => {
            const newPrefix = p2.startsWith('..') ? '../../' : '../';
            return `require(${p1}${newPrefix}`;
        });
        fs.writeFileSync(newWebPath, webContent, 'utf8');
        fs.unlinkSync(oldWebPath);
    }
});

console.log('Refactoring complete!');
