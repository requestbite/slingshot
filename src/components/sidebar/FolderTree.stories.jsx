import { useState } from 'preact/hooks';
import { FolderTree } from './FolderTree';
import { mockContextDecorator, withMockContext } from '../../stories/mocks/mockContext';
import { mockRouterDecorator } from '../../stories/mocks/mockRouter';

export default {
  title: 'Sidebar/FolderTree',
  component: FolderTree,
  tags: ['autodocs'],
  decorators: [mockContextDecorator, mockRouterDecorator],
  argTypes: {
    searchTerm: { control: 'text' },
  },
};

// Default folder tree
export const Default = {
  args: {
    searchTerm: '',
  },
};

// With search term
export const WithSearchTerm = {
  args: {
    searchTerm: 'user',
  },
};

// Empty collection
export const EmptyCollection = {
  decorators: [
    withMockContext({
      selectedCollection: {
        id: 'col-empty',
        name: 'Empty Collection',
        description: 'No folders or requests',
      },
    }),
    mockRouterDecorator,
  ],
  args: {
    searchTerm: '',
  },
};

// No collection selected
export const NoCollectionSelected = {
  decorators: [
    withMockContext({
      selectedCollection: null,
    }),
    mockRouterDecorator,
  ],
  args: {
    searchTerm: '',
  },
};

// In a sidebar context
export const InSidebarContext = {
  render: () => (
    <div class="flex h-screen">
      <div class="w-64 bg-white border-r border-gray-200 overflow-y-auto">
        <div class="p-4">
          <h3 class="text-sm font-semibold mb-3">Collection Contents</h3>
          <FolderTree searchTerm="" />
        </div>
      </div>
      <div class="flex-1 bg-gray-50 p-8">
        <p class="text-gray-600">Main content area</p>
      </div>
    </div>
  ),
};

// With search box
export const WithSearchBox = {
  render: () => {
    const SearchableTree = () => {
      const [searchTerm, setSearchTerm] = useState('');

      return (
        <div class="w-64 bg-white p-4 rounded-lg shadow">
          <div class="mb-4">
            <input
              type="text"
              placeholder="Search requests..."
              value={searchTerm}
              onInput={(e) => setSearchTerm(e.target.value)}
              class="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>
          <FolderTree searchTerm={searchTerm} />
        </div>
      );
    };

    return <SearchableTree />;
  },
};
