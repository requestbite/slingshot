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
      <div class="w-full max-w-[750px]">
        <div class="text-center">
          <div class="mx-auto w-32 mb-4">
            <img src="/images/rabbit-icon.webp" alt="Slingshot Rabbit" class="w-full h-auto" />
          </div>
          <p class="text-xl font-semibold text-gray-700 mb-4">{collection.name}</p>
        </div>
        <div class="relative p-4 border border-gray-200 bg-gray-50 rounded-md">
          <button
            onClick={() => setShowMarkdownModal(true)}
            disabled={isUpdating}
            class="absolute top-2 right-2 z-10 cursor-pointer rounded-md px-2 py-1 text-xs focus-visible:outline focus-visible:outline-offset-2 focus-visible:outline-sky-500 bg-sky-100 hover:bg-sky-200 text-sky-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-square-pen">
              <path d="M12 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
              <path d="M18.375 2.625a1 1 0 0 1 3 3l-9.013 9.014a2 2 0 0 1-.853.505l-2.873.84a.5.5 0 0 1-.62-.62l.84-2.873a2 2 0 0 1 .506-.852z" />
            </svg>
            {isUpdating ? 'Updating...' : 'Edit'}
          </button>
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
        </div>

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
