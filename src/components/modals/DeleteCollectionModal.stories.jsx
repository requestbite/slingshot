import { fn } from 'storybook/test';
import { useState } from 'preact/hooks';
import { DeleteCollectionModal } from './DeleteCollectionModal';
import { mockContextDecorator } from '../../stories/mocks/mockContext';
import { mockCollection, mockCollections } from '../../stories/mocks/mockData';

export default {
  title: 'Modals/DeleteCollectionModal',
  component: DeleteCollectionModal,
  tags: ['autodocs'],
  decorators: [mockContextDecorator],
  argTypes: {
    isOpen: { control: 'boolean' },
    onClose: { action: 'onClose' },
    onDelete: { action: 'onDelete' },
  },
  args: {
    onClose: fn(),
    onDelete: fn(),
  },
};

// Open modal
export const Open = {
  args: {
    isOpen: true,
    collection: mockCollection,
  },
};

// Closed modal
export const Closed = {
  args: {
    isOpen: false,
    collection: mockCollection,
  },
};

// Different collection
export const DifferentCollection = {
  args: {
    isOpen: true,
    collection: mockCollections[1],
  },
};

// Long collection name
export const LongCollectionName = {
  args: {
    isOpen: true,
    collection: {
      ...mockCollection,
      name: 'This is a Very Long Collection Name That Should Be Displayed Properly in the Modal',
    },
  },
};

// Interactive example
export const Interactive = {
  render: () => {
    const Example = () => {
      const [isOpen, setIsOpen] = useState(false);
      const [collections, setCollections] = useState([
        { id: '1', name: 'Development API', description: 'Dev environment' },
        { id: '2', name: 'Production API', description: 'Prod environment' },
        { id: '3', name: 'Staging API', description: 'Staging environment' },
      ]);
      const [selectedCollection, setSelectedCollection] = useState(null);

      return (
        <div class="p-4">
          <div class="mb-4">
            <h3 class="text-sm font-semibold mb-2">Collections:</h3>
            <div class="space-y-2">
              {collections.map((col) => (
                <div key={col.id} class="flex items-center justify-between p-2 bg-gray-50 rounded">
                  <div>
                    <p class="text-sm font-medium">{col.name}</p>
                    <p class="text-xs text-gray-500">{col.description}</p>
                  </div>
                  <button
                    onClick={() => {
                      setSelectedCollection(col);
                      setIsOpen(true);
                    }}
                    class="px-3 py-1 text-sm bg-red-500 text-white rounded hover:bg-red-400 cursor-pointer"
                  >
                    Delete
                  </button>
                </div>
              ))}
            </div>
          </div>

          {collections.length === 0 && (
            <p class="text-sm text-gray-500">All collections deleted!</p>
          )}

          <DeleteCollectionModal
            isOpen={isOpen}
            collection={selectedCollection}
            onClose={() => {
              setIsOpen(false);
              setSelectedCollection(null);
            }}
            onDelete={(deletedCollection) => {
              setCollections(collections.filter((c) => c.id !== deletedCollection.id));
              setIsOpen(false);
              setSelectedCollection(null);
            }}
          />
        </div>
      );
    };

    return <Example />;
  },
};

// Multiple collections showcase
export const MultipleCollections = {
  render: () => {
    const Example = () => {
      const [currentIndex, setCurrentIndex] = useState(0);
      const collections = mockCollections;

      return (
        <div class="p-4">
          <div class="mb-4">
            <h3 class="text-sm font-semibold mb-2">Preview different collections:</h3>
            <div class="flex gap-2">
              {collections.map((col, index) => (
                <button
                  key={col.id}
                  onClick={() => setCurrentIndex(index)}
                  class={`px-3 py-1 text-sm rounded cursor-pointer ${
                    index === currentIndex
                      ? 'bg-sky-500 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  {col.name}
                </button>
              ))}
            </div>
          </div>

          <DeleteCollectionModal
            isOpen={true}
            collection={collections[currentIndex]}
            onClose={fn()}
            onDelete={fn()}
          />
        </div>
      );
    };

    return <Example />;
  },
};
