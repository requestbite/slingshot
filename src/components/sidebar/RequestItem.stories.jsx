import { fn } from 'storybook/test';
import { RequestItem } from './RequestItem';
import { mockContextDecorator } from '../../stories/mocks/mockContext';
import { mockRouterDecorator } from '../../stories/mocks/mockRouter';
import { mockRequests } from '../../stories/mocks/mockData';

export default {
  title: 'Sidebar/RequestItem',
  component: RequestItem,
  tags: ['autodocs'],
  decorators: [mockContextDecorator, mockRouterDecorator],
  argTypes: {
    isSelected: { control: 'boolean' },
    level: { control: 'number' },
    onRequestUpdate: { action: 'onRequestUpdate' },
  },
  args: {
    onRequestUpdate: fn(),
  },
};

// GET request
export const GetRequest = {
  args: {
    request: mockRequests[0], // GET request
    isSelected: false,
    level: 0,
  },
};

// POST request
export const PostRequest = {
  args: {
    request: mockRequests[1], // POST request
    isSelected: false,
    level: 0,
  },
};

// PUT request
export const PutRequest = {
  args: {
    request: mockRequests[2], // PUT request
    isSelected: false,
    level: 0,
  },
};

// DELETE request
export const DeleteRequest = {
  args: {
    request: mockRequests[3], // DELETE request
    isSelected: false,
    level: 0,
  },
};

// Selected state
export const Selected = {
  args: {
    request: mockRequests[0],
    isSelected: true,
    level: 0,
  },
};

// Nested level 1
export const NestedLevel1 = {
  args: {
    request: mockRequests[0],
    isSelected: false,
    level: 1,
  },
};

// Nested level 2
export const NestedLevel2 = {
  args: {
    request: mockRequests[0],
    isSelected: false,
    level: 2,
  },
};

// Nested level 3
export const NestedLevel3 = {
  args: {
    request: mockRequests[0],
    isSelected: false,
    level: 3,
  },
};

// Long request name
export const LongRequestName = {
  args: {
    request: {
      ...mockRequests[0],
      name: 'Get all users with pagination and filtering by status and creation date',
    },
    isSelected: false,
    level: 0,
  },
};

// All HTTP methods showcase
export const AllHTTPMethods = {
  render: () => (
    <div class="bg-white p-4 rounded-lg shadow max-w-md">
      <h3 class="text-sm font-semibold mb-3 text-gray-700">HTTP Methods</h3>
      <ul class="space-y-1">
        <RequestItem
          request={{ id: '1', method: 'GET', name: 'Get Users', collection_id: 'col-1' }}
          isSelected={false}
          level={0}
          onRequestUpdate={fn()}
        />
        <RequestItem
          request={{ id: '2', method: 'POST', name: 'Create User', collection_id: 'col-1' }}
          isSelected={false}
          level={0}
          onRequestUpdate={fn()}
        />
        <RequestItem
          request={{ id: '3', method: 'PUT', name: 'Update User', collection_id: 'col-1' }}
          isSelected={false}
          level={0}
          onRequestUpdate={fn()}
        />
        <RequestItem
          request={{ id: '4', method: 'PATCH', name: 'Partial Update', collection_id: 'col-1' }}
          isSelected={false}
          level={0}
          onRequestUpdate={fn()}
        />
        <RequestItem
          request={{ id: '5', method: 'DELETE', name: 'Delete User', collection_id: 'col-1' }}
          isSelected={false}
          level={0}
          onRequestUpdate={fn()}
        />
        <RequestItem
          request={{ id: '6', method: 'HEAD', name: 'Head Request', collection_id: 'col-1' }}
          isSelected={false}
          level={0}
          onRequestUpdate={fn()}
        />
        <RequestItem
          request={{ id: '7', method: 'OPTIONS', name: 'Options Request', collection_id: 'col-1' }}
          isSelected={false}
          level={0}
          onRequestUpdate={fn()}
        />
      </ul>
    </div>
  ),
};

// Nested folder structure
export const NestedStructure = {
  render: () => (
    <div class="bg-white p-4 rounded-lg shadow max-w-md">
      <h3 class="text-sm font-semibold mb-3 text-gray-700">Folder Structure</h3>
      <ul class="space-y-1">
        <RequestItem
          request={{ id: '1', method: 'GET', name: 'Get Users', collection_id: 'col-1' }}
          isSelected={false}
          level={0}
          onRequestUpdate={fn()}
        />
        <RequestItem
          request={{ id: '2', method: 'GET', name: 'Get User Profile', collection_id: 'col-1' }}
          isSelected={false}
          level={1}
          onRequestUpdate={fn()}
        />
        <RequestItem
          request={{ id: '3', method: 'POST', name: 'Update Avatar', collection_id: 'col-1' }}
          isSelected={false}
          level={2}
          onRequestUpdate={fn()}
        />
        <RequestItem
          request={{ id: '4', method: 'GET', name: 'Get Settings', collection_id: 'col-1' }}
          isSelected={false}
          level={2}
          onRequestUpdate={fn()}
        />
        <RequestItem
          request={{ id: '5', method: 'POST', name: 'Create User', collection_id: 'col-1' }}
          isSelected={true}
          level={0}
          onRequestUpdate={fn()}
        />
      </ul>
    </div>
  ),
};

// Selected with context menu hint
export const WithHoverState = {
  render: () => (
    <div class="bg-white p-4 rounded-lg shadow max-w-md">
      <h3 class="text-sm font-semibold mb-3 text-gray-700">Request List</h3>
      <p class="text-xs text-gray-500 mb-3">Hover over items to see the menu button</p>
      <ul class="space-y-1">
        <RequestItem
          request={{ id: '1', method: 'GET', name: 'Get Users', collection_id: 'col-1' }}
          isSelected={false}
          level={0}
          onRequestUpdate={fn()}
        />
        <RequestItem
          request={{ id: '2', method: 'POST', name: 'Create User', collection_id: 'col-1' }}
          isSelected={true}
          level={0}
          onRequestUpdate={fn()}
        />
        <RequestItem
          request={{ id: '3', method: 'DELETE', name: 'Delete User', collection_id: 'col-1' }}
          isSelected={false}
          level={0}
          onRequestUpdate={fn()}
        />
      </ul>
    </div>
  ),
};

// Untitled request
export const UntitledRequest = {
  args: {
    request: {
      id: 'req-1',
      method: 'GET',
      url: 'https://api.example.com/test',
      name: '',
      collection_id: 'col-1',
    },
    isSelected: false,
    level: 0,
  },
};

// Request with only URL (no name)
export const OnlyURL = {
  args: {
    request: {
      id: 'req-1',
      method: 'GET',
      url: 'https://api.example.com/v1/users',
      name: '',
      collection_id: 'col-1',
    },
    isSelected: false,
    level: 0,
  },
};
