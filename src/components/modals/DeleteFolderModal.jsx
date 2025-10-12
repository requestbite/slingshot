import { useState } from 'preact/hooks';
import { apiClient } from '../../api';
import { Modal } from '../common/Modal';

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
          <p class="text-sm text-gray-500">This will delete the folder, including any requests and subfolders. Do you wish to continue?</p>
          {error && (
            <div class="mt-2 text-sm text-red-600">
              {error}
            </div>
          )}
        </div>
        <div class="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
          <button
            type="submit"
            disabled={isDeleting}
            class="inline-flex w-full justify-center rounded-md bg-red-600 px-3 py-2 text-sm font-semibold text-white hover:bg-red-500 sm:ml-3 sm:w-auto cursor-pointer disabled:opacity-75 disabled:cursor-not-allowed"
          >
            {isDeleting ? (
              <div class="flex items-center">
                <svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>Deleting...</span>
              </div>
            ) : (
              'Delete Folder'
            )}
          </button>
          <button
            type="button"
            onClick={handleClose}
            disabled={isDeleting}
            class="mt-3 inline-flex w-full justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 sm:mt-0 sm:w-auto cursor-pointer disabled:opacity-50"
          >
            Cancel
          </button>
        </div>
      </form>
    </Modal>
  );
}
