/**
 * One-time script to create the card-images storage bucket in Supabase
 * Run with: npx tsx scripts/setup-storage-bucket.ts
 */

import { supabase } from '../lib/server/supabase';

async function setupStorageBucket() {
  const BUCKET_NAME = 'card-images';


  // Check if bucket exists
  const { data: buckets, error: listError } = await supabase.storage.listBuckets();

  if (listError) {
    return;
  }

  const bucketExists = buckets?.some(b => b.name === BUCKET_NAME);

  if (bucketExists) {
    return;
  }

  // Create the bucket
  const { data, error } = await supabase.storage.createBucket(BUCKET_NAME, {
    public: true, // Make images publicly accessible
    fileSizeLimit: 10485760, // 10MB max file size
    allowedMimeTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml']
  });

  if (error) {
    return;
  }

}

setupStorageBucket().catch(console.error);
