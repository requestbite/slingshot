const STORAGE_KEY = 'last-slingshot-url';

/**
 * Check if a URL matches the valid Slingshot route patterns
 * Valid patterns: /, /:collectionId, /:collectionId/:requestId (where IDs are UUIDs)
 */
export function isValidSlingshotUrl(url) {
  if (!url || typeof url !== 'string') return false;
  
  // Root path
  if (url === '/') return true;
  
  // UUID pattern (8-4-4-4-12 characters)
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  
  const segments = url.split('/').filter(Boolean);
  
  // Single segment: /:collectionId (must be UUID)
  if (segments.length === 1) {
    return uuidPattern.test(segments[0]);
  }
  
  // Two segments: /:collectionId/:requestId (both must be UUIDs)
  if (segments.length === 2) {
    return uuidPattern.test(segments[0]) && uuidPattern.test(segments[1]);
  }
  
  return false;
}

/**
 * Store the last Slingshot URL in localStorage
 */
export function setLastSlingshotUrl(url) {
  if (!isValidSlingshotUrl(url)) {
    console.warn('Invalid Slingshot URL, not storing:', url);
    return;
  }
  
  try {
    localStorage.setItem(STORAGE_KEY, url);
  } catch (error) {
    console.warn('Failed to store last Slingshot URL:', error);
  }
}

/**
 * Retrieve the last Slingshot URL from localStorage
 * Returns '/' as fallback if no valid URL is stored
 */
export function getLastSlingshotUrl() {
  try {
    const storedUrl = localStorage.getItem(STORAGE_KEY);
    
    if (storedUrl && isValidSlingshotUrl(storedUrl)) {
      return storedUrl;
    }
  } catch (error) {
    console.warn('Failed to retrieve last Slingshot URL:', error);
  }
  
  // Fallback to root path
  return '/';
}

/**
 * Clear the stored Slingshot URL (useful for cleanup)
 */
export function clearLastSlingshotUrl() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.warn('Failed to clear last Slingshot URL:', error);
  }
}