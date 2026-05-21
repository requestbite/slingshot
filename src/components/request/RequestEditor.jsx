import { useState, useEffect, useRef } from 'preact/hooks';
import { Suspense, lazy } from 'preact/compat';
import { useLocation } from 'wouter-preact';
import { ParamsTab } from './tabs/ParamsTab';
import { HeadersTab } from './tabs/HeadersTab';
import { BodyTab } from './tabs/BodyTab';
import { SettingsTab } from './tabs/SettingsTab';
import { ResponseDisplay } from './ResponseDisplay';
import { ContextMenu } from '../common/ContextMenu';
import { CurlExportModal } from '../modals/CurlExportModal';
import { CurlImportModal } from '../modals/CurlImportModal';
import { SaveAsModal } from '../modals/SaveAsModal';
import { CopyRequestModal } from '../modals/CopyRequestModal';
import { VariableInput } from '../common/VariableInput';

// Dynamic import for JSONFormModal
const JSONFormModal = lazy(() => import('../modals/JSONFormModal').then(m => ({ default: m.JSONFormModal })));
import { generateUUID } from '../../utils/uuid.js';
import { Toast, useToast } from '../common/Toast';
import { requestSubmitter } from '../../utils/requestSubmitter';
import { apiClient } from '../../api';
import { useAppContext } from '../../hooks/useAppContext';
import { decryptSecret } from '../../utils/encryption';
import { Button } from '../common/Button';
import { parseRequestBodySchema, getRequestBodySchemaForContentType } from '../../utils/schemaParser';
import { trackRecentRequest } from '../../utils/recentRequests.js';
import { getMethodColor as getMethodBgColor } from '../../utils/httpMethods';

const HTTP_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'];

const getTabNames = (hasActiveCollection) => ({
  params: 'Params',
  headers: 'Headers',
  body: 'Body',
  ...(hasActiveCollection ? {} : { settings: 'Settings' })
});

// Decode percent-encoded query params in a URL so the URL bar shows human-readable values,
// matching the unencoded format produced by rebuildUrlFromParams when editing via the Params tab.
const decodeUrlQueryParams = (url) => {
  if (!url) return url;
  const qIdx = url.indexOf('?');
  if (qIdx === -1) return url;
  const base = url.slice(0, qIdx);
  const rest = url.slice(qIdx + 1);
  const hashIdx = rest.indexOf('#');
  const qs = hashIdx === -1 ? rest : rest.slice(0, hashIdx);
  const fragment = hashIdx === -1 ? '' : rest.slice(hashIdx);
  try {
    const pairs = [];
    new URLSearchParams(qs).forEach((value, key) => pairs.push(`${key}=${value}`));
    return base + (pairs.length ? '?' + pairs.join('&') : '') + fragment;
  } catch {
    return url;
  }
};

// Helper function to decrypt auth response
const decryptAuthResponse = async (encryptedResponse) => {
  if (!encryptedResponse || !encryptedResponse.encrypted_value) return encryptedResponse;

  try {
    const decryptedString = await decryptSecret(encryptedResponse.encrypted_value, encryptedResponse.iv);
    return JSON.parse(decryptedString);
  } catch (error) {
    console.error('Failed to decrypt auth response:', error);
    return null;
  }
};

// Helper function to decrypt auth config
const decryptAuthConfig = async (encryptedConfig) => {
  if (!encryptedConfig || !encryptedConfig.encrypted_value) return encryptedConfig;

  try {
    const decryptedString = await decryptSecret(encryptedConfig.encrypted_value, encryptedConfig.iv);
    return JSON.parse(decryptedString);
  } catch (error) {
    console.error('Failed to decrypt auth config:', error);
    return null;
  }
};

// Get auth method display name
const getAuthMethodDisplayName = (authField) => {
  const authDisplayNames = {
    'none': 'No auth',
    'api_key': 'API Key',
    'basic_auth': 'Basic Auth',
    'bearer_token': 'Bearer Token',
    'oauth2_pkce': 'OAuth 2.0 (PKCE)',
    'oauth2_code': 'OAuth 2.0 (Code Flow)',
    'oidc_pkce': 'OpenID Connect'
  };
  return authDisplayNames[authField] || null;
};

