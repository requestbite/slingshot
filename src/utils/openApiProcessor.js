/**
 * @fileoverview OpenAPI/Swagger specification processor
 * Converts OpenAPI specs into collections, folders, and requests
 */

import { generateUUID } from './uuid.js';
import { load as loadYAML } from 'js-yaml';

/**
 * Processes OpenAPI/Swagger specification and extracts collection data
 * @param {string} fileContent - Raw file content (JSON or YAML)
 * @param {string} collectionName - Optional collection name override
 * @returns {Promise<Object>} Processed collection data
 */
export async function processOpenAPISpec(fileContent, collectionName = '') {
  try {
    // Parse the specification
    const spec = await parseSpecification(fileContent);
    
    // Validate it's a valid OpenAPI/Swagger spec
    validateSpecification(spec);
    
    // Extract collection metadata
    const metadata = extractMetadata(spec, collectionName);
    
    // Extract base URL and create variables
    const variables = extractVariables(spec);
    
    // Process paths to create folders and requests
    const { folders, requests } = await processPaths(spec, metadata.baseUrl);
    
    return {
      collectionName: metadata.name,
      description: metadata.description,
      variables,
      folders: Array.from(folders),
      requests
    };
    
  } catch (error) {
    throw new Error(`Failed to process OpenAPI specification: ${error.message}`);
  }
}

/**
 * Parses JSON or YAML content into a JavaScript object
 * @param {string} content - File content
 * @returns {Object} Parsed specification
 */
async function parseSpecification(content) {
  try {
    // Try JSON first
    return JSON.parse(content);
  } catch (_jsonError) {
    try {
      // If JSON fails, try YAML (basic YAML parsing)
      return parseYAML(content);
    } catch (_yamlError) {
      throw new Error('Invalid JSON or YAML format');
    }
  }
}

/**
 * Parses YAML content using js-yaml library
 * @param {string} yamlContent - YAML content
 * @returns {Object} Parsed object
 */
function parseYAML(yamlContent) {
  try {
    return loadYAML(yamlContent);
  } catch (error) {
    throw new Error(`Invalid YAML format: ${error.message}`);
  }
}

/**
 * Validates that the specification is a valid OpenAPI/Swagger document
 * @param {Object} spec - Parsed specification
 */
function validateSpecification(spec) {
  if (!spec || typeof spec !== 'object') {
    throw new Error('Invalid specification format');
  }
  
  // Check for OpenAPI 3.x
  if (spec.openapi) {
    if (!spec.openapi.startsWith('3.')) {
      throw new Error(`Unsupported OpenAPI version: ${spec.openapi}`);
    }
    return;
  }
  
  // Check for Swagger 2.0
  if (spec.swagger) {
    if (spec.swagger !== '2.0') {
      throw new Error(`Unsupported Swagger version: ${spec.swagger}`);
    }
    return;
  }
  
  throw new Error('Not a valid OpenAPI or Swagger specification');
}

/**
 * Extracts metadata from the specification
 * @param {Object} spec - Parsed specification
 * @param {string} collectionName - Optional name override
 * @returns {Object} Collection metadata
 */
function extractMetadata(spec, collectionName) {
  const info = spec.info || {};
  
  // Use provided name, or fall back to spec title, or generate one
  let name = collectionName;
  if (!name) {
    name = info.title || 'OpenAPI Import';
  }
  
  // Extract base URL
  let baseUrl = '';
  if (spec.openapi) {
    // OpenAPI 3.x
    const servers = spec.servers || [];
    if (servers.length > 0) {
      baseUrl = servers[0].url || '';
    }
  } else if (spec.swagger) {
    // Swagger 2.0
    const host = spec.host || '';
    const basePath = spec.basePath || '';
    const schemes = spec.schemes || ['https'];
    if (host) {
      baseUrl = `${schemes[0]}://${host}${basePath}`;
    }
  }
  
  return {
    name,
    description: info.description || '',
    version: info.version || '',
    baseUrl
  };
}

