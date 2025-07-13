import { useState, useRef } from 'preact/hooks';
import { useLocation } from 'wouter-preact';
import { Modal } from '../common/Modal';
import { processOpenAPISpec } from '../../utils/openApiProcessor';
import { apiClient } from '../../api';
import { useAppContext } from '../../hooks/useAppContext';

export function OpenAPIImportModal({ isOpen, onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    name: '',
    file: null
  });
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const fileInputRef = useRef();
  const [, setLocation] = useLocation();
  const { addCollection, selectCollection } = useAppContext();

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
      reader.onerror = (e) => reject(new Error('Failed to read file'));
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

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Import OpenAPI Specification"
      size="md"
    >
      <form onSubmit={handleSubmit} class="space-y-6">
        {/* General Error */}
        {errors.general && (
          <div class="bg-red-50 border border-red-200 rounded-md p-3">
            <div class="flex">
              <svg class="w-5 h-5 text-red-400 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div class="ml-3">
                <p class="text-sm text-red-800">{errors.general}</p>
              </div>
            </div>
          </div>
        )}

        {/* Collection Name */}
        <div>
          <label for="collection-name" class="block text-sm font-medium text-gray-700 mb-2">
            Collection Name
            <span class="text-gray-500 font-normal">(optional)</span>
          </label>
          <input
            id="collection-name"
            type="text"
            value={formData.name}
            onInput={handleNameChange}
            placeholder="My API collection"
            class={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
              errors.name ? 'border-red-300' : 'border-gray-300'
            }`}
            disabled={isLoading}
          />
          {errors.name && (
            <p class="mt-1 text-sm text-red-600">{errors.name}</p>
          )}
          <p class="mt-1 text-xs text-gray-500">
            If left empty, the name will be taken from the OpenAPI specification.
          </p>
        </div>

        {/* File Upload */}
        <div>
          <label for="openapi-file" class="block text-sm font-medium text-gray-700 mb-2">
            OpenAPI File *
          </label>
          <div class="relative">
            <input
              id="openapi-file"
              ref={fileInputRef}
              type="file"
              accept=".yaml,.yml,.json"
              onChange={handleFileChange}
              required
              class={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                errors.file ? 'border-red-300' : 'border-gray-300'
              }`}
              disabled={isLoading}
            />
          </div>
          {errors.file && (
            <p class="mt-1 text-sm text-red-600">{errors.file}</p>
          )}
          <p class="mt-1 text-xs text-gray-500">
            Upload a YAML or JSON OpenAPI/Swagger specification file (max 10MB).
          </p>
        </div>

        {/* Form Actions */}
        <div class="flex items-center justify-end space-x-3 pt-4 border-t border-gray-200">
          <button
            type="button"
            onClick={handleClose}
            disabled={isLoading}
            class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isLoading || !formData.file}
            class="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
          >
            {isLoading && (
              <svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            )}
            {isLoading ? 'Importing...' : 'Import Collection'}
          </button>
        </div>
      </form>
    </Modal>
  );
}