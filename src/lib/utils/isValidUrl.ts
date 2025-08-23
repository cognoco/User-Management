/**
 * Validates if a string is a valid URL
 * @param url - The string to validate
 * @returns true if the string is a valid URL, false otherwise
 */
export function isValidUrl(url: string): boolean {
  if (!url) return false;
  
  try {
    const urlObj = new URL(url);
    // Check for valid protocols
    return ['http:', 'https:'].includes(urlObj.protocol);
  } catch {
    return false;
  }
}

export default isValidUrl;