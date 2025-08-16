const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client with service role key for server-side operations
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  throw new Error('Missing required Supabase environment variables');
}

// Create Supabase client with service role key for full access
const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Storage bucket configuration
const BUCKETS = {
  PHOTOS: process.env.PHOTOS_BUCKET || 'photos',
  MENUS: process.env.MENUS_BUCKET || 'menus',
  PRICING: process.env.PRICING_BUCKET || 'pricing'
};

// Validate that buckets exist
async function validateBuckets() {
  try {
    const { data: buckets, error } = await supabase.storage.listBuckets();
    
    if (error) {
      console.error('Error listing buckets:', error);
      return false;
    }

    const bucketNames = buckets.map(bucket => bucket.name);
    const requiredBuckets = Object.values(BUCKETS);
    
    for (const bucket of requiredBuckets) {
      if (!bucketNames.includes(bucket)) {
        console.error(`Required bucket '${bucket}' not found`);
        return false;
      }
    }
    
    console.log('All required buckets validated successfully');
    return true;
  } catch (error) {
    console.error('Error validating buckets:', error);
    return false;
  }
}

module.exports = {
  supabase,
  BUCKETS,
  validateBuckets
};

