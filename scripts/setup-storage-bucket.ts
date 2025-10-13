/**
 * One-time script to create the card-images storage bucket in Supabase
 * Run with: npx tsx scripts/setup-storage-bucket.ts
 */

import { supabase } from '../lib/server/supabase';

async function setupStorageBucket() {
  const BUCKET_NAME = 'card-images';

  console.log('Setting up Supabase Storage bucket:', BUCKET_NAME);

  // Check if bucket exists
  const { data: buckets, error: listError } = await supabase.storage.listBuckets();

  if (listError) {
    console.error('Error listing buckets:', listError);
    return;
  }

  const bucketExists = buckets?.some(b => b.name === BUCKET_NAME);

  if (bucketExists) {
    console.log('✅ Bucket already exists:', BUCKET_NAME);
    return;
  }

  // Create the bucket
  const { data, error } = await supabase.storage.createBucket(BUCKET_NAME, {
    public: true, // Make images publicly accessible
    fileSizeLimit: 10485760, // 10MB max file size
    allowedMimeTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml']
  });

  if (error) {
    console.error('❌ Error creating bucket:', error);
    return;
  }

  console.log('✅ Bucket created successfully:', data);
  console.log('\nNext steps:');
  console.log('1. Go to Supabase Dashboard > Storage > card-images');
  console.log('2. Verify the bucket is public and accessible');
}

setupStorageBucket().catch(console.error);
