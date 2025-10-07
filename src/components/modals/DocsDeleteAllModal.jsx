import { useState } from 'preact/hooks';
import { Modal } from '../common/Modal';
import { apiClient } from '../../api';

export function DocsDeleteAllModal({ isOpen, onClose, request, onDelete }) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState(null);

  const handleDelete = async () => {
    if (!request) return;

    setIsDeleting(true);
    setError(null);

    try {
      // Remove documentation fields from the request
      await apiClient.updateRequest(request.id, {
        summary: null,
        description: null,
        parameters_schema: null,
        request_body_schema: null,
        response_schemas: null
      });

      if (onDelete) {
        onDelete(request);
      }

      onClose();
    } catch (error) {
      console.error('Failed to delete documentation:', error);
      setError('Failed to delete documentation. Please try again.');
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
    <Modal isOpen={isOpen && !!request} onClose={handleClose} title="Delete request docs" size="md">
      <form onSubmit={(e) => { e.preventDefault(); handleDelete(); }}>
        <div class="mt-2">
          <p class="text-sm text-gray-500 text-center sm:text-left">Do you want to delete all documentation for this request?</p>
        </div>

        {error && (
          <div class="mt-3 text-sm text-red-600">
            {error}
          </div>
        )}

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
              'Delete'
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
