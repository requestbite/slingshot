import { ExampleViewer } from './ExampleViewer';

export default {
  title: 'Common/ExampleViewer',
  component: ExampleViewer,
  tags: ['autodocs'],
  argTypes: {
    title: { control: 'text' },
    contentType: { control: 'text' },
  },
};

const jsonExamples = [
  {
    name: 'Success Response',
    value: {
      success: true,
      data: {
        id: 123,
        name: 'John Doe',
        email: 'john@example.com',
        created_at: '2025-01-01T00:00:00Z'
      }
    }
  },
  {
    name: 'Error Response',
    value: {
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid email format',
        fields: {
          email: 'Must be a valid email address'
        }
      }
    }
  },
  {
    name: 'List Response',
    value: {
      success: true,
      data: {
        users: [
          { id: 1, name: 'Alice' },
          { id: 2, name: 'Bob' },
          { id: 3, name: 'Charlie' }
        ],
        total: 3,
        page: 1,
        limit: 10
      }
    }
  }
];

const xmlExamples = [
  {
    name: 'User XML',
    value: `<?xml version="1.0" encoding="UTF-8"?>
<user>
  <id>123</id>
  <name>John Doe</name>
  <email>john@example.com</email>
  <active>true</active>
</user>`
  },
  {
    name: 'Product XML',
    value: `<?xml version="1.0" encoding="UTF-8"?>
<product>
  <id>456</id>
  <name>Widget</name>
  <price currency="USD">29.99</price>
  <in_stock>true</in_stock>
</product>`
  }
];

// Single JSON example
export const SingleJSONExample = {
  args: {
    examples: [jsonExamples[0]],
    title: 'Response Example',
    contentType: 'application/json',
  },
};

// Multiple JSON examples
export const MultipleJSONExamples = {
  args: {
    examples: jsonExamples,
    title: 'API Response Examples',
    contentType: 'application/json',
  },
};

// XML examples
export const XMLExamples = {
  args: {
    examples: xmlExamples,
    title: 'XML Examples',
    contentType: 'application/xml',
  },
};

// Simple object example
export const SimpleObject = {
  args: {
    examples: [
      {
        name: 'Create User',
        value: {
          name: 'Jane Smith',
          email: 'jane@example.com',
          role: 'admin'
        }
      }
    ],
    title: 'Request Body',
    contentType: 'application/json',
  },
};

// Nested object example
export const NestedObject = {
  args: {
    examples: [
      {
        name: 'Complex User',
        value: {
          user: {
            personal: {
              firstName: 'John',
              lastName: 'Doe',
              dateOfBirth: '1990-01-01'
            },
            contact: {
              email: 'john@example.com',
              phone: '+1234567890',
              address: {
                street: '123 Main St',
                city: 'New York',
                country: 'USA'
              }
            },
            preferences: {
              notifications: true,
              theme: 'dark',
              language: 'en'
            }
          }
        }
      }
    ],
    title: 'User Profile',
    contentType: 'application/json',
  },
};

// Array example
export const ArrayExample = {
  args: {
    examples: [
      {
        name: 'Users List',
        value: [
          { id: 1, name: 'Alice', email: 'alice@example.com' },
          { id: 2, name: 'Bob', email: 'bob@example.com' },
          { id: 3, name: 'Charlie', email: 'charlie@example.com' }
        ]
      }
    ],
    title: 'Users',
    contentType: 'application/json',
  },
};

// String value (JSON string)
export const StringValue = {
  args: {
    examples: [
      {
        name: 'JSON String',
        value: '{"message":"Hello, World!","timestamp":"2025-01-01T00:00:00Z"}'
      }
    ],
    title: 'Example',
    contentType: 'application/json',
  },
};

// Empty examples
export const EmptyExamples = {
  args: {
    examples: [],
    title: 'No Examples',
    contentType: 'application/json',
  },
};

// Multiple examples showcase
export const ManyExamples = {
  args: {
    examples: [
      { name: 'Example 1', value: { status: 'success', code: 200 } },
      { name: 'Example 2', value: { status: 'created', code: 201 } },
      { name: 'Example 3', value: { status: 'accepted', code: 202 } },
      { name: 'Example 4', value: { status: 'no_content', code: 204 } },
      { name: 'Example 5', value: { status: 'bad_request', code: 400 } },
      { name: 'Example 6', value: { status: 'unauthorized', code: 401 } },
      { name: 'Example 7', value: { status: 'forbidden', code: 403 } },
      { name: 'Example 8', value: { status: 'not_found', code: 404 } },
    ],
    title: 'HTTP Status Examples',
    contentType: 'application/json',
  },
};

// Real-world API examples
export const RealWorldAPIExamples = {
  render: () => (
    <div class="p-4 max-w-3xl">
      <h3 class="text-lg font-semibold mb-4">API Documentation Examples</h3>

      <div class="space-y-6">
        <div>
          <h4 class="text-sm font-medium mb-2">Request Examples</h4>
          <ExampleViewer
            examples={[
              {
                name: 'Create User',
                value: {
                  name: 'John Doe',
                  email: 'john@example.com',
                  password: 'secret123',
                  role: 'user'
                }
              },
              {
                name: 'Update Profile',
                value: {
                  bio: 'Software developer',
                  website: 'https://example.com',
                  location: 'New York'
                }
              }
            ]}
            title="Request Body"
            contentType="application/json"
          />
        </div>

        <div>
          <h4 class="text-sm font-medium mb-2">Response Examples</h4>
          <ExampleViewer
            examples={jsonExamples}
            title="API Responses"
            contentType="application/json"
          />
        </div>
      </div>
    </div>
  ),
};

// Without example names (uses default naming)
export const WithoutExampleNames = {
  args: {
    examples: [
      { value: { id: 1, name: 'Example 1' } },
      { value: { id: 2, name: 'Example 2' } },
      { value: { id: 3, name: 'Example 3' } },
    ],
    title: 'Examples',
    contentType: 'application/json',
  },
};
