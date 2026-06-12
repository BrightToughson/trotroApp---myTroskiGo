const fs = require('fs');
const path = require('path');
const https = require('https');

const OVERPASS_URL = 'https://overpass-api.de/api/interpreter';

const REGIONS = [
  { folder: 'Ahafo', osmName: 'Ahafo Region' },
  { folder: 'Ashanti', osmName: 'Ashanti Region' },
  { folder: 'Bono', osmName: 'Bono Region' },
  { folder: 'BonoEast', osmName: 'Bono East Region' },
  { folder: 'Central', osmName: 'Central Region' },
  { folder: 'Eastern', osmName: 'Eastern Region' },
  { folder: 'Accra', osmName: 'Greater Accra Region' },
  { folder: 'NorthEast', osmName: 'North East Region' },
  { folder: 'Northern', osmName: 'Northern Region' },
  { folder: 'Oti', osmName: 'Oti Region' },
  { folder: 'Savannah', osmName: 'Savannah Region' },
  { folder: 'UpperEast', osmName: 'Upper East Region' },
  { folder: 'UpperWest', osmName: 'Upper West Region' },
  { folder: 'Volta', osmName: 'Volta Region' },
  { folder: 'Western', osmName: 'Western Region' },
  { folder: 'WesternNorth', osmName: 'Western North Region' }
];

// Helper to fetch data
async function fetchOverpassData(query) {
    return new Promise((resolve, reject) => {
        const req = https.request(OVERPASS_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'User-Agent': 'TrotroApp-DataFetcher/3.0'
            }
        }, (res) => {
            let data = '';
            res.on('data', (chunk) => { data += chunk; });
            res.on('end', () => {
                if (res.statusCode !== 200) {
                    reject(new Error(`Status ${res.statusCode}: ${data.substring(0, 100)}`));
                    return;
                }
                try {
                    const jsonData = JSON.parse(data);
                    resolve(jsonData.elements || []);
                } catch (e) {
                    reject(new Error(`JSON Parse Error: ${e.message}`));
                }
            });
        });
        req.on('error', (e) => reject(e));
        req.write(`data=${encodeURIComponent(query)}`);
        req.end();
    });
}

// Geometry stitching function
function stitchWays(ways) {
    if (!ways || ways.length === 0) return [];
    let remaining = ways.map(w => [...w]);
    remaining.sort((a, b) => b.length - a.length);
    let stitched = remaining.shift();
    
    while (remaining.length > 0) {
        const startPt = stitched[0];
        const endPt = stitched[stitched.length - 1];
        
        let bestMatchIndex = -1;
        let bestMatchDist = Infinity;
        let bestMatchType = ''; 

        for (let i = 0; i < remaining.length; i++) {
            const way = remaining[i];
            const wStart = way[0];
            const wEnd = way[way.length - 1];
            
            const distEndStart = Math.hypot(endPt.lat - wStart.lat, endPt.lon - wStart.lon);
            const distEndEnd = Math.hypot(endPt.lat - wEnd.lat, endPt.lon - wEnd.lon);
            const distStartEnd = Math.hypot(startPt.lat - wEnd.lat, startPt.lon - wEnd.lon);
            const distStartStart = Math.hypot(startPt.lat - wStart.lat, startPt.lon - wStart.lon);

            if (distEndStart < bestMatchDist) { bestMatchDist = distEndStart; bestMatchIndex = i; bestMatchType = 'end-start'; }
            if (distEndEnd < bestMatchDist) { bestMatchDist = distEndEnd; bestMatchIndex = i; bestMatchType = 'end-end'; }
            if (distStartEnd < bestMatchDist) { bestMatchDist = distStartEnd; bestMatchIndex = i; bestMatchType = 'start-end'; }
            if (distStartStart < bestMatchDist) { bestMatchDist = distStartStart; bestMatchIndex = i; bestMatchType = 'start-start'; }
        }

        const way = remaining[bestMatchIndex];
        remaining.splice(bestMatchIndex, 1);

        if (bestMatchType === 'end-start') {
            stitched.push(...way);
        } else if (bestMatchType === 'end-end') {
            stitched.push(...[...way].reverse());
        } else if (bestMatchType === 'start-end') {
            stitched = [...way, ...stitched];
        } else if (bestMatchType === 'start-start') {
            stitched = [...[...way].reverse(), ...stitched];
        }
    }
    return stitched.map(pt => ({ latitude: pt.lat, longitude: pt.lon }));
}

