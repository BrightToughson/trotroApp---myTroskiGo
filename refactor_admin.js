const fs = require('fs');
const path = require('path');

const appDir = path.join(__dirname, 'app');
const adminDir = path.join(appDir, '(admin)');

if (!fs.existsSync(adminDir)) {
    fs.mkdirSync(adminDir);
}

const filesToMove = [
    'admin.tsx',
    'contributions-manager.tsx',
    'fare-manager.tsx',
    'pulse-manager.tsx'
];

filesToMove.forEach(file => {
    const oldPath = path.join(appDir, file);
    const newPath = path.join(adminDir, file);
    
    if (fs.existsSync(oldPath)) {
        let content = fs.readFileSync(oldPath, 'utf8');
        
        // Update relative imports: '../' becomes '../../'
        content = content.replace(/(from|import)\s+(['"])(\.\.\/)/g, (match, p1, p2, p3) => {
            return `${p1} ${p2}../${p3}`;
        });
        
        // Also replace require('../xxx')
        content = content.replace(/require\s*\(\s*(['"])(\.\.\/)/g, (match, p1, p2) => {
            return `require(${p1}../${p2}`;
        });
        
        fs.writeFileSync(newPath, content, 'utf8');
        fs.unlinkSync(oldPath);
    }
});

console.log('Moved managers to (admin) folder!');