/**
 * Extracts variables from the specification
 * @param {Object} spec - Parsed specification
 * @returns {Array} Collection variables
 */
function extractVariables(spec) {
  const variables = [];
  
  // Add baseUrl as a variable if we found one
  const metadata = extractMetadata(spec, '');
  if (metadata.baseUrl) {
    variables.push({
      key: 'baseUrl',
      value: metadata.baseUrl
    });
  }
  
  // Extract server variables from OpenAPI 3.x
  if (spec.openapi && spec.servers) {
    for (const server of spec.servers) {
      if (server.variables) {
        for (const [key, variable] of Object.entries(server.variables)) {
          variables.push({
            key,
            value: variable.default || '',
            description: variable.description || ''
          });
        }
      }
    }
  }
  
  return variables;
}

/**
 * Processes paths to create folders and requests
 * @param {Object} spec - Parsed specification
 * @param {string} baseUrl - Base URL for requests
 * @returns {Object} Folders and requests
 */
async function processPaths(spec, baseUrl) {
  const folders = new Set();
  const requests = [];
  const paths = spec.paths || {};
  
  for (const [path, pathItem] of Object.entries(paths)) {
    // Skip if no operations defined
    if (!pathItem || typeof pathItem !== 'object') continue;
    
    const httpMethods = ['get', 'post', 'put', 'patch', 'delete', 'head', 'options'];
    
    for (const method of httpMethods) {
      const operation = pathItem[method];
      if (!operation) continue;
      
      // Determine folder name from tags
      const tags = operation.tags || [];
      const folderName = tags.length > 0 ? tags[0] : 'Default';
      folders.add(folderName);
      
      // Create request
      const request = await createRequestFromOperation({
        path,
        method: method.toUpperCase(),
        operation,
        baseUrl,
        folderName,
        spec
      });
      
      requests.push(request);
    }
  }
  
  return { folders, requests };
}

/**
 * Creates a request object from an OpenAPI operation
 * @param {Object} params - Operation parameters
 * @returns {Object} Request data
 */
async function createRequestFromOperation({ path, method, operation, baseUrl: _baseUrl, folderName, spec }) {
  const name = operation.summary || operation.operationId || `${method} ${path}`;
  
  // Convert OpenAPI path parameters to URL template format
  // Use {{baseUrl}} variable instead of hardcoded baseUrl
  const url = '{{baseUrl}}' + convertPathParameters(path);
  
  // Extract parameters
  const { headers, params: queryParams, pathParams } = extractParameters(operation);
  
  // Determine request type and body
  const { requestType, contentType, body } = extractRequestBody(operation, spec);
  
  return {
    name,
    method,
    url,
    headers,
    params: queryParams,
    pathParams,
    requestType,
    contentType,
    body,
    folderName
  };
}

/**
 * Converts OpenAPI path parameters from {param} to :param format
 * @param {string} path - OpenAPI path
 * @returns {string} Converted path
 */
function convertPathParameters(path) {
  return path.replace(/\{([^}]+)\}/g, ':$1');
}

/**
 * Extracts parameters from an operation
 * @param {Object} operation - OpenAPI operation
 * @returns {Object} Extracted parameters
 */
function extractParameters(operation) {
  const headers = [];
  const params = [];
  const pathParams = [];
  
  const parameters = operation.parameters || [];
  
  for (const param of parameters) {
    const paramObj = {
      key: param.name,
      value: getExampleValue(param),
      description: param.description || '',
      enabled: true // Enable all parameters by default in RequestBite
    };
    
    switch (param.in) {
      case 'header':
        headers.push(paramObj);
        break;
      case 'query':
        params.push(paramObj);
        break;
      case 'path':
        pathParams.push(paramObj);
        break;
    }
  }
  
  return { headers, params, pathParams };
}

/**
 * Extracts request body information from an operation
 * @param {Object} operation - OpenAPI operation
 * @param {Object} spec - Full specification for schema resolution
 * @returns {Object} Request body data
 */
