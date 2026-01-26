/**
 * Image Compression Utility
 * 
 * Client-side image compression for shop logos.
 * Compresses images before upload to optimize storage and loading times.
 */

export interface CompressionOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number; // 0-1
  mimeType?: 'image/jpeg' | 'image/png' | 'image/webp';
}

export interface CompressedImage {
  file: File;
  dataUrl: string;
  width: number;
  height: number;
  originalSize: number;
  compressedSize: number;
  compressionRatio: number;
}

const DEFAULT_OPTIONS: CompressionOptions = {
  maxWidth: 400,
  maxHeight: 400,
  quality: 0.8,
  mimeType: 'image/jpeg',
};

/**
 * Compresses an image file for logo upload
 * 
 * @param file - The image file to compress
 * @param options - Compression options
 * @returns Promise with compressed image data
 */
export async function compressImage(
  file: File,
  options: CompressionOptions = {}
): Promise<CompressedImage> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const originalSize = file.size;

  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      const img = new Image();

      img.onload = () => {
        try {
          // Calculate new dimensions while maintaining aspect ratio
          let { width, height } = img;
          const maxWidth = opts.maxWidth!;
          const maxHeight = opts.maxHeight!;

          if (width > maxWidth || height > maxHeight) {
            const aspectRatio = width / height;

            if (width > height) {
              width = maxWidth;
              height = Math.round(maxWidth / aspectRatio);
            } else {
              height = maxHeight;
              width = Math.round(maxHeight * aspectRatio);
            }
          }

          // Create canvas for compression
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('Failed to get canvas context'));
            return;
          }

          // Draw image with white background (for transparency)
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, width, height);
          ctx.drawImage(img, 0, 0, width, height);

          // Convert to compressed format
          const dataUrl = canvas.toDataURL(opts.mimeType, opts.quality);

          // Convert data URL to File
          fetch(dataUrl)
            .then((res) => res.blob())
            .then((blob) => {
              const extension = opts.mimeType?.split('/')[1] || 'jpeg';
              const fileName = `logo_${Date.now()}.${extension}`;
              const compressedFile = new File([blob], fileName, {
                type: opts.mimeType,
              });

              resolve({
                file: compressedFile,
                dataUrl,
                width,
                height,
                originalSize,
                compressedSize: compressedFile.size,
                compressionRatio: Math.round(
                  ((originalSize - compressedFile.size) / originalSize) * 100
                ),
              });
            })
            .catch(reject);
        } catch (err) {
          reject(err);
        }
      };

      img.onerror = () => {
        reject(new Error('Failed to load image'));
      };

      img.src = e.target?.result as string;
    };

    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };

    reader.readAsDataURL(file);
  });
}

/**
 * Validates if a file is a valid image for logo upload
 * 
 * @param file - The file to validate
 * @returns Validation result with error message if invalid
 */
export function validateImageFile(file: File): { valid: boolean; error?: string } {
  const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
  const maxSize = 5 * 1024 * 1024; // 5MB

  if (!validTypes.includes(file.type)) {
    return {
      valid: false,
      error: 'Invalid file type. Please upload a JPEG, PNG, WebP, or GIF image.',
    };
  }

  if (file.size > maxSize) {
    return {
      valid: false,
      error: 'File size too large. Maximum size is 5MB.',
    };
  }

  return { valid: true };
}

/**
 * Creates a preview URL for an image file
 * 
 * @param file - The image file
 * @returns Object URL for preview (remember to revoke when done)
 */
export function createImagePreview(file: File): string {
  return URL.createObjectURL(file);
}

/**
 * Converts a data URL to a File object
 * 
 * @param dataUrl - The data URL
 * @param fileName - Name for the file
 * @returns File object
 */
export async function dataUrlToFile(dataUrl: string, fileName: string): Promise<File> {
  const response = await fetch(dataUrl);
  const blob = await response.blob();
  return new File([blob], fileName, { type: blob.type });
}

/**
 * Formats file size to human-readable string
 * 
 * @param bytes - File size in bytes
 * @returns Formatted string (e.g., "1.5 MB")
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}
