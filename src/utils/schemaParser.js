/**
 * @fileoverview Utilities for parsing and processing JSON Schema data from OpenAPI
 */

/**
 * Parses parameters schema from the parameters_schema field
 * @param {string|null} parametersSchemaJson - JSON string from parameters_schema field
 * @returns {Object} Organized parameters by type (headers, query, path)
 */
export function parseParametersSchema(parametersSchemaJson) {
  if (!parametersSchemaJson) {
    return { headers: {}, query: {}, path: {} };
  }

  try {
    const parsed = JSON.parse(parametersSchemaJson);
    return {
      headers: parsed.headers || {},
      query: parsed.query || {},
      path: parsed.path || {}
    };
  } catch (error) {
    console.error('Failed to parse parameters schema:', error);
    return { headers: {}, query: {}, path: {} };
  }
}

/**
 * Parses request body schema from the request_body_schema field
 * @param {string|null} requestBodySchemaJson - JSON string from request_body_schema field
 * @returns {Object|null} Parsed schema object or null
 */
export function parseRequestBodySchema(requestBodySchemaJson) {
  if (!requestBodySchemaJson) {
    return null;
  }

  try {
    return JSON.parse(requestBodySchemaJson);
  } catch (error) {
    console.error('Failed to parse request body schema:', error);
    return null;
  }
}

/**
 * Parses response schemas from the response_schemas field
 * @param {string|null} responseSchemasJson - JSON string from response_schemas field
 * @returns {Object} Object with status codes as keys and enhanced response data
 *
 * New structure (v2):
 * {
 *   statusCode: {
 *     description: "...",
 *     headers: { headerName: { schema, description, required } },
 *     content: {
 *       contentType: { schema: {...}, examples: {...} }
 *     }
 *   }
 * }
 *
 * Legacy structure (v1): { contentType, schema, description }
 */
export function parseResponseSchemas(responseSchemasJson) {
  if (!responseSchemasJson) {
    return {};
  }

  try {
    const parsed = JSON.parse(responseSchemasJson);
    const result = {};

    if (!parsed || typeof parsed !== 'object') {
      return {};
    }

    for (const [statusCode, responseData] of Object.entries(parsed)) {
      if (!responseData) continue;

      // Detect new structure (has 'content' property)
      if (responseData.content !== undefined) {
        result[statusCode] = {
          description: responseData.description || '',
          headers: responseData.headers || {},
          content: responseData.content || {}
        };
      }
      // Legacy structure (has 'schema' property directly)
      else if (responseData.schema) {
        // Convert legacy format to new format
        result[statusCode] = {
          description: responseData.description || '',
          headers: {},
          content: {
            [responseData.contentType || 'application/json']: {
              schema: responseData.schema,
              examples: {}
            }
          }
        };
      }
    }

    return result;
  } catch (error) {
    console.error('Failed to parse response schemas:', error);
    return {};
  }
}

/**
 * Gets available status codes from parsed response schemas
 * @param {Object} responseSchemas - Parsed response schemas object
 * @returns {Array} Array of status code strings sorted numerically
 */
export function getSchemaStatusCodes(responseSchemas) {
  const statusCodes = Object.keys(responseSchemas || {});
  return statusCodes.sort((a, b) => {
    const numA = parseInt(a, 10);
    const numB = parseInt(b, 10);
    return numA - numB;
  });
}

/**
 * Checks if a parameters schema has any parameters
 * @param {Object} parametersSchema - Parsed parameters schema
 * @returns {boolean} True if any parameter type has parameters
 */
export function hasParameters(parametersSchema) {
  if (!parametersSchema) return false;

  return Object.keys(parametersSchema.headers || {}).length > 0 ||
         Object.keys(parametersSchema.query || {}).length > 0 ||
         Object.keys(parametersSchema.path || {}).length > 0;
}

/**
 * Gets parameter sections that have data
 * @param {Object} parametersSchema - Parsed parameters schema
 * @returns {Array} Array of objects with section info
 */
export function getParameterSections(parametersSchema) {
  if (!parametersSchema) return [];

  const sections = [];

  if (Object.keys(parametersSchema.headers || {}).length > 0) {
    sections.push({
      key: 'headers',
      title: 'Headers',
      schema: parametersSchema.headers
    });
  }

  if (Object.keys(parametersSchema.query || {}).length > 0) {
    sections.push({
      key: 'query',
      title: 'Query Parameters',
      schema: parametersSchema.query
    });
  }

  if (Object.keys(parametersSchema.path || {}).length > 0) {
    sections.push({
      key: 'path',
      title: 'Path Parameters',
      schema: parametersSchema.path
    });
  }

  return sections;
}

/**
 * Converts a flat parameters object to a nested schema structure
 * @param {Object} parameters - Flat object of parameter schemas
 * @returns {Object} Schema with properties structure
 */
export function convertParametersToSchema(parameters) {
  if (!parameters || Object.keys(parameters).length === 0) {
    return null;
  }

  const properties = {};
  const required = [];

  for (const [name, paramSchema] of Object.entries(parameters)) {
    properties[name] = {
      type: paramSchema.type || paramSchema.schema?.type || 'string',
      description: paramSchema.description || '',
      ...paramSchema.schema
    };

    if (paramSchema.required) {
      required.push(name);
    }
  }

  return {
    type: 'object',
    properties,
    ...(required.length > 0 && { required })
  };
}

/**
 * Detects if a schema contains composition keywords (anyOf, oneOf, allOf)
 * @param {Object} schema - JSON schema object
 * @returns {Object} Information about detected composition
 */
export function detectSchemaComposition(schema) {
  if (!schema || typeof schema !== 'object') {
    return { hasComposition: false };
  }

  if (schema.anyOf) {
    return { hasComposition: true, type: 'anyOf', options: schema.anyOf };
  }

  if (schema.oneOf) {
    return { hasComposition: true, type: 'oneOf', options: schema.oneOf };
  }

  if (schema.allOf) {
    return { hasComposition: true, type: 'allOf', options: schema.allOf };
  }

  return { hasComposition: false };
}

/**
 * Gets display name for schema composition type
 * @param {string} compositionType - Type of composition (anyOf, oneOf, allOf)
 * @returns {string} Human-readable name
 */
export function getCompositionDisplayName(compositionType) {
  const names = {
    anyOf: 'Any of',
    oneOf: 'One of',
    allOf: 'All of'
  };
  return names[compositionType] || compositionType;
}

/**
 * Gets a display name for a schema option in composition
 * @param {Object} schema - Schema option
 * @param {number} index - Index of the option
 * @returns {string} Display name for the option
 */
export function getSchemaOptionDisplayName(schema, index) {
  if (schema.title) return schema.title;
  if (schema.description) {
    // Use first 30 characters of description
    return schema.description.length > 30
      ? schema.description.substring(0, 30) + '...'
      : schema.description;
  }
  if (schema.type) return `${schema.type} (Option ${index + 1})`;
  return `Option ${index + 1}`;
}