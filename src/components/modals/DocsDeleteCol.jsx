import { useState } from 'preact/hooks';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { apiClient } from '../../api';

export function DocsDeleteCol({ isOpen, onClose, collection, onDelete }) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState(null);

  const handleDelete = async () => {
    if (!collection) return;

    setIsDeleting(true);
    setError(null);

    try {
      // Remove documentation fields from the collection
      await apiClient.updateCollection(collection.id, {
        description: null,
        security_schemes: null
      });

      if (onDelete) {
        onDelete(collection);
      }

      onClose();
    } catch (error) {
      console.error('Failed to delete collection documentation:', error);
      setError('Failed to delete collection documentation. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleClose = () => {
    if (!isDeleting) {
      setError(null);
      onClose();
    }
  };

  return (
    <Modal isOpen={isOpen && !!collection} onClose={handleClose} title="Delete collection docs" size="md">
      <form onSubmit={(e) => { e.preventDefault(); handleDelete(); }}>
        <div class="mt-2">
          <p class="text-sm text-gray-500 dark:text-neutral-dark-500 text-center sm:text-left">Do you want to delete the collection docs?</p>
        </div>

        {error && (
          <div class="mt-3 text-sm text-red-600">
            {error}
          </div>
        )}

        <div class="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
          <Button
            type="submit"
            disabled={isDeleting}
            loading={isDeleting}
            variant="danger"
            size="md"
            className="w-full sm:ml-3 sm:w-auto bg-red-600 hover:bg-red-500 text-white"
          >
            Delete
          </Button>
          <Button
            type="button"
            onClick={handleClose}
            disabled={isDeleting}
            variant="secondary"
            size="md"
            className="mt-3 w-full sm:mt-0 sm:w-auto"
          >
            Cancel
          </Button>
        </div>
      </form>
    </Modal>
  );
}
