import { useState, useEffect } from 'preact/hooks';
import { ParamsTab } from './tabs/ParamsTab';
import { HeadersTab } from './tabs/HeadersTab';
import { BodyTab } from './tabs/BodyTab';
import { SettingsTab } from './tabs/SettingsTab';
import { ResponseDisplay } from './ResponseDisplay';
import { CurlExportModal } from '../modals/CurlExportModal';
import { CurlImportModal } from '../modals/CurlImportModal';
import { SaveAsModal } from '../modals/SaveAsModal';
import { requestSubmitter } from '../../utils/requestSubmitter';
import { apiClient } from '../../api';
import { useAppContext } from '../../hooks/useAppContext';

const HTTP_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'];

const TAB_NAMES = {
  params: 'Params',
  headers: 'Headers',
  body: 'Body',
  settings: 'Settings'
};

export function RequestEditor({ request, onRequestChange }) {
  const { selectedCollection } = useAppContext();
  const [activeTab, setActiveTab] = useState('params');
  const [requestData, setRequestData] = useState({
    method: 'GET',
    url: '',
    headers: [],
    queryParams: [],
    pathParams: [],
    bodyType: 'none', // none, raw, form-data, url-encoded
    bodyContent: '',
    contentType: 'application/json',
    followRedirects: true,
    timeout: 30,
    formData: [],
    urlEncodedData: [],
    ...request
  });

  // Response state
  const [response, setResponse] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Modal state
  const [showCurlModal, setShowCurlModal] = useState(false);
  const [showCurlImportModal, setShowCurlImportModal] = useState(false);
  const [showSaveAsModal, setShowSaveAsModal] = useState(false);

  // Update parent when request data changes
  useEffect(() => {
    if (onRequestChange) {
      onRequestChange(requestData);
    }
  }, [requestData, onRequestChange]);

  // Load saved response data when request changes
  useEffect(() => {
    if (request && hasSavedResponse(request)) {
      const savedResponse = convertSavedResponseToDisplayFormat(request);
      setResponse(savedResponse);
    } else {
      setResponse(null);
    }
  }, [request]);

  // Update requestData when request prop changes
  useEffect(() => {
    if (request) {
      setRequestData(prev => ({
        ...prev,
        ...request
      }));
    }
  }, [request]);

  // Parse URL to extract query and path parameters
  useEffect(() => {
    if (requestData.url) {
      parseUrlParameters(requestData.url);
    }
  }, [requestData.url]);

  const parseUrlParameters = (url) => {
    try {
      const urlObj = new URL(url);
      
      // Extract query parameters
      const queryParams = [];
      urlObj.searchParams.forEach((value, key) => {
        queryParams.push({ id: crypto.randomUUID(), key, value, enabled: true });
      });

      // Extract path parameters (look for {param} patterns)
      const pathParamMatches = url.match(/\{([^}]+)\}/g) || [];
      const pathParams = pathParamMatches.map(match => {
        const key = match.slice(1, -1); // Remove { and }
        const existingParam = requestData.pathParams.find(p => p.key === key);
        return {
          id: crypto.randomUUID(),
          key,
          value: existingParam?.value || '',
          enabled: true
        };
      });

      setRequestData(prev => ({
        ...prev,
        queryParams,
        pathParams
      }));
    } catch (error) {
      // Invalid URL, clear params
      setRequestData(prev => ({
        ...prev,
        queryParams: [],
        pathParams: []
      }));
    }
  };

  const updateRequestData = (updates) => {
    setRequestData(prev => ({ ...prev, ...updates }));
  };

  // Helper function to check if request has saved response data
  const hasSavedResponse = (request) => {
    return request && (
      request.response_data !== null || 
      request.response_status !== null || 
      request.response_error_type !== null
    );
  };

  // Helper function to convert saved response to display format
  const convertSavedResponseToDisplayFormat = (request) => {
    if (!request) return null;

    // Handle error responses
    if (!request.response_success) {
      return {
        success: false,
        errorType: request.response_error_type,
        errorTitle: request.response_error_title,
        errorMessage: request.response_error_message,
        cancelled: request.response_cancelled || false,
        responseTime: request.response_time,
        rawResponseTime: request.response_raw_time,
        receivedAt: request.response_received_at?.toISOString() || null,
        saved: true // Flag to indicate this is saved data
      };
    }

    // Handle successful responses
    const processedHeaders = Object.entries(request.response_headers || {}).map(([key, value]) => ({
      name: key.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join('-'),
      value: value,
      isClickable: ['content-type', 'cache-control', 'authorization'].includes(key.toLowerCase())
    }));

    return {
      success: true,
      status: request.response_status,
      statusText: request.response_status_text,
      headers: processedHeaders,
      responseTime: request.response_time,
      responseSize: request.response_size,
      responseData: request.response_is_binary ? 
        `[Binary content - ${request.response_size || '0 B'}]` : 
        request.response_data,
      rawHeaders: request.response_headers || {},
      rawResponseTime: request.response_raw_time,
      rawResponseSize: request.response_raw_size,
      cancelled: false,
      receivedAt: request.response_received_at?.toISOString() || null,
      isBinary: request.response_is_binary || false,
      binaryData: request.response_binary_data,
      saved: true // Flag to indicate this is saved data
    };
  };

  const handleMethodChange = (method) => {
    updateRequestData({ method });
    
    // Disable body for methods that don't support it
    if (['GET', 'HEAD', 'OPTIONS'].includes(method)) {
      updateRequestData({ bodyType: 'none' });
    }
  };

  const handleUrlChange = (url) => {
    updateRequestData({ url });
  };

  const getMethodColor = (method) => {
    const colors = {
      GET: 'text-blue-600',
      POST: 'text-green-600', 
      PUT: 'text-orange-600',
      PATCH: 'text-yellow-600',
      DELETE: 'text-red-600',
      HEAD: 'text-purple-600',
      OPTIONS: 'text-gray-600'
    };
    return colors[method] || 'text-gray-600';
  };

  const isBodyDisabled = ['GET', 'HEAD', 'OPTIONS'].includes(requestData.method);

  // Handle request submission
  const handleSendRequest = async () => {
    if (!requestData.url || isSubmitting) return;
    
    setIsSubmitting(true);
    setResponse(null);
    
    try {
      const result = await requestSubmitter.submitRequest(requestData);
      setResponse(result);
      
      // Save response to IndexedDB if we have a request ID
      if (request?.id) {
        try {
          await apiClient.saveRequestResponse(request.id, result);
          console.log('Response saved to database');
        } catch (saveError) {
          console.error('Failed to save response to database:', saveError);
          // Don't fail the request if saving fails
        }
      }
      
    } catch (error) {
      console.error('Request submission failed:', error);
      const errorResponse = {
        success: false,
        errorType: 'unknown_error',
        errorTitle: 'Request Failed',
        errorMessage: error.message,
        cancelled: false,
        receivedAt: new Date().toISOString()
      };
      setResponse(errorResponse);
      
      // Save error response to IndexedDB if we have a request ID
      if (request?.id) {
        try {
          await apiClient.saveRequestResponse(request.id, errorResponse);
        } catch (saveError) {
          console.error('Failed to save error response to database:', saveError);
        }
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle request cancellation
  const handleCancelRequest = () => {
    requestSubmitter.cancelRequest();
    setIsSubmitting(false);
  };

  // Handle curl import
  const handleCurlImport = (importedData) => {
    // Merge imported data with current request data
    setRequestData(prev => ({
      ...prev,
      ...importedData
    }));
    
    // Clear any existing response since we're importing a new request
    setResponse(null);
  };

  return (
    <div class="flex flex-col h-full">
      {/* Request Name Bar */}
      <div class="px-4 py-3 border-b border-gray-200 bg-white">
        <div class="flex items-center justify-between">
          <div class="flex items-center space-x-3">
            <h2 class="text-lg font-semibold text-gray-900">
              {request?.name || 'Test Request'}
            </h2>
            {!request && (
              <span class="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded">
                Standalone
              </span>
            )}
            {request && (
              <span class="text-xs text-orange-600 bg-orange-50 px-2 py-1 rounded">
                Editing
              </span>
            )}
          </div>
          {request && (
            <div class="flex space-x-2">
              <button 
                onClick={() => setShowSaveAsModal(true)}
                class="px-3 py-1.5 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
              >
                Save As
              </button>
              <button class="px-3 py-1.5 text-sm font-medium text-white bg-sky-600 hover:bg-sky-700 rounded-md transition-colors">
                Update
              </button>
            </div>
          )}
          {!request && selectedCollection && (
            <div class="flex space-x-2">
              <button 
                onClick={() => setShowSaveAsModal(true)}
                class="px-3 py-1.5 text-sm font-medium text-white bg-sky-600 hover:bg-sky-700 rounded-md transition-colors"
              >
                Save As
              </button>
            </div>
          )}
        </div>
      </div>

      {/* URL Bar Section */}
      <div class="px-4 py-3 border-b border-gray-200 bg-white">
        <div class="flex items-stretch space-x-2">
          {/* HTTP Method Dropdown */}
          <div class="relative w-28">
            <select
              value={requestData.method}
              onChange={(e) => handleMethodChange(e.target.value)}
              class={`w-full appearance-none rounded-md bg-white pl-3 pr-8 py-2 text-sm font-medium outline-1 outline-gray-300 focus:outline focus:-outline-offset-2 focus:outline-sky-500 ${getMethodColor(requestData.method)}`}
            >
              {HTTP_METHODS.map(method => (
                <option key={method} value={method}>{method}</option>
              ))}
            </select>
            <svg class="absolute right-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
            </svg>
          </div>

          {/* URL Input */}
          <div class="flex-1">
            <input
              type="text"
              value={requestData.url}
              onChange={(e) => handleUrlChange(e.target.value)}
              placeholder="https://example.com"
              class="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-sky-500 focus:border-sky-500"
            />
          </div>

          {/* Send and Code Buttons */}
          <div class="flex space-x-2">
            <button 
              onClick={handleSendRequest}
              disabled={!requestData.url || isSubmitting}
              class={`px-4 py-2 text-sm font-semibold rounded-md transition-colors ${
                !requestData.url || isSubmitting
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-sky-600 hover:bg-sky-700 text-white'
              }`}
            >
              {isSubmitting ? 'Sending...' : 'Send'}
            </button>
            <button 
              onClick={() => setShowCurlModal(true)}
              disabled={isSubmitting}
              class={`px-4 py-2 text-sm font-semibold border rounded-md transition-colors ${
                isSubmitting
                  ? 'bg-gray-50 text-gray-400 border-gray-200 cursor-not-allowed'
                  : 'bg-gray-100 hover:bg-gray-200 text-gray-700 border-gray-300'
              }`}
            >
              Code
            </button>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div class="border-b border-gray-200 px-4 overflow-x-auto bg-white">
        <div class="flex space-x-2 min-w-max">
          {Object.entries(TAB_NAMES).map(([key, name]) => (
            <button
              key={key}
              type="button"
              onClick={() => setActiveTab(key)}
              class={`px-4 py-2 text-xs rounded-t-md font-medium focus:outline-none transition-colors ${
                activeTab === key
                  ? 'text-sky-600 bg-sky-50 border-b-2 border-sky-600'
                  : 'text-gray-600 hover:text-sky-600 hover:bg-gray-100'
              } ${key === 'body' && isBodyDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
              disabled={key === 'body' && isBodyDisabled}
            >
              {name}
              {key === 'params' && (requestData.queryParams.length + requestData.pathParams.length) > 0 && (
                <span class="ml-1 text-xs bg-sky-100 text-sky-600 rounded-full px-1.5 py-0.5">
                  {requestData.queryParams.length + requestData.pathParams.length}
                </span>
              )}
              {key === 'headers' && requestData.headers.length > 0 && (
                <span class="ml-1 text-xs bg-sky-100 text-sky-600 rounded-full px-1.5 py-0.5">
                  {requestData.headers.length}
                </span>
              )}
            </button>
          ))}
          <button 
            onClick={() => setShowCurlImportModal(true)}
            class="px-4 py-2 text-xs rounded-t-md font-medium text-sky-500 hover:text-sky-700 hover:bg-sky-50 transition-colors"
          >
            Import cURL
          </button>
        </div>
      </div>

      {/* Tab Content */}
      <div class="flex-1 overflow-auto bg-gray-50">
        {activeTab === 'params' && (
          <ParamsTab
            queryParams={requestData.queryParams}
            pathParams={requestData.pathParams}
            onQueryParamsChange={(params) => updateRequestData({ queryParams: params })}
            onPathParamsChange={(params) => updateRequestData({ pathParams: params })}
          />
        )}
        {activeTab === 'headers' && (
          <HeadersTab
            headers={requestData.headers}
            onHeadersChange={(headers) => updateRequestData({ headers })}
          />
        )}
        {activeTab === 'body' && (
          <BodyTab
            bodyType={requestData.bodyType}
            bodyContent={requestData.bodyContent}
            contentType={requestData.contentType}
            method={requestData.method}
            formData={requestData.formData}
            urlEncodedData={requestData.urlEncodedData}
            onBodyTypeChange={(bodyType) => updateRequestData({ bodyType })}
            onBodyContentChange={(bodyContent) => updateRequestData({ bodyContent })}
            onContentTypeChange={(contentType) => updateRequestData({ contentType })}
            onFormDataChange={(formData) => updateRequestData({ formData })}
            onUrlEncodedDataChange={(urlEncodedData) => updateRequestData({ urlEncodedData })}
          />
        )}
        {activeTab === 'settings' && (
          <SettingsTab
            followRedirects={requestData.followRedirects}
            timeout={requestData.timeout}
            onFollowRedirectsChange={(followRedirects) => updateRequestData({ followRedirects })}
            onTimeoutChange={(timeout) => updateRequestData({ timeout })}
          />
        )}
      </div>

      {/* Response Display */}
      <ResponseDisplay
        response={response}
        isLoading={isSubmitting}
        onCancel={handleCancelRequest}
      />

      {/* Curl Export Modal */}
      <CurlExportModal
        isOpen={showCurlModal}
        onClose={() => setShowCurlModal(false)}
        requestData={requestData}
      />

      {/* Curl Import Modal */}
      <CurlImportModal
        isOpen={showCurlImportModal}
        onClose={() => setShowCurlImportModal(false)}
        onImport={handleCurlImport}
      />

      {/* Save As Modal */}
      <SaveAsModal
        isOpen={showSaveAsModal}
        onClose={() => setShowSaveAsModal(false)}
        requestData={requestData}
        collection={selectedCollection}
        onSuccess={(savedRequest) => {
          console.log('Request saved successfully:', savedRequest);
          // Could potentially navigate to the saved request or show notification
        }}
      />
    </div>
  );
}