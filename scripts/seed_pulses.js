require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

// We need valid image URLs since the app now expects remote URLs instead of require().
// For the mockup images, I'm mapping them to generic placeholder image URLs or the closest publicly available equivalents.
const MOCK_NEWS = [
  {
    tag: "highway",
    title: "Accra-Kumasi Expressway begins as military clear 17.75km land for project",
    excerpt: "The military has commenced clearing of the 17.75km land for the Accra-Kumasi Expressway project.",
    image_url: "https://cdn.ghanaweb.com/imagelib/pics/838/83884814.jpg",
    color: "#3B82F6",
    url: "https://www.ghanaweb.com/GhanaHomePage/NewsArchive/Accra-Kumasi-Expressway-begins-as-military-clear-17-75km-land-for-project-2033030"
  },
  {
    tag: "safety",
    title: "Public Transportation Safety Measures",
    excerpt: "New safety guidelines have been introduced for all public transport operators.",
    image_url: "https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?q=80&w=1000",
    color: "#10B981",
    url: "https://www.hseblog.com/public-transportation-safety/"
  },
  {
    tag: "expansion",
    title: "Tema Motorway Expansion: Traffic Relief",
    excerpt: "Lane reopens on Accra-Madina road providing major traffic relief for commuters.",
    image_url: "https://images.unsplash.com/photo-1545642412-2592a8310c9c?q=80&w=1000",
    color: "#F59E0B",
    url: "https://www.citinewsroom.com/2026/03/tema-motorway-expansion-traffic-relief-as-lane-reopens-on-accra-madina-road/"
  },
  {
    tag: "contractors",
    title: "Contractors Complete Clearing of Road Alignments",
    excerpt: "The Accra-Kumasi highway dualization is advancing quickly with the clearing of alignments.",
    image_url: "https://images.unsplash.com/photo-1581094794329-c8112a89af12?q=80&w=1000",
    color: "#8B5CF6",
    url: "https://mrh.gov.gh/accra-kumasi-highway-dualization-contractors-complete-clearing-of-road-alignments/"
  },
  {
    tag: "fares",
    title: "New List of Transport Fares",
    excerpt: "Following the GPRTU increment, transport fares have officially been updated.",
    image_url: "https://images.unsplash.com/photo-1580136608260-4eb11f4b24fe?q=80&w=1000",
    color: "#EF4444",
    url: "https://www.myjoyonline.com/new-list-of-transport-fares-following-gprtus-increment/"
  }
];

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase environment variables in .env");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function seed() {
  console.log("Seeding City Pulses...");
  
  for (const pulse of MOCK_NEWS) {
    const { error } = await supabase.from('city_pulses').insert([pulse]);
    if (error) {
      console.error(`Failed to insert pulse: ${pulse.title}`, error);
    } else {
      console.log(`Successfully inserted: ${pulse.title}`);
    }
  }
  
  console.log("Seeding complete!");
}

seed();
