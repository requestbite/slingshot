import { useState, useEffect } from 'preact/hooks';
import { useRoute } from 'wouter-preact';
import { RequestEditor } from '../components/request/RequestEditor';
import { useAppContext } from '../hooks/useAppContext';
import { apiClient } from '../api';

export function RequestPage() {
  const [match, params] = useRoute('/:collectionId/:requestId');
  const { selectedCollection, selectedRequest, selectRequest } = useAppContext();
  const [request, setRequest] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (params?.requestId) {
      loadRequest(params.requestId);
    }
  }, [params?.requestId]);

  const loadRequest = async (requestId) => {
    try {
      setIsLoading(true);
      setError(null);
      
      const requestData = await apiClient.getRequest(requestId);
      setRequest(requestData);
      
      // Update context if needed
      if (!selectedRequest || selectedRequest.id !== requestId) {
        selectRequest(requestData);
      }
      
    } catch (err) {
      console.error('Failed to load request:', err);
      setError('Failed to load request');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRequestChange = (updatedRequest) => {
    // This handles real-time editing without saving
    setRequest(updatedRequest);
  };

  if (isLoading) {
    return (
      <div class="flex items-center justify-center h-full">
        <div class="flex items-center space-x-3 text-gray-500">
          <svg class="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <span>Loading request...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div class="flex items-center justify-center h-full">
        <div class="text-center">
          <svg class="w-12 h-12 mx-auto mb-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h3 class="text-lg font-medium text-gray-900 mb-2">Failed to load request</h3>
          <p class="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => loadRequest(params?.requestId)}
            class="px-4 py-2 text-sm font-medium text-white bg-sky-600 hover:bg-sky-700 rounded-md transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!request) {
    return (
      <div class="flex items-center justify-center h-full">
        <div class="text-center">
          <svg class="w-12 h-12 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <h3 class="text-lg font-medium text-gray-900 mb-2">Request not found</h3>
          <p class="text-gray-600">The requested item could not be found.</p>
        </div>
      </div>
    );
  }

  return (
    <div class="h-full flex flex-col">
      <RequestEditor
        request={request}
        onRequestChange={handleRequestChange}
      />
    </div>
  );
}