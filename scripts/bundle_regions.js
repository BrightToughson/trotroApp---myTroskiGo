const fs = require('fs');
const path = require('path');

const baseDir = path.join(__dirname, '..', 'osrm routes');
const outputStopsPath = path.join(baseDir, 'allStops.json');
const outputRoutesPath = path.join(baseDir, 'allAnchorRoutes.json');

const allStops = [];
const allRoutes = [];

console.log("Bundling regional data...");

try {
    const items = fs.readdirSync(baseDir);
    
    for (const item of items) {
        const itemPath = path.join(baseDir, item);
        
        if (fs.statSync(itemPath).isDirectory()) {
            console.log(`Processing region: ${item}`);
            
            // Expected file names based on our structure
            const stopsFile = path.join(itemPath, `osm${item}Stops.json`);
            const routesFile = path.join(itemPath, `${item}AnchorRoutes.json`);
            
            if (fs.existsSync(stopsFile)) {
                try {
                    const stopsData = JSON.parse(fs.readFileSync(stopsFile, 'utf-8'));
                    if (Array.isArray(stopsData)) {
                        // Tag each stop with its source region
                        const taggedStops = stopsData.map(stop => ({
                            ...stop,
                            region: item
                        }));
                        allStops.push(...taggedStops);
                        console.log(`  - Added ${stopsData.length} stops.`);
                    }
                } catch(e) {
                    console.error(`  - Error reading stops for ${item}: ${e.message}`);
                }
            }
            
            if (fs.existsSync(routesFile)) {
                try {
                    const routesData = JSON.parse(fs.readFileSync(routesFile, 'utf-8'));
                    if (Array.isArray(routesData)) {
                        allRoutes.push(...routesData);
                        console.log(`  - Added ${routesData.length} routes.`);
                    }
                } catch(e) {
                    console.error(`  - Error reading routes for ${item}: ${e.message}`);
                }
            }
        }
    }
    
    // Format stops as GeoJSON
    const finalStopsGeoJSON = {
        type: 'FeatureCollection',
        features: allStops.map((s, index) => ({
            type: 'Feature',
            id: index,
            properties: { 
                name: s.name,
                region: s.region
            },
            geometry: {
                type: 'Point',
                coordinates: [s.coordinate.longitude, s.coordinate.latitude]
            }
        }))
    };
    
    fs.writeFileSync(outputStopsPath, JSON.stringify(finalStopsGeoJSON, null, 2), 'utf-8');
    fs.writeFileSync(outputRoutesPath, JSON.stringify(allRoutes, null, 2), 'utf-8');
    console.log(`Bundle complete! Wrote ${finalStopsGeoJSON.features.length} stops and ${allRoutes.length} routes.`);
} catch(err) {
    console.error("Bundling failed:", err);
}
