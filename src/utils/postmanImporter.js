/**
 * @fileoverview Postman Collection v2.1 processor
 * Converts Postman collections into RequestBite collections, folders, and requests
 */

import { generateUUID } from './uuid.js';

/**
 * Processes Postman Collection v2.1 format and extracts collection data
 * @param {string} fileContent - Raw JSON file content
 * @param {string} collectionName - Optional collection name override
 * @returns {Promise<Object>} Processed collection data
 */
export async function processPostmanCollection(fileContent, collectionName = '') {
  try {
    // Parse the JSON content
    const collection = await parseCollection(fileContent);
    
    // Validate it's a valid Postman collection
    validateCollection(collection);
    
    // Extract collection metadata
    const metadata = extractMetadata(collection, collectionName);
    
    // Extract variables
    const variables = extractVariables(collection);
    
    // Process items to create folders and requests
    const { folders, requests } = await processItems(collection.item || [], null);
    
    return {
      collectionName: metadata.name,
      description: metadata.description,
      variables,
      folders,
      requests
    };
    
  } catch (error) {
    throw new Error(`Failed to process Postman collection: ${error.message}`);
  }
}

/**
 * Parses JSON content into a JavaScript object
 * @param {string} content - File content
 * @returns {Object} Parsed collection
 */
async function parseCollection(content) {
  try {
    return JSON.parse(content);
  } catch (error) {
    throw new Error('Invalid JSON format');
  }
}

/**
 * Validates that the collection is a valid Postman Collection v2.1
 * @param {Object} collection - Parsed collection
 */
function validateCollection(collection) {
  if (!collection || typeof collection !== 'object') {
    throw new Error('Invalid collection format');
  }
  
  // Check for Postman collection schema
  if (!collection.info) {
    throw new Error('Not a valid Postman collection - missing info object');
  }
  
  // Check schema version
  if (collection.info.schema) {
    const schema = collection.info.schema;
    if (!schema.includes('v2.1') && !schema.includes('v2.0')) {
      throw new Error(`Unsupported Postman collection version. Expected v2.1 or v2.0, got: ${schema}`);
    }
  }
}

/**
 * Extracts metadata from the collection
 * @param {Object} collection - Parsed collection
 * @param {string} collectionName - Optional name override
 * @returns {Object} Collection metadata
 */
function extractMetadata(collection, collectionName) {
  const info = collection.info || {};
  
  // Use provided name, or fall back to collection name
  let name = collectionName;
  if (!name) {
    name = info.name || 'Postman Import';
  }
  
  return {
    name,
    description: info.description || '',
    version: info.version || ''
  };
}

/**
 * Extracts variables from the collection
 * @param {Object} collection - Parsed collection
 * @returns {Array} Collection variables
 */
function extractVariables(collection) {
  const variables = [];
  
  // Extract collection-level variables
  if (collection.variable && Array.isArray(collection.variable)) {
    for (const variable of collection.variable) {
      if (variable.key) {
        variables.push({
          key: variable.key,
          value: variable.value || '',
          description: variable.description || ''
        });
      }
    }
  }
  
  return variables;
}

/**
 * Processes items (folders and requests) recursively
 * @param {Array} items - Array of items from Postman collection
 * @param {string|null} parentFolderId - Parent folder ID for nested items
 * @returns {Object} Folders and requests
 */
async function processItems(items, parentFolderId = null) {
  const folders = [];
  const requests = [];
  
  for (const item of items) {
    if (!item) continue;
    
    // Check if item is a folder or request
    if (item.item && Array.isArray(item.item)) {
      // It's a folder
      const folderId = generateUUID();
      const folderName = item.name || 'Untitled Folder';
      
      // Create folder object with proper hierarchy
      const folder = {
        id: folderId,
        name: folderName,
        parent_folder_id: parentFolderId,
        description: item.description || ''
      };
      
      folders.push(folder);
      
      // Process nested items with this folder as parent
      const { folders: nestedFolders, requests: nestedRequests } = 
        await processItems(item.item, folderId);
      
      // Add nested folders and requests
      folders.push(...nestedFolders);
      requests.push(...nestedRequests);
      
    } else if (item.request) {
      // It's a request
      const request = await createRequestFromItem(item, parentFolderId);
      requests.push(request);
    }
  }
  
  return { folders, requests };
}

/**
 * Creates a request object from a Postman item
 * @param {Object} item - Postman request item
 * @param {string|null} folderId - Folder ID for the request
 * @returns {Object} Request data
 */
async function createRequestFromItem(item, folderId) {
  const request = item.request;
  const name = item.name || 'Untitled Request';
  
  // Extract method
  const method = typeof request.method === 'string' ? request.method.toUpperCase() : 'GET';
  
  // Extract URL
  const url = extractUrl(request.url);
  
  // Extract headers
  const headers = extractHeaders(request.header);
  
  // Extract query parameters
  const params = extractQueryParams(request.url);
  
  // Extract path parameters (if any are defined in the URL)
  const pathParams = extractPathParams(url);
  
  // Extract request body
  const { requestType, contentType, body, formData, urlEncodedData } = extractRequestBody(request.body);
  
  return {
    name,
    method,
    url,
    headers,
    params,
    pathParams,
    requestType,
    contentType,
    body,
    formData,
    urlEncodedData,
    folderId
  };
}

/**
 * Extracts URL from Postman URL object or string
 * @param {Object|string} urlData - Postman URL data
 * @returns {string} URL string
 */
