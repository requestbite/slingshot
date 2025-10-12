import { useState } from 'preact/hooks';
import { apiClient } from '../../api';
import { useAppContext } from '../../hooks/useAppContext';
import { Modal } from '../common/Modal';

export function DeleteCollectionModal({ isOpen, onClose, collection, onDelete }) {
  const [isDeleting, setIsDeleting] = useState(false);
  const { loadCollections } = useAppContext();

  const handleDeleteCollection = async () => {
    if (!collection) return;
    
    setIsDeleting(true);
    try {
      await apiClient.deleteCollection(collection.id);
      await loadCollections();
      
      if (onDelete) {
        onDelete(collection);
      }
      
      onClose();
    } catch (error) {
      console.error('Failed to delete collection:', error);
      // Let the parent handle error notifications
    } finally {
      setIsDeleting(false);
    }
  };

  if (!collection) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Delete Collection" size="md">
      <p class="text-sm text-gray-500">
        This will permanently delete the collection and all its contents. Do you wish to continue?
      </p>
      <div class="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
        <button
          onClick={handleDeleteCollection}
          type="button"
          disabled={isDeleting}
          class="inline-flex w-full justify-center rounded-md bg-red-600 px-3 py-2 text-sm font-semibold text-white hover:bg-red-500 sm:ml-3 sm:w-auto cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isDeleting ? (
            <div class="flex items-center space-x-2">
              <svg class="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              <span>Deleting...</span>
            </div>
          ) : (
            'Delete Collection'
          )}
        </button>
        <button
          onClick={onClose}
          type="button"
          disabled={isDeleting}
          class="mt-3 inline-flex w-full justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 sm:mt-0 sm:w-auto cursor-pointer disabled:opacity-50"
        >
          Cancel
        </button>
      </div>
    </Modal>
  );
}