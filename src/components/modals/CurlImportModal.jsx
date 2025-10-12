import { useState, useEffect, useRef } from 'preact/hooks';
import { parseCurlCommand, validateCurlCommand } from '../../utils/curlParser';
import { Modal } from '../common/Modal';

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

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Import cURL Command" size="md">
      <p class="text-sm text-gray-500 mb-2">Paste your cURL command below to import it into the app.</p>
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
    </Modal>
  );
}
