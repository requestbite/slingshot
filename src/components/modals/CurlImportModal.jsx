import { useState, useEffect, useRef } from 'preact/hooks';
import { parseCurlCommand, validateCurlCommand } from '../../utils/curlParser';

export function CurlImportModal({ isOpen, onClose, onImport }) {
  const [curlCommand, setCurlCommand] = useState('');
  const [errors, setErrors] = useState([]);
  const textareaRef = useRef();

  // Auto-focus textarea when modal opens
  useEffect(() => {
    if (isOpen && textareaRef.current) {
      setTimeout(() => {
        textareaRef.current.focus();
      }, 50);
    }
  }, [isOpen]);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setCurlCommand('');
      setErrors([]);
    }
  }, [isOpen]);

  const handleInputChange = (value) => {
    setCurlCommand(value);
    setErrors([]);
  };

  const handleImport = () => {
    if (!curlCommand.trim()) {
      setErrors(['No valid cURL command found.']);
      return;
    }

    try {
      // Validate command structure
      const validationErrors = validateCurlCommand(curlCommand);
      if (validationErrors.length > 0) {
        setErrors(validationErrors);
        return;
      }

      // Parse the command
      const requestData = parseCurlCommand(curlCommand);

      if (onImport) {
        onImport(requestData);
        onClose();
      }

    } catch (error) {
      console.error('Failed to parse curl command:', error);
      setErrors([error.message || 'No valid cURL command found.']);
    }
  };

  const handleClose = () => {
    setCurlCommand('');
    setErrors([]);
    onClose();
  };

  const handlePasteExample = () => {
    const exampleCurl = `curl -X POST https://example.com \\
  -H 'Content-type: application/json' \\
  -d '{
        "foo": "bar"
      }'`;

    setCurlCommand(exampleCurl);
    setErrors([]);
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
    <div class="relative z-10" aria-labelledby="modal-title" role="dialog" aria-modal="true">
      <div class="fixed inset-0 bg-gray-500/75 transition-opacity" aria-hidden="true"></div>
      <div class="fixed inset-0 z-10 w-screen overflow-y-auto">
        <div class="flex min-h-full items-center justify-center p-4 text-center sm:items-center sm:p-0">
          <div class="relative transform overflow-hidden rounded-lg bg-white px-4 pb-4 pt-5 text-left shadow-xl transition-all sm:my-8 w-full sm:max-w-lg sm:p-6">
            <div class="absolute right-0 top-0 hidden pr-4 pt-4 sm:block">
              <button
                onClick={handleClose}
                type="button"
                class="rounded-md bg-white text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 cursor-pointer"
              >
                <span class="sr-only">Close</span>
                <svg class="size-6" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" aria-hidden="true">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div class="text-center mt-0 sm:text-left">
              <h3 class="text-base font-semibold text-gray-900" id="modal-title">Import cURL Command</h3>
              <div class="mt-2">
                <div>
                  <p class="text-sm text-gray-500 mb-2">Paste your cURL command below to import it into the app.</p>
                </div>
                <div class="mb-2 text-right">
                  <button
                    onClick={handlePasteExample}
                    class="text-xs text-sky-600 hover:text-sky-700 cursor-pointer"
                  >
                    Paste example
                  </button>
                </div>
                <div class="w-full">
                  <textarea
                    ref={textareaRef}
                    value={curlCommand}
                    onChange={(e) => handleInputChange(e.target.value)}
                    class="w-full h-32 p-2 font-mono text-xs rounded-md text-white bg-slate-800"
                    placeholder={`curl -X POST https://example.com \\
  -H 'Content-type: application/json' \\
  -d '{
        "foo": "bar"
      }'`}
                  />
                  {errors.length > 0 && (
                    <div class="mt-2 rounded-md bg-red-50 py-2 px-3 text-sm text-red-700 w-full">
                      {errors.map((error, index) => (
                        <div key={index}>{error}</div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div class="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
                <button
                  onClick={handleImport}
                  type="button"
                  class="inline-flex w-full justify-center rounded-md bg-sky-500 px-3 py-2 text-sm font-semibold text-white hover:bg-sky-400 sm:ml-3 sm:w-auto cursor-pointer"
                >
                  Import
                </button>
                <button
                  onClick={handleClose}
                  type="button"
                  class="mt-3 inline-flex w-full justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 sm:mt-0 sm:w-auto cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
