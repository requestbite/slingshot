import { useState, useEffect, useRef } from 'preact/hooks';
import { ParamsTab } from './tabs/ParamsTab';
import { HeadersTab } from './tabs/HeadersTab';
import { BodyTab } from './tabs/BodyTab';
import { SettingsTab } from './tabs/SettingsTab';
import { ResponseDisplay } from './ResponseDisplay';
import { CurlExportModal } from '../modals/CurlExportModal';
import { CurlImportModal } from '../modals/CurlImportModal';
import { SaveAsModal } from '../modals/SaveAsModal';
import { VariableInput } from '../common/VariableInput';
import { Toast, useToast } from '../common/Toast';
import { requestSubmitter } from '../../utils/requestSubmitter';
import { apiClient } from '../../api';
import { useAppContext } from '../../hooks/useAppContext';

const HTTP_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'];

const getTabNames = (hasActiveCollection) => ({
  params: 'Params',
  headers: 'Headers',
  body: 'Body',
  ...(hasActiveCollection ? {} : { settings: 'Settings' })
});

export function RequestEditor({ request, onRequestChange }) {
  const { selectedCollection } = useAppContext();
  const [activeTab, setActiveTab] = useState('params');

  // Get placeholder URL from environment variable
  const placeholderUrl = import.meta.env.VITE_HELLO_URL || 'https://example.com';

  // Helper function to get effective request data (draft if available, otherwise main)
  const getEffectiveRequestData = (request) => {
    if (!request) {
      return {
        method: 'GET',
        url: '',
        headers: [],
        queryParams: [],
        pathParams: [],
        bodyType: 'none',
        contentType: 'application/json',
        bodyContent: '',
        formData: [],
        urlEncodedData: []
      };
    }

    return {
      method: request.has_draft_edits && request.draft_method ? request.draft_method : (request.method || 'GET'),
      url: request.has_draft_edits && request.draft_url ? request.draft_url : (request.url || ''),
      headers: request.has_draft_edits && request.draft_headers ? request.draft_headers : (request.headers || []),
      queryParams: request.has_draft_edits && request.draft_params ? request.draft_params : (request.params || []),
      pathParams: request.has_draft_edits && request.draft_path_params ? request.draft_path_params : (request.path_params || []),
      bodyType: request.has_draft_edits && request.draft_request_type ? request.draft_request_type : (request.request_type || 'none'),
      contentType: request.has_draft_edits && request.draft_content_type ? request.draft_content_type : (request.content_type || 'application/json'),
      bodyContent: request.has_draft_edits && request.draft_body ? request.draft_body : (request.body || ''),
      formData: request.has_draft_edits && request.draft_form_data ? request.draft_form_data : (request.form_data || []),
      urlEncodedData: request.has_draft_edits && request.draft_url_encoded_data ? request.draft_url_encoded_data : (request.url_encoded_data || [])
    };
  };

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
    ...(request ? getEffectiveRequestData(request) : {})
  });

  // Response state
  const [response, setResponse] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Draft state
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isDraftDirty, setIsDraftDirty] = useState(false);
  const draftSaveTimeoutRef = useRef(null);
  const originalDataRef = useRef(null);
  const currentRequestDataRef = useRef(requestData);

  // Modal state
  const [showCurlModal, setShowCurlModal] = useState(false);
  const [showCurlImportModal, setShowCurlImportModal] = useState(false);
  const [showSaveAsModal, setShowSaveAsModal] = useState(false);

  // Toast state
  const [isToastVisible, showToast, hideToast] = useToast();

  // Update parent when request data changes (but not during initial load or when editing existing requests)
  useEffect(() => {
    console.log('👆 PARENT UPDATE EFFECT - onRequestChange exists:', !!onRequestChange);
    console.log('👆 PARENT UPDATE EFFECT - request exists:', !!request);
    // Only call onRequestChange for new requests, not when editing existing ones
    if (onRequestChange && !request) {
      console.log('👆 Calling onRequestChange with:', requestData);
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
    console.log('🔄 REQUEST CHANGE EFFECT - Request:', request?.id, request?.name);
    if (request) {
      // Use draft data if available, otherwise use main data
      const dataToLoad = getEffectiveRequestData(request);
      console.log('📥 Loading data for request:', dataToLoad);
      setRequestData(prev => {
        console.log('📥 Previous requestData:', prev);
        const newData = { ...prev, ...dataToLoad };
        console.log('📥 New requestData:', newData);
        return newData;
      });

      // Store original data for comparison (without draft changes)
      originalDataRef.current = getEffectiveRequestData({
        ...request,
        has_draft_edits: false // Force getting original data without drafts
      });
      console.log('💾 Stored original data:', originalDataRef.current);

      // Set draft state based on request
      setHasUnsavedChanges(request.has_draft_edits || false);
      setIsDraftDirty(false);
    } else {
      console.log('🔄 No request - resetting to defaults');
      // Reset to default values when no request is selected
      const defaultData = getEffectiveRequestData(null);
      setRequestData(prev => ({
        ...prev,
        ...defaultData
      }));

      originalDataRef.current = null;
      setHasUnsavedChanges(false);
      setIsDraftDirty(false);
    }
  }, [request]);

  // Update the ref whenever requestData changes
  useEffect(() => {
    currentRequestDataRef.current = requestData;
  }, [requestData]);

  // Track changes for immediate UI updates and debounced saving
  useEffect(() => {
    console.log('🔍 CHANGE TRACKING EFFECT');
    console.log('🔍 Request ID:', request?.id);
    console.log('🔍 Original data exists:', !!originalDataRef.current);
    console.log('🔍 Current requestData:', requestData);
    console.log('🔍 isDraftDirty:', isDraftDirty);

    if (request && originalDataRef.current) {
      const hasChanges = hasDataChanged(originalDataRef.current, requestData);
      console.log('🔍 Has changes:', hasChanges);

      // Immediately update the hasUnsavedChanges state for UI
      setHasUnsavedChanges(hasChanges);

      if (hasChanges && !isDraftDirty) {
        console.log('🔍 Setting draft dirty and saving...');
        setIsDraftDirty(true);
        saveDraftChangesDebounced();
      } else if (!hasChanges && isDraftDirty) {
        // If changes were reverted, clear the dirty flag
        setIsDraftDirty(false);
      }
    }
  }, [requestData]);

  // Check if data has changed from original
  const hasDataChanged = (original, current) => {
    if (!request) return false;

    const fieldsToCheck = ['method', 'url', 'headers', 'queryParams', 'pathParams', 'bodyType', 'contentType', 'bodyContent', 'formData', 'urlEncodedData'];

    return fieldsToCheck.some(field => {
      const originalValue = original[field];
      const currentValue = current[field];

      // For arrays and objects, do a JSON comparison
      if (Array.isArray(originalValue) || Array.isArray(currentValue)) {
        return JSON.stringify(originalValue) !== JSON.stringify(currentValue);
      }

      return originalValue !== currentValue;
    });
  };

  // Debounced draft save
  const saveDraftChangesDebounced = () => {
    console.log('💾 DEBOUNCED SAVE - Clearing existing timeout');
    if (draftSaveTimeoutRef.current) {
      clearTimeout(draftSaveTimeoutRef.current);
    }

    console.log('💾 DEBOUNCED SAVE - Setting new timeout for request:', request?.id);
    draftSaveTimeoutRef.current = setTimeout(async () => {
      console.log('💾 EXECUTING DRAFT SAVE for request:', request?.id);
      // Use the ref to get the latest state at save time
      const currentData = currentRequestDataRef.current;
      console.log('💾 Saving requestData:', currentData);
      if (request?.id) {
        try {
          await apiClient.saveDraftChanges(request.id, currentData);
          console.log('💾 Draft save completed successfully');
          setIsDraftDirty(false);
        } catch (error) {
          console.error('💾 Failed to save draft changes:', error);
        }
      }
    }, 1000); // Save after 1 second of no changes
  };

  // Parse URL to extract query and path parameters
  // Use debounced parsing to avoid interfering with typing
  useEffect(() => {
    if (requestData.url) {
      const timeoutId = setTimeout(() => {
        parseUrlParameters(requestData.url);
      }, 500); // Wait 500ms after user stops typing

      return () => clearTimeout(timeoutId);
    }
  }, [requestData.url]);

  const parseUrlParameters = (url) => {
    if (!url) {
      setRequestData(prev => ({
        ...prev,
        queryParams: [],
        pathParams: []
      }));
      return;
    }

    try {
      // Parse query parameters from URL
      const queryParams = [];
      const urlParts = url.split('?');
      if (urlParts.length > 1) {
        const queryString = urlParts[1].split('#')[0]; // Remove fragment if present
        const searchParams = new URLSearchParams(queryString);
        searchParams.forEach((value, key) => {
          // Try to preserve existing parameter data (ID, enabled state) but use new URL value
          const existingParam = (requestData.queryParams || []).find(p => p.key === key);
          queryParams.push({ 
            id: existingParam?.id || crypto.randomUUID(), 
            key, 
            value: value, // Always use the value from URL
            enabled: existingParam?.enabled !== undefined ? existingParam.enabled : true 
          });
        });
      }

      // Extract path parameters (look for :param patterns)
      const pathPart = urlParts[0];
      const pathParamMatches = pathPart.match(/:([a-zA-Z_][a-zA-Z0-9_]*)/g) || [];
      const pathParams = pathParamMatches.map(match => {
        const key = match.slice(1); // Remove :
        const existingParam = (requestData.pathParams || []).find(p => p.key === key);
        return {
          id: existingParam?.id || crypto.randomUUID(),
          key,
          value: existingParam?.value || '',
          enabled: existingParam?.enabled !== undefined ? existingParam.enabled : true
        };
      });

      setRequestData(prev => ({
        ...prev,
        queryParams,
        pathParams
      }));
    } catch (error) {
      // For invalid URLs, still try to parse path parameters
      const pathParamMatches = url.match(/:([a-zA-Z_][a-zA-Z0-9_]*)/g) || [];
      const pathParams = pathParamMatches.map(match => {
        const key = match.slice(1); // Remove :
        const existingParam = (requestData.pathParams || []).find(p => p.key === key);
        return {
          id: existingParam?.id || crypto.randomUUID(),
          key,
          value: existingParam?.value || '',
          enabled: existingParam?.enabled !== undefined ? existingParam.enabled : true
        };
      });

      setRequestData(prev => ({
        ...prev,
        queryParams: [],
        pathParams
      }));
    }
  };

  const updateRequestData = (updates) => {
    console.log('📝 UPDATE REQUEST DATA:', updates);
    console.log('📝 Previous data:', requestData);
    setRequestData(prev => {
      const newData = { ...prev, ...updates };
      console.log('📝 New data after update:', newData);
      return newData;
    });
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

    // Handle error responses (only if explicitly marked as failed or has error data)
    if (request.response_success === false || request.response_error_type) {
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
    console.log('🖊️ URL CHANGE - New URL:', url);
    console.log('🖊️ Current requestData before update:', requestData);

    // Only update the URL directly, don't parse parameters during typing
    // Parameter parsing will happen when the user finishes editing (see useEffect below)
    updateRequestData({ url });
  };

  const handleBodyTypeChange = (bodyType) => {
    const updates = { bodyType };

    // If changing to 'raw', default to JSON content type
    if (bodyType === 'raw') {
      updates.contentType = 'application/json';
    }

    updateRequestData(updates);
  };

  // Synchronous version of parseUrlParameters for immediate parsing
  const parseUrlParametersSync = (url) => {
    if (!url) {
      return { queryParams: [], pathParams: [] };
    }

    try {
      // Parse query parameters from URL
      const queryParams = [];
      const urlParts = url.split('?');
      if (urlParts.length > 1) {
        const queryString = urlParts[1].split('#')[0]; // Remove fragment if present
        const searchParams = new URLSearchParams(queryString);
        searchParams.forEach((value, key) => {
          // Try to preserve existing parameter data (ID, enabled state) but use new URL value
          const existingParam = (requestData.queryParams || []).find(p => p.key === key);
          queryParams.push({ 
            id: existingParam?.id || crypto.randomUUID(), 
            key, 
            value: value, // Always use the value from URL
            enabled: existingParam?.enabled !== undefined ? existingParam.enabled : true 
          });
        });
      }

      // Extract path parameters (look for :param patterns)
      const pathPart = urlParts[0];
      const pathParamMatches = pathPart.match(/:([a-zA-Z_][a-zA-Z0-9_]*)/g) || [];
      const pathParams = pathParamMatches.map(match => {
        const key = match.slice(1); // Remove :
        const existingParam = (requestData.pathParams || []).find(p => p.key === key);
        return {
          id: existingParam?.id || crypto.randomUUID(),
          key,
          value: existingParam?.value || '',
          enabled: existingParam?.enabled !== undefined ? existingParam.enabled : true
        };
      });

      return { queryParams, pathParams };
    } catch (error) {
      // For invalid URLs, still try to parse path parameters
      const pathParamMatches = url.match(/:([a-zA-Z_][a-zA-Z0-9_]*)/g) || [];
      const pathParams = pathParamMatches.map(match => {
        const key = match.slice(1); // Remove :
        const existingParam = (requestData.pathParams || []).find(p => p.key === key);
        return {
          id: existingParam?.id || crypto.randomUUID(),
          key,
          value: existingParam?.value || '',
          enabled: existingParam?.enabled !== undefined ? existingParam.enabled : true
        };
      });

      return { queryParams: [], pathParams };
    }
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

  // Handle Enter key press to trigger send
  const handleEnterKeyPress = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSendRequest();
    }
  };

  // Get effective URL (use placeholder if URL is empty)
  const getEffectiveUrl = () => {
    return requestData.url.trim() || placeholderUrl;
  };

  // Get all available variables from collection and environment
  const getAvailableVariables = async () => {
    const variables = new Map();

    try {
      // Collection variables (inline)
      if (selectedCollection?.variables) {
        selectedCollection.variables.forEach(v => variables.set(v.key, v.value));
      }

      // Database collection variables
      if (selectedCollection?.id) {
        const collectionVars = await apiClient.getSecretsByCollection(selectedCollection.id);
        collectionVars.forEach(v => variables.set(v.key, v.value));
      }

      // Environment variables (if collection has environment)
      if (selectedCollection?.environment_id) {
        const envVars = await apiClient.getSecretsByEnvironment(selectedCollection.environment_id);
        envVars.forEach(v => variables.set(v.key, v.value));
      }
    } catch (error) {
      console.error('Failed to load variables:', error);
    }

    return variables;
  };

  // Replace {{variable}} patterns with actual values
  const replaceVariables = (text, variables) => {
    if (!text || typeof text !== 'string') return text;

    return text.replace(/\{\{([^}]+)\}\}/g, (match, variableName) => {
      const value = variables.get(variableName.trim());
      return value !== undefined ? value : match; // Keep original if variable not found
    });
  };

  // Handle request submission
  const handleSendRequest = async () => {
    if (isSubmitting) return;

    const effectiveUrl = getEffectiveUrl();
    if (!effectiveUrl) return;

    setIsSubmitting(true);
    setResponse(null);

    // Get all available variables for replacement
    const variables = await getAvailableVariables();

    // Use collection settings if available, otherwise use local settings
    const effectiveFollowRedirects = selectedCollection?.follow_redirects !== undefined
      ? selectedCollection.follow_redirects
      : requestData.followRedirects;
    const effectiveTimeout = selectedCollection?.timeout !== undefined
      ? selectedCollection.timeout
      : requestData.timeout;

    // Replace variables in all request fields
    const processedRequestData = {
      ...requestData,
      followRedirects: effectiveFollowRedirects,
      timeout: effectiveTimeout,
      url: replaceVariables(effectiveUrl, variables),
      headers: requestData.headers.map(h => ({
        ...h,
        key: replaceVariables(h.key, variables),
        value: replaceVariables(h.value, variables)
      })),
      queryParams: requestData.queryParams.map(p => ({
        ...p,
        key: replaceVariables(p.key, variables),
        value: replaceVariables(p.value, variables)
      })),
      pathParams: requestData.pathParams.map(p => ({
        ...p,
        key: replaceVariables(p.key, variables),
        value: replaceVariables(p.value, variables)
      })),
      bodyContent: replaceVariables(requestData.bodyContent, variables),
      formData: requestData.formData?.map(f => ({
        ...f,
        key: replaceVariables(f.key, variables),
        value: f.type === 'text' ? replaceVariables(f.value, variables) : f.value // Don't replace file values
      })),
      urlEncodedData: requestData.urlEncodedData?.map(u => ({
        ...u,
        key: replaceVariables(u.key, variables),
        value: replaceVariables(u.value, variables)
      }))
    };

    try {
      // Update proxy URL to respect current settings before making the request
      requestSubmitter.updateProxyUrl(requestSubmitter.getCurrentProxyUrl());
      
      const result = await requestSubmitter.submitRequest(processedRequestData);
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

  // Handle restore (discard draft changes)
  const handleRestore = async () => {
    if (!request?.id) return;

    try {
      const updatedRequest = await apiClient.discardDraftChanges(request.id);

      // Reload the original data
      const originalData = getEffectiveRequestData(updatedRequest);
      setRequestData(prev => ({
        ...prev,
        ...originalData
      }));

      // Update the original data reference to prevent false positives in change detection
      originalDataRef.current = originalData;

      setHasUnsavedChanges(false);
      setIsDraftDirty(false);

      // Trigger context refresh to update the request object
      if (onRequestChange) {
        onRequestChange(updatedRequest);
      }
    } catch (error) {
      console.error('Failed to restore request:', error);
    }
  };

  // Handle update (apply draft changes)
  const handleUpdate = async () => {
    if (!request?.id) return;

    try {
      const updatedRequest = await apiClient.applyDraftChanges(request.id);

      setHasUnsavedChanges(false);
      setIsDraftDirty(false);

      // Show success toast
      showToast();

      // Trigger context refresh to update the request object
      if (onRequestChange) {
        onRequestChange(updatedRequest);
      }
    } catch (error) {
      console.error('Failed to update request:', error);
    }
  };

  return (
    <>
      {/* URL Input and HTTP Method Selection Bar */}
      <div class="p-4">
        <div class="mb-2 overflow-x-auto scrollbar-hide">
          <div class="flex items-center justify-between flex-nowrap min-w-max">
            <div class="text-sm font-medium text-gray-700 whitespace-nowrap mr-2">
              ⚡️ <span>{request?.name || 'Untitled request'}</span>
            </div>
            <div class="flex items-center space-x-2 whitespace-nowrap">
              {hasUnsavedChanges && (
                <span class="flex items-center text-xs text-gray-400 font-normal">
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-info-icon lucide-info mr-1">
                    <circle cx="12" cy="12" r="10" />
                    <path d="M12 16v-4" />
                    <path d="M12 8h.01" />
                  </svg>
                  Request has unsaved data ( <button onClick={handleRestore} class="text-sky-500 hover:text-sky-700 cursor-pointer">restore</button>)
                </span>
              )}
              <button
                onClick={handleUpdate}
                disabled={!hasUnsavedChanges}
                class={`cursor-pointer rounded-md px-2 py-1 text-xs focus-visible:outline focus-visible:outline-offset-2 focus-visible:outline-sky-500 ${hasUnsavedChanges
                  ? 'bg-sky-100 hover:bg-sky-200 text-sky-700'
                  : 'bg-gray-300 text-white'
                  }`}
              >
                Update
              </button>
              <button
                onClick={() => setShowSaveAsModal(true)}
                disabled={!selectedCollection}
                title={selectedCollection ? 'Save the current request to collection' : 'Create or select a collection to save.'}
                class={`cursor-pointer rounded-md px-2 py-1 text-xs focus-visible:outline focus-visible:outline-offset-2 focus-visible:outline-sky-500 ${selectedCollection
                  ? 'bg-sky-100 hover:bg-sky-200 text-sky-700'
                  : 'bg-gray-300 text-white'
                  }`}
              >
                Save as
              </button>
            </div>
          </div>
        </div>
        <div class="flex flex-row items-stretch">
          {/* HTTP Method selector dropdown */}
          <div class="method-selector relative w-28 mr-2">
            <select
              value={requestData.method}
              onChange={(e) => handleMethodChange(e.target.value)}
              onKeyDown={handleEnterKeyPress}
              class="w-full appearance-none rounded-md bg-white pl-3 pr-8 text-sm text-gray-900 outline -outline-offset-1 outline-gray-300 focus:outline focus:-outline-offset-2 focus:outline-sky-500"
              style="min-height: 38px; max-height: 38px; line-height: 22px; box-sizing: border-box;"
            >
              {HTTP_METHODS.map(method => (
                <option key={method} value={method}>{method}</option>
              ))}
            </select>
            <svg class="pointer-events-none absolute top-1/2 right-3 transform -translate-y-1/2 text-gray-500 h-4 w-4"
              viewBox="0 0 16 16" fill="currentColor" aria-hidden="true" data-slot="icon">
              <path fill-rule="evenodd"
                d="M4.22 6.22a.75.75 0 0 1 1.06 0L8 8.94l2.72-2.72a.75.75 0 1 1 1.06 1.06l-3.25 3.25a.75.75 0 0 1-1.06 0L4.22 7.28a.75.75 0 0 1 0-1.06Z"
                clip-rule="evenodd" />
            </svg>
          </div>

          {/* URL input */}
          <div class="flex-1 mr-2" style="min-width: 0;">
            <VariableInput
              value={requestData.url}
              onChange={handleUrlChange}
              onKeyDown={handleEnterKeyPress}
              placeholder={placeholderUrl}
              className="w-full text-sm font-inter text-gray-900"
              style="min-height: 38px; line-height: 22px; width: 100%; box-sizing: border-box;"
            />
          </div>

          {/* Send and Code buttons */}
          <div class="flex flex-none">
            <button
              onClick={handleSendRequest}
              disabled={isSubmitting}
              class={`cursor-pointer rounded-md px-3 py-2 text-sm font-semibold focus-visible:outline focus-visible:outline-offset-2 focus-visible:outline-sky-500 ${isSubmitting
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-sky-500 hover:bg-sky-400 text-white'
                }`}
            >
              {isSubmitting ? 'Sending...' : 'Send'}
            </button>
            <button
              onClick={() => setShowCurlModal(true)}
              disabled={isSubmitting}
              type="button"
              class={`hidden ml-2 sm:block cursor-pointer rounded-md px-3 py-2 text-sm font-semibold border border-gray-300 focus-visible:outline focus-visible:outline-offset-2 focus-visible:outline-gray-500 ${isSubmitting
                ? 'bg-gray-50 text-gray-400 cursor-not-allowed'
                : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                }`}
            >
              <span>
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-code-icon lucide-code">
                  <path d="m16 18 6-6-6-6" />
                  <path d="m8 6-6 6 6 6" />
                </svg>
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Tabs and Tab Content */}
      <div>
        {/* Tabs */}
        <div class="border-b border-gray-200 px-4 overflow-x-auto scrollbar-hide">
          <div class="flex space-x-2 flex-nowrap min-w-max">
            {Object.entries(getTabNames(!!selectedCollection)).map(([key, name]) => (
              <button key={key} type="button" data-tab={key}
                onClick={() => setActiveTab(key)}
                class={`px-4 py-2 text-xs rounded-t-md font-medium focus:outline-none ${key === 'body' && isBodyDisabled
                  ? 'text-gray-400 cursor-not-allowed'
                  : activeTab === key
                    ? 'text-sky-600 bg-sky-50 border-b-2 border-sky-600 cursor-pointer'
                    : 'text-gray-600 hover:text-sky-600 hover:bg-gray-100 cursor-pointer'
                  }`}
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
                {key === 'body' && requestData.bodyType === 'form-data' && requestData.formData.length > 0 && (
                  <span class="ml-1 text-xs bg-sky-100 text-sky-600 rounded-full px-1.5 py-0.5">
                    {requestData.formData.length}
                  </span>
                )}
              </button>
            ))}
            <button type="button"
              onClick={() => setShowCurlImportModal(true)}
              class="cursor-pointer px-4 py-2 text-xs rounded-t-md font-medium text-sky-500 hover:text-sky-700 hover:bg-sky-50 focus:outline-none"
            >
              Import cURL
            </button>
          </div>
        </div>

        {/* Tab Content */}
        <div class="p-4 pb-2">
          {activeTab === 'params' && (
            <ParamsTab
              queryParams={requestData.queryParams}
              pathParams={requestData.pathParams}
              onQueryParamsChange={(params) => updateRequestData({ queryParams: params })}
              onPathParamsChange={(params) => updateRequestData({ pathParams: params })}
              onEnterKeyPress={handleEnterKeyPress}
            />
          )}
          {activeTab === 'headers' && (
            <HeadersTab
              headers={requestData.headers}
              onHeadersChange={(headers) => updateRequestData({ headers })}
              onEnterKeyPress={handleEnterKeyPress}
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
              onBodyTypeChange={handleBodyTypeChange}
              onBodyContentChange={(bodyContent) => updateRequestData({ bodyContent })}
              onContentTypeChange={(contentType) => updateRequestData({ contentType })}
              onFormDataChange={(formData) => updateRequestData({ formData })}
              onUrlEncodedDataChange={(urlEncodedData) => updateRequestData({ urlEncodedData })}
              onEnterKeyPress={handleEnterKeyPress}
              onSendRequest={handleSendRequest}
            />
          )}
          {activeTab === 'settings' && !selectedCollection && (
            <SettingsTab
              followRedirects={requestData.followRedirects}
              timeout={requestData.timeout}
              onFollowRedirectsChange={(followRedirects) => updateRequestData({ followRedirects })}
              onTimeoutChange={(timeout) => updateRequestData({ timeout })}
              onEnterKeyPress={handleEnterKeyPress}
            />
          )}
        </div>
      </div>

      {/* Response Section */}
      <div class="p-4 border-t border-gray-200">
        <div id="response-content-container">
          <ResponseDisplay
            response={response}
            isLoading={isSubmitting}
            onCancel={handleCancelRequest}
            collection={selectedCollection}
          />
        </div>
      </div>

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

      {/* Toast notification */}
      <Toast
        message="Request updated!"
        isVisible={isToastVisible}
        onClose={hideToast}
        type="success"
      />
    </>
  );
}
