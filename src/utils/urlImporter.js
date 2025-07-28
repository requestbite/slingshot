/**
 * @fileoverview URL-based import utility
 * Fetches and processes API specifications or collections from URLs
 */

/**
 * Fetches content from a URL with error handling
 * @param {string} url - URL to fetch from
 * @returns {Promise<{content: string, contentType: string}>} Fetched content and detected type
 */
export async function fetchFromURL(url) {
  // Validate URL format
  try {
    new URL(url);
  } catch (_error) {
    throw new Error('Invalid URL format');
  }

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json, application/x-yaml, text/yaml, text/plain, */*'
      }
    });

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error('File not found at the specified URL');
      } else if (response.status === 403) {
        throw new Error('Access denied to the specified URL');
      } else {
        throw new Error(`Failed to fetch: ${response.status} ${response.statusText}`);
      }
    }

    // Check content type to detect binary files
    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('application/octet-stream') || 
        contentType.includes('application/pdf') ||
        contentType.includes('image/') ||
        contentType.includes('video/') ||
        contentType.includes('audio/')) {
      throw new Error('Binary files are not supported');
    }

    const content = await response.text();

    // Check if content is empty
    if (!content.trim()) {
      throw new Error('The file appears to be empty');
    }

    // Check file size (10MB limit)
    const maxSize = 10 * 1024 * 1024; // 10MB in bytes
    if (content.length > maxSize) {
      throw new Error('File size must be less than 10MB');
    }

    return {
      content,
      contentType: contentType
    };

  } catch (error) {
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      // This usually indicates CORS or network issues
      throw new Error('Unable to access the URL. This may be due to CORS restrictions or network issues.');
    }
    throw error;
  }
}

/**
 * Detects the format of the fetched content
 * @param {string} content - Raw content string
 * @returns {string} Format type: 'openapi', 'postman', or 'unknown'
 */
export function detectContentFormat(content) {
  try {
    const parsed = JSON.parse(content);
    
    // Check for Postman Collection
    if (parsed.collection || 
        (parsed.info && parsed.info.schema && parsed.info.schema.includes('postman'))) {
      return 'postman';
    }
    
    // Check for OpenAPI/Swagger
    if (parsed.openapi || 
        parsed.swagger || 
        (parsed.info && parsed.paths)) {
      return 'openapi';
    }
    
    return 'unknown';
    
  } catch (_jsonError) {
    // If JSON parsing fails, try to detect YAML-based OpenAPI
    const contentLower = content.toLowerCase();
    
    // Look for YAML OpenAPI indicators
    if (contentLower.includes('openapi:') || 
        contentLower.includes('swagger:') ||
        (contentLower.includes('info:') && contentLower.includes('paths:'))) {
      return 'openapi';
    }
    
    return 'unknown';
  }
}

/**
 * Extracts a default name from the content based on format
 * @param {string} content - Raw content string
 * @param {string} format - Detected format ('openapi' or 'postman')
 * @param {string} url - Original URL (fallback for name)
 * @returns {string} Extracted name or fallback
 */
export function extractDefaultName(content, format, url) {
  try {
    const parsed = JSON.parse(content);
    
    if (format === 'postman') {
      return parsed.info?.name || parsed.collection?.info?.name || 'Imported Collection';
    } else if (format === 'openapi') {
      return parsed.info?.title || 'Imported API';
    }
    
  } catch (_error) {
    // For YAML content, try basic regex extraction
    if (format === 'openapi') {
      const titleMatch = content.match(/title:\s*['"]?([^'"\\n]+)['"]?/i);
      if (titleMatch) {
        return titleMatch[1].trim();
      }
    }
  }
  
  // Fallback: extract filename from URL
  try {
    const urlObj = new URL(url);
    const pathname = urlObj.pathname;
    const filename = pathname.split('/').pop() || 'imported-collection';
    return filename.replace(/\.[^/.]+$/, ''); // Remove extension
  } catch (_error) {
    return 'Imported Collection';
  }
}