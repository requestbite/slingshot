import { SchemaTree, SchemaTreeRoot } from './SchemaTree';

export default {
  title: 'Common/SchemaTree',
  component: SchemaTree,
  tags: ['autodocs'],
};

const simpleObjectSchema = {
  type: 'object',
  properties: {
    name: {
      type: 'string',
      description: 'User name'
    },
    email: {
      type: 'string',
      description: 'Email address'
    },
    age: {
      type: 'integer',
      description: 'User age'
    }
  },
  required: ['name', 'email']
};

const nestedObjectSchema = {
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
            firstName: { type: 'string', description: 'First name' },
            lastName: { type: 'string', description: 'Last name' },
            dateOfBirth: { type: 'string', format: 'date', description: 'Date of birth' }
          },
          required: ['firstName', 'lastName']
        },
        contact: {
          type: 'object',
          description: 'Contact information',
          properties: {
            email: { type: 'string', format: 'email', description: 'Email address' },
            phone: { type: 'string', description: 'Phone number' }
          },
          required: ['email']
        }
      },
      required: ['personal', 'contact']
    },
    settings: {
      type: 'object',
      description: 'User settings',
      properties: {
        notifications: { type: 'boolean', description: 'Enable notifications' },
        theme: { type: 'string', description: 'UI theme preference' }
      }
    }
  },
  required: ['user']
};

const arraySchema = {
  type: 'array',
  description: 'List of users',
  items: {
    type: 'object',
    properties: {
      id: { type: 'string', description: 'User ID' },
      name: { type: 'string', description: 'User name' },
      email: { type: 'string', description: 'Email' }
    },
    required: ['id', 'name']
  }
};

const complexArraySchema = {
  type: 'object',
  properties: {
    users: {
      type: 'array',
      description: 'Array of user objects',
      items: {
        type: 'object',
        properties: {
          id: { type: 'integer', description: 'Unique identifier' },
          profile: {
            type: 'object',
            description: 'User profile',
            properties: {
              name: { type: 'string', description: 'Display name' },
              avatar: { type: 'string', description: 'Avatar URL' }
            }
          },
          tags: {
            type: 'array',
            description: 'User tags',
            items: { type: 'string' }
          }
        },
        required: ['id']
      }
    },
    total: {
      type: 'integer',
      description: 'Total number of users'
    }
  },
  required: ['users', 'total']
};

// Simple object
export const SimpleObject = {
  render: () => (
    <div class="p-4 max-w-2xl">
      <SchemaTreeRoot schema={simpleObjectSchema} title="User Schema" />
    </div>
  ),
};

// Nested object
export const NestedObject = {
  render: () => (
    <div class="p-4 max-w-2xl">
      <SchemaTreeRoot schema={nestedObjectSchema} title="Complex User Schema" />
    </div>
  ),
};

// Array schema
export const ArraySchema = {
  render: () => (
    <div class="p-4 max-w-2xl">
      <SchemaTreeRoot schema={arraySchema} title="Users Array" />
    </div>
  ),
};

// Complex array
export const ComplexArraySchema = {
  render: () => (
    <div class="p-4 max-w-2xl">
      <SchemaTreeRoot schema={complexArraySchema} title="Users Response" />
    </div>
  ),
};

// All types showcase
export const AllTypes = {
  render: () => (
    <div class="p-4 max-w-2xl">
      <SchemaTreeRoot
        schema={{
          type: 'object',
          properties: {
            stringField: { type: 'string', description: 'A string field' },
            numberField: { type: 'number', description: 'A number field' },
            integerField: { type: 'integer', description: 'An integer field' },
            booleanField: { type: 'boolean', description: 'A boolean field' },
            arrayField: {
              type: 'array',
              description: 'An array field',
              items: { type: 'string' }
            },
            objectField: {
              type: 'object',
              description: 'An object field',
              properties: {
                nested: { type: 'string', description: 'Nested property' }
              }
            }
          }
        }}
        title="All Schema Types"
      />
    </div>
  ),
};

// Required fields
export const RequiredFields = {
  render: () => (
    <div class="p-4 max-w-2xl">
      <SchemaTreeRoot
        schema={{
          type: 'object',
          properties: {
            requiredString: { type: 'string', description: 'This field is required' },
            optionalString: { type: 'string', description: 'This field is optional' },
            requiredNumber: { type: 'number', description: 'This field is required' },
            optionalNumber: { type: 'number', description: 'This field is optional' }
          },
          required: ['requiredString', 'requiredNumber']
        }}
        title="Required vs Optional Fields"
      />
    </div>
  ),
};

// Without descriptions
export const WithoutDescriptions = {
  render: () => (
    <div class="p-4 max-w-2xl">
      <SchemaTreeRoot
        schema={{
          type: 'object',
          properties: {
            name: { type: 'string' },
            email: { type: 'string' },
            age: { type: 'integer' },
            active: { type: 'boolean' }
          }
        }}
        title="Schema Without Descriptions"
      />
    </div>
  ),
};

// Deeply nested
export const DeeplyNested = {
  render: () => (
    <div class="p-4 max-w-2xl">
      <SchemaTreeRoot
        schema={{
          type: 'object',
          properties: {
            level1: {
              type: 'object',
              description: 'Level 1',
              properties: {
                level2: {
                  type: 'object',
                  description: 'Level 2',
                  properties: {
                    level3: {
                      type: 'object',
                      description: 'Level 3',
                      properties: {
                        level4: {
                          type: 'object',
                          description: 'Level 4',
                          properties: {
                            deepValue: { type: 'string', description: 'A deeply nested value' }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }}
        title="Deeply Nested Schema"
      />
    </div>
  ),
};

// No schema
export const NoSchema = {
  render: () => (
    <div class="p-4 max-w-2xl">
      <SchemaTreeRoot schema={null} title="No Schema Available" />
    </div>
  ),
};

// Multiple schemas side by side
export const MultipleSideBySide = {
  render: () => (
    <div class="p-4 max-w-4xl">
      <div class="grid grid-cols-2 gap-6">
        <div>
          <SchemaTreeRoot schema={simpleObjectSchema} title="Simple Schema" />
        </div>
        <div>
          <SchemaTreeRoot schema={arraySchema} title="Array Schema" />
        </div>
      </div>
    </div>
  ),
};

// API response example
export const APIResponseExample = {
  render: () => (
    <div class="p-4 max-w-2xl">
      <SchemaTreeRoot
        schema={{
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              description: 'Whether the request was successful'
            },
            data: {
              type: 'object',
              description: 'Response data',
              properties: {
                users: {
                  type: 'array',
                  description: 'List of users',
                  items: {
                    type: 'object',
                    properties: {
                      id: { type: 'integer', description: 'User ID' },
                      name: { type: 'string', description: 'Full name' },
                      email: { type: 'string', format: 'email', description: 'Email address' },
                      created_at: { type: 'string', format: 'date-time', description: 'Creation timestamp' }
                    },
                    required: ['id', 'name', 'email']
                  }
                },
                pagination: {
                  type: 'object',
                  description: 'Pagination information',
                  properties: {
                    page: { type: 'integer', description: 'Current page number' },
                    limit: { type: 'integer', description: 'Items per page' },
                    total: { type: 'integer', description: 'Total number of items' }
                  },
                  required: ['page', 'limit', 'total']
                }
              },
              required: ['users', 'pagination']
            }
          },
          required: ['success', 'data']
        }}
        title="GET /api/users - Response Schema"
      />
    </div>
  ),
};
