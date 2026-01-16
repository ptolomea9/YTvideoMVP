/**
 * Uploads the circle mask PNG to Supabase storage.
 * Run with: node scripts/upload-circle-mask.js
 *
 * Prerequisites:
 * - NEXT_PUBLIC_SUPABASE_URL in .env.local
 * - SUPABASE_SERVICE_ROLE_KEY in .env.local
 * - 'assets' bucket created in Supabase Storage (or use existing 'listing-images')
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

async function uploadCircleMask() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    console.error('Make sure these are set in .env.local');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  const filePath = path.join(__dirname, '..', 'public', 'circle-mask.png');

  if (!fs.existsSync(filePath)) {
    console.error('Circle mask not found. Run: node scripts/create-circle-mask.js first');
    process.exit(1);
  }

  const fileBuffer = fs.readFileSync(filePath);
  const fileName = 'assets/circle-mask.png';

  // Try 'listing-images' bucket first (we know it exists from the code)
  const bucketName = 'listing-images';

  console.log(`Uploading to ${bucketName}/${fileName}...`);

  const { data, error } = await supabase.storage
    .from(bucketName)
    .upload(fileName, fileBuffer, {
      contentType: 'image/png',
      upsert: true, // Overwrite if exists
    });

  if (error) {
    console.error('Upload failed:', error.message);
    process.exit(1);
  }

  // Get public URL
  const { data: urlData } = supabase.storage
    .from(bucketName)
    .getPublicUrl(fileName);

  console.log('\nSuccess! Circle mask uploaded.');
  console.log('\nPublic URL:');
  console.log(urlData.publicUrl);
  console.log('\nUse this URL in the n8n workflow for the headshot mask property.');
}

uploadCircleMask().catch(console.error);