function extractRequestBody(operation, spec) {
  const requestBody = operation.requestBody;
  if (!requestBody || !requestBody.content) {
    return { requestType: 'none', contentType: 'json', body: '' };
  }
  
  const content = requestBody.content;
  const contentTypes = Object.keys(content);
  
  if (contentTypes.length === 0) {
    return { requestType: 'none', contentType: 'json', body: '' };
  }
  
  // Prefer JSON, then form data, then anything else
  let selectedContentType = contentTypes[0];
  if (contentTypes.includes('application/json')) {
    selectedContentType = 'application/json';
  } else if (contentTypes.includes('application/x-www-form-urlencoded')) {
    selectedContentType = 'application/x-www-form-urlencoded';
  } else if (contentTypes.includes('multipart/form-data')) {
    selectedContentType = 'multipart/form-data';
  }
  
  const mediaType = content[selectedContentType];
  const schema = mediaType?.schema;
  
  // Determine request type and content type
  let requestType = 'raw';
  let contentType = 'json';
  
  if (selectedContentType.includes('json')) {
    requestType = 'raw';
    contentType = 'json';
  } else if (selectedContentType.includes('form-urlencoded')) {
    requestType = 'urlencoded';
    contentType = 'text';
  } else if (selectedContentType.includes('form-data')) {
    requestType = 'form';
    contentType = 'text';
  }
  
  // Generate example body
  const body = generateExampleFromSchema(schema, spec);
  
  return { requestType, contentType, body };
}

/**
 * Gets example value for a parameter
 * @param {Object} param - Parameter definition
 * @returns {string} Example value
 */
function getExampleValue(param) {
  if (param.example !== undefined) {
    return String(param.example);
  }
  
  if (param.schema?.example !== undefined) {
    return String(param.schema.example);
  }
  
  // Generate based on type
  const type = param.type || param.schema?.type || 'string';
  switch (type) {
    case 'integer':
    case 'number':
      return '0';
    case 'boolean':
      return 'false';
    case 'array':
      return '[]';
    case 'object':
      return '{}';
    default:
      return '';
  }
}

/**
 * Generates example JSON from a schema
 * @param {Object} schema - OpenAPI schema
 * @param {Object} spec - Full specification for reference resolution
 * @returns {string} Example JSON string
 */
function generateExampleFromSchema(schema, spec) {
  if (!schema) return '';
  
  try {
    const example = generateExample(schema, spec, new Set());
    return JSON.stringify(example, null, 2);
  } catch (_error) {
    return '{}';
  }
}

/**
 * Recursively generates example data from schema
 * @param {Object} schema - Schema object
 * @param {Object} spec - Full specification
 * @param {Set} visited - Visited schemas to prevent circular references
 * @returns {*} Example data
 */
function generateExample(schema, spec, visited) {
  if (!schema) return null;
  
  // Handle $ref
  if (schema.$ref) {
    const refPath = schema.$ref.replace('#/', '').split('/');
    let refSchema = spec;
    for (const part of refPath) {
      refSchema = refSchema[part];
    }
    
    // Prevent circular references
    const refKey = schema.$ref;
    if (visited.has(refKey)) {
      return {};
    }
    visited.add(refKey);
    
    const result = generateExample(refSchema, spec, visited);
    visited.delete(refKey);
    return result;
  }
  
  // Use provided example
  if (schema.example !== undefined) {
    return schema.example;
  }
  
  // Generate based on type
  switch (schema.type) {
    case 'string':
      return schema.enum ? schema.enum[0] : 'string';
    case 'number':
    case 'integer':
      return 0;
    case 'boolean':
      return false;
    case 'array':
      if (schema.items) {
        return [generateExample(schema.items, spec, visited)];
      }
      return [];
    case 'object': {
      const obj = {};
      if (schema.properties) {
        for (const [key, prop] of Object.entries(schema.properties)) {
          obj[key] = generateExample(prop, spec, visited);
        }
      }
      return obj;
    }
    default:
      return null;
  }
}