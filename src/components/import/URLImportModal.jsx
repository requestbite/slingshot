import { useState, useRef, useEffect } from 'preact/hooks';
import { useLocation } from 'wouter-preact';
import { fetchFromURL, detectContentFormat, extractDefaultName } from '../../utils/urlImporter';
import { processOpenAPISpec } from '../../utils/openApiProcessor';
import { processPostmanCollection } from '../../utils/postmanImporter';
import { apiClient } from '../../api';
import { useAppContext } from '../../hooks/useAppContext';
import { Toast, useToast } from '../common/Toast';

export function URLImportModal({ isOpen, importUrl, onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    name: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const nameInputRef = useRef();
  const [, setLocation] = useLocation();
  const { addCollection, selectCollection } = useAppContext();
  
  // Toast state
  const [isToastVisible, showToast, hideToast] = useToast();
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState('error');

  // Initialize form data when modal opens and auto-focus name input
  useEffect(() => {
    if (isOpen) {
      setFormData({ name: '' });
      setErrors({});

      // Auto-focus on name input
      setTimeout(() => {
        if (nameInputRef.current) {
          nameInputRef.current.focus();
        }
      }, 100);
    }
  }, [isOpen]);

  const showErrorToast = (message) => {
    setToastMessage(message);
    setToastType('error');
    showToast();
  };

  const handleNameChange = (e) => {
    setFormData({ ...formData, name: e.target.value });
    if (errors.name) {
      setErrors({ ...errors, name: '' });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!importUrl) {
      showErrorToast('No import URL provided');
      return;
    }

    setIsLoading(true);
    setErrors({});

    try {
      // Fetch content from URL
      const { content } = await fetchFromURL(importUrl);
      
      // Detect content format
      const format = detectContentFormat(content);
      
      if (format === 'unknown') {
        showErrorToast('Unable to detect file format. Please ensure the URL points to a valid OpenAPI specification or Postman collection.');
        return;
      }

      // Extract default name if user didn't provide one
      const collectionName = formData.name.trim() || extractDefaultName(content, format, importUrl);

      let processedData;
      
      // Process based on detected format
      if (format === 'openapi') {
        processedData = await processOpenAPISpec(content, collectionName);
      } else if (format === 'postman') {
        processedData = await processPostmanCollection(content, collectionName);
      }

      // Create collection using our API client
      const collection = await apiClient.createCollection({
        name: processedData.collectionName,
        description: processedData.description || '',
        variables: processedData.variables || []
      });

      // Create individual variable records for collection management UI
      for (const variable of processedData.variables || []) {
        await apiClient.createSecret({
          collection_id: collection.id,
          key: variable.key,
          value: variable.value,
          description: variable.description || ''
        });
      }

      // Create folders and requests
      const folderMap = new Map();

      // Create folders first
      for (const folderName of processedData.folders || []) {
        const folder = await apiClient.createFolder({
          name: folderName,
          collection_id: collection.id
        });
        folderMap.set(folderName, folder.id);
      }

      // Create requests
      for (const requestData of processedData.requests || []) {
        const folderId = requestData.folderName ? folderMap.get(requestData.folderName) : null;

        await apiClient.createRequest({
          collection_id: collection.id,
          folder_id: folderId,
          name: requestData.name,
          method: requestData.method,
          url: requestData.url,
          headers: requestData.headers || [],
          params: requestData.params || [],
          path_params: requestData.pathParams || [],
          request_type: requestData.requestType || 'none',
          content_type: requestData.contentType || 'json',
          body: requestData.body || ''
        });
      }

      // Success - add to context, navigate to collection, and notify parent
      addCollection(collection);
      selectCollection(collection);
      setLocation(`/${collection.id}`);

      if (onSuccess) onSuccess(collection);
      onClose();
      resetForm();

    } catch (error) {
      console.error('URL import error:', error);
      showErrorToast(error.message || 'Failed to import from URL. Please check the URL and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({ name: '' });
    setErrors({});
  };

  const handleClose = () => {
    if (!isLoading) {
      resetForm();
      hideToast();
      onClose();
    }
  };

  // Handle escape key to close modal
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isOpen) {
        e.preventDefault();
        e.stopPropagation();
        handleClose();
      }
    };

    // Handle escape on input fields directly to bypass browser blur behavior
    const handleInputEscape = (e) => {
      if (e.key === 'Escape' && isOpen) {
        e.preventDefault();
        e.stopPropagation();
        handleClose();
      }
    };

    if (isOpen) {
      // Use keyup to fire after input blur completes
      document.addEventListener('keyup', handleEscape, true);
      
      // Also add direct listeners to input fields to catch escape before blur
      const inputs = document.querySelectorAll('input, select, textarea');
      inputs.forEach(input => {
        input.addEventListener('keydown', handleInputEscape, true);
      });
      
      return () => {
        document.removeEventListener('keyup', handleEscape, true);
        inputs.forEach(input => {
          input.removeEventListener('keydown', handleInputEscape, true);
        });
      };
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <>
      <div class="relative z-50" role="dialog" aria-modal="true">
        <div class="fixed inset-0 bg-gray-500/75 transition-opacity" aria-hidden="true"></div>
        <div class="fixed inset-0 z-10 w-screen overflow-y-auto">
          <div class="flex min-h-full items-center justify-center p-4 text-center sm:items-center sm:p-0">
            <div
              class="relative transform overflow-hidden rounded-lg bg-white px-4 pb-4 pt-5 text-left shadow-xl transition-all sm:my-8 w-full sm:max-w-lg sm:p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <div>
                <div class="absolute right-0 top-0 hidden pr-4 pt-4 sm:block">
                  <button
                    onClick={handleClose}
                    type="button"
                    class="rounded-md bg-white text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 cursor-pointer"
                    disabled={isLoading}
                  >
                    <span class="sr-only">Close</span>
                    <svg class="size-6" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" aria-hidden="true">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <form onSubmit={handleSubmit}>
                  <div class="text-center mt-0 sm:text-left">
                    <h3 class="text-base font-semibold text-gray-900">Import</h3>
                    <div class="mt-2 text-sm text-gray-500">Do you want to import the linked API spec or collection?</div>

                    <div class="mt-6">
                      <label for="import-collection-name" class="block text-left text-sm font-medium text-gray-700 mb-1">Name</label>
                      <input
                        ref={nameInputRef}
                        type="text"
                        id="import-collection-name"
                        placeholder="My API collection"
                        class="block w-full rounded-md px-3 py-1.5 text-gray-900 outline -outline-offset-1 focus:outline-2 outline-gray-300 placeholder:text-gray-400 focus:-outline-offset-2 focus:outline-sky-500 text-sm/6 mb-1"
                        value={formData.name}
                        onChange={handleNameChange}
                        disabled={isLoading}
                      />
                      <p class="text-xs text-gray-500 mb-3">
                        If left empty, the name will be taken from the imported file.
                      </p>
                    </div>

                    {importUrl && (
                      <div class="mt-4 p-3 bg-gray-50 rounded-md">
                        <div class="text-xs font-medium text-gray-700 mb-1">Import URL:</div>
                        <div class="text-xs text-gray-600 break-all">{importUrl}</div>
                      </div>
                    )}

                    {errors.general && (
                      <div class="mt-2 text-sm text-red-600 bg-red-100 p-2 rounded-md">
                        {errors.general}
                      </div>
                    )}

                    <div class="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
                      <button
                        type="submit"
                        disabled={isLoading}
                        class="inline-flex w-full justify-center rounded-md bg-sky-500 px-3 py-2 text-sm font-semibold text-white hover:bg-sky-400 disabled:bg-sky-300 disabled:cursor-not-allowed sm:ml-3 sm:w-auto cursor-pointer"
                      >
                        {isLoading ? (
                          <div class="flex items-center">
                            <div class="inline-block animate-spin rounded-full h-4 w-4 border-2 border-solid border-white border-r-transparent mr-2"></div>
                            Importing...
                          </div>
                        ) : (
                          'Import'
                        )}
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
      </div>

      {/* Toast Notification */}
      <Toast
        message={toastMessage}
        isVisible={isToastVisible}
        onClose={hideToast}
        type={toastType}
      />
    </>
  );
}