import { useState } from 'preact/hooks';
import { apiClient } from '../../api';
import { useAppContext } from '../../hooks/useAppContext';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';

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
      <p class="text-sm text-gray-500 dark:text-neutral-dark-500">
        This will permanently delete the collection and all its contents. Do you wish to continue?
      </p>
      <div class="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
        <Button
          onClick={handleDeleteCollection}
          type="button"
          disabled={isDeleting}
          loading={isDeleting}
          variant="danger"
          size="md"
          className="w-full sm:ml-3 sm:w-auto bg-red-600 hover:bg-red-500 text-white"
        >
          Delete Collection
        </Button>
        <Button
          onClick={onClose}
          type="button"
          disabled={isDeleting}
          variant="secondary"
          size="md"
          className="mt-3 w-full sm:mt-0 sm:w-auto"
        >
          Cancel
        </Button>
      </div>
    </Modal>
  );
}