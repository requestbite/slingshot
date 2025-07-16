import { useState } from 'preact/hooks';
import { apiClient } from '../../api';

export function DeleteRequestModal({ isOpen, onClose, request, onDelete }) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState(null);

  const handleDelete = async () => {
    if (!request) return;
    
    setIsDeleting(true);
    setError(null);
    
    try {
      await apiClient.deleteRequest(request.id);
      
      if (onDelete) {
        onDelete(request);
      }
      
      onClose();
    } catch (error) {
      console.error('Failed to delete request:', error);
      setError('Failed to delete request. Please try again.');
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

  if (!isOpen || !request) return null;

  return (
    <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={handleClose}>
      <div 
        class="bg-white rounded-lg shadow-xl max-w-md w-full mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div class="px-6 py-4 border-b border-gray-200">
          <div class="flex items-center space-x-3">
            <div class="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
              <svg class="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <div>
              <h2 class="text-lg font-semibold text-gray-900">Delete Request</h2>
              <p class="text-sm text-gray-600">This action cannot be undone</p>
            </div>
          </div>
        </div>

        <div class="px-6 py-4">
          <div class="space-y-4">
            <p class="text-sm text-gray-700">
              Are you sure you want to delete the request <strong>"{request.name || 'Untitled Request'}"</strong>?
            </p>
            
            {/* Request Details */}
            <div class="bg-gray-50 border border-gray-200 rounded-md p-3">
              <div class="text-xs text-gray-500 mb-2">Request Details</div>
              <div class="space-y-2">
                <div class="flex items-center space-x-2">
                  <span class="text-xs font-medium px-2 py-1 rounded bg-blue-100 text-blue-800">
                    {request.method || 'GET'}
                  </span>
                  <span class="text-sm text-gray-700 truncate">
                    {request.url || 'No URL specified'}
                  </span>
                </div>
                {request.folder_id && (
                  <div class="text-xs text-gray-500">
                    In folder: {request.folder_id}
                  </div>
                )}
              </div>
            </div>

            <div class="bg-yellow-50 border border-yellow-200 rounded-md p-3">
              <div class="flex items-start space-x-2">
                <svg class="w-4 h-4 text-yellow-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
                <div class="text-sm text-yellow-700">
                  <p class="font-medium">This will permanently delete:</p>
                  <ul class="mt-1 list-disc list-inside space-y-1">
                    <li>The request configuration</li>
                    <li>All saved response data</li>
                    <li>Request history and metadata</li>
                  </ul>
                </div>
              </div>
            </div>

            <div class="text-xs text-gray-500">
              <p>Request ID: {request.id}</p>
              <p>Collection ID: {request.collection_id}</p>
            </div>

            {error && (
              <div class="text-red-600 text-sm bg-red-50 border border-red-200 rounded p-2">
                {error}
              </div>
            )}
          </div>
        </div>

        <div class="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
          <button
            type="button"
            onClick={handleClose}
            disabled={isDeleting}
            class="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={isDeleting}
            class="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
              'Delete Request'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}