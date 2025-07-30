import { useState, useEffect, useRef } from 'preact/hooks';
import { generateFormattedCurlCommand } from '../../utils/curlGenerator';
import { resolveRequestVariables } from '../../utils/variableResolver';
import { useAppContext } from '../../hooks/useAppContext';

export function CurlExportModal({ isOpen, onClose, requestData }) {
  const { selectedCollection } = useAppContext();
  const [copySuccess, setCopySuccess] = useState(false);
  const [curlCommand, setCurlCommand] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const preRef = useRef();

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
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
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
    setCopySuccess(false);
    onClose();
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
              <h3 class="text-base font-semibold text-gray-900" id="modal-title">Export cURL Command</h3>
              <div class="mt-2">
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
              </div>
              
              <div class="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
                <button
                  onClick={handleCopy}
                  type="button"
                  class={`inline-flex w-full justify-center rounded-md px-3 py-2 text-sm font-semibold text-white sm:ml-3 sm:w-auto cursor-pointer ${
                    copySuccess 
                      ? 'bg-green-500 hover:bg-green-400' 
                      : 'bg-sky-500 hover:bg-sky-400'
                  }`}
                >
                  {copySuccess ? 'Copied!' : 'Copy'}
                </button>
                <button
                  onClick={handleClose}
                  type="button"
                  class="mt-3 inline-flex w-full justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 sm:mt-0 sm:w-auto cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}