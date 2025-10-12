import { useState } from 'preact/hooks';
import { apiClient } from '../../api';
import { Modal } from '../common/Modal';

export function DeleteEnvironmentModal({ isOpen, onClose, environment, onDelete }) {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDeleteEnvironment = async () => {
    if (!environment) return;
    
    setIsDeleting(true);
    try {
      await apiClient.deleteEnvironment(environment.id);
      
      if (onDelete) {
        onDelete(environment);
      }
      
      onClose();
    } catch (error) {
      console.error('Failed to delete environment:', error);
      // Let the parent handle error notifications
    } finally {
      setIsDeleting(false);
    }
  };

  if (!environment) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Delete Environment" size="md">
      <p class="text-sm text-gray-500">
        This will permanently delete the environment "{environment.name}" and all its encrypted secrets. This action cannot be undone. Do you wish to continue?
      </p>
      <div class="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
        <button
          onClick={handleDeleteEnvironment}
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
            'Delete Environment'
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