function extractUrl(urlData) {
  if (!urlData) return '';
  
  // If it's already a string, return it
  if (typeof urlData === 'string') {
    return urlData;
  }
  
  // If it's an object, construct the URL
  if (urlData.raw) {
    return urlData.raw;
  }
  
  // Construct from parts
  let url = '';
  
  if (urlData.protocol) {
    url += urlData.protocol + '://';
  }
  
  if (urlData.host) {
    if (Array.isArray(urlData.host)) {
      url += urlData.host.join('.');
    } else {
      url += urlData.host;
    }
  }
  
  if (urlData.port) {
    url += ':' + urlData.port;
  }
  
  if (urlData.path) {
    if (Array.isArray(urlData.path)) {
      url += '/' + urlData.path.join('/');
    } else {
      url += '/' + urlData.path;
    }
  }
  
  return url;
}

/**
 * Extracts headers from Postman header array
 * @param {Array} headerData - Postman headers
 * @returns {Array} Header objects
 */
function extractHeaders(headerData) {
  if (!headerData || !Array.isArray(headerData)) return [];
  
  return headerData
    .filter(header => header && header.key)
    .map(header => ({
      key: header.key,
      value: header.value || '',
      enabled: true // Enable all headers by default in RequestBite
    }));
}

/**
 * Extracts query parameters from Postman URL object
 * @param {Object|string} urlData - Postman URL data
 * @returns {Array} Query parameter objects
 */
function extractQueryParams(urlData) {
  if (!urlData) return [];
  
  // If URL has query array
  if (urlData.query && Array.isArray(urlData.query)) {
    return urlData.query
      .filter(param => param && param.key)
      .map(param => ({
        key: param.key,
        value: param.value || '',
        enabled: true // Enable all params by default in RequestBite
      }));
  }
  
  // Parse from raw URL if available
  if (typeof urlData === 'string' || urlData.raw) {
    const urlString = typeof urlData === 'string' ? urlData : urlData.raw;
    return parseQueryParamsFromString(urlString);
  }
  
  return [];
}

/**
 * Parses query parameters from URL string
 * @param {string} urlString - URL string
 * @returns {Array} Query parameter objects
 */
function parseQueryParamsFromString(urlString) {
  try {
    const url = new URL(urlString);
    const params = [];
    
    for (const [key, value] of url.searchParams.entries()) {
      params.push({
        key,
        value,
        enabled: true
      });
    }
    
    return params;
  } catch (error) {
    return [];
  }
}

/**
 * Extracts path parameters from URL (converts :param to path params)
 * @param {string} url - URL string
 * @returns {Array} Path parameter objects
 */
function extractPathParams(url) {
  if (!url) return [];
  
  const pathParams = [];
  const pathParamRegex = /:([a-zA-Z_][a-zA-Z0-9_]*)/g;
  let match;
  
  while ((match = pathParamRegex.exec(url)) !== null) {
    pathParams.push({
      key: match[1],
      value: '',
      enabled: true
    });
  }
  
  return pathParams;
}

/**
 * Extracts request body information from Postman body object
 * @param {Object} bodyData - Postman body data
 * @returns {Object} Request body data
 */
function extractRequestBody(bodyData) {
  if (!bodyData) {
    return {
      requestType: 'none',
      contentType: 'json',
      body: '',
      formData: [],
      urlEncodedData: []
    };
  }
  
  const mode = bodyData.mode || 'none';
  
  switch (mode) {
    case 'raw':
      return {
        requestType: 'raw',
        contentType: getContentTypeFromRaw(bodyData.options),
        body: bodyData.raw || '',
        formData: [],
        urlEncodedData: []
      };
      
    case 'formdata':
      return {
        requestType: 'form-data',
        contentType: 'text',
        body: '',
        formData: extractFormData(bodyData.formdata),
        urlEncodedData: []
      };
      
    case 'urlencoded':
      return {
        requestType: 'urlencoded',
        contentType: 'text',
        body: '',
        formData: [],
        urlEncodedData: extractUrlEncodedData(bodyData.urlencoded)
      };
      
    default:
      return {
        requestType: 'none',
        contentType: 'json',
        body: '',
        formData: [],
        urlEncodedData: []
      };
  }
}

/**
 * Gets content type from raw body options
 * @param {Object} options - Raw body options
 * @returns {string} Content type
 */
function getContentTypeFromRaw(options) {
  if (!options || !options.raw) return 'json';
  
  const language = options.raw.language;
  switch (language) {
    case 'json':
      return 'json';
    case 'xml':
      return 'xml';
    case 'html':
      return 'html';
    case 'text':
      return 'text';
    default:
      return 'json';
  }
}

/**
 * Extracts form data from Postman formdata array
 * @param {Array} formData - Postman form data
 * @returns {Array} Form data objects
 */
function extractFormData(formData) {
  if (!formData || !Array.isArray(formData)) return [];
  
  return formData
    .filter(item => item && item.key)
    .map(item => ({
      key: item.key,
      value: item.value || '',
      type: item.type || 'text',
      enabled: true // Enable all form fields by default in RequestBite
    }));
}

/**
 * Extracts URL-encoded data from Postman urlencoded array
 * @param {Array} urlEncodedData - Postman URL-encoded data
 * @returns {Array} URL-encoded data objects
 */
function extractUrlEncodedData(urlEncodedData) {
  if (!urlEncodedData || !Array.isArray(urlEncodedData)) return [];
  
  return urlEncodedData
    .filter(item => item && item.key)
    .map(item => ({
      key: item.key,
      value: item.value || '',
      enabled: true // Enable all URL-encoded fields by default in RequestBite
    }));
}