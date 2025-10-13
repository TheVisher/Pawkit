/**
 * One-time admin endpoint to create the card-images storage bucket
 * Call once: POST /api/admin/setup-storage
 */

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST() {
  try {
    // Use service role key if available for admin operations
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

    const supabase = createClient(supabaseUrl, supabaseKey);

    const BUCKET_NAME = 'card-images';

    // Check if bucket exists
    const { data: buckets, error: listError } = await supabase.storage.listBuckets();

    if (listError) {
      return NextResponse.json({ error: 'Failed to list buckets', details: listError }, { status: 500 });
    }

    const bucketExists = buckets?.some(b => b.name === BUCKET_NAME);

    if (bucketExists) {
      return NextResponse.json({ message: 'Bucket already exists', bucket: BUCKET_NAME });
    }

    // Create the bucket
    const { data, error } = await supabase.storage.createBucket(BUCKET_NAME, {
      public: true,
      fileSizeLimit: 10485760, // 10MB
      allowedMimeTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml']
    });

    if (error) {
      return NextResponse.json({ error: 'Failed to create bucket', details: error }, { status: 500 });
    }

    return NextResponse.json({
      message: 'Bucket created successfully',
      bucket: BUCKET_NAME,
      data
    });

  } catch (error) {
    return NextResponse.json({ error: 'Unexpected error', details: error }, { status: 500 });
  }
}
