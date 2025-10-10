import { fn } from 'storybook/test';
import { useState } from 'preact/hooks';
import { ParamsTab } from './ParamsTab';
import { mockContextDecorator } from '../../../stories/mocks/mockContext';
import { mockEnvironment } from '../../../stories/mocks/mockData';

export default {
  title: 'Request/ParamsTab',
  component: ParamsTab,
  tags: ['autodocs'],
  decorators: [mockContextDecorator],
  argTypes: {
    onQueryParamsChange: { action: 'onQueryParamsChange' },
    onPathParamsChange: { action: 'onPathParamsChange' },
    onEnterKeyPress: { action: 'onEnterKeyPress' },
  },
  args: {
    onQueryParamsChange: fn(),
    onPathParamsChange: fn(),
    onEnterKeyPress: fn(),
  },
};

const sampleQueryParams = [
  { id: '1', key: 'page', value: '1', enabled: true },
  { id: '2', key: 'limit', value: '10', enabled: true },
  { id: '3', key: 'sort', value: 'created_at', enabled: true },
  { id: '4', key: 'order', value: 'desc', enabled: false },
];

const samplePathParams = [
  { id: '1', key: 'userId', value: '123', enabled: true },
  { id: '2', key: 'postId', value: '456', enabled: true },
];

// With query and path params
export const WithBothParams = {
  args: {
    queryParams: sampleQueryParams,
    pathParams: samplePathParams,
    selectedEnvironment: null,
  },
};

// Only query params
export const OnlyQueryParams = {
  args: {
    queryParams: sampleQueryParams,
    pathParams: [],
    selectedEnvironment: null,
  },
};

// Only path params
export const OnlyPathParams = {
  args: {
    queryParams: [],
    pathParams: samplePathParams,
    selectedEnvironment: null,
  },
};

// No params
export const NoParams = {
  args: {
    queryParams: [],
    pathParams: [],
    selectedEnvironment: null,
  },
};

// With disabled params
export const WithDisabledParams = {
  args: {
    queryParams: [
      { id: '1', key: 'page', value: '1', enabled: true },
      { id: '2', key: 'limit', value: '10', enabled: false },
      { id: '3', key: 'filter', value: 'active', enabled: false },
    ],
    pathParams: [
      { id: '1', key: 'userId', value: '123', enabled: true },
      { id: '2', key: 'resourceId', value: '789', enabled: false },
    ],
    selectedEnvironment: null,
  },
};

// With variables
export const WithVariables = {
  args: {
    queryParams: [
      { id: '1', key: 'apiKey', value: '{{apiKey}}', enabled: true },
      { id: '2', key: 'version', value: '{{version}}', enabled: true },
    ],
    pathParams: [
      { id: '1', key: 'userId', value: '{{userId}}', enabled: true },
    ],
    selectedEnvironment: mockEnvironment,
  },
};

// Many params
export const ManyParams = {
  args: {
    queryParams: Array.from({ length: 10 }, (_, i) => ({
      id: `q${i}`,
      key: `param${i + 1}`,
      value: `value${i + 1}`,
      enabled: i % 3 !== 0,
    })),
    pathParams: Array.from({ length: 5 }, (_, i) => ({
      id: `p${i}`,
      key: `path${i + 1}`,
      value: `value${i + 1}`,
      enabled: true,
    })),
    selectedEnvironment: null,
  },
};

// Interactive example
export const Interactive = {
  render: () => {
    const Example = () => {
      const [queryParams, setQueryParams] = useState(sampleQueryParams);
      const [pathParams, setPathParams] = useState(samplePathParams);

      return (
        <div class="p-4 max-w-3xl">
          <h3 class="text-lg font-semibold mb-4">Request Parameters</h3>
          <div class="bg-white border border-gray-200 rounded-lg p-4">
            <ParamsTab
              queryParams={queryParams}
              pathParams={pathParams}
              onQueryParamsChange={setQueryParams}
              onPathParamsChange={setPathParams}
              onEnterKeyPress={(e) => console.log('Enter pressed', e)}
              selectedEnvironment={null}
            />
          </div>

          <div class="mt-6 p-4 bg-gray-50 rounded-md">
            <h4 class="text-sm font-semibold mb-2">Current State:</h4>
            <div class="grid grid-cols-2 gap-4 text-xs">
              <div>
                <p class="font-medium mb-1">Query Params:</p>
                <pre class="bg-white p-2 rounded overflow-auto">
                  {JSON.stringify(queryParams, null, 2)}
                </pre>
              </div>
              <div>
                <p class="font-medium mb-1">Path Params:</p>
                <pre class="bg-white p-2 rounded overflow-auto">
                  {JSON.stringify(pathParams, null, 2)}
                </pre>
              </div>
            </div>
          </div>
        </div>
      );
    };

    return <Example />;
  },
};

// Long values
export const LongValues = {
  args: {
    queryParams: [
      {
        id: '1',
        key: 'token',
        value: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ',
        enabled: true
      },
      {
        id: '2',
        key: 'callback_url',
        value: 'https://example.com/api/v1/callbacks/webhook?session=abc123&redirect=https://app.example.com/dashboard',
        enabled: true
      },
    ],
    pathParams: [],
    selectedEnvironment: null,
  },
};
