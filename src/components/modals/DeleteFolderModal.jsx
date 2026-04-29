import { useState } from 'preact/hooks';
import { apiClient } from '../../api';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';

export function DeleteFolderModal({ isOpen, onClose, folder, onDelete }) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState(null);

  const handleDelete = async () => {
    if (!folder) return;

    setIsDeleting(true);
    setError(null);

    try {
      await apiClient.deleteFolder(folder.id);

      if (onDelete) {
        onDelete(folder);
      }

      onClose();
    } catch (error) {
      console.error('Failed to delete folder:', error);
      setError('Failed to delete folder. Please try again.');
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

  if (!folder) return null;

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={`Delete folder: ${folder.name || 'Unknown'}`} size="md">
      <form onSubmit={(e) => { e.preventDefault(); handleDelete(); }}>
        <div>
          <p class="text-sm text-gray-500 dark:text-neutral-dark-500">This will delete the folder, including any requests and subfolders. Do you wish to continue?</p>
          {error && (
            <div class="mt-2 text-sm text-red-600">
              {error}
            </div>
          )}
        </div>
        <div class="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
          <Button
            type="submit"
            disabled={isDeleting}
            loading={isDeleting}
            variant="danger"
            size="md"
            className="w-full sm:ml-3 sm:w-auto bg-red-600 hover:bg-red-500 text-white"
          >
            Delete Folder
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
