import { useState } from 'preact/hooks';
import { WelcomeMessage } from '../common/WelcomeMessage';

export function ResponseDisplay({ response, isLoading, onCancel }) {
  const [showHeaders, setShowHeaders] = useState(true);
  const [activeTab, setActiveTab] = useState('body');

  if (isLoading) {
    return (
      <div class="p-6 border-t border-gray-200 bg-white">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-lg font-medium text-gray-900">Sending Request...</h3>
          <button
            onClick={onCancel}
            class="px-3 py-1.5 text-sm font-medium text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 rounded-md transition-colors"
          >
            Cancel
          </button>
        </div>
        <div class="flex items-center space-x-3 text-gray-500">
          <svg class="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <span>Waiting for response...</span>
        </div>
      </div>
    );
  }

  if (!response) {
    return (
      <div class="p-6 border-t border-gray-200 bg-gray-50">
        <WelcomeMessage />
      </div>
    );
  }

  if (response.cancelled) {
    return (
      <div class="p-6 border-t border-gray-200 bg-white">
        <div class="text-center">
          <div class="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
            <svg class="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 class="text-lg font-medium text-gray-900 mb-2">Request Cancelled</h3>
          <p class="text-gray-600">The request was cancelled before completion.</p>
          <p class="text-xs text-gray-500 mt-2">Time: {response.responseTime}</p>
        </div>
      </div>
    );
  }

  if (!response.success) {
    return (
      <div class="p-6 border-t border-gray-200 bg-white">
        <div class="text-center">
          <div class="w-16 h-16 mx-auto mb-4 bg-red-100 rounded-full flex items-center justify-center">
            <svg class="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 class="text-lg font-medium text-gray-900 mb-2">{response.errorTitle}</h3>
          <p class="text-gray-600 mb-4">{response.errorMessage}</p>
          <div class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
            {response.errorType}
          </div>
          <p class="text-xs text-gray-500 mt-3">Time: {response.responseTime}</p>
        </div>
      </div>
    );
  }

  const getStatusColor = (status) => {
    if (status >= 200 && status < 300) return 'bg-green-100 text-green-800';
    if (status >= 300 && status < 400) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };

  const copyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      // TODO: Show toast notification
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
    }
  };

  return (
    <div class="border-t border-gray-200 bg-white">
      {/* Response Metadata */}
      <div class="p-4 border-b border-gray-200">
        <div class="flex items-center justify-between mb-3">
          <div class="flex items-center space-x-3">
            <h3 class="text-lg font-medium text-gray-900">Response</h3>
            {response.saved && (
              <span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                <svg class="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                </svg>
                Saved
              </span>
            )}
          </div>
          <button
            onClick={() => copyToClipboard(response.responseData)}
            class="px-3 py-1.5 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 border border-gray-300 rounded-md transition-colors"
          >
            Copy Response
          </button>
        </div>
        
        <div class="flex flex-wrap items-center gap-4 text-sm">
          <div class="flex items-center space-x-2">
            <span class="text-gray-500">Status:</span>
            <span class={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(response.status)}`}>
              {response.status} {response.statusText}
            </span>
          </div>
          
          <div class="flex items-center space-x-2">
            <span class="text-gray-500">Time:</span>
            <span class="font-medium text-gray-900">{response.responseTime}</span>
          </div>
          
          <div class="flex items-center space-x-2">
            <span class="text-gray-500">Size:</span>
            <span class="font-medium text-gray-900">{response.responseSize}</span>
          </div>
          
          <div class="flex items-center space-x-2">
            <span class="text-gray-500">Headers:</span>
            <span class="font-medium text-gray-900">{response.headers?.length || 0}</span>
          </div>
          
          {response.saved && response.receivedAt && (
            <div class="flex items-center space-x-2">
              <span class="text-gray-500">Received:</span>
              <span class="font-medium text-gray-900">{new Date(response.receivedAt).toLocaleString()}</span>
            </div>
          )}
        </div>
      </div>

      {/* Response Headers */}
      {response.headers && response.headers.length > 0 && (
        <div class="border-b border-gray-200">
          <button
            onClick={() => setShowHeaders(!showHeaders)}
            class="w-full px-4 py-3 text-left flex items-center justify-between hover:bg-gray-50 transition-colors"
          >
            <span class="text-sm font-medium text-gray-700">
              Response Headers ({response.headers.length})
            </span>
            <svg 
              class={`w-4 h-4 text-gray-400 transition-transform ${showHeaders ? 'rotate-90' : ''}`}
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
            </svg>
          </button>
          
          {showHeaders && (
            <div class="px-4 pb-4">
              <div class="space-y-2">
                {response.headers.map((header, index) => (
                  <div key={index} class="grid grid-cols-12 gap-2 text-sm">
                    <div class="col-span-4 font-medium text-gray-700">
                      {header.isClickable ? (
                        <a
                          href={`https://docs.requestbite.com/http/response-headers/${header.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}/`}
                          target="_blank"
                          rel="noopener noreferrer"
                          class="text-sky-600 hover:text-sky-800 hover:underline"
                        >
                          {header.name}
                          <svg class="inline w-3 h-3 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                          </svg>
                        </a>
                      ) : (
                        header.name
                      )}
                    </div>
                    <div class="col-span-8 text-gray-900 break-all">
                      {header.value}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Response Body */}
      <div class="p-4">
        <div class="flex items-center justify-between mb-3">
          <h4 class="text-sm font-medium text-gray-700">Response Body</h4>
          {response.responseData && (
            <div class="text-xs text-gray-500">
              {response.responseSize}
            </div>
          )}
        </div>
        
        {response.responseData ? (
          <div class="relative">
            <textarea
              value={response.responseData}
              readonly
              class="w-full h-64 px-3 py-2 text-sm font-mono border border-gray-300 rounded focus:ring-sky-500 focus:border-sky-500 resize-y bg-gray-50"
            />
            <button
              onClick={() => copyToClipboard(response.responseData)}
              class="absolute top-2 right-2 p-1 text-gray-400 hover:text-gray-600 bg-white border border-gray-300 rounded"
              title="Copy to clipboard"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </button>
          </div>
        ) : (
          <div class="text-center py-8 text-gray-500">
            <p class="text-sm">No response body</p>
          </div>
        )}
      </div>
    </div>
  );
}