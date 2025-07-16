import { useState, useEffect, useRef } from 'preact/hooks';
import { parseCurlCommand, validateCurlCommand } from '../../utils/curlParser';

export function CurlImportModal({ isOpen, onClose, onImport }) {
  const [curlCommand, setCurlCommand] = useState('');
  const [errors, setErrors] = useState([]);
  const [isValidating, setIsValidating] = useState(false);
  const [previewData, setPreviewData] = useState(null);
  const textareaRef = useRef();

  // Auto-focus textarea when modal opens
  useEffect(() => {
    if (isOpen && textareaRef.current) {
      setTimeout(() => {
        textareaRef.current.focus();
      }, 100);
    }
  }, [isOpen]);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setCurlCommand('');
      setErrors([]);
      setPreviewData(null);
    }
  }, [isOpen]);

  const handleInputChange = (value) => {
    setCurlCommand(value);
    setErrors([]);
    setPreviewData(null);
  };

  const handleValidate = () => {
    if (!curlCommand.trim()) {
      setErrors(['Please enter a curl command']);
      return;
    }

    setIsValidating(true);
    setErrors([]);
    setPreviewData(null);

    try {
      // Validate command structure
      const validationErrors = validateCurlCommand(curlCommand);
      if (validationErrors.length > 0) {
        setErrors(validationErrors);
        return;
      }

      // Parse the command
      const requestData = parseCurlCommand(curlCommand);
      setPreviewData(requestData);

    } catch (error) {
      console.error('Failed to parse curl command:', error);
      setErrors([error.message || 'Failed to parse curl command']);
    } finally {
      setIsValidating(false);
    }
  };

  const handleImport = () => {
    if (previewData && onImport) {
      onImport(previewData);
      onClose();
    }
  };

  const handleClose = () => {
    setCurlCommand('');
    setErrors([]);
    setPreviewData(null);
    onClose();
  };

  const handlePasteExample = () => {
    const exampleCurl = `curl -X POST 'https://api.example.com/users' \\
  -H 'Content-Type: application/json' \\
  -H 'Authorization: Bearer your-token' \\
  -d '{"name": "John Doe", "email": "john@example.com"}'`;
    
    setCurlCommand(exampleCurl);
    setErrors([]);
    setPreviewData(null);
  };

  // Handle escape key to close modal
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isOpen) {
        handleClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={handleClose}>
      <div 
        class="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div class="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h2 class="text-lg font-semibold text-gray-900">Import cURL</h2>
            <p class="text-sm text-gray-600 mt-1">Paste a cURL command to import it as a request</p>
          </div>
          <button
            onClick={handleClose}
            class="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div class="flex-1 p-6 overflow-hidden">
          <div class="h-full flex flex-col space-y-4">
            {/* Input Section */}
            <div class="flex-1 min-h-0">
              <div class="flex items-center justify-between mb-2">
                <label class="text-sm font-medium text-gray-700">
                  cURL Command
                </label>
                <button
                  onClick={handlePasteExample}
                  class="text-xs text-sky-600 hover:text-sky-700 underline"
                >
                  Paste example
                </button>
              </div>
              
              <textarea
                ref={textareaRef}
                value={curlCommand}
                onChange={(e) => handleInputChange(e.target.value)}
                placeholder={`Paste your cURL command here, for example:

curl -X POST 'https://api.example.com/users' \\
  -H 'Content-Type: application/json' \\
  -H 'Authorization: Bearer token' \\
  -d '{"name": "John", "email": "john@example.com"}'`}
                class="w-full h-32 px-3 py-2 text-sm font-mono border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-sky-500 focus:border-sky-500 resize-none"
                style={{ fontFamily: 'Monaco, Menlo, "Ubuntu Mono", monospace' }}
              />
            </div>

            {/* Action Buttons */}
            <div class="flex space-x-3">
              <button
                onClick={handleValidate}
                disabled={!curlCommand.trim() || isValidating}
                class={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                  curlCommand.trim() && !isValidating
                    ? 'bg-sky-100 text-sky-700 border border-sky-200 hover:bg-sky-200'
                    : 'bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed'
                }`}
              >
                {isValidating ? 'Validating...' : 'Validate & Preview'}
              </button>
              
              {previewData && (
                <button
                  onClick={handleImport}
                  class="px-4 py-2 text-sm font-medium text-white bg-sky-600 hover:bg-sky-700 rounded-md transition-colors"
                >
                  Import Request
                </button>
              )}
            </div>

            {/* Error Display */}
            {errors.length > 0 && (
              <div class="bg-red-50 border border-red-200 rounded-md p-3">
                <div class="flex items-start space-x-2">
                  <svg class="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div class="text-sm text-red-700">
                    <p class="font-medium">Error parsing cURL command:</p>
                    <ul class="mt-1 list-disc list-inside space-y-1">
                      {errors.map((error, index) => (
                        <li key={index}>{error}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {/* Preview Display */}
            {previewData && (
              <div class="bg-green-50 border border-green-200 rounded-md p-4">
                <div class="flex items-start space-x-2">
                  <svg class="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div class="text-sm text-green-700 flex-1">
                    <p class="font-medium mb-2">Preview of imported request:</p>
                    <div class="bg-white rounded border border-green-200 p-3 space-y-2">
                      <div class="flex items-center space-x-2">
                        <span class="font-medium text-gray-700">Method:</span>
                        <span class="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded">
                          {previewData.method}
                        </span>
                      </div>
                      
                      <div>
                        <span class="font-medium text-gray-700">URL:</span>
                        <span class="ml-2 text-gray-900 break-all">{previewData.url}</span>
                      </div>
                      
                      {previewData.headers.length > 0 && (
                        <div>
                          <span class="font-medium text-gray-700">Headers:</span>
                          <span class="ml-2 text-gray-600">
                            {previewData.headers.length} header{previewData.headers.length !== 1 ? 's' : ''}
                          </span>
                        </div>
                      )}
                      
                      {previewData.queryParams.length > 0 && (
                        <div>
                          <span class="font-medium text-gray-700">Query Parameters:</span>
                          <span class="ml-2 text-gray-600">
                            {previewData.queryParams.length} parameter{previewData.queryParams.length !== 1 ? 's' : ''}
                          </span>
                        </div>
                      )}
                      
                      {previewData.bodyType !== 'none' && (
                        <div>
                          <span class="font-medium text-gray-700">Body:</span>
                          <span class="ml-2 text-gray-600">{previewData.bodyType}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div class="px-6 py-4 border-t border-gray-200 flex justify-between">
          <div class="text-xs text-gray-500">
            Supports most curl options including headers (-H), data (-d), form data (-F), and more
          </div>
          <div class="flex space-x-3">
            <button
              onClick={handleClose}
              class="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}