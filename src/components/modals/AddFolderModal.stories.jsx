import { fn } from 'storybook/test';
import { useState } from 'preact/hooks';
import { AddFolderModal } from './AddFolderModal';
import { mockContextDecorator, withMockContext } from '../../stories/mocks/mockContext';
import { mockFolders } from '../../stories/mocks/mockData';

export default {
  title: 'Modals/AddFolderModal',
  component: AddFolderModal,
  tags: ['autodocs'],
  decorators: [mockContextDecorator],
  argTypes: {
    isOpen: { control: 'boolean' },
    onClose: { action: 'onClose' },
    onSuccess: { action: 'onSuccess' },
  },
  args: {
    onClose: fn(),
    onSuccess: fn(),
  },
};

// Open modal (root folder)
export const Open = {
  args: {
    isOpen: true,
    parentFolder: null,
  },
};

// Open modal (subfolder)
export const OpenAsSubfolder = {
  args: {
    isOpen: true,
    parentFolder: mockFolders[0],
  },
};

// Closed modal
export const Closed = {
  args: {
    isOpen: false,
  },
};

// Interactive example
export const Interactive = {
  render: () => {
    const Example = () => {
      const [isOpen, setIsOpen] = useState(false);
      const [folders, setFolders] = useState([
        { id: '1', name: 'Authentication', collection_id: 'col-1' },
        { id: '2', name: 'Users', collection_id: 'col-1' },
      ]);

      return (
        <div class="p-4">
          <div class="mb-4">
            <h3 class="text-sm font-semibold mb-2">Existing Folders:</h3>
            <ul class="text-sm text-gray-600 space-y-1">
              {folders.map((folder) => (
                <li key={folder.id}>• {folder.name}</li>
              ))}
            </ul>
          </div>

          <button
            onClick={() => setIsOpen(true)}
            class="px-4 py-2 bg-sky-500 text-white rounded-md hover:bg-sky-400 cursor-pointer"
          >
            Add Folder
          </button>

          <AddFolderModal
            isOpen={isOpen}
            onClose={() => setIsOpen(false)}
            onSuccess={(folder) => {
              setFolders([...folders, folder]);
              setIsOpen(false);
            }}
            parentFolder={null}
          />
        </div>
      );
    };

    return <Example />;
  },
};

// Add subfolder interactive
export const AddSubfolderInteractive = {
  render: () => {
    const Example = () => {
      const [isOpen, setIsOpen] = useState(false);
      const parentFolder = { id: 'f1', name: 'API Resources', collection_id: 'col-1' };

      return (
        <div class="p-4">
          <div class="mb-4">
            <h3 class="text-sm font-semibold mb-2">Parent Folder:</h3>
            <p class="text-sm text-gray-600">{parentFolder.name}</p>
          </div>

          <button
            onClick={() => setIsOpen(true)}
            class="px-4 py-2 bg-sky-500 text-white rounded-md hover:bg-sky-400 cursor-pointer"
          >
            Add Subfolder
          </button>

          <AddFolderModal
            isOpen={isOpen}
            onClose={() => setIsOpen(false)}
            onSuccess={(folder) => {
              console.log('Subfolder created:', folder);
              setIsOpen(false);
            }}
            parentFolder={parentFolder}
          />
        </div>
      );
    };

    return <Example />;
  },
};

// No collection selected
export const NoCollectionSelected = {
  decorators: [
    withMockContext({
      selectedCollection: null,
    }),
  ],
  args: {
    isOpen: true,
    parentFolder: null,
  },
};
