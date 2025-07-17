import { useState, useEffect } from 'preact/hooks';
import { apiClient } from '../../api';
import { useAppContext } from '../../hooks/useAppContext';

export function SaveAsModal({ isOpen, onClose, requestData, collection, onSuccess }) {
  const { loadCollections, refreshCollectionData } = useAppContext();
  const [name, setName] = useState('');
  const [selectedFolderId, setSelectedFolderId] = useState('');
  const [folders, setFolders] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen && collection) {
      loadFolders();
      // Only set default name when modal first opens, not on every requestData change
      if (name === '') {
        const defaultName = generateDefaultName(requestData);
        setName(defaultName);
      }
    }
  }, [isOpen, collection]);

  // Separate effect to update name only when modal is first opened (not on requestData changes)
  useEffect(() => {
    if (isOpen && name === '') {
      const defaultName = generateDefaultName(requestData);
      setName(defaultName);
    }
  }, [isOpen]);

  const loadFolders = async () => {
    try {
      const folderData = await apiClient.getFoldersByCollection(collection.id);
      setFolders(folderData);
    } catch (error) {
      console.error('Failed to load folders:', error);
    }
  };

  const generateDefaultName = (requestData) => {
    // If no URL provided, use default name
    if (!requestData.url || !requestData.url.trim()) {
      return 'Untitled request';
    }
    
    try {
      const url = new URL(requestData.url);
      const path = url.pathname || '/';
      const method = requestData.method || 'GET';
      
      // Extract the last part of the path for a meaningful name
      const pathParts = path.split('/').filter(Boolean);
      const lastPart = pathParts.length > 0 ? pathParts[pathParts.length - 1] : 'root';
      
      return `${method} ${lastPart}`;
    } catch (error) {
      // If URL is invalid, use method + simplified URL or fallback
      const method = requestData.method || 'GET';
      
      if (requestData.url.trim()) {
        const urlPart = requestData.url.split('/').pop() || 'request';
        return `${method} ${urlPart}`;
      }
      
      return 'Untitled request';
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!name.trim()) {
      setError('Request name is required');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      // Convert request data to the format expected by apiClient
      const requestToSave = {
        name: name.trim(),
        collection_id: collection.id,
        folder_id: selectedFolderId || null,
        method: requestData.method || 'GET',
        url: requestData.url || '',  // Allow empty URL
        headers: requestData.headers || [],
        params: requestData.queryParams || [],
        path_params: requestData.pathParams || [],
        request_type: requestData.bodyType || 'none',
        content_type: requestData.contentType || '',  // Allow empty content type
        body: requestData.bodyContent || '',
        form_data: requestData.formData || [],
        url_encoded_data: requestData.urlEncodedData || []
      };

      const savedRequest = await apiClient.createRequest(requestToSave);
      
      // Refresh the sidebar to show the new request
      refreshCollectionData();
      
      if (onSuccess) {
        onSuccess(savedRequest);
      }
      
      onClose();
    } catch (error) {
      console.error('Failed to save request:', error);
      setError('Failed to save request. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    // Reset state when modal closes
    setName('');
    setSelectedFolderId('');
    setError('');
    setIsLoading(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div class="fixed inset-0 bg-gray-500/75 transition-opacity z-50">
      <div class="fixed inset-0 z-10 w-screen overflow-y-auto">
        <div class="flex min-h-full items-center justify-center p-4 text-center sm:items-center sm:p-0">
          <div class="relative transform overflow-hidden rounded-lg bg-white px-4 pb-4 pt-5 text-left shadow-xl transition-all sm:my-8 w-full sm:max-w-lg sm:p-6">
            
            {/* Close button */}
            <div class="absolute right-0 top-0 hidden pr-4 pt-4 sm:block">
              <button
                onClick={handleClose}
                type="button"
                class="rounded-md bg-white text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 cursor-pointer"
                disabled={isLoading}
              >
                <span class="sr-only">Close</span>
                <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal content */}
            <form onSubmit={handleSubmit}>
              <div class="text-center mt-0 sm:text-left">
                <h3 class="text-base font-semibold text-gray-900">Save Request</h3>
                <div class="mt-2 text-sm text-gray-500">
                  Save a new request to {collection?.name || 'this collection'}.
                </div>
                
                {error && (
                  <div class="mt-2 text-sm text-red-600 bg-red-100 p-2 rounded-md">
                    {error}
                  </div>
                )}
              
                <div class="mt-6">
                  <label for="request-name" class="block text-xs font-medium text-gray-600 mb-1">
                    Request Name
                  </label>
                  <input
                    type="text"
                    id="request-name"
                    value={name}
                    onInput={(e) => setName(e.target.value)}
                    placeholder="Name of request"
                    class="block w-full rounded-md px-3 py-1.5 text-gray-900 outline outline-1 outline-gray-300 placeholder:text-gray-400 focus:outline-2 focus:outline-sky-500 text-sm"
                    disabled={isLoading}
                    required
                  />
                </div>
                
                <div class="mt-6">
                  <label for="folder-select" class="block text-xs font-medium text-gray-600 mb-1">
                    Folder
                  </label>
                  <select
                    id="folder-select"
                    value={selectedFolderId}
                    onChange={(e) => setSelectedFolderId(e.target.value)}
                    class="w-full appearance-none rounded-md bg-white py-2 pl-3 pr-8 text-sm text-gray-900 outline outline-1 outline-gray-300 focus:outline-2 focus:outline-sky-500"
                    disabled={isLoading}
                  >
                    <option value="">No folder</option>
                    {folders.map(folder => (
                      <option key={folder.id} value={folder.id}>
                        {folder.name}
                      </option>
                    ))}
                  </select>
                </div>
                
                {/* Action buttons */}
                <div class="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
                  <button
                    type="submit"
                    disabled={isLoading || !name.trim()}
                    class="inline-flex w-full justify-center rounded-md bg-sky-500 px-3 py-2 text-sm font-semibold text-white hover:bg-sky-400 disabled:bg-sky-300 disabled:cursor-not-allowed sm:ml-3 sm:w-auto cursor-pointer"
                  >
                    {isLoading ? 'Saving...' : 'Save'}
                  </button>
                  <button
                    type="button"
                    onClick={handleClose}
                    disabled={isLoading}
                    class="mt-3 inline-flex w-full justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed sm:mt-0 sm:w-auto cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}