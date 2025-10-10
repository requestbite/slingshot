import { SchemaViewer, ParametersSchemaViewer, RequestBodySchemaViewer, ResponseSchemasViewer } from './SchemaViewer';

export default {
  title: 'Common/SchemaViewer',
  component: SchemaViewer,
  tags: ['autodocs'],
};

const mockParametersSchema = {
  query: {
    page: {
      type: 'integer',
      description: 'Page number for pagination',
      required: false,
      schema: { type: 'integer', default: 1 }
    },
    limit: {
      type: 'integer',
      description: 'Number of items per page',
      required: false,
      schema: { type: 'integer', default: 10, minimum: 1, maximum: 100 }
    },
    status: {
      type: 'string',
      description: 'Filter by status',
      required: false,
      schema: { type: 'string', enum: ['active', 'inactive', 'pending'] }
    }
  },
  path: {
    userId: {
      type: 'string',
      description: 'The unique identifier of the user',
      required: true,
      schema: { type: 'string', format: 'uuid' }
    }
  },
  headers: {
    'Authorization': {
      type: 'string',
      description: 'Bearer token for authentication',
      required: true,
      schema: { type: 'string' }
    },
    'X-API-Version': {
      type: 'string',
      description: 'API version',
      required: false,
      schema: { type: 'string', default: 'v1' }
    }
  }
};

const mockRequestBodySchema = {
  type: 'object',
  required: ['name', 'email'],
  properties: {
    name: {
      type: 'string',
      description: 'Full name of the user',
      minLength: 1,
      maxLength: 100
    },
    email: {
      type: 'string',
      description: 'Email address',
      format: 'email'
    },
    age: {
      type: 'integer',
      description: 'User age',
      minimum: 18,
      maximum: 120
    },
    active: {
      type: 'boolean',
      description: 'Whether the user is active',
      default: true
    },
    tags: {
      type: 'array',
      description: 'User tags',
      items: {
        type: 'string'
      }
    },
    metadata: {
      type: 'object',
      description: 'Additional metadata',
      properties: {
        source: {
          type: 'string',
          description: 'Source of registration'
        },
        referrer: {
          type: 'string',
          description: 'Referrer URL'
        }
      }
    }
  }
};

const mockResponseSchemas = {
  '200': {
    description: 'Successful response',
    content: {
      'application/json': {
        schema: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              description: 'Whether the request was successful'
            },
            data: {
              type: 'object',
              properties: {
                id: {
                  type: 'string',
                  description: 'User ID',
                  format: 'uuid'
                },
                name: {
                  type: 'string',
                  description: 'User name'
                },
                email: {
                  type: 'string',
                  description: 'User email',
                  format: 'email'
                },
                created_at: {
                  type: 'string',
                  description: 'Creation timestamp',
                  format: 'date-time'
                }
              }
            }
          }
        }
      }
    }
  },
  '400': {
    description: 'Bad request - validation error',
    content: {
      'application/json': {
        schema: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              description: 'Always false for errors'
            },
            error: {
              type: 'object',
              properties: {
                code: {
                  type: 'string',
                  description: 'Error code'
                },
                message: {
                  type: 'string',
                  description: 'Error message'
                },
                fields: {
                  type: 'object',
                  description: 'Field-specific validation errors'
                }
              }
            }
          }
        }
      }
    }
  },
  '404': {
    description: 'Resource not found',
    content: {
      'application/json': {
        schema: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean'
            },
            error: {
              type: 'object',
              properties: {
                code: { type: 'string' },
                message: { type: 'string' }
              }
            }
          }
        }
      }
    }
  }
};

// Parameters only
export const ParametersOnly = {
  render: () => (
    <div class="p-4 max-w-2xl">
      <h3 class="text-lg font-semibold mb-4">Parameters Schema</h3>
      <ParametersSchemaViewer parametersSchema={mockParametersSchema} />
    </div>
  ),
};

// Request body only
export const RequestBodyOnly = {
  render: () => (
    <div class="p-4 max-w-2xl">
      <h3 class="text-lg font-semibold mb-4">Request Body Schema</h3>
      <RequestBodySchemaViewer requestBodySchema={mockRequestBodySchema} />
    </div>
  ),
};

// Response schemas only
export const ResponseSchemasOnly = {
  render: () => (
    <div class="p-4 max-w-2xl">
      <h3 class="text-lg font-semibold mb-4">Response Schemas</h3>
      <ResponseSchemasViewer responseSchemas={mockResponseSchemas} />
    </div>
  ),
};

// Complete schema viewer with all parts
export const Complete = {
  render: () => (
    <div class="p-4 max-w-2xl">
      <h3 class="text-lg font-semibold mb-4">Complete API Schema</h3>
      <SchemaViewer
        parametersSchema={mockParametersSchema}
        requestBodySchema={mockRequestBodySchema}
        responseSchemas={mockResponseSchemas}
      />
    </div>
  ),
};

