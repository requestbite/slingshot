import { fn } from 'storybook/test';
import { useState } from 'preact/hooks';
import { AddCollectionModal } from './AddCollectionModal';
import { mockContextDecorator } from '../../stories/mocks/mockContext';
import { mockRouterDecorator } from '../../stories/mocks/mockRouter';

export default {
  title: 'Modals/AddCollectionModal',
  component: AddCollectionModal,
  tags: ['autodocs'],
  decorators: [mockContextDecorator, mockRouterDecorator],
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

// Open modal
export const Open = {
  args: {
    isOpen: true,
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

      return (
        <div class="p-4">
          <button
            onClick={() => setIsOpen(true)}
            class="px-4 py-2 bg-sky-500 text-white rounded-md hover:bg-sky-400 cursor-pointer"
          >
            Add Collection
          </button>

          <AddCollectionModal
            isOpen={isOpen}
            onClose={() => setIsOpen(false)}
            onSuccess={(collection) => {
              console.log('Collection created:', collection);
              setIsOpen(false);
            }}
          />
        </div>
      );
    };

    return <Example />;
  },
};

// With validation error (simulated)
export const WithValidationError = {
  render: () => {
    const Example = () => {
      const [isOpen, setIsOpen] = useState(true);

      return (
        <div class="p-4">
          <p class="text-sm text-gray-600 mb-4">
            Try entering a very long collection name (over 100 characters) to trigger validation error.
          </p>
          <AddCollectionModal
            isOpen={isOpen}
            onClose={() => setIsOpen(false)}
            onSuccess={fn()}
          />
        </div>
      );
    };

    return <Example />;
  },
};

// Multiple modals demonstration
export const MultipleInteractions = {
  render: () => {
    const Example = () => {
      const [isOpen, setIsOpen] = useState(false);
      const [collections, setCollections] = useState([
        { id: '1', name: 'Existing Collection 1' },
        { id: '2', name: 'Existing Collection 2' },
      ]);

      return (
        <div class="p-4">
          <div class="mb-4">
            <h3 class="text-sm font-semibold mb-2">Existing Collections:</h3>
            <ul class="text-sm text-gray-600 space-y-1">
              {collections.map((col) => (
                <li key={col.id}>• {col.name}</li>
              ))}
            </ul>
          </div>

          <button
            onClick={() => setIsOpen(true)}
            class="px-4 py-2 bg-sky-500 text-white rounded-md hover:bg-sky-400 cursor-pointer"
          >
            Add New Collection
          </button>

          <AddCollectionModal
            isOpen={isOpen}
            onClose={() => setIsOpen(false)}
            onSuccess={(collection) => {
              setCollections([...collections, collection]);
              setIsOpen(false);
            }}
          />
        </div>
      );
    };

    return <Example />;
  },
};
