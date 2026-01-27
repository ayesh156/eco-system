/**
 * Product Image Service
 * 
 * Handles product image uploads to Supabase Storage.
 * Manages compression, uploads, deletions, and URL generation.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Environment variables
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
const BUCKET_NAME = 'product-images';

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
 * Compresses an image to reduce file size
 * 
 * @param file - The image file to compress
 * @param maxWidth - Maximum width in pixels (default: 800px)
 * @param quality - JPEG quality 0-1 (default: 0.8 = 80%)
 * @returns Promise resolving to compressed File
 */
export async function compressImage(
  file: File,
  maxWidth: number = 800,
  quality: number = 0.8
): Promise<File> {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    img.onload = () => {
      let { width, height } = img;

      // Calculate new dimensions
      if (width > maxWidth) {
        height = (height * maxWidth) / width;
        width = maxWidth;
      }

      canvas.width = width;
      canvas.height = height;

      // Draw and compress
      ctx?.drawImage(img, 0, 0, width, height);

      // Convert to blob and create file
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error('Failed to compress image'));
            return;
          }

          const compressedFile = new File(
            [blob],
            `${file.name.split('.')[0]}_compressed.jpg`,
            { type: 'image/jpeg' }
          );

          resolve(compressedFile);
        },
        'image/jpeg',
        quality
      );
    };

    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = URL.createObjectURL(file);
  });
}

/**
 * Uploads a product image to Supabase Storage
 * 
 * @param file - The compressed image file to upload
 * @param shopId - The shop ID (used for file path organization)
 * @param productId - The product ID (optional, used for file naming)
 * @returns Upload result with URL or error
 */
export async function uploadProductImage(
  file: File,
  shopId: string,
  productId?: string
): Promise<UploadResult> {
  try {
    if (!isSupabaseConfigured()) {
      return {
        success: false,
        error: 'Supabase not configured. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.',
      };
    }

    const client = getSupabaseClient();

    // Generate unique file path
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(7);
    const extension = file.name.split('.').pop() || 'jpg';
    const fileName = productId
      ? `${productId}_${timestamp}.${extension}`
      : `product_${timestamp}_${randomStr}.${extension}`;
    const filePath = `${shopId}/${fileName}`;

    // Upload file
    const { data, error } = await client.storage
      .from(BUCKET_NAME)
      .upload(filePath, file, {
        cacheControl: '86400', // Cache for 24 hours
        upsert: false,
      });

    if (error) {
      console.error('Supabase upload error:', error);
      return {
        success: false,
        error: error.message || 'Failed to upload product image',
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
      error: err instanceof Error ? err.message : 'Failed to upload product image',
    };
  }
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
 * Deletes a product image from Supabase Storage
 * 
 * @param url - The full URL of the image to delete
 * @returns Success status
 */
export async function deleteProductImage(url: string): Promise<{ success: boolean; error?: string }> {
  try {
    const filePath = extractPathFromUrl(url);

    if (!filePath) {
      // If we can't extract the path, just return success
      return { success: true };
    }

    if (!isSupabaseConfigured()) {
      return { success: true }; // Don't fail if Supabase not configured
    }

    const client = getSupabaseClient();

    const { error } = await client.storage
      .from(BUCKET_NAME)
      .remove([filePath]);

    if (error) {
      console.error('Supabase delete error:', error);
      // Don't fail the operation, just log the error
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
      error: err instanceof Error ? err.message : 'Failed to delete product image',
    };
  }
}

/**
 * Uploads a new product image and optionally deletes the old one
 * 
 * @param file - The new image file to upload
 * @param shopId - The shop ID
 * @param productId - The product ID (optional)
 * @param oldImageUrl - The URL of the existing image (optional)
 * @returns Upload result with new URL
 */
export async function replaceProductImage(
  file: File,
  shopId: string,
  productId?: string,
  oldImageUrl?: string
): Promise<UploadResult> {
  // Delete old image first (if exists)
  if (oldImageUrl) {
    await deleteProductImage(oldImageUrl);
  }

  // Upload new image
  return uploadProductImage(file, shopId, productId);
}

/**
 * Checks if Supabase storage is configured
 * 
 * @returns Whether Supabase is properly configured
 */
export function isSupabaseConfigured(): boolean {
  return !!SUPABASE_URL && !!SUPABASE_ANON_KEY;
}

/**
 * Gets the bucket name being used for product images
 * 
 * @returns The bucket name
 */
export function getBucketName(): string {
  return BUCKET_NAME;
}

/**
 * Converts a Base64 string to a File object
 * Useful for uploading previously Base64-encoded images
 * 
 * @param base64String - The Base64 encoded image string
 * @param filename - The filename for the file
 * @returns File object
 */
export function base64ToFile(base64String: string, filename: string = 'image.jpg'): File {
  // Remove data URI prefix if present
  const base64 = base64String.includes(',')
    ? base64String.split(',')[1]
    : base64String;

  // Convert Base64 to binary
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);

  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }

  // Create File from binary data
  return new File([bytes], filename, { type: 'image/jpeg' });
}