function processMergedElements(elements) {
    const relations = elements.filter(el => el.type === 'relation');
    const routes = [];
    for (const rel of relations) {
        let origin = rel.tags?.from || "Unknown Origin";
        let destination = rel.tags?.to || "Unknown Destination";
        let fare = rel.tags?.charge || rel.tags?.fare || null;
        
        if (origin === "Unknown Origin" && destination === "Unknown Destination" && rel.tags?.name) {
            const parts = rel.tags.name.split('-');
            if (parts.length >= 2) {
                origin = parts[0].trim();
                destination = parts[parts.length - 1].trim();
            } else {
                origin = rel.tags.name;
            }
        }
        if (origin === "Unknown Origin") continue;

        const ways = [];
        if (rel.members && Array.isArray(rel.members)) {
            for (const member of rel.members) {
                if (member.type === 'way' && member.geometry && member.geometry.length > 0) {
                    ways.push(member.geometry);
                }
            }
        }

        const waypoints = stitchWays(ways);
        if (waypoints.length >= 2) {
            routes.push({ origin, destination, fare, waypoints });
        }
    }
    return routes;
}

// Formats stops
function formatStops(elements) {
    const nodes = elements.filter(el => el.type === 'node');
    return nodes.map(node => ({
        name: node.tags?.name || "OpenStreetMap Stop",
        coordinate: {
            latitude: node.lat,
            longitude: node.lon
        },
        address: "OpenStreetMap Stop",
        type: "station",
        isVerified: true
    }));
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function main() {
    console.log("=================================================");
    console.log("Ghana Regional Trotro OSM Route Fetcher");
    console.log("=================================================\n");

    const baseDir = path.join(__dirname, '..', 'osrm routes');

    for (let i = 0; i < REGIONS.length; i++) {
        const region = REGIONS[i];
        console.log(`\n[${i + 1}/${REGIONS.length}] Fetching data for ${region.osmName}...`);

        const stopsFile = path.join(baseDir, region.folder, `osm${region.folder}Stops.json`);
        const routesFile = path.join(baseDir, region.folder, `${region.folder}AnchorRoutes.json`);

        const regionQueryPart = `area["name"="${region.osmName}"]["admin_level"="4"]->.searchArea;`;

        // 1. Fetch Stops
        try {
            console.log(`   -> Fetching stops...`);
            const stopsQuery = `[out:json][timeout:180]; ${regionQueryPart} node["highway"="bus_stop"](area.searchArea); out geom;`;
            const elements = await fetchOverpassData(stopsQuery);
            const stops = formatStops(elements);
            fs.writeFileSync(stopsFile, JSON.stringify(stops, null, 2), 'utf-8');
            console.log(`      Found ${stops.length} stops.`);
        } catch (e) {
            console.error(`   [Error] Stops fetch failed: ${e.message}`);
        }

        await sleep(3000); // Sleep 3 seconds

        // 2. Fetch Routes
        try {
            console.log(`   -> Fetching transit routes...`);
            const routesQuery = `[out:json][timeout:180]; ${regionQueryPart} (relation["route"="share_taxi"](area.searchArea); relation["route"="bus"](area.searchArea); relation["route"="minibus"](area.searchArea); relation["route"="matatu"](area.searchArea);); out geom;`;
            const elements = await fetchOverpassData(routesQuery);
            const routes = processMergedElements(elements);
            fs.writeFileSync(routesFile, JSON.stringify(routes, null, 2), 'utf-8');
            console.log(`      Found ${routes.length} stitched transit routes.`);
        } catch (e) {
            console.error(`   [Error] Routes fetch failed: ${e.message}`);
        }

        // Sleep 5 seconds before next region to avoid API limits
        if (i < REGIONS.length - 1) {
            console.log("   Waiting 5 seconds before next region...");
            await sleep(5000);
        }
    }

    console.log("\nSuccess! All regions processed.");
}

main();
