const fs = require('fs');
const path = require('path');

const libDir = path.join(__dirname, 'lib');

const files = fs.readdirSync(libDir).filter(f => f.endsWith('.ts') && !f.endsWith('.web.ts') && !f.endsWith('.d.ts'));

files.forEach(file => {
    const stat = fs.statSync(path.join(libDir, file));
    if (stat.isDirectory()) return;

    const baseName = file.replace('.ts', '');
    const folderPath = path.join(libDir, baseName);
    
    // Create directory if it doesn't exist
    if (!fs.existsSync(folderPath)) {
        fs.mkdirSync(folderPath);
    }
    
    const oldPath = path.join(libDir, file);
    const newPath = path.join(folderPath, 'index.ts');
    
    // Read content
    let content = fs.readFileSync(oldPath, 'utf8');
    
    // Update relative imports
    // Matches: from "./xxx" or from '../xxx'
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
    
    // Check for .web.ts
    const webFile = `${baseName}.web.ts`;
    const oldWebPath = path.join(libDir, webFile);
    if (fs.existsSync(oldWebPath)) {
        const newWebPath = path.join(folderPath, 'index.web.ts');
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

console.log('Refactoring lib complete!');
