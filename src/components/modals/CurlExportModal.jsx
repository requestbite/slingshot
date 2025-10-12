import { useState, useEffect, useRef } from 'preact/hooks';
import { generateFormattedCurlCommand } from '../../utils/curlGenerator';
import { resolveRequestVariables } from '../../utils/variableResolver';
import { useAppContext } from '../../hooks/useAppContext';
import { Modal } from '../common/Modal';
import { Toast, useToast } from '../common/Toast';

export function CurlExportModal({ isOpen, onClose, requestData }) {
  const { selectedCollection } = useAppContext();
  const [curlCommand, setCurlCommand] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const preRef = useRef();
  const [isToastVisible, showToast, hideToast] = useToast();

  // Generate curl command with resolved variables when modal opens or requestData changes
  useEffect(() => {
    if (isOpen && requestData) {
      setIsLoading(true);
      resolveRequestVariables(requestData, selectedCollection)
        .then(resolvedData => {
          const command = generateFormattedCurlCommand(resolvedData);
          setCurlCommand(command);
        })
        .catch(error => {
          console.error('Failed to resolve variables:', error);
          // Fallback to unresolved command
          setCurlCommand(generateFormattedCurlCommand(requestData));
        })
        .finally(() => {
          setIsLoading(false);
        });
    }
  }, [isOpen, requestData, selectedCollection]);

  // Auto-select content when modal opens
  useEffect(() => {
    if (isOpen && preRef.current && curlCommand) {
      setTimeout(() => {
        const range = document.createRange();
        range.selectNodeContents(preRef.current);
        const selection = window.getSelection();
        selection.removeAllRanges();
        selection.addRange(range);
        preRef.current.focus();
      }, 50);
    }
  }, [isOpen, curlCommand]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(curlCommand);
      showToast();
      onClose();
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
      // Fallback: select the text for manual copy
      if (preRef.current) {
        const range = document.createRange();
        range.selectNodeContents(preRef.current);
        const selection = window.getSelection();
        selection.removeAllRanges();
        selection.addRange(range);
      }
    }
  };

  const handleClose = () => {
    onClose();
  };

  return (
    <>
      <Modal isOpen={isOpen} onClose={handleClose} title="Export cURL Command" size="md">
        <p class="text-sm text-gray-500 mb-4">Copy the cURL command below to use in your terminal or other tools.</p>
        <div class="w-full">
          <pre
            ref={preRef}
            class="w-full h-32 p-2 font-mono text-xs rounded-md text-white bg-slate-800 overflow-auto whitespace-pre-wrap cursor-text"
            tabIndex="0"
          >
            {isLoading ? 'Resolving variables...' : curlCommand}
          </pre>
        </div>

        <div class="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
          <button
            onClick={handleCopy}
            type="button"
            class="inline-flex w-full justify-center rounded-md bg-sky-500 px-3 py-2 text-sm font-semibold text-white hover:bg-sky-400 sm:ml-3 sm:w-auto cursor-pointer"
          >
            Copy
          </button>
          <button
            onClick={handleClose}
            type="button"
            class="mt-3 inline-flex w-full justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 sm:mt-0 sm:w-auto cursor-pointer"
          >
            Close
          </button>
        </div>
      </Modal>

      <Toast
        message="cURL command copied."
        isVisible={isToastVisible}
        onClose={hideToast}
        type="success"
      />
    </>
  );
}