export function RequestEditor({ request, onRequestChange, sharedRequestData }) {
  const { selectedCollection, currentEnvironment, hasManuallySelectedEnvironment, loadCollections, isDocsSidebarVisible, setIsDocsSidebarVisible, setUpdateRequestBodyCallback } = useAppContext();
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState('overview');

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
      url: decodeUrlQueryParams(request.has_draft_edits && request.draft_url ? request.draft_url : (request.url || '')),
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
    ...(request ? getEffectiveRequestData(request) : {}),
    ...(sharedRequestData || {})
  });

  // Response state
  const [response, setResponse] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamedContent, setStreamedContent] = useState('');
  const [streamedChunks, setStreamedChunks] = useState([]);
  const [streamingMetadata, setStreamingMetadata] = useState(null);

  // Use ref to preserve metadata across streaming lifecycle
  const streamingMetadataRef = useRef(null);
  // Use ref to prevent race conditions when updating chunks rapidly
  const streamedChunksRef = useRef([]);

  // Keep ref synchronized with state
  useEffect(() => {
    streamedChunksRef.current = streamedChunks;
  }, [streamedChunks]);

  // Draft state
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isDraftDirty, setIsDraftDirty] = useState(false);
  const draftSaveTimeoutRef = useRef(null);
  const originalDataRef = useRef(null);
  const currentRequestDataRef = useRef(requestData);
  const isInitialLoadRef = useRef(false);
  const isParamEditRef = useRef(false);
  const previousRequestIdRef = useRef(null);

  // URL input ref — used to focus and position cursor on request load
  const urlInputRef = useRef(null);

  // Recent requests menu state
  const [showRecentMenu, setShowRecentMenu] = useState(false);
  const [recentRequests, setRecentRequests] = useState([]);
  const recentMenuButtonRef = useRef(null);

  // Modal state
  const [showCurlModal, setShowCurlModal] = useState(false);
  const [showCurlImportModal, setShowCurlImportModal] = useState(false);
  const [showSaveAsModal, setShowSaveAsModal] = useState(false);
  const [showCopyRequestModal, setShowCopyRequestModal] = useState(false);
  const [showJSONFormModal, setShowJSONFormModal] = useState(false);

  // Toast state
  const [isToastVisible, showToast, hideToast] = useToast();
  const [toastMessage, setToastMessage] = useState('Request updated!');

  // Resolved URL state (for displaying the final URL that will be sent)
  const [fullyResolvedUrl, setFullyResolvedUrl] = useState('');

  // Update parent when request data changes (but not during initial load or when editing existing requests)
  useEffect(() => {
    // Only call onRequestChange for new requests, not when editing existing ones
    if (onRequestChange && !request) {
      onRequestChange(requestData);
    }
  }, [requestData, onRequestChange]);

  // Register callback for updating request body from docs sidebar
  useEffect(() => {
    if (setUpdateRequestBodyCallback) {
      setUpdateRequestBodyCallback(() => (bodyData) => {
        // Update the request data with the new body content
        updateRequestData({
          bodyType: 'raw',
          contentType: 'application/json',
          bodyContent: JSON.stringify(bodyData, null, 2)
        });
        // Switch to the body tab
        setActiveTab('body');
      });
    }

    // Cleanup: unregister callback when component unmounts
    return () => {
      if (setUpdateRequestBodyCallback) {
        setUpdateRequestBodyCallback(null);
      }
    };
  }, [setUpdateRequestBodyCallback]);

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
      // Check if this is a different request (not just an update to the current request)
      const isDifferentRequest = previousRequestIdRef.current !== request.id;
      previousRequestIdRef.current = request.id;

      // Set initial load flag to prevent URL parsing from triggering change detection
      isInitialLoadRef.current = true;

      // Use draft data if available, otherwise use main data
      const dataToLoad = getEffectiveRequestData(request);
      setRequestData(prev => {
        const newData = { ...prev, ...dataToLoad };
        return newData;
      });

      // Store original data for comparison (without draft changes)
      originalDataRef.current = getEffectiveRequestData({
        ...request,
        has_draft_edits: false // Force getting original data without drafts
      });

      // Set draft state based on request
      setHasUnsavedChanges(request.has_draft_edits || false);
      setIsDraftDirty(false);

      // Only set active tab if this is a different request
      if (isDifferentRequest) {
        // Set active tab based on whether request has params
        const hasParams = (dataToLoad.queryParams?.length || 0) + (dataToLoad.pathParams?.length || 0) > 0;
        setActiveTab(hasParams ? 'params' : 'overview');
      } else {
        // Same request being updated - check if Body tab should be disabled
        const isBodyDisabled = ['GET', 'HEAD', 'OPTIONS'].includes(dataToLoad.method);
        if (isBodyDisabled) {
          setActiveTab(prev => prev === 'body' ? 'overview' : prev);
        }
      }

      // Clear the initial load flag after a delay to allow URL parsing to complete
      setTimeout(() => {
        isInitialLoadRef.current = false;
      }, 1000);
    } else {
      previousRequestIdRef.current = null;
      isInitialLoadRef.current = false;

      // Reset to default values when no request is selected
      const defaultData = getEffectiveRequestData(null);
      setRequestData(prev => ({
        ...prev,
        ...defaultData
      }));

      originalDataRef.current = null;
      setHasUnsavedChanges(false);
      setIsDraftDirty(false);
      setActiveTab('overview');
    }
  }, [request]);

  // Handle shared request data
  useEffect(() => {
    if (sharedRequestData && !request) {
      setRequestData(prev => ({
        ...prev,
        ...sharedRequestData
      }));
    }
  }, [sharedRequestData, request]);

  // Focus the URL bar with cursor at the end whenever a (different) request is loaded
  useEffect(() => {
    if (!request?.id) return;
    // Delay to let the VariableInput highlight effect settle its DOM update first
    const id = setTimeout(() => urlInputRef.current?.focusAtEnd(), 50);
    return () => clearTimeout(id);
  }, [request?.id]);

  // Update the ref whenever requestData changes
  useEffect(() => {
    currentRequestDataRef.current = requestData;
  }, [requestData]);

  // Track changes for immediate UI updates and debounced saving
  useEffect(() => {
    // Skip change tracking during initial load to prevent false positives
    if (isInitialLoadRef.current) {
      return;
    }

    if (request && originalDataRef.current) {
      const hasChanges = hasDataChanged(originalDataRef.current, requestData);

      // Immediately update the hasUnsavedChanges state for UI
      setHasUnsavedChanges(hasChanges);

      if (hasChanges && !isDraftDirty) {
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
    if (draftSaveTimeoutRef.current) {
      clearTimeout(draftSaveTimeoutRef.current);
    }

    draftSaveTimeoutRef.current = setTimeout(async () => {
      // Use the ref to get the latest state at save time
      const currentData = currentRequestDataRef.current;
      if (request?.id) {
        try {
          await apiClient.saveDraftChanges(request.id, currentData);
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
    // Skip re-parsing when the URL was just set by a param tab edit
    if (isParamEditRef.current) {
      isParamEditRef.current = false;
      return;
    }
    if (requestData.url) {
      const timeoutId = setTimeout(() => {
        parseUrlParameters(requestData.url);
      }, 500); // Wait 500ms after user stops typing

      return () => clearTimeout(timeoutId);
    }
  }, [requestData.url]);

  // Update fully resolved URL whenever URL, params, or environment changes
  useEffect(() => {
    const updateResolvedUrl = async () => {
      const resolved = await computeFullyResolvedUrl();
      setFullyResolvedUrl(resolved);
    };
    updateResolvedUrl();
  }, [requestData.url, requestData.queryParams, requestData.pathParams, currentEnvironment, selectedCollection]);

  const parseUrlParameters = (url) => {
    if (!url) {
      setRequestData(prev => ({
        ...prev,
        queryParams: [],
        pathParams: []
      }));
      return;
    }

    setRequestData(prev => {
      try {
        // Parse query parameters from URL
        const queryParams = [];
        const urlParts = url.split('?');
        if (urlParts.length > 1) {
          const queryString = urlParts[1].split('#')[0]; // Remove fragment if present
          const searchParams = new URLSearchParams(queryString);
          searchParams.forEach((value, key) => {
            // Try to preserve existing parameter data (ID, enabled state) but use new URL value
            const existingParam = (prev.queryParams || []).find(p => p.key === key);
            queryParams.push({
              id: existingParam?.id || generateUUID(),
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
          const existingParam = (prev.pathParams || []).find(p => p.key === key);
          return {
            id: existingParam?.id || generateUUID(),
            key,
            value: existingParam?.value || '',
            enabled: existingParam?.enabled !== undefined ? existingParam.enabled : true
          };
        });

        return {
          ...prev,
          queryParams,
          pathParams
        };
      } catch (error) {
        // For invalid URLs, still try to parse path parameters
        const pathParamMatches = url.match(/:([a-zA-Z_][a-zA-Z0-9_]*)/g) || [];
        const pathParams = pathParamMatches.map(match => {
          const key = match.slice(1); // Remove :
          const existingParam = (prev.pathParams || []).find(p => p.key === key);
          return {
            id: existingParam?.id || generateUUID(),
            key,
            value: existingParam?.value || '',
            enabled: existingParam?.enabled !== undefined ? existingParam.enabled : true
          };
        });

        return {
          ...prev,
          queryParams: [],
          pathParams
        };
      }
    });
  };

  const updateRequestData = (updates) => {
    setRequestData(prev => {
      const newData = { ...prev, ...updates };
      // Keep ref in sync immediately so handleSendRequest always reads latest data,
      // even if called before React has re-rendered with the new state.
      currentRequestDataRef.current = newData;
      return newData;
    });
  };

  const rebuildUrlFromParams = (queryParams) => {
    const base = currentRequestDataRef.current.url.split('?')[0];
    const enabled = queryParams.filter(p => p.enabled && p.key);
    if (!enabled.length) return base;
    return base + '?' + enabled.map(p => `${p.key}=${p.value}`).join('&');
  };

  const handleQueryParamsChange = (newParams) => {
    isParamEditRef.current = true;
    const newUrl = rebuildUrlFromParams(newParams);
    updateRequestData({ queryParams: newParams, url: newUrl });
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
            id: existingParam?.id || generateUUID(),
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
          id: existingParam?.id || generateUUID(),
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
          id: existingParam?.id || generateUUID(),
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

      // Environment variables - use currentEnvironment if available, 
      // otherwise fall back to collection's default environment only if user hasn't manually selected
      const environmentId = currentEnvironment?.id || (!hasManuallySelectedEnvironment ? selectedCollection?.environment_id : null);
      if (environmentId) {
        const envVars = await apiClient.getDecryptedEnvironmentSecrets(environmentId);
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

  // Compute the fully resolved URL (with variables, path params, and query params)
  const computeFullyResolvedUrl = async () => {
    const effectiveUrl = getEffectiveUrl();
    if (!effectiveUrl) return '';

    try {
      // Get all available variables for replacement
      const variables = await getAvailableVariables();

      // Replace variables in URL
      let resolvedUrl = replaceVariables(effectiveUrl, variables);

      // Replace path parameters with their values
      requestData.pathParams.forEach(param => {
        if (param.enabled && param.value) {
          const resolvedValue = replaceVariables(param.value, variables);
          const pattern = new RegExp(`:${param.key}\\b`, 'g');
          resolvedUrl = resolvedUrl.replace(pattern, resolvedValue);
        }
      });

      // Build complete URL with query parameters (unencoded for display)
      try {
        const urlObj = new URL(resolvedUrl.startsWith('http') ? resolvedUrl : `http://${resolvedUrl}`);
        const base = urlObj.origin + urlObj.pathname;

        const enabledQueryParams = requestData.queryParams.filter(p => p.enabled && p.key);
        if (!enabledQueryParams.length) return base;

        const queryString = enabledQueryParams
          .map(param => {
            const resolvedValue = replaceVariables(param.value, variables);
            return `${param.key}=${resolvedValue ?? ''}`;
          })
          .join('&');

        return `${base}?${queryString}`;
      } catch (error) {
        // If URL parsing fails, return the partially resolved URL
        return resolvedUrl;
      }
    } catch (error) {
      console.error('Failed to compute resolved URL:', error);
      return effectiveUrl;
    }
  };

  // Helper function to check if a data chunk is a timeout response
  const checkForTimeoutResponse = (data) => {
    if (!data || typeof data !== 'string') return null;

    try {
      const trimmed = data.trim();
      // Check if it looks like JSON
      if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
        const parsed = JSON.parse(trimmed);
        // Check for timeout response pattern
        if (parsed.success === false && parsed.error_type === 'request_timeout') {
          return { isTimeout: true };
        }
      }
    } catch (error) {
      // Not valid JSON, continue normally
    }
    return null;
  };

  // Save SSE response to IndexedDB
  const saveSSEResponseToIndexedDB = async (requestId, sseData) => {
    try {
      const { streamingMetadata, streamedContent, streamedChunks } = sseData;

      // Create SSE response object that matches the expected format
      const sseResponse = {
        responseData: streamedContent,
        rawHeaders: streamingMetadata?.response_headers || streamingMetadata?.headers || {},
        status: streamingMetadata?.response_status || streamingMetadata?.status || null,
        statusText: streamingMetadata?.response_status_text || streamingMetadata?.status_text || null,
        responseTime: 'N/A', // SSE doesn't have traditional response time
        responseSize: 'N/A', // SSE doesn't have traditional response size
        rawResponseTime: null,
        rawResponseSize: null,
        isBinary: false,
        binaryData: null,
        cancelled: false,
        success: true,
        errorType: null,
        errorTitle: null,
        errorMessage: null,
        receivedAt: new Date().toISOString(),
        // Mark this as an SSE response for proper rendering
        response_type: 'SSE',
        // Store streaming-specific data
        streaming_chunks: streamedChunks,
        streaming_metadata: streamingMetadata
      };

      await apiClient.saveRequestResponse(requestId, sseResponse);
    } catch (error) {
      console.error('Failed to save SSE response to IndexedDB:', error);
    }
  };

  // Handle request submission
  const handleSendRequest = async () => {
    if (isSubmitting) return;

    // Use the ref to get the most current data, bypassing any stale React closure.
    // This matters when the user edits a field and immediately hits Enter before
    // React has re-rendered with the updated requestData.
    const currentData = currentRequestDataRef.current;

    const effectiveUrl = currentData.url.trim() || placeholderUrl;
    if (!effectiveUrl) return;

    trackRecentRequest(request?.id);

    setIsSubmitting(true);
    setResponse(null);
    setIsStreaming(false);
    setStreamedContent('');
    setStreamedChunks([]);
    setStreamingMetadata(null);
    // Reset metadata ref for clean state
    streamingMetadataRef.current = null;
    // Reset chunks ref for clean state
    streamedChunksRef.current = [];

    // Get all available variables for replacement
    const variables = await getAvailableVariables();

    // Use collection settings if available, otherwise use local settings
    const effectiveFollowRedirects = selectedCollection?.follow_redirects !== undefined
      ? selectedCollection.follow_redirects
      : currentData.followRedirects;
    const effectiveTimeout = selectedCollection?.timeout !== undefined
      ? selectedCollection.timeout
      : currentData.timeout;

    // Process headers with variable replacement
    let processedHeaders = currentData.headers.map(h => ({
      ...h,
      key: replaceVariables(h.key, variables),
      value: replaceVariables(h.value, variables)
    }));

    // Add authentication headers based on environment auth type (only if not manually overridden)
    if (currentEnvironment?.auth && currentEnvironment.auth !== 'none') {
      try {
        if (currentEnvironment.auth === 'oidc_pkce' && currentEnvironment?.authResponse) {
          // OIDC PKCE: Use access token from auth response
          const decryptedAuthResponse = await decryptAuthResponse(currentEnvironment.authResponse);

          if (decryptedAuthResponse?.access_token) {
            // Only add Authorization header if no manual Authorization header exists
            const hasManualAuthHeader = processedHeaders.some(h =>
              h.enabled && h.key.toLowerCase() === 'authorization'
            );

            if (!hasManualAuthHeader) {
              // Add the Authorization header with Bearer token
              processedHeaders.push({
                id: generateUUID(),
                key: 'Authorization',
                value: `Bearer ${decryptedAuthResponse.access_token}`,
                enabled: true
              });
            }
          }
        } else if ((currentEnvironment.auth === 'oauth2_pkce' || currentEnvironment.auth === 'oauth2_code') && currentEnvironment?.authResponse) {
          // OAuth 2.0 (PKCE/Code Flow): Use access token from auth response
          const decryptedAuthResponse = await decryptAuthResponse(currentEnvironment.authResponse);

          if (decryptedAuthResponse?.access_token) {
            // Only add Authorization header if no manual Authorization header exists
            const hasManualAuthHeader = processedHeaders.some(h =>
              h.enabled && h.key.toLowerCase() === 'authorization'
            );

            if (!hasManualAuthHeader) {
              // Add the Authorization header with Bearer token
              processedHeaders.push({
                id: generateUUID(),
                key: 'Authorization',
                value: `Bearer ${decryptedAuthResponse.access_token}`,
                enabled: true
              });
            }
          }
        } else if (currentEnvironment.auth === 'basic_auth' && currentEnvironment?.authConfig) {
          // Basic Auth: Base64-encode username:password
          const decryptedAuthConfig = await decryptAuthConfig(currentEnvironment.authConfig);

          if (decryptedAuthConfig?.username || decryptedAuthConfig?.password) {
            // Only add Authorization header if no manual Authorization header exists
            const hasManualAuthHeader = processedHeaders.some(h =>
              h.enabled && h.key.toLowerCase() === 'authorization'
            );

            if (!hasManualAuthHeader) {
              const username = decryptedAuthConfig.username || '';
              const password = decryptedAuthConfig.password || '';
              const credentials = btoa(`${username}:${password}`);

              // Add the Authorization header with Basic auth
              processedHeaders.push({
                id: generateUUID(),
                key: 'Authorization',
                value: `Basic ${credentials}`,
                enabled: true
              });
            }
          }
        } else if (currentEnvironment.auth === 'bearer_token' && currentEnvironment?.authConfig) {
          // Bearer Token: Use token from auth config
          const decryptedAuthConfig = await decryptAuthConfig(currentEnvironment.authConfig);

          if (decryptedAuthConfig?.token) {
            // Only add Authorization header if no manual Authorization header exists
            const hasManualAuthHeader = processedHeaders.some(h =>
              h.enabled && h.key.toLowerCase() === 'authorization'
            );

            if (!hasManualAuthHeader) {
              // Add the Authorization header with Bearer token
              processedHeaders.push({
                id: generateUUID(),
                key: 'Authorization',
                value: `Bearer ${decryptedAuthConfig.token}`,
                enabled: true
              });
            }
          }
        } else if (currentEnvironment.auth === 'api_key' && currentEnvironment?.authConfig) {
          // API Key: Add as header or query parameter
          const decryptedAuthConfig = await decryptAuthConfig(currentEnvironment.authConfig);

          if (decryptedAuthConfig?.key && decryptedAuthConfig?.value) {
            const addTo = decryptedAuthConfig.addTo || 'header';

            if (addTo === 'header') {
              // Only add API key header if no manual header with the same key exists
              const hasManualHeader = processedHeaders.some(h =>
                h.enabled && h.key.toLowerCase() === decryptedAuthConfig.key.toLowerCase()
              );

              if (!hasManualHeader) {
                // Add the API key as a header
                processedHeaders.push({
                  id: generateUUID(),
                  key: decryptedAuthConfig.key,
                  value: decryptedAuthConfig.value,
                  enabled: true
                });
              }
            }
            // Note: Query parameter handling is done later in the URL processing
          }
        }
      } catch (error) {
        console.error('Failed to decrypt auth config for request:', error);
      }
    }

    // Parse query params fresh from the URL string to bypass the 500ms debounce.
    // Query params are always URL-derived (read-only in the UI), so re-parsing here
    // ensures we capture any params the user just typed before hitting Enter.
    let baseQueryParams = currentData.queryParams;
    try {
      const tempUrl = new URL(effectiveUrl.startsWith('http') ? effectiveUrl : `http://${effectiveUrl}`);
      const urlDerivedParams = [];
      tempUrl.searchParams.forEach((value, key) => {
        const existing = currentData.queryParams.find(p => p.key === key);
        urlDerivedParams.push({
          id: existing?.id || generateUUID(),
          key,
          value,
          enabled: existing?.enabled !== undefined ? existing.enabled : true
        });
      });
      // Only use freshly-parsed params if we got any (or the URL has no query string)
      baseQueryParams = urlDerivedParams;
    } catch (e) {
      // URL parsing failed, fall back to current state
    }

    // Process query parameters (including API key if needed)
    let processedQueryParams = baseQueryParams.map(p => ({
      ...p,
      key: replaceVariables(p.key, variables),
      value: replaceVariables(p.value, variables)
    }));

    // Add API key as query parameter if configured (only if not manually overridden)
    if (currentEnvironment?.auth === 'api_key' && currentEnvironment?.authConfig) {
      try {
        const decryptedAuthConfig = await decryptAuthConfig(currentEnvironment.authConfig);

        if (decryptedAuthConfig?.key && decryptedAuthConfig?.value && decryptedAuthConfig.addTo === 'query') {
          // Only add API key query param if no manual query param with the same key exists
          const hasManualQueryParam = processedQueryParams.some(p =>
            p.enabled && p.key.toLowerCase() === decryptedAuthConfig.key.toLowerCase()
          );

          if (!hasManualQueryParam) {
            // Add the API key as a query parameter
            processedQueryParams.push({
              id: generateUUID(),
              key: decryptedAuthConfig.key,
              value: decryptedAuthConfig.value,
              enabled: true
            });
          }
        }
      } catch (error) {
        console.error('Failed to decrypt auth config for query params:', error);
      }
    }

    // Build complete URL with query parameters
    let processedUrl = replaceVariables(effectiveUrl, variables);

    // Create URL object and clear existing query parameters, then add only enabled ones
    const url = new URL(processedUrl.startsWith('http') ? processedUrl : `http://${processedUrl}`);

    // Clear all existing query parameters first
    url.search = '';

    // Add only enabled query parameters
    const enabledQueryParams = processedQueryParams.filter(p => p.enabled && p.key);
    enabledQueryParams.forEach(param => {
      if (param.value !== undefined && param.value !== null) {
        url.searchParams.set(param.key, param.value);
      } else {
        url.searchParams.set(param.key, '');
      }
    });

    processedUrl = url.toString();

    // Replace variables in all request fields
    const processedRequestData = {
      ...currentData,
      followRedirects: effectiveFollowRedirects,
      timeout: effectiveTimeout,
      url: processedUrl,
      headers: processedHeaders,
      queryParams: processedQueryParams,
      pathParams: currentData.pathParams.map(p => ({
        ...p,
        key: replaceVariables(p.key, variables),
        value: replaceVariables(p.value, variables)
      })),
      bodyContent: replaceVariables(currentData.bodyContent, variables),
      formData: currentData.formData?.map(f => ({
        ...f,
        key: replaceVariables(f.key, variables),
        value: f.type === 'text' ? replaceVariables(f.value, variables) : f.value // Don't replace file values
      })),
      urlEncodedData: currentData.urlEncodedData?.map(u => ({
        ...u,
        key: replaceVariables(u.key, variables),
        value: replaceVariables(u.value, variables)
      }))
    };

    try {
      // Update proxy URL to respect current settings before making the request
      requestSubmitter.updateProxyUrl(requestSubmitter.getCurrentProxyUrl());

      // Set up streaming callbacks for real-time updates
      requestSubmitter.setStreamingCallbacks(
        (metadata) => {
          // Handle streaming metadata - immediately show ResponseDisplay with headers
          setIsStreaming(true);
          setStreamingMetadata(metadata);
          // Store metadata in ref to preserve it across streaming lifecycle
          streamingMetadataRef.current = metadata;
          setResponse({
            success: true,
            status: metadata.response_status || metadata.status,
            statusText: metadata.response_status_text || metadata.statusText,
            headers: metadata.response_headers ? Object.entries(metadata.response_headers).map(([key, value]) => ({
              name: key.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join('-'),
              value: value,
              isClickable: ['content-type', 'cache-control', 'authorization'].includes(key.toLowerCase())
            })) : [],
            responseTime: 'N/A',
            responseSize: 'N/A',
            isStreaming: true,
            streamedContent: '',
            rawHeaders: metadata.response_headers || {}
          });
        },
        (newData) => {
          if (newData === null) {
            // Streaming completed - capture current state and save to IndexedDB
            setStreamedContent(prev => {
              setStreamedChunks(currentChunks => {

                // Save SSE response to IndexedDB when streaming completes
                if (request?.id && streamingMetadataRef.current) {
                  saveSSEResponseToIndexedDB(request.id, {
                    streamingMetadata: streamingMetadataRef.current,
                    streamedContent: prev,
                    streamedChunks: currentChunks
                  });
                }

                return currentChunks;
              });

              const finalResponse = {
                isStreamingComplete: true,
                finalStreamedContent: prev
              };

              setResponse(prevResponse => ({
                ...prevResponse,
                ...finalResponse
              }));

              setIsStreaming(false);
              return prev;
            });
          } else {
            // Check if this chunk is a timeout JSON response
            const timeoutCheck = checkForTimeoutResponse(newData);
            if (timeoutCheck?.isTimeout) {
              // Mark the response as timed out and save to IndexedDB
              setStreamedContent(prev => {
                setStreamedChunks(currentChunks => {
                  // Save SSE response to IndexedDB when timing out
                  if (request?.id && streamingMetadataRef.current) {
                    saveSSEResponseToIndexedDB(request.id, {
                      streamingMetadata: streamingMetadataRef.current,
                      streamedContent: prev,
                      streamedChunks: currentChunks
                    });
                  }

                  return currentChunks;
                });
                return prev;
              });

              // Update response to mark it as timed out
              setResponse(prevResponse => ({
                ...prevResponse,
                timedOut: true
              }));

              // Mark streaming as completed since it's a timeout
              setIsStreaming(false);
            } else {
              // Handle normal streaming data - add as individual chunks and update content
              setStreamedContent(prev => prev + newData);

              // Split multiple SSE events that might arrive in a single chunk
              // SSE events are separated by double newlines
              const sseEvents = newData.split(/\n\n+/).filter(chunk => chunk.trim());

              // Use ref to prevent race conditions when chunks arrive rapidly
              const currentChunks = [...streamedChunksRef.current, ...sseEvents];
              streamedChunksRef.current = currentChunks;
              setStreamedChunks(currentChunks);
            }
          }
        }
      );

      const result = await requestSubmitter.submitRequest(processedRequestData);

      // Handle the final result
      if (result.isStreaming && result.streamingComplete) {
        // Streaming completed - update final response
        setIsStreaming(false);
        setResponse(prev => ({
          ...prev,
          responseTime: result.receivedAt ? '0.00 ms' : 'N/A', // Use actual timing if available
          responseSize: `${result.totalDataReceived || streamedContent.length} B`,
          isStreamingComplete: true,
          finalStreamedContent: result.streamedContent || streamedContent
        }));
      } else if (result.isStreaming && result.streamingStarted) {
        // Streaming just started - keep isStreaming true, don't reset it
        // Don't call setResponse here, the metadata callback already handled it
      } else {
        // Normal non-streaming response
        setResponse(result);
      }

      // Save response to IndexedDB if we have a request ID
      if (request?.id) {
        try {
          await apiClient.saveRequestResponse(request.id, result);
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
      // Only reset isStreaming if we don't have an active stream
      // (Active streams will be reset by the completion callback or cancellation)
    }
  };

  // Handle request cancellation
  const handleCancelRequest = () => {
    // Save SSE response before canceling if we have streaming data
    if (request?.id && streamingMetadataRef.current && (streamedContent || streamedChunks.length > 0)) {
      saveSSEResponseToIndexedDB(request.id, {
        streamingMetadata: streamingMetadataRef.current,
        streamedContent,
        streamedChunks
      });
    }

    requestSubmitter.cancelRequest();
    setIsSubmitting(false);
    setIsStreaming(false);
    // Keep streaming content and metadata to preserve the StreamingDisplay
    // setStreamedContent('');
    // setStreamedChunks([]);
    // setStreamingMetadata(null);
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

  // Handle copy request success
  const handleCopyRequestSuccess = () => {
    setToastMessage('Request copied.');
    showToast();
  };

  // Handle JSON form import
  const handleJSONFormImport = (formData) => {
    updateRequestData({
      bodyType: 'raw',
      contentType: 'application/json',
      bodyContent: JSON.stringify(formData, null, 2)
    });
  };

  // Handle update (apply draft changes)
  const handleUpdate = async () => {
    if (!request?.id) return;

    try {
      const updatedRequest = await apiClient.applyDraftChanges(request.id);

      setHasUnsavedChanges(false);
      setIsDraftDirty(false);

      // Show success toast
      setToastMessage('Request updated!');
      showToast();

      // Trigger context refresh to update the request object
      if (onRequestChange) {
        onRequestChange(updatedRequest);
      }
    } catch (error) {
      console.error('Failed to update request:', error);
    }
  };

  // Load recent requests from localStorage + IndexedDB and show menu
  const loadAndShowRecentMenu = async () => {
    try {
      const raw = localStorage.getItem('slingshot_recent_req');
      const ids = raw ? JSON.parse(raw) : [];

      const resolved = await Promise.all(
        ids.map(id => apiClient.getRequest(id).catch(() => null))
      );

      setRecentRequests(resolved.filter(Boolean));
    } catch (error) {
      setRecentRequests([]);
    }
    setShowRecentMenu(true);
  };

  // Handle clear response (clears only response data, preserves drafts and active tab)
  const handleClearResponse = async () => {
    // For non-collection requests (no request.id), just clear local state
    if (!request?.id) {
      setResponse(null);
      setIsStreaming(false);
      setStreamedContent('');
      setStreamedChunks([]);
      setStreamingMetadata(null);
      return;
    }

    try {
      // Use the new API method that only clears response fields
      await apiClient.clearRequestResponse(request.id);

      // Clear only the local response state to show WelcomeMessage
      setResponse(null);
      setIsStreaming(false);
      setStreamedContent('');
      setStreamedChunks([]);
      setStreamingMetadata(null);

      // DO NOT clear draft state or reload requestData
      // DO NOT call onRequestChange to avoid triggering tab changes
    } catch (error) {
      console.error('Failed to clear response:', error);
    }
  };

  return (
    <div class="h-full flex flex-col">
      {/* URL Input and HTTP Method Selection Bar */}
      <div class="p-4">
        <div class="mb-2 overflow-x-auto scrollbar-hide">
          <div class="flex items-center justify-between flex-nowrap min-w-max">
            <div class="flex items-center space-x-2 text-sm font-medium text-gray-700 dark:text-neutral-dark-700 whitespace-nowrap mr-2">
              <span ref={recentMenuButtonRef} class="inline-flex">
                <Button
                  onClick={loadAndShowRecentMenu}
                  variant="icon"
                  size="xs"
                  className="rounded-full p-1"
                  title="Recently sent requests"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M9 14 4 9l5-5" />
                    <path d="M4 9h10.5a5.5 5.5 0 0 1 5.5 5.5a5.5 5.5 0 0 1-5.5 5.5H11" />
                  </svg>
                </Button>
              </span>
              <span>⚡️ {request?.name || 'Untitled request'}</span>
            </div>
            <div class="flex items-center space-x-2 whitespace-nowrap">
              {hasUnsavedChanges && (
                <span class="flex items-center text-xs text-gray-400 dark:text-neutral-dark-400 font-normal">
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-info-icon lucide-info mr-1">
                    <circle cx="12" cy="12" r="10" />
                    <path d="M12 16v-4" />
                    <path d="M12 8h.01" />
                  </svg>
                  Request has unsaved data ( <Button onClick={handleRestore} variant="link" size="xs" className="p-0 h-auto">restore</Button>)
                </span>
              )}
              <Button
                onClick={handleUpdate}
                disabled={!hasUnsavedChanges}
                variant={hasUnsavedChanges ? 'icon' : 'icon'}
                size="xs"
              >
                Update
              </Button>
              <Button
                onClick={() => setShowSaveAsModal(true)}
                title="Save the current request to a collection"
                variant="icon"
                size="xs"
              >
                Save as
              </Button>
            </div>
          </div>
        </div>
        <div class="flex flex-row items-start">
          {/* HTTP Method selector dropdown */}
          <div class="method-selector relative w-28 mr-2">
            <select
              value={requestData.method}
              onChange={(e) => handleMethodChange(e.target.value)}
              onKeyDown={handleEnterKeyPress}
              class="w-full appearance-none rounded-md bg-white dark:bg-[#282a36] pl-3 pr-8 text-sm text-gray-900 dark:text-neutral-dark-900 outline -outline-offset-1 outline-gray-300 dark:outline-neutral-dark-50 focus:outline focus:-outline-offset-2 focus:outline-sky-500"
              style="min-height: 38px; max-height: 38px; line-height: 22px; box-sizing: border-box;"
            >
              {HTTP_METHODS.map(method => (
                <option key={method} value={method}>{method}</option>
              ))}
            </select>
            <svg class="pointer-events-none absolute top-1/2 right-3 transform -translate-y-1/2 text-gray-500 dark:text-neutral-dark-500 h-4 w-4"
              viewBox="0 0 16 16" fill="currentColor" aria-hidden="true" data-slot="icon">
              <path fill-rule="evenodd"
                d="M4.22 6.22a.75.75 0 0 1 1.06 0L8 8.94l2.72-2.72a.75.75 0 1 1 1.06 1.06l-3.25 3.25a.75.75 0 0 1-1.06 0L4.22 7.28a.75.75 0 0 1 0-1.06Z"
                clip-rule="evenodd" />
            </svg>
          </div>

          {/* URL input */}
          <div class="flex-1 sm:mr-2" style="min-width: 0;">
            <VariableInput
              ref={urlInputRef}
              key={`url-${currentEnvironment?.id || 'none'}`}
              value={requestData.url}
              onChange={handleUrlChange}
              onKeyDown={handleEnterKeyPress}
              placeholder={placeholderUrl}
              className="w-full text-sm font-inter text-gray-900 dark:text-neutral-dark-900"
              style="min-height: 38px; line-height: 22px; width: 100%; box-sizing: border-box;"
              selectedEnvironment={currentEnvironment}
              showResolved={true}
              inputType="url"
              fullyResolvedUrl={fullyResolvedUrl}
            />
          </div>

          {/* Send and Code buttons - Hidden below 500px */}
          <div class="hidden sm:flex flex-none">
            <Button
              onClick={handleSendRequest}
              disabled={isSubmitting}
              variant="primary"
              size="md"
            >
              {isSubmitting ? 'Sending...' : 'Send'}
            </Button>
          </div>
        </div>
      </div>

      {/* Tabs and Tab Content */}
      <div>
        {/* Tabs */}
        <div class={`px-4 overflow-x-auto scrollbar-hide ${activeTab !== 'overview' ? 'border-b border-gray-200 dark:border-neutral-dark-300' : ''}`}>
          <div class="flex justify-between items-start flex-nowrap min-w-max">
            <div class="flex space-x-1 flex-nowrap">
              {/* Overview Tab with Eye-Closed Icon */}
              <button type="button" data-tab="overview"
                onClick={() => setActiveTab('overview')}
                class={`px-4 py-2 text-xs rounded-t-md font-medium focus:outline-none ${activeTab === 'overview'
                  ? 'text-sky-600 dark:text-primary-dark-400 bg-sky-50 dark:bg-primary-dark-200 border-b-2 border-sky-600 dark:border-primary-dark-400 cursor-pointer'
                  : 'text-gray-600 dark:text-neutral-dark-600 hover:text-sky-600 hover:bg-gray-100 dark:hover:bg-neutral-dark-200 cursor-pointer'
                  }`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="m15 18-.722-3.25" />
                  <path d="M2 8a10.645 10.645 0 0 0 20 0" />
                  <path d="m20 15-1.726-2.05" />
                  <path d="m4 15 1.726-2.05" />
                  <path d="m9 18 .722-3.25" />
                </svg>
              </button>
              {Object.entries(getTabNames(!!selectedCollection)).map(([key, name]) => (
                <button key={key} type="button" data-tab={key}
                  onClick={() => setActiveTab(key)}
                  class={`px-4 py-2 text-xs rounded-t-md font-medium focus:outline-none ${key === 'body' && isBodyDisabled
                    ? 'text-gray-400 dark:text-neutral-dark-400 cursor-not-allowed'
                    : activeTab === key
                      ? 'text-sky-600 dark:text-primary-dark-400 bg-sky-50 dark:bg-primary-dark-200 border-b-2 border-sky-600 dark:border-primary-dark-400 cursor-pointer'
                      : 'text-gray-600 dark:text-neutral-dark-600 hover:text-sky-600 hover:bg-gray-100 dark:hover:bg-neutral-dark-200 cursor-pointer'
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
              <Button type="button"
                onClick={() => setShowCurlImportModal(true)}
                variant="ghost"
                size="xs"
                className="py-2 rounded-t-md"
              >
                <div class="flex items-center space-x-1">
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
                    <path d="M14 2v4a2 2 0 0 0 2 2h4" />
                    <path d="M9 15h6" />
                    <path d="M12 18v-6" />
                  </svg>
                  <span>Import cURL</span>
                </div>
              </Button>
              <Button type="button"
                onClick={() => setShowCurlModal(true)}
                variant="ghost"
                size="xs"
                className="py-2 rounded-t-md"
              >
                <div class="flex items-center space-x-1">
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" x2="12" y1="15" y2="3" />
                  </svg>
                  <span>Export cURL</span>
                </div>
              </Button>
              <Button type="button"
                onClick={() => setShowCopyRequestModal(true)}
                variant="ghost"
                size="xs"
                className="py-2 rounded-t-md"
              >
                <div class="flex items-center space-x-1">
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
                    <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
                  </svg>
                  <span>Copy request</span>
                </div>
              </Button>

              {/* Auth Banner */}
              {currentEnvironment?.auth && currentEnvironment.auth !== 'none' && getAuthMethodDisplayName(currentEnvironment.auth) && (
                <a
                  href={`/environments/${currentEnvironment.id}/auth`}
                  onClick={(e) => {
                    e.preventDefault();
                    setLocation(`/environments/${currentEnvironment.id}/auth`);
                  }}
                  class="cursor-pointer px-2 rounded-t-md text-xs transition-colors flex items-center text-green-600 hover:text-green-800 hover:bg-green-50 dark:hover:bg-success-dark-100 dark:hover:text-success-dark-400"
                  title="Click to view authentication settings"
                >
                  Auth: {getAuthMethodDisplayName(currentEnvironment.auth)}
                </a>
              )}
            </div>

            {/* Right side container for docs toggle */}
            <div class="flex-shrink-0">
              {/* Docs Sidebar Toggle - show when collection is selected */}
              {selectedCollection && (
                <Button type="button"
                  onClick={() => setIsDocsSidebarVisible(!isDocsSidebarVisible)}
                  variant="ghost"
                  size="xs"
                  className="py-2 rounded-t-md"
                  title={isDocsSidebarVisible ? "Hide docs panel" : "Show docs panel"}
                >
                  <div class="flex items-center space-x-1">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H19a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1H6.5a1 1 0 0 1 0-5H20" />
                    </svg>
                    <span>{isDocsSidebarVisible ? 'Hide docs' : 'Show docs'}</span>
                  </div>
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Tab Content - Hide when overview tab is active */}
        {activeTab !== 'overview' && (
          <div class="p-4 pb-2">
            {activeTab === 'params' && (
              <ParamsTab
                queryParams={requestData.queryParams}
                pathParams={requestData.pathParams}
                onQueryParamsChange={handleQueryParamsChange}
                onPathParamsChange={(params) => updateRequestData({ pathParams: params })}
                onEnterKeyPress={handleEnterKeyPress}
                selectedEnvironment={currentEnvironment}
              />
            )}
            {activeTab === 'headers' && (
              <HeadersTab
                headers={requestData.headers}
                onHeadersChange={(headers) => updateRequestData({ headers })}
                onEnterKeyPress={handleEnterKeyPress}
                selectedEnvironment={currentEnvironment}
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
                selectedEnvironment={currentEnvironment}
                request={request}
                isDocsSidebarVisible={isDocsSidebarVisible}
                onOpenSchemaEditor={() => setShowJSONFormModal(true)}
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
        )}
      </div>

      {/* Response Section */}
      <div class="p-4 border-t border-gray-200 dark:border-neutral-dark-300 flex-grow flex flex-col">
        <div id="response-content-container" class="flex flex-col h-full">
          <ResponseDisplay
            response={response}
            isLoading={isSubmitting}
            onCancel={handleCancelRequest}
            onClear={handleClearResponse}
            isStreaming={isStreaming}
            streamedContent={streamedContent}
            streamedChunks={streamedChunks}
            streamingMetadata={streamingMetadata}
            selectedCollection={selectedCollection}
            request={request}
          />
        </div>
      </div>

      {/* Recent Requests Menu */}
      <ContextMenu
        isOpen={showRecentMenu}
        onClose={() => setShowRecentMenu(false)}
        trigger={recentMenuButtonRef.current}
        width={260}
        position="below"
      >
        {recentRequests.length === 0 ? (
          <div class="px-4 py-2 text-sm text-gray-400 dark:text-neutral-dark-400">No recent requests...</div>
        ) : (
          recentRequests.map(req => (
            <a
              key={req.id}
              href={`/${req.collection_id}/${req.id}`}
              onClick={(e) => {
                e.preventDefault();
                setShowRecentMenu(false);
                setLocation(`/${req.collection_id}/${req.id}`);
              }}
              class="flex flex-col px-4 py-2 text-sm text-gray-700 dark:text-neutral-dark-700 hover:bg-gray-100 dark:hover:bg-neutral-dark-200 cursor-pointer no-underline"
            >
              <span class="truncate">{req.name || 'Untitled request'}</span>
              <span class="flex items-center gap-1.5 mt-0.5 overflow-hidden">
                <span class={`text-[10px] text-white font-semibold py-0.5 px-1 rounded flex-shrink-0 ${getMethodBgColor(req.method)}`}>
                  {req.method?.toUpperCase()}
                </span>
                {req.url && (
                  <span class="text-xs text-gray-400 dark:text-neutral-dark-400 truncate">{req.url.replace(/^\{\{[^}]+\}\}/, '')}</span>
                )}
              </span>
            </a>
          ))
        )}
      </ContextMenu>

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
          // Could potentially navigate to the saved request or show notification
        }}
      />

      {/* Copy Request Modal */}
      <CopyRequestModal
        isOpen={showCopyRequestModal}
        onClose={() => setShowCopyRequestModal(false)}
        requestData={requestData}
        onCopySuccess={handleCopyRequestSuccess}
      />

      {/* JSON Form Modal */}
      {showJSONFormModal && request && (() => {
        const requestBodySchema = parseRequestBodySchema(request.request_body_schema);
        const selectedSchema = getRequestBodySchemaForContentType(requestBodySchema, requestData.contentType);

        return (
          <Suspense fallback={null}>
            <JSONFormModal
              isOpen={showJSONFormModal}
              onClose={() => setShowJSONFormModal(false)}
              onImport={handleJSONFormImport}
              jsonSchema={selectedSchema}
            />
          </Suspense>
        );
      })()}

      {/* Toast notification */}
      <Toast
        message={toastMessage}
        isVisible={isToastVisible}
        onClose={hideToast}
        type="success"
      />
    </div>
  );
}
