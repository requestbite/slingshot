/**
 * @fileoverview OpenAPI/Swagger specification processor
 * Converts OpenAPI specs into collections, folders, and requests
 */

import { generateUUID } from './uuid.js';
import { load as loadYAML } from 'js-yaml';
import { flattenAllOf } from './schemaParser.js';

/**
 * Processes OpenAPI/Swagger specification and extracts collection data
 * @param {string} fileContent - Raw file content (JSON or YAML)
 * @param {string} collectionName - Optional collection name override
 * @param {Object} serverSelection - Optional server selection (serverIndex, variableValues)
 * @returns {Promise<Object>} Processed collection data
 */
export async function processOpenAPISpec(fileContent, collectionName = '', serverSelection = null) {
  try {
    // Parse the specification
    const spec = await parseSpecification(fileContent);

    // Validate it's a valid OpenAPI/Swagger spec
    validateSpecification(spec);

    // Extract collection metadata
    const metadata = extractMetadata(spec, collectionName, serverSelection);

    // Extract base URL and create variables
    const variables = extractVariables(spec, serverSelection);

    // Extract security schemes from components
    const securitySchemes = extractSecuritySchemes(spec);

    // Process paths to create folders and requests
    const { folders, requests } = await processPaths(spec, metadata.baseUrl);

    return {
      collectionName: metadata.name,
      description: metadata.description,
      variables,
      securitySchemes,
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
 * Resolves a server URL by substituting variables
 * @param {string} urlTemplate - URL template with {variable} placeholders
 * @param {Object} variableValues - Map of variable names to their selected values
 * @returns {string} Resolved URL
 */
function resolveServerUrl(urlTemplate, variableValues) {
  let resolved = urlTemplate;

  // Replace all {variableName} with their values
  for (const [varName, value] of Object.entries(variableValues)) {
    if (value) {
      resolved = resolved.replace(new RegExp(`\\{${varName}\\}`, 'g'), value);
    }
  }

  return resolved;
}

/**
 * Extracts metadata from the specification
 * @param {Object} spec - Parsed specification
 * @param {string} collectionName - Optional name override
 * @param {Object} serverSelection - Optional server selection (serverIndex, variableValues)
 * @returns {Object} Collection metadata
 */
function extractMetadata(spec, collectionName, serverSelection = null) {
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
      // Use selected server if provided
      const serverIndex = serverSelection?.serverIndex ?? 0;
      const server = servers[serverIndex] || servers[0];
      baseUrl = server.url || '';

      // Resolve server variables if provided
      if (serverSelection?.variableValues && server.variables) {
        baseUrl = resolveServerUrl(baseUrl, serverSelection.variableValues);
      }
    }
  } else if (spec.swagger) {
    // Swagger 2.0
    let host = spec.host || '';
    const basePath = spec.basePath || '';

    // If host is missing but provided via serverSelection, use it
    if (!host && serverSelection?.swaggerHost) {
      // Use the full origin (includes protocol) from user input
      baseUrl = serverSelection.swaggerHost + basePath;
    } else if (host) {
      // Use host from spec with scheme
      const schemes = spec.schemes || ['https'];
      baseUrl = `${schemes[0]}://${host}${basePath}`;
    }
  }

  // Handle trailing slash in baseUrl to prevent double slashes
  // If baseUrl ends with "/" and any path starts with "/", trim the trailing "/"
  if (baseUrl && baseUrl.endsWith('/')) {
    const paths = spec.paths || {};
    const pathKeys = Object.keys(paths);

    // Check if any path starts with "/"
    const hasLeadingSlashPath = pathKeys.some(path => path.startsWith('/'));

    if (hasLeadingSlashPath) {
      // Trim the trailing "/" to prevent URLs like http://example.com//path
      baseUrl = baseUrl.slice(0, -1);
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
 * @param {Object} serverSelection - Optional server selection (serverIndex, variableValues)
 * @returns {Array} Collection variables
 */
function extractVariables(spec, serverSelection = null) {
  const variables = [];

  // Add baseUrl as a variable if we found one
  const metadata = extractMetadata(spec, '', serverSelection);
  if (metadata.baseUrl) {
    variables.push({
      key: 'baseUrl',
      value: metadata.baseUrl
    });
  }

  // Extract server variables from OpenAPI 3.x
  if (spec.openapi && spec.servers) {
    // Use selected server if provided, otherwise use first server
    const serverIndex = serverSelection?.serverIndex ?? 0;
    const server = spec.servers[serverIndex] || spec.servers[0];

    if (server && server.variables) {
      for (const [key, variable] of Object.entries(server.variables)) {
        // Use user-selected value if provided, otherwise use default
        const value = serverSelection?.variableValues?.[key] || variable.default || '';

        variables.push({
          key,
          value,
          description: variable.description || ''
        });
      }
    }
  }

  return variables;
}

/**
 * Extracts security schemes from OpenAPI components
 * @param {Object} spec - Parsed specification
 * @returns {Object|null} Security schemes object or null if not present
 */
function extractSecuritySchemes(spec) {
  // Extract security schemes from components (OpenAPI 3.x)
  if (spec.components && spec.components.securitySchemes) {
    return spec.components.securitySchemes;
  }

  // Swagger 2.0 uses securityDefinitions at the root level
  if (spec.securityDefinitions) {
    return spec.securityDefinitions;
  }

  return null;
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

    // Extract path-level parameters
    const pathLevelParameters = pathItem.parameters || [];

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
        spec,
        pathLevelParameters
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
async function createRequestFromOperation({ path, method, operation, baseUrl, folderName, spec, pathLevelParameters = [] }) {
  const name = operation.summary || operation.operationId || `${method} ${path}`;

  // Convert OpenAPI path parameters to URL template format
  // Only use {{baseUrl}} variable if a server object exists in the spec
  let url = baseUrl ? '{{baseUrl}}' + convertPathParameters(path) : convertPathParameters(path);

  // Extract parameters (including path-level parameters)
  const { headers, params: queryParams, pathParams, parametersSchema } = extractParameters(operation, spec, pathLevelParameters);

  // Append query parameters to URL so RequestEditor can parse them
  if (queryParams.length > 0) {
    const queryString = queryParams
      .map(param => `${encodeURIComponent(param.key)}=${encodeURIComponent(param.value)}`)
      .join('&');
    url += '?' + queryString;
  }

  // Determine request type and body
  const { requestType, contentType, body, requestBodySchema } = extractRequestBody(operation, spec);

  // Extract response schemas (now includes headers, multiple content types, and examples)
  const { responseSchemas } = extractResponseSchemas(operation, spec);

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
    folderName,
    // OpenAPI metadata
    description: operation.description || '',
    summary: operation.summary || '',
    operation_id: operation.operationId || '',
    tags: operation.tags || [],
    parameters_schema: parametersSchema,
    request_body_schema: requestBodySchema,
    response_schemas: responseSchemas
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
 * Extracts parameters from an operation with resolved schemas
 * @param {Object} operation - OpenAPI operation
 * @param {Object} spec - Full specification for reference resolution
 * @param {Array} pathLevelParameters - Path-level parameters to merge
 * @returns {Object} Extracted parameters with resolved schemas
 */
function extractParameters(operation, spec, pathLevelParameters = []) {
  const headers = [];
  const params = [];
  const pathParams = [];
  const parametersSchema = {
    headers: {},
    query: {},
    path: {}
  };

  // Merge path-level parameters with operation-level parameters
  const parameters = [...pathLevelParameters, ...(operation.parameters || [])];

  for (const param of parameters) {
    const resolvedParam = resolveReferences(param, spec);

    const paramObj = {
      key: resolvedParam.name,
      value: getExampleValue(resolvedParam),
      description: resolvedParam.description || '',
      enabled: true // Enable all parameters by default in RequestBite
    };

    // Store resolved schema for this parameter
    const paramSchema = {
      type: resolvedParam.type || resolvedParam.schema?.type || 'string',
      description: resolvedParam.description || '',
      required: resolvedParam.required || false,
      schema: resolvedParam.schema ? resolveReferences(resolvedParam.schema, spec) : undefined
    };

    switch (resolvedParam.in) {
      case 'header':
        headers.push(paramObj);
        parametersSchema.headers[resolvedParam.name] = paramSchema;
        break;
      case 'query':
        params.push(paramObj);
        parametersSchema.query[resolvedParam.name] = paramSchema;
        break;
      case 'path':
        pathParams.push(paramObj);
        parametersSchema.path[resolvedParam.name] = paramSchema;
        break;
    }
  }

  return { headers, params, pathParams, parametersSchema };
}

/**
 * Extracts request body information from an operation with resolved schemas
 * @param {Object} operation - OpenAPI operation
 * @param {Object} spec - Full specification for schema resolution
 * @returns {Object} Request body data with resolved schemas
 */
function extractRequestBody(operation, spec) {
  const requestBody = operation.requestBody;
  if (!requestBody || !requestBody.content) {
    return {
      requestType: 'none',
      contentType: 'application/json',
      body: '',
      requestBodySchema: null
    };
  }

  const content = requestBody.content;
  const contentTypes = Object.keys(content);

  if (contentTypes.length === 0) {
    return {
      requestType: 'none',
      contentType: 'application/json',
      body: '',
      requestBodySchema: null
    };
  }

  // Build enhanced request body schema with all content types and examples
  const requestBodySchemaData = {
    content: {}
  };

  // Prefer JSON, then form data, then anything else (for default request type/body)
  let selectedContentType = contentTypes[0];
  if (contentTypes.includes('application/json')) {
    selectedContentType = 'application/json';
  } else if (contentTypes.includes('application/x-www-form-urlencoded')) {
    selectedContentType = 'application/x-www-form-urlencoded';
  } else if (contentTypes.includes('multipart/form-data')) {
    selectedContentType = 'multipart/form-data';
  }

  // Extract all content types with their schemas and examples
  for (const [contentType, mediaType] of Object.entries(content)) {
    const contentData = {
      schema: null,
      examples: {}
    };

    // Resolve schema
    if (mediaType.schema) {
      contentData.schema = resolveReferences(mediaType.schema, spec);
    }

    // Extract all named examples
    if (mediaType.examples) {
      for (const [exampleName, exampleDef] of Object.entries(mediaType.examples)) {
        const resolvedExample = resolveReferences(exampleDef, spec);
        contentData.examples[exampleName] = {
          summary: resolvedExample.summary || '',
          description: resolvedExample.description || '',
          value: resolvedExample.value !== undefined ? resolvedExample.value : null
        };
      }
    }
    // If no named examples but has a single example, use it
    else if (mediaType.example !== undefined) {
      contentData.examples['default'] = {
        summary: 'Example',
        description: '',
        value: mediaType.example
      };
    }
    // Generate example from schema if no examples provided
    else if (contentData.schema) {
      contentData.examples['generated'] = {
        summary: 'Generated Example',
        description: '',
        value: generateExampleFromResolvedSchema(contentData.schema)
      };
    }

    requestBodySchemaData.content[contentType] = contentData;
  }

  // Determine request type and content type for the default request editor
  let requestType = 'raw';
  let contentType = 'application/json';

  if (selectedContentType.includes('json')) {
    requestType = 'raw';
    contentType = 'application/json';
  } else if (selectedContentType.includes('form-urlencoded')) {
    requestType = 'url-encoded';
    contentType = 'text/plain';
  } else if (selectedContentType.includes('form-data')) {
    requestType = 'form-data';
    contentType = 'text/plain';
  } else if (selectedContentType.includes('xml')) {
    requestType = 'raw';
    contentType = 'application/xml';
  }

  // Generate default body: prefer examples from spec, otherwise generate from schema
  const selectedMediaType = content[selectedContentType];
  let body = '';

  // First, try to use an example from the OpenAPI spec
  const selectedContentData = requestBodySchemaData.content[selectedContentType];
  if (selectedContentData && selectedContentData.examples) {
    const exampleKeys = Object.keys(selectedContentData.examples);
    if (exampleKeys.length > 0) {
      // Use the first available example
      const firstExampleValue = selectedContentData.examples[exampleKeys[0]].value;
      if (firstExampleValue !== null && firstExampleValue !== undefined) {
        try {
          body = typeof firstExampleValue === 'string'
            ? firstExampleValue
            : JSON.stringify(firstExampleValue, null, 2);
        } catch (_error) {
          // If JSON.stringify fails, generate from schema
          body = generateExampleFromSchema(selectedMediaType?.schema, spec);
        }
      } else {
        // No valid example value, generate from schema
        body = generateExampleFromSchema(selectedMediaType?.schema, spec);
      }
    } else {
      // No examples, generate from schema
      body = generateExampleFromSchema(selectedMediaType?.schema, spec);
    }
  } else {
    // No examples data, generate from schema
    body = generateExampleFromSchema(selectedMediaType?.schema, spec);
  }

  return {
    requestType,
    contentType,
    body,
    requestBodySchema: requestBodySchemaData
  };
}

/**
 * Extracts response schemas from an operation with headers, multiple content types, and examples
 * @param {Object} operation - OpenAPI operation
 * @param {Object} spec - Full specification for schema resolution
 * @returns {Object} Enhanced response schemas by status code
 */
function extractResponseSchemas(operation, spec) {
  const responses = operation.responses || {};
  const responseSchemas = {};

  for (const [statusCode, response] of Object.entries(responses)) {
    const responseData = {
      description: response.description || '',
      headers: {},
      content: {}
    };

    // Extract response headers
    if (response.headers) {
      for (const [headerName, headerDef] of Object.entries(response.headers)) {
        const resolvedHeader = resolveReferences(headerDef, spec);
        responseData.headers[headerName] = {
          schema: resolvedHeader.schema ? resolveReferences(resolvedHeader.schema, spec) : { type: 'string' },
          description: resolvedHeader.description || '',
          required: resolvedHeader.required || false
        };
      }
    }

    // Extract all content types with their schemas and examples
    if (response.content) {
      for (const [contentType, mediaType] of Object.entries(response.content)) {
        const contentData = {
          schema: null,
          examples: {}
        };

        // Resolve schema
        if (mediaType.schema) {
          contentData.schema = resolveReferences(mediaType.schema, spec);
        }

        // Extract all named examples
        if (mediaType.examples) {
          for (const [exampleName, exampleDef] of Object.entries(mediaType.examples)) {
            const resolvedExample = resolveReferences(exampleDef, spec);
            contentData.examples[exampleName] = {
              summary: resolvedExample.summary || '',
              description: resolvedExample.description || '',
              value: resolvedExample.value !== undefined ? resolvedExample.value : null
            };
          }
        }
        // If no named examples but has a single example, use it
        else if (mediaType.example !== undefined) {
          contentData.examples['default'] = {
            summary: 'Example',
            description: '',
            value: mediaType.example
          };
        }
        // Generate example from schema if no examples provided
        else if (contentData.schema) {
          contentData.examples['generated'] = {
            summary: 'Generated Example',
            description: '',
            value: generateExampleFromResolvedSchema(contentData.schema)
          };
        }

        responseData.content[contentType] = contentData;
      }
    }

    // Only add response if it has content or headers
    if (Object.keys(responseData.content).length > 0 || Object.keys(responseData.headers).length > 0) {
      responseSchemas[statusCode] = responseData;
    } else {
      // Store minimal response with just description
      responseSchemas[statusCode] = {
        description: responseData.description,
        headers: {},
        content: {}
      };
    }
  }

  return { responseSchemas };
}

/**
 * Generates example data from a resolved schema (no $refs)
 * @param {Object} schema - Resolved schema object
 * @returns {*} Example data
 */
function generateExampleFromResolvedSchema(schema) {
  if (!schema) return null;

  // Use provided example
  if (schema.example !== undefined) {
    return schema.example;
  }

  // Handle composition keywords
  // allOf: Flatten and merge all schemas (should be rare in resolved schemas)
  if (schema.allOf && Array.isArray(schema.allOf)) {
    const flattened = flattenAllOf(schema);
    return generateExampleFromResolvedSchema(flattened);
  }

  // anyOf: Pick the first alternative
  if (schema.anyOf && Array.isArray(schema.anyOf) && schema.anyOf.length > 0) {
    return generateExampleFromResolvedSchema(schema.anyOf[0]);
  }

  // oneOf: Pick the first alternative
  if (schema.oneOf && Array.isArray(schema.oneOf) && schema.oneOf.length > 0) {
    return generateExampleFromResolvedSchema(schema.oneOf[0]);
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
        return [generateExampleFromResolvedSchema(schema.items)];
      }
      return [];
    case 'object': {
      const obj = {};
      if (schema.properties) {
        for (const [key, prop] of Object.entries(schema.properties)) {
          obj[key] = generateExampleFromResolvedSchema(prop);
        }
      }
      return obj;
    }
    default:
      return null;
  }
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
 * Resolves all $ref references in a schema object recursively
 * @param {Object} schema - Schema object that may contain $ref
 * @param {Object} spec - Full OpenAPI specification for reference resolution
 * @param {Set} visited - Visited references to prevent circular references
 * @returns {Object} Completely resolved schema without any $ref references
 */
function resolveReferences(schema, spec, visited = new Set()) {
  if (!schema || typeof schema !== 'object') {
    return schema;
  }

  // Handle $ref
  if (schema.$ref) {
    const refPath = schema.$ref;

    // Prevent circular references
    if (visited.has(refPath)) {
      return { type: 'object', description: 'Circular reference detected' };
    }

    visited.add(refPath);

    try {
      // Resolve the reference path
      const resolved = resolveReference(refPath, spec);
      const result = resolveReferences(resolved, spec, visited);
      visited.delete(refPath);
      return result;
    } catch (error) {
      console.warn(`Failed to resolve reference ${refPath}:`, error);
      visited.delete(refPath);
      return { type: 'object', description: `Unresolved reference: ${refPath}` };
    }
  }

  // Handle arrays
  if (Array.isArray(schema)) {
    return schema.map(item => resolveReferences(item, spec, visited));
  }

  // Handle objects - recursively resolve all properties
  const resolved = {};
  for (const [key, value] of Object.entries(schema)) {
    resolved[key] = resolveReferences(value, spec, visited);
  }

  return resolved;
}

/**
 * Resolves a single $ref path to the actual schema object
 * @param {string} refPath - Reference path like "#/components/schemas/User"
 * @param {Object} spec - Full OpenAPI specification
 * @returns {Object} Referenced schema object
 */
function resolveReference(refPath, spec) {
  if (!refPath.startsWith('#/')) {
    throw new Error(`External references not supported: ${refPath}`);
  }

  const path = refPath.substring(2).split('/'); // Remove '#/' and split
  let current = spec;

  for (const segment of path) {
    if (!current || typeof current !== 'object' || !(segment in current)) {
      throw new Error(`Reference path not found: ${refPath}`);
    }
    current = current[segment];
  }

  return current;
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

  // Handle composition keywords
  // allOf: Flatten and merge all schemas
  if (schema.allOf && Array.isArray(schema.allOf)) {
    const flattened = flattenAllOf(schema);
    return generateExample(flattened, spec, visited);
  }

  // anyOf: Pick the first alternative
  if (schema.anyOf && Array.isArray(schema.anyOf) && schema.anyOf.length > 0) {
    return generateExample(schema.anyOf[0], spec, visited);
  }

  // oneOf: Pick the first alternative
  if (schema.oneOf && Array.isArray(schema.oneOf) && schema.oneOf.length > 0) {
    return generateExample(schema.oneOf[0], spec, visited);
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
