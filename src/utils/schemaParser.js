/**
 * @fileoverview Utilities for parsing and processing JSON Schema data from OpenAPI
 */

/**
 * Deep merge two schemas according to JSON Schema allOf semantics
 * @param {Object} schema1 - First schema
 * @param {Object} schema2 - Second schema
 * @returns {Object} Merged schema
 */
function mergeSchemas(schema1, schema2) {
  // Handle null/undefined
  if (!schema1) return schema2;
  if (!schema2) return schema1;

  const result = { ...schema1 };

  for (const [key, value] of Object.entries(schema2)) {
    if (key === 'properties') {
      // Deep merge properties - recursively flatten any allOf in property schemas
      const mergedProps = { ...(result.properties || {}) };
      for (const [propName, propSchema] of Object.entries(value)) {
        if (mergedProps[propName]) {
          // If property exists in both, merge them
          mergedProps[propName] = mergeSchemas(
            flattenAllOf(mergedProps[propName]),
            flattenAllOf(propSchema)
          );
        } else {
          // New property from schema2
          mergedProps[propName] = flattenAllOf(propSchema);
        }
      }
      result.properties = mergedProps;
    } else if (key === 'required') {
      // Union required fields (remove duplicates)
      const existingRequired = result.required || [];
      const newRequired = value || [];
      result.required = [...new Set([...existingRequired, ...newRequired])];
    } else if (key === 'definitions' || key === 'dependencies' || key === '$defs') {
      // Deep merge definitions/dependencies/$defs
      result[key] = {
        ...(result[key] || {}),
        ...value
      };
    } else if (key === 'type') {
      // Handle type conflicts - if both specify type, they should match
      if (result.type && result.type !== value) {
        console.warn(`Type conflict in allOf merge: ${result.type} vs ${value}`);
      }
      result.type = value;
    } else if (key === 'enum') {
      // Intersect enum values (only values in both)
      if (result.enum && Array.isArray(result.enum) && Array.isArray(value)) {
        result.enum = result.enum.filter(v => value.includes(v));
      } else {
        result.enum = value;
      }
    } else if (key === 'minimum' || key === 'exclusiveMinimum') {
      // Take the maximum of minimums
      if (result[key] !== undefined) {
        result[key] = Math.max(result[key], value);
      } else {
        result[key] = value;
      }
    } else if (key === 'maximum' || key === 'exclusiveMaximum') {
      // Take the minimum of maximums
      if (result[key] !== undefined) {
        result[key] = Math.min(result[key], value);
      } else {
        result[key] = value;
      }
    } else if (key === 'minLength') {
      // Take the maximum of minLengths
      if (result.minLength !== undefined) {
        result.minLength = Math.max(result.minLength, value);
      } else {
        result.minLength = value;
      }
    } else if (key === 'maxLength') {
      // Take the minimum of maxLengths
      if (result.maxLength !== undefined) {
        result.maxLength = Math.min(result.maxLength, value);
      } else {
        result.maxLength = value;
      }
    } else if (key === 'minItems') {
      // Take the maximum of minItems
      if (result.minItems !== undefined) {
        result.minItems = Math.max(result.minItems, value);
      } else {
        result.minItems = value;
      }
    } else if (key === 'maxItems') {
      // Take the minimum of maxItems
      if (result.maxItems !== undefined) {
        result.maxItems = Math.min(result.maxItems, value);
      } else {
        result.maxItems = value;
      }
    } else if (key === 'items') {
      // Merge items schemas
      if (result.items) {
        result.items = mergeSchemas(flattenAllOf(result.items), flattenAllOf(value));
      } else {
        result.items = flattenAllOf(value);
      }
    } else if (result[key] !== undefined && typeof result[key] === 'object' && typeof value === 'object') {
      // For other objects, do a shallow merge
      result[key] = { ...result[key], ...value };
    } else if (result[key] === undefined) {
      // New key from schema2
      result[key] = value;
    }
    // For conflicting primitive values, schema2 takes precedence (already in result)
  }

  return result;
}

/**
 * Flattens allOf schema composition by merging all schemas in the allOf array
 * @param {Object} schema - Schema that may contain allOf
 * @returns {Object} Flattened schema
 */
