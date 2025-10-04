/**
 * @fileoverview Utilities for parsing and processing request/response examples from OpenAPI data
 */

/**
 * Parses request examples from the request_example field
 * @param {string|null} requestExampleJson - JSON string from request_example field
 * @returns {Array} Array of example objects with name/value properties
 */
export function parseRequestExamples(requestExampleJson) {
  if (!requestExampleJson) {
    return [];
  }

  try {
    const parsed = JSON.parse(requestExampleJson);

    // If it's already an array of examples
    if (Array.isArray(parsed)) {
      return parsed.map((example, index) => ({
        name: example.name || example.summary || `Example ${index + 1}`,
        value: example.value || example,
        summary: example.summary || '',
        description: example.description || ''
      }));
    }

    // If it's a single example object
    if (parsed && typeof parsed === 'object') {
      return [{
        name: parsed.name || parsed.summary || 'Example',
        value: parsed.value || parsed,
        summary: parsed.summary || '',
        description: parsed.description || ''
      }];
    }

    // If it's a primitive value, wrap it
    return [{
      name: 'Example',
      value: parsed,
      summary: '',
      description: ''
    }];
  } catch (error) {
    console.error('Failed to parse request examples:', error);
    return [];
  }
}

/**
 * Parses response examples from the response_examples field
 * @param {string|null} responseExamplesJson - JSON string from response_examples field
 * @returns {Object} Object with status codes as keys and example arrays as values
 */
export function parseResponseExamples(responseExamplesJson) {
  if (!responseExamplesJson) {
    return {};
  }

  try {
    const parsed = JSON.parse(responseExamplesJson);
    const result = {};

    if (!parsed || typeof parsed !== 'object') {
      return {};
    }

    // Process each status code
    for (const [statusCode, examples] of Object.entries(parsed)) {
      if (!examples) {
        result[statusCode] = [];
        continue;
      }

      // If examples is an array
      if (Array.isArray(examples)) {
        result[statusCode] = examples.map((example, index) => ({
          name: example.name || example.summary || `Example ${index + 1}`,
          value: example.value || example,
          summary: example.summary || '',
          description: example.description || ''
        }));
      }
      // If examples is a single object
      else if (typeof examples === 'object') {
        result[statusCode] = [{
          name: examples.name || examples.summary || 'Example',
          value: examples.value || examples,
          summary: examples.summary || '',
          description: examples.description || ''
        }];
      }
      // If examples is a primitive value
      else {
        result[statusCode] = [{
          name: 'Example',
          value: examples,
          summary: '',
          description: ''
        }];
      }
    }

    return result;
  } catch (error) {
    console.error('Failed to parse response examples:', error);
    return {};
  }
}

/**
 * Extracts response examples from the new response_schemas structure
 * @param {Object} responseSchemas - Parsed response schemas object (from parseResponseSchemas)
 * @returns {Object} Nested object: { statusCode: { contentType: [examples] } }
 */
export function extractResponseExamplesFromSchemas(responseSchemas) {
  const result = {};

  if (!responseSchemas || typeof responseSchemas !== 'object') {
    return {};
  }

  for (const [statusCode, responseData] of Object.entries(responseSchemas)) {
    if (!responseData || !responseData.content) continue;

    result[statusCode] = {};

    for (const [contentType, contentData] of Object.entries(responseData.content)) {
      if (!contentData || !contentData.examples) continue;

      const examplesArray = [];

      for (const [exampleName, exampleData] of Object.entries(contentData.examples)) {
        examplesArray.push({
          name: exampleData.summary || exampleName,
          value: exampleData.value,
          summary: exampleData.summary || '',
          description: exampleData.description || ''
        });
      }

      if (examplesArray.length > 0) {
        result[statusCode][contentType] = examplesArray;
      }
    }

    // Clean up empty status codes
    if (Object.keys(result[statusCode]).length === 0) {
      delete result[statusCode];
    }
  }

  return result;
}

/**
 * Gets all available status codes from response examples
 * @param {Object} responseExamples - Parsed response examples object
 * @returns {Array} Array of status code strings sorted numerically
 */
export function getResponseStatusCodes(responseExamples) {
  const statusCodes = Object.keys(responseExamples || {});
  return statusCodes.sort((a, b) => {
    const numA = parseInt(a, 10);
    const numB = parseInt(b, 10);
    return numA - numB;
  });
}

/**
 * Gets the display name for a status code
 * @param {string} statusCode - HTTP status code
 * @returns {string} Human-readable status code name
 */
export function getStatusCodeDisplayName(statusCode) {
  const statusTexts = {
    '200': '200 OK',
    '201': '201 Created',
    '204': '204 No Content',
    '400': '400 Bad Request',
    '401': '401 Unauthorized',
    '403': '403 Forbidden',
    '404': '404 Not Found',
    '409': '409 Conflict',
    '422': '422 Unprocessable Entity',
    '500': '500 Internal Server Error',
    '502': '502 Bad Gateway',
    '503': '503 Service Unavailable'
  };

  return statusTexts[statusCode] || `${statusCode} Response`;
}

/**
 * Gets all available content types for a specific status code from response examples
 * @param {Object} responseExamples - Response examples object from extractResponseExamplesFromSchemas
 * @param {string} statusCode - HTTP status code
 * @returns {Array} Array of content type strings
 */
export function getContentTypesForStatus(responseExamples, statusCode) {
  if (!responseExamples || !responseExamples[statusCode]) {
    return [];
  }
  return Object.keys(responseExamples[statusCode]);
}

/**
 * Gets display name for a content type
 * @param {string} contentType - Content type string
 * @returns {string} Human-readable content type name
 */
export function getContentTypeDisplayName(contentType) {
  const displayNames = {
    'application/json': 'JSON',
    'application/xml': 'XML',
    'text/xml': 'XML',
    'application/x-www-form-urlencoded': 'Form URL Encoded',
    'multipart/form-data': 'Form Data',
    'text/plain': 'Plain Text',
    'text/html': 'HTML'
  };
  return displayNames[contentType] || contentType;
}

/**
 * Determines content type for examples based on request data
 * @param {Object} request - Request object
 * @param {string} type - 'request' or 'response'
 * @returns {string} Content type for syntax highlighting
 */
export function getExampleContentType(request, type = 'request') {
  if (type === 'request') {
    // Check request content type
    if (request.content_type?.includes('json') || request.requestType === 'raw') {
      return 'application/json';
    } else if (request.content_type?.includes('xml')) {
      return 'application/xml';
    }
    return 'application/json'; // Default to JSON
  } else {
    // For responses, default to JSON but could be extended to check response headers
    return 'application/json';
  }
}