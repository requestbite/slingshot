import { fn } from 'storybook/test';
import { useState } from 'preact/hooks';
import { HeadersTab } from './HeadersTab';
import { mockContextDecorator } from '../../../stories/mocks/mockContext';

export default {
  title: 'Request/HeadersTab',
  component: HeadersTab,
  tags: ['autodocs'],
  decorators: [mockContextDecorator],
  argTypes: {
    onHeadersChange: { action: 'onHeadersChange' },
    onEnterKeyPress: { action: 'onEnterKeyPress' },
  },
  args: {
    onHeadersChange: fn(),
    onEnterKeyPress: fn(),
  },
};

const sampleHeaders = [
  { id: '1', key: 'Content-Type', value: 'application/json', enabled: true },
  { id: '2', key: 'Authorization', value: 'Bearer {{token}}', enabled: true },
  { id: '3', key: 'X-API-Key', value: '{{apiKey}}', enabled: true },
  { id: '4', key: 'Accept', value: 'application/json', enabled: false },
];

// With headers
export const WithHeaders = {
  args: {
    headers: sampleHeaders,
    selectedEnvironment: null,
  },
};

// Empty headers (initial state)
export const EmptyHeaders = {
  args: {
    headers: [],
    selectedEnvironment: null,
  },
};

// Single header
export const SingleHeader = {
  args: {
    headers: [sampleHeaders[0]],
    selectedEnvironment: null,
  },
};

// With disabled headers
export const WithDisabledHeaders = {
  args: {
    headers: [
      { id: '1', key: 'Content-Type', value: 'application/json', enabled: true },
      { id: '2', key: 'Authorization', value: 'Bearer token123', enabled: false },
      { id: '3', key: 'X-Custom-Header', value: 'custom-value', enabled: false },
    ],
    selectedEnvironment: null,
  },
};

// Common HTTP headers
export const CommonHTTPHeaders = {
  args: {
    headers: [
      { id: '1', key: 'Accept', value: 'application/json', enabled: true },
      { id: '2', key: 'Accept-Encoding', value: 'gzip, deflate, br', enabled: true },
      { id: '3', key: 'Accept-Language', value: 'en-US,en;q=0.9', enabled: true },
      { id: '4', key: 'Cache-Control', value: 'no-cache', enabled: true },
      { id: '5', key: 'Connection', value: 'keep-alive', enabled: true },
      { id: '6', key: 'User-Agent', value: 'Mozilla/5.0', enabled: true },
    ],
    selectedEnvironment: null,
  },
};

// Authentication headers
export const AuthenticationHeaders = {
  args: {
    headers: [
      { id: '1', key: 'Authorization', value: 'Bearer {{accessToken}}', enabled: true },
      { id: '2', key: 'X-API-Key', value: '{{apiKey}}', enabled: true },
      { id: '3', key: 'X-Auth-Token', value: '{{authToken}}', enabled: true },
    ],
    selectedEnvironment: null,
  },
};

// Many headers
export const ManyHeaders = {
  args: {
    headers: Array.from({ length: 15 }, (_, i) => ({
      id: `${i + 1}`,
      key: `X-Custom-Header-${i + 1}`,
      value: `value-${i + 1}`,
      enabled: i % 3 !== 0,
    })),
    selectedEnvironment: null,
  },
};

// Interactive example
export const Interactive = {
  render: () => {
    const Example = () => {
      const [headers, setHeaders] = useState(sampleHeaders);

      return (
        <div class="p-4 max-w-3xl">
          <h3 class="text-lg font-semibold mb-4">Request Headers</h3>
          <div class="bg-white border border-gray-200 rounded-lg p-4">
            <HeadersTab
              headers={headers}
              onHeadersChange={setHeaders}
              onEnterKeyPress={(e) => console.log('Enter pressed', e)}
              selectedEnvironment={null}
            />
          </div>

          <div class="mt-6 p-4 bg-gray-50 rounded-md">
            <h4 class="text-sm font-semibold mb-2">Current Headers ({headers.length}):</h4>
            <pre class="bg-white p-3 rounded overflow-auto text-xs">
              {JSON.stringify(headers, null, 2)}
            </pre>
          </div>

          <div class="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
            <p class="text-xs text-blue-900">
              <strong>Tip:</strong> Click the + button to add new headers. Click the × to remove them.
            </p>
          </div>
        </div>
      );
    };

    return <Example />;
  },
};

// Long header values
export const LongHeaderValues = {
  args: {
    headers: [
      {
        id: '1',
        key: 'Authorization',
        value: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c',
        enabled: true
      },
      {
        id: '2',
        key: 'Cookie',
        value: 'session=abc123def456; user_id=789; preferences={"theme":"dark","lang":"en"}',
        enabled: true
      },
    ],
    selectedEnvironment: null,
  },
};
