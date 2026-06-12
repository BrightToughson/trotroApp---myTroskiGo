const fs = require('fs');
const path = require('path');
const https = require('https');

const OVERPASS_URL = 'https://overpass-api.de/api/interpreter';
const outputPath = path.join(__dirname, '..', 'osrm routes', 'Accra', 'AccraAnchorRoutes.json');

// Bounding boxes representing a grid covering the entirety of Ghana.
// Ghana lies between latitudes 4.7°N and 11.2°N, and longitudes 3.3°W and 1.2°E.
// We split this area into an 8-box grid to avoid hitting Overpass API size/timeout limits.
const GHANA_GRID = [
  { name: "South-West Ghana (inc. Western/Central)", bbox: "4.5,-3.5,6.5,-1.0" },
  { name: "South-East Ghana (inc. Greater Accra/Volta/Eastern)", bbox: "4.5,-1.0,6.5,1.5" },
  { name: "Mid-South-West Ghana (inc. Ashanti/Kumasi)", bbox: "6.5,-3.5,8.0,-1.0" },
  { name: "Mid-South-East Ghana (inc. Bono/Eastern)", bbox: "6.5,-1.0,8.0,1.5" },
  { name: "Mid-North-West Ghana (inc. Savannah)", bbox: "8.0,-3.5,9.5,-1.0" },
  { name: "Mid-North-East Ghana (inc. Northern/Tamale)", bbox: "8.0,-1.0,9.5,1.5" },
  { name: "North-West Ghana (inc. Upper West)", bbox: "9.5,-3.5,11.5,-1.0" },
  { name: "North-East Ghana (inc. Upper East)", bbox: "9.5,-1.0,11.5,1.5" }
];

async function fetchBBoxData(gridCell) {
    const query = `
    [out:json][timeout:180];
    (
      relation["route"="share_taxi"](${gridCell.bbox});
      relation["route"="bus"](${gridCell.bbox});
      relation["route"="minibus"](${gridCell.bbox});
      relation["route"="matatu"](${gridCell.bbox});
    );
    out geom;
    `;

    return new Promise((resolve, reject) => {
        const req = https.request(OVERPASS_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'User-Agent': 'TrotroApp-DataFetcher/2.0'
            }
        }, (res) => {
            let data = '';

            res.on('data', (chunk) => {
                data += chunk;
            });

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

        req.on('error', (e) => {
            reject(e);
        });

        req.write(`data=${encodeURIComponent(query)}`);
        req.end();
    });
}

function stitchWays(ways) {
    if (!ways || ways.length === 0) return [];
    
    // Copy ways so we can mutate
    let remaining = ways.map(w => [...w]);
    
    // Start with the longest way to maximize chance of it being the main trunk
    remaining.sort((a, b) => b.length - a.length);
    let stitched = remaining.shift();
    
    while (remaining.length > 0) {
        const startPt = stitched[0];
        const endPt = stitched[stitched.length - 1];
        
        let bestMatchIndex = -1;
        let bestMatchDist = Infinity;
        let bestMatchType = ''; // 'end-start', 'end-end', 'start-end', 'start-start'

        for (let i = 0; i < remaining.length; i++) {
            const way = remaining[i];
            const wStart = way[0];
            const wEnd = way[way.length - 1];
            
            // Calculate Pythagorean distance (sufficient for small comparisons)
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

        // Stitch the way based on the closest endpoints
        if (bestMatchType === 'end-start') {
            // Drop the first point if it's extremely close to avoid duplicates, but it's safe to just append
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
    console.log(`\nParsing geometry for ${relations.length} unique transit routes...`);

    const routes = [];

    for (const rel of relations) {
        let origin = rel.tags.from || "Unknown Origin";
        let destination = rel.tags.to || "Unknown Destination";
        let fare = rel.tags.charge || rel.tags.fare || null;
        
        // Fallback: Parse the name tag (e.g., "Madina - Lapaz")
        if (origin === "Unknown Origin" && destination === "Unknown Destination" && rel.tags.name) {
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
            routes.push({
                origin,
                destination,
                fare,
                waypoints
            });
        }
    }

    return routes;
}

async function main() {
    console.log("=================================================");
    console.log("Ghana-Wide Trotro OSM Route Fetcher (Grid Chunked)");
    console.log("=================================================\n");

    const mergedElementsMap = new Map();

    for (let i = 0; i < GHANA_GRID.length; i++) {
        const cell = GHANA_GRID[i];
        console.log(`[${i + 1}/${GHANA_GRID.length}] Fetching ${cell.name}...`);
        
        try {
            const elements = await fetchBBoxData(cell);
            let newCount = 0;
            for (const el of elements) {
                if (!mergedElementsMap.has(el.id)) {
                    mergedElementsMap.set(el.id, el);
                    newCount++;
                }
            }
            console.log(`   -> Successfully fetched! Added ${newCount} new unique elements. Total accumulated: ${mergedElementsMap.size}`);
        } catch (error) {
            console.error(`   [Error] Failed to fetch ${cell.name}: ${error.message}`);
        }

        // Add a 3-second delay between queries to respect Overpass API rate-limits
        if (i < GHANA_GRID.length - 1) {
            console.log("   Waiting 3 seconds before next query...");
            await new Promise(r => setTimeout(r, 3000));
        }
    }

    const allElements = Array.from(mergedElementsMap.values());
    console.log(`\nGrid fetch complete. Merged ${allElements.length} unique elements.`);

    const cleanedRoutes = processMergedElements(allElements);

    console.log(`Writing ${cleanedRoutes.length} clean continuous routes to ${outputPath}...`);
    fs.writeFileSync(outputPath, JSON.stringify(cleanedRoutes, null, 2), 'utf-8');
    
    console.log("\nSuccess! anchorRoutes.json has been replaced with accurate Ghana-wide OSM data.");
}

main();
