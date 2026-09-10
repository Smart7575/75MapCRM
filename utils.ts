
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

/**
 * Recursively removes any keys with `undefined` values from an object.
 * This is crucial for Firestore writes as Firestore does not accept `undefined`.
 */
export function removeUndefinedFields<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => removeUndefinedFields(item)) as unknown as T;
  }

  const newObj = {} as any;
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      const val = obj[key];
      if (val !== undefined) {
        newObj[key] = removeUndefinedFields(val);
      }
    }
  }
  return newObj as T;
}

/**
 * Normalizes a phone number for telephone links (tel: protocol).
 * Retains digits and a leading +, while stripping formatting characters (spaces, dashes, parens).
 */
export function cleanPhoneNumber(phone?: string): string {
  if (!phone) return '';
  const trimmed = phone.trim();
  const hasPlus = trimmed.startsWith('+');
  const digits = trimmed.replace(/\D/g, '');
  return hasPlus ? `+${digits}` : digits;
}

/**
 * Triggers the device's native phone dialer application with the specified phone number.
 */
export function dialPhoneNumber(phoneNumber: string, e?: React.MouseEvent | React.TouchEvent): void {
  if (e) {
    e.stopPropagation();
  }
  const clean = cleanPhoneNumber(phoneNumber);
  if (!clean) return;
  const telUri = `tel:${clean}`;
  window.location.href = telUri;
}

/**
 * Computes the default sorting string for a contact: "Achternaam, Voornaam".
 * If only lastName is given: "Achternaam".
 * If only firstName is given: "Voornaam".
 * Example:
 *   Stefan Martinali -> "Martinali, Stefan"
 *   Corina van der Koppel -> "van der Koppel, Corina"
 */
export function computeDefaultSortName(firstName?: string, lastName?: string): string {
  const f = firstName?.trim() || '';
  const l = lastName?.trim() || '';
  if (l && f) return `${l}, ${f}`;
  if (l) return l;
  if (f) return f;
  return '';
}

/**
 * Returns the effective sorting name for a contact.
 * Uses custom sortName if provided, otherwise calculates the default "Achternaam, Voornaam".
 */
export function getContactSortName(contact: { firstName?: string; lastName?: string; sortName?: string }): string {
  if (contact.sortName && contact.sortName.trim() !== '') {
    return contact.sortName.trim();
  }
  return computeDefaultSortName(contact.firstName, contact.lastName);
}
