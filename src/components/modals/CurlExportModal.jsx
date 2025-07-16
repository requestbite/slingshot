import { useState, useEffect, useRef } from 'preact/hooks';
import { generateCurlCommand, generateFormattedCurlCommand } from '../../utils/curlGenerator';

export function CurlExportModal({ isOpen, onClose, requestData }) {
  const [copySuccess, setCopySuccess] = useState(false);
  const [formatType, setFormatType] = useState('formatted'); // 'formatted' or 'oneline'
  const textareaRef = useRef();

  const curlCommand = formatType === 'formatted' 
    ? generateFormattedCurlCommand(requestData || {})
    : generateCurlCommand(requestData || {});

  // Auto-select content when modal opens
  useEffect(() => {
    if (isOpen && textareaRef.current) {
      setTimeout(() => {
        textareaRef.current.select();
        textareaRef.current.focus();
      }, 100);
    }
  }, [isOpen, formatType]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(curlCommand);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
      // Fallback: select the text for manual copy
      if (textareaRef.current) {
        textareaRef.current.select();
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
    <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={handleClose}>
      <div 
        class="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div class="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h2 class="text-lg font-semibold text-gray-900">Export as cURL</h2>
            <p class="text-sm text-gray-600 mt-1">Copy the command to reproduce this request in terminal</p>
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

        {/* Format Options */}
        <div class="px-6 py-3 border-b border-gray-200 bg-gray-50">
          <div class="flex items-center space-x-4">
            <span class="text-sm font-medium text-gray-700">Format:</span>
            <div class="flex space-x-2">
              <button
                onClick={() => setFormatType('formatted')}
                class={`px-3 py-1 text-sm rounded-md transition-colors ${
                  formatType === 'formatted'
                    ? 'bg-sky-100 text-sky-700 border border-sky-200'
                    : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
                }`}
              >
                Multi-line
              </button>
              <button
                onClick={() => setFormatType('oneline')}
                class={`px-3 py-1 text-sm rounded-md transition-colors ${
                  formatType === 'oneline'
                    ? 'bg-sky-100 text-sky-700 border border-sky-200'
                    : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
                }`}
              >
                Single line
              </button>
            </div>
          </div>
        </div>

        {/* Command Content */}
        <div class="flex-1 p-6 overflow-hidden">
          <div class="h-full flex flex-col">
            <div class="flex items-center justify-between mb-3">
              <label class="text-sm font-medium text-gray-700">
                cURL Command
              </label>
              <button
                onClick={handleCopy}
                class={`inline-flex items-center px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                  copySuccess
                    ? 'bg-green-100 text-green-700 border border-green-200'
                    : 'bg-sky-100 text-sky-700 border border-sky-200 hover:bg-sky-200'
                }`}
              >
                {copySuccess ? (
                  <>
                    <svg class="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                    </svg>
                    Copied!
                  </>
                ) : (
                  <>
                    <svg class="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    Copy
                  </>
                )}
              </button>
            </div>

            <div class="flex-1 relative">
              <textarea
                ref={textareaRef}
                value={curlCommand}
                readonly
                class="w-full h-full px-3 py-2 text-sm font-mono border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-sky-500 focus:border-sky-500 bg-gray-50 resize-none"
                style={{ fontFamily: 'Monaco, Menlo, "Ubuntu Mono", monospace' }}
              />
            </div>
          </div>
        </div>

        {/* Request Summary */}
        {requestData && (
          <div class="px-6 py-3 border-t border-gray-200 bg-gray-50">
            <div class="flex items-center justify-between text-xs text-gray-600">
              <div class="flex items-center space-x-4">
                <span class="font-medium">
                  {requestData.method || 'GET'} {requestData.url || 'No URL'}
                </span>
                {requestData.headers && requestData.headers.filter(h => h.enabled).length > 0 && (
                  <span>{requestData.headers.filter(h => h.enabled).length} headers</span>
                )}
                {requestData.bodyType && requestData.bodyType !== 'none' && (
                  <span>Body: {requestData.bodyType}</span>
                )}
              </div>
              <div class="text-gray-500">
                Press Ctrl+A to select all
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div class="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
          <button
            onClick={handleClose}
            class="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
          >
            Close
          </button>
          <button
            onClick={handleCopy}
            class="px-4 py-2 text-sm font-medium text-white bg-sky-600 hover:bg-sky-700 rounded-md transition-colors"
          >
            Copy to Clipboard
          </button>
        </div>
      </div>
    </div>
  );
}