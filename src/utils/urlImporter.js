/**
 * @fileoverview URL-based import utility
 * Fetches and processes API specifications or collections from URLs via proxy
 */

import { requestSubmitter } from './requestSubmitter.js';

/**
 * Fetches content from a URL with error handling using the proxy server
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
    // Update proxy URL to respect current settings
    requestSubmitter.updateProxyUrl(requestSubmitter.getCurrentProxyUrl());

    // Create proxy request with passThrough mode to get raw content
    const proxyRequest = {
      method: 'GET',
      url: url,
      headers: [
        'Accept: application/json, application/x-yaml, text/yaml, text/plain, */*'
      ],
      timeout: 60, // 60 seconds timeout for import operations
      followRedirects: true,
      passThrough: true // This makes the proxy return raw content instead of JSON wrapper
    };

    const response = await requestSubmitter.submitRequest(proxyRequest);

    // Handle proxy errors
    if (!response.success) {
      if (response.errorType === 'timeout') {
        throw new Error('Request timed out. The URL may be slow to respond.');
      } else if (response.errorType === 'connection_error') {
        throw new Error('Unable to connect to the URL. Please check the URL and try again.');
      } else if (response.errorType === 'url_validation_error') {
        throw new Error('Invalid URL format');
      } else if (response.cancelled) {
        throw new Error('Request was cancelled');
      } else {
        // For other errors, use the error message from proxy or provide generic message
        throw new Error(response.errorMessage || 'Failed to fetch content from URL');
      }
    }

    // In passThrough mode, the response is the raw content, not JSON
    // The content should be available as responseData
    const content = response.responseData || '';
    const contentType = response.rawHeaders?.['content-type'] || '';

    // Check content type to detect binary files
    if (contentType.includes('application/octet-stream') || 
        contentType.includes('application/pdf') ||
        contentType.includes('image/') ||
        contentType.includes('video/') ||
        contentType.includes('audio/')) {
      throw new Error('Binary files are not supported');
    }

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
    // If it's already one of our custom errors, re-throw as is
    if (error.message.includes('Binary files are not supported') ||
        error.message.includes('file appears to be empty') ||
        error.message.includes('File size must be less than') ||
        error.message.includes('Request timed out') ||
        error.message.includes('Unable to connect') ||
        error.message.includes('Invalid URL format') ||
        error.message.includes('Request was cancelled')) {
      throw error;
    }

    // For unexpected errors, provide a generic message
    throw new Error('Unable to fetch content from URL. Please check the URL and try again.');
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
      const titleMatch = content.match(/title:\s*['"]?([^'"\n]+)['"]?/i);
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