// Query parameters only
export const QueryParametersOnly = {
  render: () => (
    <div class="p-4 max-w-2xl">
      <h3 class="text-lg font-semibold mb-4">Query Parameters</h3>
      <ParametersSchemaViewer
        parametersSchema={{
          query: mockParametersSchema.query
        }}
      />
    </div>
  ),
};

// Path parameters only
export const PathParametersOnly = {
  render: () => (
    <div class="p-4 max-w-2xl">
      <h3 class="text-lg font-semibold mb-4">Path Parameters</h3>
      <ParametersSchemaViewer
        parametersSchema={{
          path: mockParametersSchema.path
        }}
      />
    </div>
  ),
};

// Headers only
export const HeadersOnly = {
  render: () => (
    <div class="p-4 max-w-2xl">
      <h3 class="text-lg font-semibold mb-4">Request Headers</h3>
      <ParametersSchemaViewer
        parametersSchema={{
          headers: mockParametersSchema.headers
        }}
      />
    </div>
  ),
};

// Simple object schema
export const SimpleObjectSchema = {
  render: () => (
    <div class="p-4 max-w-2xl">
      <h3 class="text-lg font-semibold mb-4">Simple Object Schema</h3>
      <RequestBodySchemaViewer
        requestBodySchema={{
          type: 'object',
          properties: {
            name: { type: 'string', description: 'User name' },
            email: { type: 'string', description: 'Email address' },
            age: { type: 'integer', description: 'User age' }
          },
          required: ['name', 'email']
        }}
      />
    </div>
  ),
};

// Array schema
export const ArraySchema = {
  render: () => (
    <div class="p-4 max-w-2xl">
      <h3 class="text-lg font-semibold mb-4">Array Schema</h3>
      <RequestBodySchemaViewer
        requestBodySchema={{
          type: 'array',
          description: 'List of users',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string', description: 'User ID' },
              name: { type: 'string', description: 'User name' },
              email: { type: 'string', description: 'Email' }
            }
          }
        }}
      />
    </div>
  ),
};

// Nested object schema
export const NestedObjectSchema = {
  render: () => (
    <div class="p-4 max-w-2xl">
      <h3 class="text-lg font-semibold mb-4">Nested Object Schema</h3>
      <RequestBodySchemaViewer
        requestBodySchema={{
          type: 'object',
          properties: {
            user: {
              type: 'object',
              description: 'User information',
              properties: {
                personal: {
                  type: 'object',
                  description: 'Personal details',
                  properties: {
                    firstName: { type: 'string' },
                    lastName: { type: 'string' },
                    dateOfBirth: { type: 'string', format: 'date' }
                  }
                },
                contact: {
                  type: 'object',
                  description: 'Contact information',
                  properties: {
                    email: { type: 'string', format: 'email' },
                    phone: { type: 'string' }
                  }
                }
              }
            },
            settings: {
              type: 'object',
              description: 'User settings',
              properties: {
                notifications: { type: 'boolean' },
                theme: { type: 'string', enum: ['light', 'dark'] }
              }
            }
          }
        }}
      />
    </div>
  ),
};

// Multiple response content types
export const MultipleContentTypes = {
  render: () => (
    <div class="p-4 max-w-2xl">
      <h3 class="text-lg font-semibold mb-4">Multiple Content Types</h3>
      <ResponseSchemasViewer
        responseSchemas={{
          '200': {
            description: 'Successful response',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    data: { type: 'object' }
                  }
                }
              },
              'application/xml': {
                schema: {
                  type: 'object',
                  properties: {
                    root: { type: 'object' }
                  }
                }
              },
              'text/plain': {
                schema: {
                  type: 'string'
                }
              }
            }
          }
        }}
      />
    </div>
  ),
};

// Response with headers
export const ResponseWithHeaders = {
  render: () => (
    <div class="p-4 max-w-2xl">
      <h3 class="text-lg font-semibold mb-4">Response with Headers</h3>
      <ResponseSchemasViewer
        responseSchemas={{
          '200': {
            description: 'Successful response with custom headers',
            headers: {
              'X-Rate-Limit': {
                description: 'Rate limit',
                schema: { type: 'integer' }
              },
              'X-Rate-Remaining': {
                description: 'Remaining requests',
                schema: { type: 'integer' }
              },
              'X-Request-Id': {
                description: 'Request ID for tracking',
                schema: { type: 'string', format: 'uuid' }
              }
            },
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' }
                  }
                }
              }
            }
          }
        }}
      />
    </div>
  ),
};

// Empty schemas
export const EmptySchemas = {
  render: () => (
    <div class="p-4 max-w-2xl">
      <h3 class="text-lg font-semibold mb-4">Empty Schemas</h3>
      <p class="text-sm text-gray-600 mb-4">No schemas available - component should not render</p>
      <SchemaViewer />
    </div>
  ),
};
