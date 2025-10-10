import { fn } from 'storybook/test';
import { FolderItem } from './FolderItem';
import { mockContextDecorator } from '../../stories/mocks/mockContext';
import { mockRouterDecorator } from '../../stories/mocks/mockRouter';
import { mockFolders, mockRequests } from '../../stories/mocks/mockData';

export default {
  title: 'Sidebar/FolderItem',
  component: FolderItem,
  tags: ['autodocs'],
  decorators: [mockContextDecorator, mockRouterDecorator],
  argTypes: {
    level: { control: 'number' },
    onFolderUpdate: { action: 'onFolderUpdate' },
  },
  args: {
    onFolderUpdate: fn(),
  },
};

// Basic folder (collapsed by default in story, but component default is expanded)
export const BasicFolder = {
  args: {
    folder: mockFolders[0],
    requests: [],
    subfolders: [],
    selectedRequestId: null,
    level: 0,
  },
};

// Folder with requests
export const FolderWithRequests = {
  args: {
    folder: mockFolders[0],
    requests: mockRequests.slice(0, 3),
    subfolders: [],
    selectedRequestId: null,
    level: 0,
  },
};

// Folder with selected request
export const FolderWithSelectedRequest = {
  args: {
    folder: mockFolders[0],
    requests: mockRequests.slice(0, 3),
    subfolders: [],
    selectedRequestId: mockRequests[1].id,
    level: 0,
  },
};

// Nested folder (level 1)
export const NestedLevel1 = {
  args: {
    folder: mockFolders[2],
    requests: mockRequests.slice(0, 2),
    subfolders: [],
    selectedRequestId: null,
    level: 1,
  },
};

// Nested folder (level 2)
export const NestedLevel2 = {
  args: {
    folder: mockFolders[2],
    requests: mockRequests.slice(0, 2),
    subfolders: [],
    selectedRequestId: null,
    level: 2,
  },
};

// Folder with subfolders
export const FolderWithSubfolders = {
  args: {
    folder: mockFolders[0],
    requests: mockRequests.slice(0, 2),
    subfolders: [mockFolders[2]],
    selectedRequestId: null,
    level: 0,
  },
};

// Empty folder
export const EmptyFolder = {
  args: {
    folder: {
      id: 'folder-empty',
      collection_id: 'col-1',
      name: 'Empty Folder',
      parent_id: null,
    },
    requests: [],
    subfolders: [],
    selectedRequestId: null,
    level: 0,
  },
};

// Long folder name
export const LongFolderName = {
  args: {
    folder: {
      ...mockFolders[0],
      name: 'Very Long Folder Name That Should Be Truncated When Displayed',
    },
    requests: mockRequests.slice(0, 2),
    subfolders: [],
    selectedRequestId: null,
    level: 0,
  },
};

// Complex nested structure
export const ComplexStructure = {
  render: () => (
    <div class="bg-white p-4 rounded-lg shadow max-w-md">
      <h3 class="text-sm font-semibold mb-3 text-gray-700">Complex Folder Structure</h3>
      <div class="space-y-1">
        <FolderItem
          folder={{ id: 'f1', name: 'Authentication', collection_id: 'col-1' }}
          requests={[
            { id: 'r1', method: 'POST', name: 'Login', collection_id: 'col-1' },
            { id: 'r2', method: 'POST', name: 'Register', collection_id: 'col-1' },
            { id: 'r3', method: 'POST', name: 'Logout', collection_id: 'col-1' },
          ]}
          subfolders={[]}
          selectedRequestId={null}
          level={0}
          onFolderUpdate={fn()}
        />
        <FolderItem
          folder={{ id: 'f2', name: 'Users', collection_id: 'col-1' }}
          requests={[
            { id: 'r4', method: 'GET', name: 'Get Users', collection_id: 'col-1' },
            { id: 'r5', method: 'POST', name: 'Create User', collection_id: 'col-1' },
          ]}
          subfolders={[
            { id: 'f3', name: 'Profile', collection_id: 'col-1', parent_id: 'f2' }
          ]}
          selectedRequestId="r4"
          level={0}
          onFolderUpdate={fn()}
        />
        <div class="ml-10">
          <FolderItem
            folder={{ id: 'f3', name: 'Profile', collection_id: 'col-1', parent_id: 'f2' }}
            requests={[
              { id: 'r6', method: 'GET', name: 'Get Profile', collection_id: 'col-1' },
              { id: 'r7', method: 'PUT', name: 'Update Profile', collection_id: 'col-1' },
            ]}
            subfolders={[]}
            selectedRequestId={null}
            level={1}
            onFolderUpdate={fn()}
          />
        </div>
        <FolderItem
          folder={{ id: 'f4', name: 'Products', collection_id: 'col-1' }}
          requests={[
            { id: 'r8', method: 'GET', name: 'List Products', collection_id: 'col-1' },
            { id: 'r9', method: 'POST', name: 'Create Product', collection_id: 'col-1' },
            { id: 'r10', method: 'DELETE', name: 'Delete Product', collection_id: 'col-1' },
          ]}
          subfolders={[]}
          selectedRequestId={null}
          level={0}
          onFolderUpdate={fn()}
        />
      </div>
    </div>
  ),
};

// Multiple folders showcase
export const MultipleFolders = {
  render: () => (
    <div class="bg-white p-4 rounded-lg shadow max-w-md">
      <h3 class="text-sm font-semibold mb-3 text-gray-700">Multiple Folders</h3>
      <div class="space-y-1">
        {mockFolders.map((folder, index) => (
          <FolderItem
            key={folder.id}
            folder={folder}
            requests={index === 0 ? mockRequests.slice(0, 2) : []}
            subfolders={[]}
            selectedRequestId={null}
            level={0}
            onFolderUpdate={fn()}
          />
        ))}
      </div>
    </div>
  ),
};

// Deeply nested folders
export const DeeplyNested = {
  render: () => (
    <div class="bg-white p-4 rounded-lg shadow max-w-md">
      <h3 class="text-sm font-semibold mb-3 text-gray-700">Deeply Nested Folders</h3>
      <div>
        <FolderItem
          folder={{ id: 'f1', name: 'API v1', collection_id: 'col-1' }}
          requests={[]}
          subfolders={[]}
          selectedRequestId={null}
          level={0}
          onFolderUpdate={fn()}
        />
        <div class="ml-3">
          <FolderItem
            folder={{ id: 'f2', name: 'Resources', collection_id: 'col-1', parent_id: 'f1' }}
            requests={[]}
            subfolders={[]}
            selectedRequestId={null}
            level={1}
            onFolderUpdate={fn()}
          />
          <div class="ml-6">
            <FolderItem
              folder={{ id: 'f3', name: 'Users', collection_id: 'col-1', parent_id: 'f2' }}
              requests={[
                { id: 'r1', method: 'GET', name: 'List Users', collection_id: 'col-1' },
              ]}
              subfolders={[]}
              selectedRequestId={null}
              level={2}
              onFolderUpdate={fn()}
            />
          </div>
        </div>
      </div>
    </div>
  ),
};
