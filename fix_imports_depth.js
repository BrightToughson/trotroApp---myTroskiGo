const fs = require('fs');
const path = require('path');

const rootDir = __dirname;

function getAllFiles(dirPath, arrayOfFiles) {
    if (!fs.existsSync(dirPath)) return arrayOfFiles || [];
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
    ...getAllFiles(path.join(rootDir, 'hooks')),
    ...getAllFiles(path.join(rootDir, 'constants')),
    ...getAllFiles(path.join(rootDir, '__tests__')),
    ...getAllFiles(path.join(rootDir, 'lib'))
];

const importRegex = /(['"])(\.\.\/)+lib\/(.*?)(['"])/g;

allFilesToUpdate.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    let modified = false;
    
    content = content.replace(importRegex, (match, p1, p2, p3, p4) => {
        const targetPath = path.join(rootDir, 'lib', p3);
        let relativePath = path.relative(path.dirname(file), targetPath).replace(/\\/g, '/');
        if (!relativePath.startsWith('.')) {
            relativePath = './' + relativePath;
        }
        modified = true;
        return `${p1}${relativePath}${p4}`;
    });
    
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
    
    for (const [oldName, newName] of Object.entries(mapping)) {
        const aliasRegex = new RegExp(`(['"])@/lib/${oldName}(['"])`, 'g');
        if (aliasRegex.test(content)) {
            content = content.replace(aliasRegex, `$1@/lib/${newName}$2`);
            modified = true;
        }
    }
    
    if (modified) {
        fs.writeFileSync(file, content, 'utf8');
        console.log(`Updated ${file}`);
    }
});
console.log('Fix complete!');
