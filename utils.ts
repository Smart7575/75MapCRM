
/**
 * Compresses a Base64 image string by resizing it to a maximum dimension
 * and reducing the JPEG quality.
 */
export async function compressImageBase64(
  base64Str: string, 
  maxWidth = 400, 
  maxHeight = 400, 
  quality = 0.7
): Promise<string> {
  // If it's not a data URL or not an image, return as is
  if (!base64Str || !base64Str.startsWith('data:image')) {
    return base64Str;
  }
  
  // If the image is already small (e.g. < 50KB), don't bother compressing
  // unless we specifically want to enforce dimensions
  if (base64Str.length < 50000) {
    // Basic check, could still proceed if strict resizing is needed
  }

  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;

      // Calculate new dimensions while maintaining aspect ratio
      if (width > height) {
        if (width > maxWidth) {
          height *= maxWidth / width;
          width = maxWidth;
        }
      } else {
        if (height > maxHeight) {
          width *= maxHeight / height;
          height = maxHeight;
        }
      }

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        resolve(base64Str);
        return;
      }

      // Draw and compress
      ctx.drawImage(img, 0, 0, width, height);
      
      // Convert to optimized JPEG
      const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
      
      // Only return compressed version if it's actually smaller or we resized it
      if (compressedDataUrl.length < base64Str.length || width !== img.width) {
        resolve(compressedDataUrl);
      } else {
        resolve(base64Str);
      }
    };
    
    img.onerror = () => {
      console.warn("Image compression failed, using original.");
      resolve(base64Str);
    };
    
    img.src = base64Str;
  });
}
