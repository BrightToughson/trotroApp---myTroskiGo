const fs = require('fs');
const path = require('path');

const rootDir = __dirname;
const libDir = path.join(rootDir, 'lib');

const mapping = {
    'NotificationService': 'notifications/NotificationService',
    'NotificationsWrapper': 'notifications/NotificationsWrapper',
    'auth': 'auth/auth',
    'supabase': 'auth/supabase',
    'SecureStoreWrapper': 'auth/SecureStoreWrapper',
    'i18n': 'i18n/i18n',
    'translate': 'i18n/translate',
    'metrics': 'utils/metrics',
    'polyfills': 'utils/polyfills',
    'LocationService': 'location/LocationService',
    'RouteCacheService': 'location/RouteCacheService',
    'FareService': 'fares/FareService',
    'ContributionService': 'contributions/ContributionService',
    'PulseService': 'pulse/PulseService',
    'HistoryService': 'history/HistoryService'
};

// 1. Move files and delete old folders
for (const [modName, newRelativePath] of Object.entries(mapping)) {
    const oldDir = path.join(libDir, modName);
    const oldFile = path.join(oldDir, 'index.ts');
    
    if (fs.existsSync(oldFile)) {
        const newFile = path.join(libDir, `${newRelativePath}.ts`);
        const newDir = path.dirname(newFile);
        
        if (!fs.existsSync(newDir)) {
            fs.mkdirSync(newDir, { recursive: true });
        }
        
        fs.renameSync(oldFile, newFile);
        
        // Also check for .web.ts
        const oldWebFile = path.join(oldDir, 'index.web.ts');
        if (fs.existsSync(oldWebFile)) {
            fs.renameSync(oldWebFile, path.join(libDir, `${newRelativePath}.web.ts`));
        }
        
        try {
            fs.rmdirSync(oldDir); // Should be empty now
        } catch(e) {}
    }
}

// 2. Update imports across app, components, lib
function getAllFiles(dirPath, arrayOfFiles) {
    const files = fs.readdirSync(dirPath);
    arrayOfFiles = arrayOfFiles || [];
    
    files.forEach(function(file) {
        if (fs.statSync(dirPath + "/" + file).isDirectory()) {
            arrayOfFiles = getAllFiles(dirPath + "/" + file, arrayOfFiles);
        } else {
            if (file.endsWith('.ts') || file.endsWith('.tsx') || file.endsWith('.js')) {
                arrayOfFiles.push(path.join(dirPath, file));
            }
        }
    });
    
    return arrayOfFiles;
}

const allFilesToUpdate = [
    ...getAllFiles(path.join(rootDir, 'app')),
    ...getAllFiles(path.join(rootDir, 'components')),
    ...getAllFiles(path.join(rootDir, 'lib')),
    ...(fs.existsSync(path.join(rootDir, 'hooks')) ? getAllFiles(path.join(rootDir, 'hooks')) : []),
    ...(fs.existsSync(path.join(rootDir, 'constants')) ? getAllFiles(path.join(rootDir, 'constants')) : []),
    ...(fs.existsSync(path.join(rootDir, '__tests__')) ? getAllFiles(path.join(rootDir, '__tests__')) : [])
];

const moduleNames = Object.keys(mapping).join('|');
// Matches `../lib/XXX` or `../../lib/XXX` etc.
const regexFromLib = new RegExp(`(['"])(\\.\\.\\/)+lib\\/(${moduleNames})(['"])`, 'g');
// Matches `../XXX` or `../../XXX` inside the lib folder itself!
const regexInsideLib = new RegExp(`(['"])(\\.\\.\\/)+(${moduleNames})(['"])`, 'g');

allFilesToUpdate.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    let modified = false;
    
    // Replace imports pointing to `lib/XXX`
    if (regexFromLib.test(content)) {
        content = content.replace(regexFromLib, (match, p1, p2, p3, p4) => {
            const newPath = mapping[p3];
            return `${p1}${p2}lib/${newPath}${p4}`;
        });
        modified = true;
    }
    
    // If the file is inside `lib`, also replace imports like `../supabase`
    if (file.includes(path.join(rootDir, 'lib'))) {
        if (regexInsideLib.test(content)) {
            content = content.replace(regexInsideLib, (match, p1, p2, p3, p4) => {
                const newPath = mapping[p3];
                return `${p1}${p2}${newPath}${p4}`;
            });
            modified = true;
        }
    }
    
    if (modified) {
        fs.writeFileSync(file, content, 'utf8');
    }
});

console.log('Execution complete!');
