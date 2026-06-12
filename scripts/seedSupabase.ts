import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

// Load environment variables from the .env file
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_ANON_KEY in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function seedStops() {
  console.log('\n======================================');
  console.log('📍 Seeding Stops...');
  console.log('======================================');
  
  const stopsPath = path.join(__dirname, '../osrm routes/allStops.json');
  if (!fs.existsSync(stopsPath)) {
    console.log('⚠️ allStops.json not found, skipping.');
    return;
  }

  const rawData = fs.readFileSync(stopsPath, 'utf8');
  const geojson = JSON.parse(rawData);
  const features = geojson.features;

  console.log(`Found ${features.length} stops to upload.`);
  
  // Upload in chunks of 500 to avoid overloading the network
  const batchSize = 500;
  for (let i = 0; i < features.length; i += batchSize) {
    const batch = features.slice(i, i + batchSize).map((f: any) => ({
      original_id: f.id,
      name: f.properties.name,
      region: f.properties.region,
      longitude: f.geometry.coordinates[0],
      latitude: f.geometry.coordinates[1],
      // PostGIS spatial point creation
      geom: `SRID=4326;POINT(${f.geometry.coordinates[0]} ${f.geometry.coordinates[1]})` 
    }));

    const { error } = await supabase.from('stops').insert(batch);
    if (error) {
      console.error(`❌ Error inserting stops batch ${i}:`, error.message);
    } else {
      console.log(`✅ Successfully uploaded stops ${i} to ${Math.min(i + batchSize, features.length)}`);
    }
  }
  console.log('🎉 Finished uploading stops!');
}

async function seedRoutes() {
  console.log('\n======================================');
  console.log('🗺️  Seeding OSRM Routes...');
  console.log('======================================');
  
  const routesPath = path.join(__dirname, '../osrm routes/allAnchorRoutes.json');
  if (!fs.existsSync(routesPath)) {
    console.log('⚠️ allAnchorRoutes.json not found, skipping.');
    return;
  }

  const rawData = fs.readFileSync(routesPath, 'utf8');
  const routes = JSON.parse(rawData);

  console.log(`Found ${routes.length} routes to upload.`);
  
  // Upload in smaller chunks because route data is huge (15MB file)
  const batchSize = 50; 
  for (let i = 0; i < routes.length; i += batchSize) {
    const batch = routes.slice(i, i + batchSize).map((r: any) => ({
      origin: r.origin,
      destination: r.destination,
      fare: r.fare ? parseFloat(r.fare) : null,
      waypoints: r.waypoints // Supabase will natively store this huge array as JSONB
    }));

    const { error } = await supabase.from('routes').insert(batch);
    if (error) {
      console.error(`❌ Error inserting routes batch ${i}:`, error.message);
    } else {
      console.log(`✅ Successfully uploaded routes ${i} to ${Math.min(i + batchSize, routes.length)}`);
    }
  }
  console.log('🎉 Finished uploading routes!');
}

async function run() {
  try {
    await seedStops();
    await seedRoutes();
    console.log('\n🚀 ALL DONE! Data is successfully in Supabase.');
  } catch (error) {
    console.error('Fatal Error:', error);
  }
}

run();