export function flattenAllOf(schema) {
  if (!schema || typeof schema !== 'object') {
    return schema;
  }

  // If no allOf, return as-is (but check properties for nested allOf)
  if (!schema.allOf || !Array.isArray(schema.allOf)) {
    // Still need to recursively flatten nested allOf in properties
    if (schema.properties) {
      const flattenedProps = {};
      for (const [propName, propSchema] of Object.entries(schema.properties)) {
        flattenedProps[propName] = flattenAllOf(propSchema);
      }
      return { ...schema, properties: flattenedProps };
    }
    return schema;
  }

  // Start with base schema (without allOf)
  const { allOf, ...baseSchema } = schema;

  // Merge all schemas in allOf array
  const merged = allOf.reduce((acc, subSchema) => {
    return mergeSchemas(acc, flattenAllOf(subSchema)); // Recursive to handle nested allOf
  }, baseSchema);

  return merged;
}

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
 *
 * New structure (v2): { content: { contentType: { schema, examples } } }
 * Legacy structure (v1): { type: "object", properties: {...}, ... } (single schema)
 */
export function parseRequestBodySchema(requestBodySchemaJson) {
  if (!requestBodySchemaJson) {
    return null;
  }

  try {
    const parsed = JSON.parse(requestBodySchemaJson);

    // Detect new structure (has 'content' property)
    if (parsed && parsed.content !== undefined) {
      // Flatten allOf in each content type schema
      const flattenedContent = {};
      for (const [contentType, contentData] of Object.entries(parsed.content)) {
        flattenedContent[contentType] = {
          ...contentData,
          schema: contentData.schema ? flattenAllOf(contentData.schema) : contentData.schema
        };
      }
      return { ...parsed, content: flattenedContent };
    }

    // Legacy structure - convert to new format with default content type
    if (parsed && typeof parsed === 'object' && !parsed.content) {
      return {
        content: {
          'application/json': {
            schema: flattenAllOf(parsed),
            examples: {}
          }
        }
      };
    }

    return parsed;
  } catch (error) {
    console.error('Failed to parse request body schema:', error);
    return null;
  }
}

/**
 * Gets all available content types from a parsed request body schema
 * @param {Object|null} requestBodySchema - Parsed request body schema
 * @returns {Array} Array of content type strings
 */
export function getRequestBodyContentTypes(requestBodySchema) {
  if (!requestBodySchema || !requestBodySchema.content) {
    return [];
  }
  return Object.keys(requestBodySchema.content);
}

/**
 * Gets the schema for a specific content type from request body schema
 * @param {Object|null} requestBodySchema - Parsed request body schema
 * @param {string} contentType - Content type to get schema for
 * @returns {Object|null} Schema object or null
 */
export function getRequestBodySchemaForContentType(requestBodySchema, contentType) {
  if (!requestBodySchema || !requestBodySchema.content || !requestBodySchema.content[contentType]) {
    return null;
  }
  return requestBodySchema.content[contentType].schema || null;
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
        // Flatten allOf in each content type schema
        const flattenedContent = {};
        for (const [contentType, contentData] of Object.entries(responseData.content)) {
          flattenedContent[contentType] = {
            ...contentData,
            schema: contentData.schema ? flattenAllOf(contentData.schema) : contentData.schema
          };
        }
        result[statusCode] = {
          description: responseData.description || '',
          headers: responseData.headers || {},
          content: flattenedContent
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
              schema: flattenAllOf(responseData.schema),
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
    const baseProperty = {
      type: paramSchema.type || paramSchema.schema?.type || 'string',
      description: paramSchema.description || '',
      ...paramSchema.schema
    };

    // Flatten allOf in the property schema
    properties[name] = flattenAllOf(baseProperty);

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
 * Detects if a schema contains composition keywords (anyOf, oneOf)
 * Note: allOf is auto-flattened and not returned as a composition
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

  // allOf is no longer treated as a composition - it's auto-flattened
  // during parsing via flattenAllOf()

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
  if (schema.type) return `${schema.type} (Option ${index + 1})`;
  return `Option ${index + 1}`;
}