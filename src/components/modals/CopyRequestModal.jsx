import { useState } from 'preact/hooks';

export function CopyRequestModal({ isOpen, onClose, requestData, getAvailableVariables, replaceVariables }) {
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
    } catch (error) {
      console.error('Failed to generate shareable URL:', error);
      // Could add error state here if needed
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div class="fixed inset-0 bg-gray-500/75 transition-opacity z-50">
      <div class="fixed inset-0 z-10 w-screen overflow-y-auto">
        <div class="flex min-h-full items-center justify-center p-4 text-center sm:items-center sm:p-0">
          <div class="relative transform overflow-hidden rounded-lg bg-white px-4 pb-4 pt-5 text-left shadow-xl transition-all sm:my-8 w-full sm:max-w-lg sm:p-6">
            
            {/* Close button */}
            <div class="absolute right-0 top-0 hidden pr-4 pt-4 sm:block">
              <button
                onClick={onClose}
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
            <div class="text-center mt-0 sm:text-left">
              <h3 class="text-base font-semibold text-gray-900">Copy Request URL</h3>
              <div class="mt-2 text-sm text-gray-500">
                Do you want to copy the current request as a shareable URL? Any used variables or secrets will be included in plain-text.
              </div>
              
              {/* Action buttons */}
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
                  onClick={onClose}
                  disabled={isLoading}
                  class="mt-3 inline-flex w-full justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed sm:mt-0 sm:w-auto cursor-pointer"
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