import { useState, useRef, useEffect } from 'preact/hooks';
import { apiClient } from '../../api';
import { encryptSecret } from '../../utils/encryption';
import db from '../../db/schema';

export function ImportEnvironmentsModal({ isOpen, onClose, onSuccess }) {
  const [file, setFile] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const fileInputRef = useRef();

  // Initialize form data when modal opens
  useEffect(() => {
    if (isOpen) {
      setFile(null);
      setErrors({});
    }
  }, [isOpen]);

  const validateFile = (file) => {
    const errors = {};

    if (!file) {
      errors.file = 'Please select a file to upload.';
      return errors;
    }

    // Check file type
    const allowedTypes = ['.json'];
    const fileExtension = '.' + file.name.split('.').pop().toLowerCase();
    if (!allowedTypes.includes(fileExtension)) {
      errors.file = 'Please upload a JSON file.';
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
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      const fileErrors = validateFile(selectedFile);
      setErrors({ ...errors, file: fileErrors.file });
      setFile(selectedFile);
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

  const validateImportData = (data) => {
    if (!data || typeof data !== 'object') {
      throw new Error('Invalid file format: File must contain a valid JSON object.');
    }

    if (!data.environments || !Array.isArray(data.environments)) {
      throw new Error('Invalid file format: File must contain an "environments" array.');
    }

    // Validate each environment
    for (let i = 0; i < data.environments.length; i++) {
      const env = data.environments[i];
      if (!env.id || typeof env.id !== 'string') {
        throw new Error(`Invalid environment at index ${i}: Missing or invalid "id" field.`);
      }
      if (!env.name || typeof env.name !== 'string') {
        throw new Error(`Invalid environment at index ${i}: Missing or invalid "name" field.`);
      }
      if (env.secrets && !Array.isArray(env.secrets)) {
        throw new Error(`Invalid environment at index ${i}: "secrets" must be an array.`);
      }
    }

    return true;
  };

  const encryptAuthData = async (authData) => {
    if (!authData) return null;
    
    try {
      const jsonString = JSON.stringify(authData);
      const { encrypted_value, iv } = await encryptSecret(jsonString);
      return { encrypted_value, iv };
    } catch (error) {
      console.error('Failed to encrypt auth data:', error);
      throw new Error('Failed to encrypt auth data');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate file
    const fileErrors = validateFile(file);
    if (Object.keys(fileErrors).length > 0) {
      setErrors(fileErrors);
      return;
    }

    setIsLoading(true);
    setErrors({});

    try {
      // Read file content
      const fileContent = await readFileContent(file);

      // Parse JSON
      let importData;
      try {
        importData = JSON.parse(fileContent);
      } catch (parseError) {
        throw new Error('Invalid JSON file format.');
      }

      // Validate import data structure
      validateImportData(importData);

      // Process each environment
      const processedEnvironments = await Promise.all(
        importData.environments.map(async (importEnv) => {
          let processedEnv = { ...importEnv };

          // Encrypt authConfig if it exists and is not already encrypted
          if (importEnv.authConfig && !importEnv.authConfig.encrypted_value) {
            processedEnv.authConfig = await encryptAuthData(importEnv.authConfig);
          }

          // Encrypt authResponse if it exists and is not already encrypted
          if (importEnv.authResponse && !importEnv.authResponse.encrypted_value) {
            processedEnv.authResponse = await encryptAuthData(importEnv.authResponse);
          }

          return processedEnv;
        })
      );

      // Import environments - check if each exists and update or create
      for (const environment of processedEnvironments) {
        try {
          // Check if environment exists using direct DB access
          const existingEnvironment = await db.environments.get(environment.id);
          
          if (existingEnvironment) {
            // Environment exists - update it with all fields using direct DB access
            await db.environments.update(environment.id, environment);
          } else {
            // Environment doesn't exist - create new one with all fields preserved
            // Ensure the environment has all required fields with defaults
            const newEnvironment = {
              id: environment.id, // Preserve the original ID
              name: environment.name,
              description: environment.description || '',
              secrets: environment.secrets || [],
              // Include auth fields if they exist
              ...(environment.auth && { auth: environment.auth }),
              ...(environment.authConfig && { authConfig: environment.authConfig }),
              ...(environment.authResponse && { authResponse: environment.authResponse })
            };
            
            // Use direct DB add to preserve the ID
            await db.environments.add(newEnvironment);
          }
        } catch (error) {
          console.error(`Failed to import environment ${environment.id}:`, error);
          throw new Error(`Failed to import environment "${environment.name}": ${error.message}`);
        }
      }

      // Success
      if (onSuccess) onSuccess();
      onClose();
      resetForm();

    } catch (error) {
      console.error('Import error:', error);
      setErrors({
        general: error.message || 'Failed to import environments. Please check the file format and try again.'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setFile(null);
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

  // Handle escape key to close modal
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isOpen && !isLoading) {
        e.preventDefault();
        e.stopPropagation();
        handleClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keyup', handleEscape, true);
      return () => {
        document.removeEventListener('keyup', handleEscape, true);
      };
    }
  }, [isOpen, isLoading]);

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
                <h3 class="text-base font-semibold text-gray-900">Import environments</h3>
                <div class="mt-2 text-sm text-gray-500">
                  Import a previously exported environment JSON file. Any existing environment with the same ID as in the imported file will be overwritten. Any other environments will be added.
                </div>

                <div class="mt-6">
                  <label for="environment-file" class="block text-left text-sm font-medium text-gray-700 mb-1">Environment file</label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    id="environment-file"
                    class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-500"
                    accept=".json"
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
                  <div class="mt-4 text-sm text-red-600 bg-red-100 p-2 rounded-md">
                    {errors.general}
                  </div>
                )}

                {/* Action buttons */}
                <div class="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
                  <button
                    type="submit"
                    disabled={isLoading || !file}
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
  );
}