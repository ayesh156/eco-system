/**
 * Supabase Storage Service
 * 
 * Handles logo uploads to Supabase Storage bucket.
 * Manages file uploads, deletions, and URL generation.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Environment variables
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
const BUCKET_NAME = 'shop-logos';

// Initialize Supabase client
let supabase: SupabaseClient | null = null;

function getSupabaseClient(): SupabaseClient {
  if (!supabase) {
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      throw new Error('Supabase configuration missing. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
    }
    supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  }
  return supabase;
}

export interface UploadResult {
  success: boolean;
  url?: string;
  error?: string;
  path?: string;
}

/**
 * Extracts the file path from a Supabase storage URL
 * 
 * @param url - The full Supabase storage URL
 * @returns The file path within the bucket, or null if not a valid URL
 */
export function extractPathFromUrl(url: string): string | null {
  if (!url || !SUPABASE_URL) return null;

  try {
    // Supabase public URLs follow this pattern:
    // https://xxx.supabase.co/storage/v1/object/public/bucket-name/path/to/file.jpg
    const bucketPath = `/storage/v1/object/public/${BUCKET_NAME}/`;
    const index = url.indexOf(bucketPath);
    
    if (index !== -1) {
      return url.substring(index + bucketPath.length);
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Uploads a logo file to Supabase Storage
 * 
 * @param file - The compressed image file to upload
 * @param shopId - The shop ID (used for file path organization)
 * @returns Upload result with URL or error
 */
export async function uploadLogo(file: File, shopId: string): Promise<UploadResult> {
  try {
    const client = getSupabaseClient();

    // Generate unique file path
    const timestamp = Date.now();
    const extension = file.name.split('.').pop() || 'jpg';
    const filePath = `${shopId}/logo_${timestamp}.${extension}`;

    // Upload file
    const { data, error } = await client.storage
      .from(BUCKET_NAME)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false, // Don't overwrite existing files
      });

    if (error) {
      console.error('Supabase upload error:', error);
      return {
        success: false,
        error: error.message || 'Failed to upload logo',
      };
    }

    // Get public URL
    const { data: urlData } = client.storage
      .from(BUCKET_NAME)
      .getPublicUrl(data.path);

    return {
      success: true,
      url: urlData.publicUrl,
      path: data.path,
    };
  } catch (err) {
    console.error('Upload error:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to upload logo',
    };
  }
}

/**
 * Deletes a logo file from Supabase Storage
 * 
 * @param url - The full URL of the logo to delete
 * @returns Success status
 */
export async function deleteLogo(url: string): Promise<{ success: boolean; error?: string }> {
  try {
    const filePath = extractPathFromUrl(url);
    
    if (!filePath) {
      // If we can't extract the path, it might be a local file or invalid URL
      // Just return success to allow the update to proceed
      return { success: true };
    }

    const client = getSupabaseClient();

    const { error } = await client.storage
      .from(BUCKET_NAME)
      .remove([filePath]);

    if (error) {
      console.error('Supabase delete error:', error);
      // Don't fail the operation, just log the error
      // The new logo will still be uploaded
      return {
        success: true,
        error: error.message,
      };
    }

    return { success: true };
  } catch (err) {
    console.error('Delete error:', err);
    // Don't fail the operation
    return {
      success: true,
      error: err instanceof Error ? err.message : 'Failed to delete old logo',
    };
  }
}

/**
 * Uploads a new logo and deletes the old one
 * 
 * @param file - The new logo file to upload
 * @param shopId - The shop ID
 * @param oldLogoUrl - The URL of the existing logo (optional)
 * @returns Upload result with new URL
 */
export async function replaceLogo(
  file: File,
  shopId: string,
  oldLogoUrl?: string
): Promise<UploadResult> {
  // Delete old logo first (if exists)
  if (oldLogoUrl) {
    await deleteLogo(oldLogoUrl);
  }

  // Upload new logo
  return uploadLogo(file, shopId);
}

/**
 * Checks if Supabase storage is configured
 * 
 * @returns Whether Supabase is properly configured
 */
export function isSupabaseConfigured(): boolean {
  return Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
}

/**
 * Gets the bucket name being used for logos
 * 
 * @returns The bucket name
 */
export function getBucketName(): string {
  return BUCKET_NAME;
}
