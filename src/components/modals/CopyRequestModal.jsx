import { useState } from 'preact/hooks';
import { Modal } from '../common/Modal';

export function CopyRequestModal({ isOpen, onClose, requestData, getAvailableVariables, replaceVariables, onCopySuccess }) {
  const [isLoading, setIsLoading] = useState(false);

  const generateShareableUrl = async () => {
    setIsLoading(true);
    
    try {
      // Get all available variables for replacement
      const variables = await getAvailableVariables();

      // Process request data and resolve variables
      const processedData = {
        method: requestData.method || 'GET',
        url: replaceVariables(requestData.url || '', variables),
        headers: requestData.headers?.filter(h => h.enabled && h.key.trim()).reduce((acc, h) => {
          acc[replaceVariables(h.key, variables)] = replaceVariables(h.value, variables);
          return acc;
        }, {}) || {},
        params: requestData.queryParams?.filter(p => p.enabled && p.key.trim()).reduce((acc, p) => {
          acc[replaceVariables(p.key, variables)] = replaceVariables(p.value, variables);
          return acc;
        }, {}) || {},
        requestType: requestData.bodyType || 'none',
        contentType: requestData.contentType || '',
        body: replaceVariables(requestData.bodyContent || '', variables),
        formData: requestData.formData?.filter(f => f.enabled && f.key.trim()).map(f => ({
          key: replaceVariables(f.key, variables),
          value: f.type === 'text' ? replaceVariables(f.value, variables) : f.value,
          type: f.type
        })) || []
      };

      // Remove empty/default fields to keep URL clean
      const cleanData = {};
      if (processedData.method && processedData.method !== 'GET') cleanData.method = processedData.method;
      if (processedData.url) cleanData.url = processedData.url;
      if (Object.keys(processedData.headers).length > 0) cleanData.headers = processedData.headers;
      if (Object.keys(processedData.params).length > 0) cleanData.params = processedData.params;
      if (processedData.requestType && processedData.requestType !== 'none') cleanData.requestType = processedData.requestType;
      if (processedData.contentType) cleanData.contentType = processedData.contentType;
      if (processedData.body) cleanData.body = processedData.body;
      if (processedData.formData.length > 0) cleanData.formData = processedData.formData;

      // Create shareable URL
      const baseUrl = import.meta.env.VITE_BASE_URL || 'https://s.requestbite.com';
      const jsonData = JSON.stringify(cleanData);
      const base64Data = btoa(jsonData);
      const shareableUrl = `${baseUrl}?r=${base64Data}`;

      // Copy to clipboard
      await navigator.clipboard.writeText(shareableUrl);
      
      onClose();
      
      // Notify parent component of successful copy
      if (onCopySuccess) {
        onCopySuccess();
      }
    } catch (error) {
      console.error('Failed to generate shareable URL:', error);
      // Could add error state here if needed
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    if (!isLoading) {
      onClose();
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Copy Request URL" size="md">
      <div class="text-sm text-gray-500">
        Do you want to copy the current request as a shareable URL? Any used variables or secrets will be included in plain-text.
      </div>

      <div class="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
        <button
          onClick={generateShareableUrl}
          disabled={isLoading}
          class="inline-flex w-full justify-center rounded-md bg-sky-500 px-3 py-2 text-sm font-semibold text-white hover:bg-sky-400 disabled:bg-sky-300 disabled:cursor-not-allowed sm:ml-3 sm:w-auto cursor-pointer"
        >
          {isLoading ? 'Copying...' : 'Copy'}
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
    </Modal>
  );
}