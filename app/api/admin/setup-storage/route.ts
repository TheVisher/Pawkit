/**
 * One-time admin endpoint to create the card-images storage bucket
 * Call once: POST /api/admin/setup-storage
 *
 * Requires authenticated user (admin operations use service role internally)
 */

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { handleApiError } from '@/lib/utils/api-error';
import { success, unauthorized } from '@/lib/utils/api-responses';
import { getCurrentUser } from '@/lib/auth/get-user';

export async function POST() {
  let user;
  try {
    // Block in production - admin endpoints should only run in development
    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json(
        { error: 'Admin endpoints disabled in production', code: 'FORBIDDEN' },
        { status: 403 }
      );
    }

    // Require authentication for admin endpoints
    user = await getCurrentUser();
    if (!user) {
      return unauthorized();
    }

    // Use service role key if available for admin operations
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

    const supabase = createClient(supabaseUrl, supabaseKey);

    const BUCKET_NAME = 'card-images';

    // Check if bucket exists
    const { data: buckets, error: listError } = await supabase.storage.listBuckets();

    if (listError) {
      return NextResponse.json(
        { error: 'Failed to list buckets', code: 'STORAGE_ERROR', details: listError },
        { status: 500 }
      );
    }

    const bucketExists = buckets?.some(b => b.name === BUCKET_NAME);

    if (bucketExists) {
      return success({ message: 'Bucket already exists', bucket: BUCKET_NAME });
    }

    // Create the bucket
    const { data, error } = await supabase.storage.createBucket(BUCKET_NAME, {
      public: true,
      fileSizeLimit: 10485760, // 10MB
      allowedMimeTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml']
    });

    if (error) {
      return NextResponse.json(
        { error: 'Failed to create bucket', code: 'STORAGE_ERROR', details: error },
        { status: 500 }
      );
    }

    return success({
      message: 'Bucket created successfully',
      bucket: BUCKET_NAME,
      data
    });

  } catch (error) {
    return handleApiError(error, { route: '/api/admin/setup-storage', userId: user?.id });
  }
}
