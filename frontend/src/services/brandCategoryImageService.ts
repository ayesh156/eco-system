/**
 * Brand & Category Image Service
 * 
 * Handles image uploads to Supabase Storage for brands and categories.
 * Manages compression, uploads, deletions, and URL generation.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Environment variables
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
const BRAND_BUCKET_NAME = 'brand-images';
const CATEGORY_BUCKET_NAME = 'category-images';

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

/**
 * Checks if Supabase storage is configured
 */
export function isSupabaseConfigured(): boolean {
  return !!SUPABASE_URL && !!SUPABASE_ANON_KEY;
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
 * @param maxWidth - Maximum width in pixels (default: 400px for logos)
 * @param quality - JPEG quality 0-1 (default: 0.85)
 * @returns Promise resolving to compressed File
 */
export async function compressImage(
  file: File,
  maxWidth: number = 400,
  quality: number = 0.85
): Promise<File> {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    img.onload = () => {
      let { width, height } = img;

      // Calculate new dimensions maintaining aspect ratio
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
 * Uploads a brand image to Supabase Storage
 * 
 * @param file - The image file to upload
 * @param shopId - The shop ID (used for file path organization)
 * @param brandId - The brand ID (optional, used for file naming)
 * @returns Upload result with URL or error
 */
export async function uploadBrandImage(
  file: File,
  shopId: string,
  brandId?: string
): Promise<UploadResult> {
  try {
    if (!isSupabaseConfigured()) {
      return {
        success: false,
        error: 'Supabase not configured. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.',
      };
    }

    const client = getSupabaseClient();

    // Compress image first
    const compressedFile = await compressImage(file);

    // Generate unique file path
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(7);
    const extension = 'jpg'; // Always jpg after compression
    const fileName = brandId
      ? `brand_${brandId}_${timestamp}.${extension}`
      : `brand_${timestamp}_${randomStr}.${extension}`;
    const filePath = `${shopId}/${fileName}`;

    // Upload file
    const { data, error } = await client.storage
      .from(BRAND_BUCKET_NAME)
      .upload(filePath, compressedFile, {
        cacheControl: '86400', // Cache for 24 hours
        upsert: false,
      });

    if (error) {
      console.error('Supabase brand image upload error:', error);
      return {
        success: false,
        error: error.message || 'Failed to upload brand image',
      };
    }

    // Get public URL
    const { data: urlData } = client.storage
      .from(BRAND_BUCKET_NAME)
      .getPublicUrl(data.path);

    console.log('✅ Brand image uploaded:', urlData.publicUrl);
    return {
      success: true,
      url: urlData.publicUrl,
      path: data.path,
    };
  } catch (err) {
    console.error('Brand image upload error:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to upload brand image',
    };
  }
}

/**
 * Uploads a category image to Supabase Storage
 * 
 * @param file - The image file to upload
 * @param shopId - The shop ID (used for file path organization)
 * @param categoryId - The category ID (optional, used for file naming)
 * @returns Upload result with URL or error
 */
export async function uploadCategoryImage(
  file: File,
  shopId: string,
  categoryId?: string
): Promise<UploadResult> {
  try {
    if (!isSupabaseConfigured()) {
      return {
        success: false,
        error: 'Supabase not configured. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.',
      };
    }

    const client = getSupabaseClient();

    // Compress image first
    const compressedFile = await compressImage(file);

    // Generate unique file path
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(7);
    const extension = 'jpg'; // Always jpg after compression
    const fileName = categoryId
      ? `category_${categoryId}_${timestamp}.${extension}`
      : `category_${timestamp}_${randomStr}.${extension}`;
    const filePath = `${shopId}/${fileName}`;

    // Upload file
    const { data, error } = await client.storage
      .from(CATEGORY_BUCKET_NAME)
      .upload(filePath, compressedFile, {
        cacheControl: '86400', // Cache for 24 hours
        upsert: false,
      });

    if (error) {
      console.error('Supabase category image upload error:', error);
      return {
        success: false,
        error: error.message || 'Failed to upload category image',
      };
    }

    // Get public URL
    const { data: urlData } = client.storage
      .from(CATEGORY_BUCKET_NAME)
      .getPublicUrl(data.path);

    console.log('✅ Category image uploaded:', urlData.publicUrl);
    return {
      success: true,
      url: urlData.publicUrl,
      path: data.path,
    };
  } catch (err) {
    console.error('Category image upload error:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to upload category image',
    };
  }
}

/**
 * Extracts the file path from a Supabase storage URL
 * 
 * @param url - The full Supabase storage URL
 * @param bucketName - The bucket name to extract path from
 * @returns The file path within the bucket, or null if not a valid URL
 */
export function extractPathFromUrl(url: string, bucketName: string): string | null {
  if (!url || !SUPABASE_URL) return null;

  try {
    const bucketPath = `/storage/v1/object/public/${bucketName}/`;
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
 * Deletes a brand image from Supabase Storage
 * 
 * @param url - The full URL of the image to delete
 * @returns Success status
 */
export async function deleteBrandImage(url: string): Promise<{ success: boolean; error?: string }> {
  try {
    const filePath = extractPathFromUrl(url, BRAND_BUCKET_NAME);

    if (!filePath) {
      return { success: true };
    }

    if (!isSupabaseConfigured()) {
      return { success: true };
    }

    const client = getSupabaseClient();

    const { error } = await client.storage
      .from(BRAND_BUCKET_NAME)
      .remove([filePath]);

    if (error) {
      console.error('Supabase brand image delete error:', error);
      return {
        success: true,
        error: error.message,
      };
    }

    return { success: true };
  } catch (err) {
    console.error('Brand image delete error:', err);
    return {
      success: true,
      error: err instanceof Error ? err.message : 'Failed to delete brand image',
    };
  }
}

/**
 * Deletes a category image from Supabase Storage
 * 
 * @param url - The full URL of the image to delete
 * @returns Success status
 */
export async function deleteCategoryImage(url: string): Promise<{ success: boolean; error?: string }> {
  try {
    const filePath = extractPathFromUrl(url, CATEGORY_BUCKET_NAME);

    if (!filePath) {
      return { success: true };
    }

    if (!isSupabaseConfigured()) {
      return { success: true };
    }

    const client = getSupabaseClient();

    const { error } = await client.storage
      .from(CATEGORY_BUCKET_NAME)
      .remove([filePath]);

    if (error) {
      console.error('Supabase category image delete error:', error);
      return {
        success: true,
        error: error.message,
      };
    }

    return { success: true };
  } catch (err) {
    console.error('Category image delete error:', err);
    return {
      success: true,
      error: err instanceof Error ? err.message : 'Failed to delete category image',
    };
  }
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

/**
 * Check if a URL is a Supabase storage URL
 */
export function isSupabaseUrl(url: string): boolean {
  if (!url || !SUPABASE_URL) return false;
  return url.includes(SUPABASE_URL);
}

/**
 * Check if a string is a base64 data URL
 */
export function isBase64DataUrl(str: string): boolean {
  return str.startsWith('data:image/');
}

export default {
  uploadBrandImage,
  uploadCategoryImage,
  deleteBrandImage,
  deleteCategoryImage,
  compressImage,
  isSupabaseConfigured,
  isSupabaseUrl,
  isBase64DataUrl,
  base64ToFile,
};
