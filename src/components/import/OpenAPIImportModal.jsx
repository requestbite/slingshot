import { useState, useRef, useEffect } from 'preact/hooks';
import { useLocation } from 'wouter-preact';
import { processOpenAPISpec } from '../../utils/openApiProcessor';
import { apiClient } from '../../api';
import { useAppContext } from '../../hooks/useAppContext';
import { Portal } from '../common/Portal';

export function OpenAPIImportModal({ isOpen, onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    name: '',
    file: null
  });
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const fileInputRef = useRef();
  const nameInputRef = useRef();
  const [, setLocation] = useLocation();
  const { addCollection, selectCollection } = useAppContext();

  // Initialize form data when modal opens and auto-focus name input
  useEffect(() => {
    if (isOpen) {
      setFormData({ name: '', file: null });
      setErrors({});

      // Lock body scroll and hide scrollbars
      const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
      document.body.style.overflow = 'hidden';
      document.body.style.paddingRight = `${scrollbarWidth}px`;

      // Auto-focus on name input (matching Django behavior)
      setTimeout(() => {
        if (nameInputRef.current) {
          nameInputRef.current.focus();
        }
      }, 100);
    } else {
      // Restore body scroll
      document.body.style.overflow = '';
      document.body.style.paddingRight = '';
    }

    return () => {
      // Cleanup on unmount
      document.body.style.overflow = '';
      document.body.style.paddingRight = '';
    };
  }, [isOpen]);

  const validateFile = (file) => {
    const errors = {};

    if (!file) {
      errors.file = 'Please select a file to upload.';
      return errors;
    }

    // Check file type
    const allowedTypes = ['.yaml', '.yml', '.json'];
    const fileExtension = '.' + file.name.split('.').pop().toLowerCase();
    if (!allowedTypes.includes(fileExtension)) {
      errors.file = 'Please upload a YAML or JSON file.';
      return errors;
    }

    // Check file size (10MB limit)
    const maxSize = 10 * 1024 * 1024; // 10MB in bytes
    if (file.size > maxSize) {
      errors.file = 'File size must be less than 10MB.';
      return errors;
    }

    return errors;
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const fileErrors = validateFile(file);
      setErrors({ ...errors, file: fileErrors.file });
      setFormData({ ...formData, file });
    }
  };

  const handleNameChange = (e) => {
    setFormData({ ...formData, name: e.target.value });
    if (errors.name) {
      setErrors({ ...errors, name: '' });
    }
  };

  const readFileContent = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.onerror = (_e) => reject(new Error('Failed to read file'));
      reader.readAsText(file);
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate form
    const fileErrors = validateFile(formData.file);
    if (Object.keys(fileErrors).length > 0) {
      setErrors(fileErrors);
      return;
    }

    setIsLoading(true);
    setErrors({});

    try {
      // Read file content
      const fileContent = await readFileContent(formData.file);

      // Process OpenAPI spec
      const processedData = await processOpenAPISpec(fileContent, formData.name);

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
      for (const folderName of processedData.folders) {
        const folder = await apiClient.createFolder({
          name: folderName,
          collection_id: collection.id
        });
        folderMap.set(folderName, folder.id);
      }

      // Create requests
      for (const requestData of processedData.requests) {
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
      console.error('OpenAPI import error:', error);
      setErrors({
        general: error.message || 'Failed to import OpenAPI specification. Please check the file format and try again.'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({ name: '', file: null });
    setErrors({});
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleClose = () => {
    if (!isLoading) {
      resetForm();
      onClose();
    }
  };

  // Handle escape key to close modal (matching Django behavior)
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
    <Portal>
      <div class="relative z-[80]" role="dialog" aria-modal="true" style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 9999,
        WebkitBackfaceVisibility: 'hidden',
        backfaceVisibility: 'hidden',
        WebkitTransform: 'translate3d(0,0,0)',
        transform: 'translate3d(0,0,0)'
      }}>
      <div class="fixed inset-0 bg-gray-500/75 transition-opacity" aria-hidden="true" style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 9998
      }}></div>
      <div class="fixed inset-0 z-[80] w-screen overflow-y-auto" style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 9999,
        WebkitOverflowScrolling: 'touch'
      }}>
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
                  <h3 class="text-base font-semibold text-gray-900">Import OpenAPI</h3>
                  <div class="mt-2 text-sm text-gray-500">Import an OpenAPI or Swagger spec to create new collection.</div>

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
                      If left empty, the name will be taken from the OpenAPI specification.
                    </p>

                    <label for="openapi-file" class="block text-left text-sm font-medium text-gray-700 mb-1">Specification file (YAML or JSON)</label>
                    <input
                      ref={fileInputRef}
                      type="file"
                      id="openapi-file"
                      class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-500"
                      accept=".yaml,.yml,.json"
                      required
                      onChange={handleFileChange}
                      disabled={isLoading}
                    />
                    <div class="text-xs text-gray-500 mt-1">Maximum file size: 10 MB</div>
                    {errors.file && (
                      <div class="mt-2 text-sm text-red-600 bg-red-100 p-2 rounded-md">
                        {errors.file}
                      </div>
                    )}
                  </div>

                  {errors.general && (
                    <div class="mt-2 text-sm text-red-600 bg-red-100 p-2 rounded-md">
                      {errors.general}
                    </div>
                  )}

                  <div class="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
                    <button
                      type="submit"
                      disabled={isLoading || !formData.file}
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
    </Portal>
  );
}
