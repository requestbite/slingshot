/**
 * Mock data for Storybook stories
 */

export const mockCollection = {
  id: 'col-1',
  name: 'My API Collection',
  description: 'Sample API collection for testing',
  created_at: '2025-01-01T00:00:00Z',
  updated_at: '2025-01-01T00:00:00Z',
  environment_id: 'env-1',
  variables: [
    { key: 'apiKey', value: 'test-api-key-123' },
    { key: 'baseUrl', value: 'https://api.example.com' }
  ]
};

export const mockCollections = [
  mockCollection,
  {
    id: 'col-2',
    name: 'E-commerce API',
    description: 'E-commerce platform API',
    created_at: '2025-01-02T00:00:00Z',
    updated_at: '2025-01-02T00:00:00Z',
  },
  {
    id: 'col-3',
    name: 'Weather API',
    description: 'Weather data API collection',
    created_at: '2025-01-03T00:00:00Z',
    updated_at: '2025-01-03T00:00:00Z',
  }
];

export const mockRequest = {
  id: 'req-1',
  collection_id: 'col-1',
  name: 'Get Users',
  method: 'GET',
  url: 'https://api.example.com/users',
  headers: [
    { key: 'Content-Type', value: 'application/json', enabled: true },
    { key: 'Authorization', value: 'Bearer {{token}}', enabled: true }
  ],
  params: [
    { key: 'page', value: '1', enabled: true },
    { key: 'limit', value: '10', enabled: true }
  ],
  path_params: [],
  request_type: 'none',
  body_content: '',
  created_at: '2025-01-01T00:00:00Z',
  updated_at: '2025-01-01T00:00:00Z',
};

export const mockRequests = [
  mockRequest,
  {
    id: 'req-2',
    collection_id: 'col-1',
    name: 'Create User',
    method: 'POST',
    url: 'https://api.example.com/users',
    headers: [
      { key: 'Content-Type', value: 'application/json', enabled: true }
    ],
    params: [],
    path_params: [],
    request_type: 'json',
    body_content: '{\n  "name": "John Doe",\n  "email": "john@example.com"\n}',
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
  },
  {
    id: 'req-3',
    collection_id: 'col-1',
    name: 'Update User',
    method: 'PUT',
    url: 'https://api.example.com/users/{{userId}}',
    headers: [
      { key: 'Content-Type', value: 'application/json', enabled: true }
    ],
    params: [],
    path_params: [
      { key: 'userId', value: '123', enabled: true }
    ],
    request_type: 'json',
    body_content: '{\n  "name": "Jane Doe"\n}',
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
  },
  {
    id: 'req-4',
    collection_id: 'col-1',
    name: 'Delete User',
    method: 'DELETE',
    url: 'https://api.example.com/users/{{userId}}',
    headers: [],
    params: [],
    path_params: [
      { key: 'userId', value: '123', enabled: true }
    ],
    request_type: 'none',
    body_content: '',
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
  }
];

export const mockEnvironment = {
  id: 'env-1',
  name: 'Development',
  variables: [
    { key: 'apiUrl', value: 'https://dev-api.example.com' },
    { key: 'token', value: 'dev-token-123' }
  ],
  created_at: '2025-01-01T00:00:00Z',
  updated_at: '2025-01-01T00:00:00Z',
};

export const mockEnvironments = [
  mockEnvironment,
  {
    id: 'env-2',
    name: 'Staging',
    variables: [
      { key: 'apiUrl', value: 'https://staging-api.example.com' },
      { key: 'token', value: 'staging-token-456' }
    ],
    created_at: '2025-01-02T00:00:00Z',
    updated_at: '2025-01-02T00:00:00Z',
  },
  {
    id: 'env-3',
    name: 'Production',
    variables: [
      { key: 'apiUrl', value: 'https://api.example.com' },
      { key: 'token', value: 'prod-token-789' }
    ],
    created_at: '2025-01-03T00:00:00Z',
    updated_at: '2025-01-03T00:00:00Z',
  }
];

export const mockFolder = {
  id: 'folder-1',
  collection_id: 'col-1',
  name: 'User Management',
  parent_id: null,
  created_at: '2025-01-01T00:00:00Z',
  updated_at: '2025-01-01T00:00:00Z',
};

export const mockFolders = [
  mockFolder,
  {
    id: 'folder-2',
    collection_id: 'col-1',
    name: 'Authentication',
    parent_id: null,
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
  },
  {
    id: 'folder-3',
    collection_id: 'col-1',
    name: 'Products',
    parent_id: 'folder-1',
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
  }
];

export const mockResponse = {
  status: 200,
  statusText: 'OK',
  headers: {
    'content-type': 'application/json',
    'content-length': '1234',
    'cache-control': 'no-cache',
    'x-request-id': 'abc-123'
  },
  body: JSON.stringify({
    success: true,
    data: {
      users: [
        { id: 1, name: 'John Doe', email: 'john@example.com' },
        { id: 2, name: 'Jane Smith', email: 'jane@example.com' },
        { id: 3, name: 'Bob Johnson', email: 'bob@example.com' }
      ],
      total: 3,
      page: 1,
      limit: 10
    }
  }, null, 2),
  duration: 145,
  size: 1234
};

export const mockErrorResponse = {
  status: 404,
  statusText: 'Not Found',
  headers: {
    'content-type': 'application/json'
  },
  body: JSON.stringify({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: 'The requested resource was not found'
    }
  }, null, 2),
  duration: 89,
  size: 156
};

export const mockVariables = new Map([
  ['apiKey', 'test-api-key-123'],
  ['baseUrl', 'https://api.example.com'],
  ['token', 'bearer-token-456'],
  ['userId', '123'],
  ['version', 'v1']
]);
