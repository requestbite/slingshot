import { useState } from 'preact/hooks';
import { MarkdownPreview } from './MarkdownPreview';
import { MarkdownModal } from '../modals/MarkdownModal';
import { apiClient } from '../../api';

export function CollectionWelcome({ collection, onCollectionUpdate }) {
  const [showMarkdownModal, setShowMarkdownModal] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);


  if (!collection) return null;

  const handleEditDescription = async (newDescription) => {
    if (!collection?.id) return;

    setIsUpdating(true);
    try {
      await apiClient.updateCollection(collection.id, {
        description: newDescription
      });

      // Notify parent component to refresh collection data
      if (onCollectionUpdate) {
        onCollectionUpdate();
      }
    } catch (error) {
      console.error('Failed to update collection description:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div class="flex justify-center py-8">
      <div class="w-full max-w-[650px] px-6">
        <h1 class="text-3xl font-bold text-gray-900 text-left mb-6">
          {collection.name}
        </h1>

        <div class="mb-4">
          <button
            onClick={() => setShowMarkdownModal(true)}
            disabled={isUpdating}
            class="cursor-pointer rounded-md px-2 py-1 text-xs focus-visible:outline focus-visible:outline-offset-2 focus-visible:outline-sky-500 bg-sky-100 hover:bg-sky-200 text-sky-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isUpdating ? 'Updating...' : 'Edit text'}
          </button>
        </div>

        {collection.description && collection.description.trim() && (
          <div class="text-left">
            <MarkdownPreview markdown={collection.description} />
          </div>
        )}

        {(!collection.description || !collection.description.trim()) && (
          <div class="text-left text-gray-500 italic">
            No description provided for this collection.
          </div>
        )}

        <MarkdownModal
          key={`${collection.id}-${showMarkdownModal}`}
          isOpen={showMarkdownModal}
          onClose={() => setShowMarkdownModal(false)}
          onSave={handleEditDescription}
          initialMarkdown={collection.description || ''}
          title="Edit Collection Description"
          subtitle="Update the description for this collection using CommonMark Markdown."
        />
      </div>
    </div>
  );
}