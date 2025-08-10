const STORAGE_KEY = 'last-slingshot-url';

/**
 * Check if a URL matches the valid Slingshot route patterns
 * Valid patterns: /, /:collectionId, /:collectionId/:requestId
 */
export function isValidSlingshotUrl(url) {
  if (!url || typeof url !== 'string') return false;
  
  // Root path
  if (url === '/') return true;
  
  // Collection or request paths (but not system paths like /collections, /environments, etc.)
  const segments = url.split('/').filter(Boolean);
  
  // Single segment: /:collectionId (but not /collections, /environments, /settings)
  if (segments.length === 1) {
    const segment = segments[0];
    return !['collections', 'environments', 'settings'].includes(segment);
  }
  
  // Two segments: /:collectionId/:requestId (but not /collections/:id, /environments/:id)
  if (segments.length === 2) {
    const firstSegment = segments[0];
    return !['collections', 'environments'].includes(firstSegment);
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