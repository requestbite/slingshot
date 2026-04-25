import { useState, useEffect } from 'preact/hooks';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { Alert } from '../common/Alert';
import { resolveRequestVariables } from '../../utils/variableResolver';
import { useAppContext } from '../../hooks/useAppContext';
import { decryptSecret } from '../../utils/encryption';

const decryptAuthResponse = async (encryptedResponse) => {
  if (!encryptedResponse || !encryptedResponse.encrypted_value) return encryptedResponse;
  try {
    const decryptedString = await decryptSecret(encryptedResponse.encrypted_value, encryptedResponse.iv);
    return JSON.parse(decryptedString);
  } catch {
    return null;
  }
};

const decryptAuthConfig = async (encryptedConfig) => {
  if (!encryptedConfig || !encryptedConfig.encrypted_value) return encryptedConfig;
  try {
    const decryptedString = await decryptSecret(encryptedConfig.encrypted_value, encryptedConfig.iv);
    return JSON.parse(decryptedString);
  } catch {
    return null;
  }
};

const injectAuthHeaders = async (resolvedData, environment) => {
  if (!environment?.auth || environment.auth === 'none') return { data: resolvedData, hasAuth: false };

  let headers = [...(resolvedData.headers || [])];
  let hasAuth = false;

  const hasAuthHeader = (key) => headers.some(h => h.enabled && h.key.toLowerCase() === key.toLowerCase());

  try {
    if ((environment.auth === 'oidc_pkce' || environment.auth === 'oauth2_pkce' || environment.auth === 'oauth2_code') && environment.authResponse) {
      const authResp = await decryptAuthResponse(environment.authResponse);
      if (authResp?.access_token && !hasAuthHeader('authorization')) {
        headers.push({ key: 'Authorization', value: `Bearer ${authResp.access_token}`, enabled: true });
        hasAuth = true;
      }
    } else if (environment.auth === 'bearer_token' && environment.authConfig) {
      const authCfg = await decryptAuthConfig(environment.authConfig);
      if (authCfg?.token && !hasAuthHeader('authorization')) {
        headers.push({ key: 'Authorization', value: `Bearer ${authCfg.token}`, enabled: true });
        hasAuth = true;
      }
    } else if (environment.auth === 'basic_auth' && environment.authConfig) {
      const authCfg = await decryptAuthConfig(environment.authConfig);
      if ((authCfg?.username || authCfg?.password) && !hasAuthHeader('authorization')) {
        const credentials = btoa(`${authCfg.username || ''}:${authCfg.password || ''}`);
        headers.push({ key: 'Authorization', value: `Basic ${credentials}`, enabled: true });
        hasAuth = true;
      }
    } else if (environment.auth === 'api_key' && environment.authConfig) {
      const authCfg = await decryptAuthConfig(environment.authConfig);
      if (authCfg?.key && authCfg?.value) {
        const addTo = authCfg.addTo || 'header';
        if (addTo === 'header' && !hasAuthHeader(authCfg.key)) {
          headers.push({ key: authCfg.key, value: authCfg.value, enabled: true });
          hasAuth = true;
        } else if (addTo === 'query') {
          const queryParams = [...(resolvedData.queryParams || [])];
          const hasParam = queryParams.some(p => p.enabled && p.key.toLowerCase() === authCfg.key.toLowerCase());
          if (!hasParam) {
            queryParams.push({ key: authCfg.key, value: authCfg.value, enabled: true });
            return { data: { ...resolvedData, headers, queryParams }, hasAuth: true };
          }
        }
      }
    }
  } catch (error) {
    console.error('Failed to inject auth headers for shareable URL:', error);
  }

  return { data: { ...resolvedData, headers }, hasAuth };
};

export function CopyRequestModal({ isOpen, onClose, requestData, onCopySuccess }) {
  const { selectedCollection, currentEnvironment } = useAppContext();
  const [isLoading, setIsLoading] = useState(false);
  const [hasAuthData, setHasAuthData] = useState(false);

  // Check for secrets/auth when modal opens
  useEffect(() => {
    if (!isOpen || !requestData) {
      setHasAuthData(false);
      return;
    }
    resolveRequestVariables(requestData, selectedCollection, currentEnvironment)
      .then(({ data: resolvedData, hasResolvedSecrets }) =>
        injectAuthHeaders(resolvedData, currentEnvironment)
          .then(({ hasAuth }) => setHasAuthData(hasAuth || hasResolvedSecrets))
      )
      .catch(() => {});
  }, [isOpen, requestData, selectedCollection, currentEnvironment]);

  const generateShareableUrl = async () => {
    setIsLoading(true);

    try {
      const { data: resolvedData } = await resolveRequestVariables(requestData, selectedCollection, currentEnvironment);
      const { data } = await injectAuthHeaders(resolvedData, currentEnvironment);

      // Substitute resolved path parameters into the URL
      let resolvedUrl = data.url || '';
      data.pathParams?.forEach(param => {
        if (param.enabled && param.value) {
          const pattern = new RegExp(`:${param.key}\\b`, 'g');
          resolvedUrl = resolvedUrl.replace(pattern, param.value);
        }
      });

      // Process resolved data into the shareable URL format
      const processedData = {
        method: data.method || 'GET',
        url: resolvedUrl,
        headers: data.headers?.filter(h => h.enabled && h.key.trim()).reduce((acc, h) => {
          acc[h.key] = h.value;
          return acc;
        }, {}) || {},
        params: data.queryParams?.filter(p => p.enabled && p.key.trim()).reduce((acc, p) => {
          acc[p.key] = p.value;
          return acc;
        }, {}) || {},
        requestType: data.bodyType || 'none',
        contentType: data.contentType || '',
        body: data.bodyContent || '',
        formData: data.formData?.filter(f => f.enabled && f.key.trim()).map(f => ({
          key: f.key,
          value: f.value,
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

      if (onCopySuccess) {
        onCopySuccess();
      }
    } catch (error) {
      console.error('Failed to generate shareable URL:', error);
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
      <div class="text-sm text-gray-500 dark:text-neutral-dark-500">
        Do you want to create a copy of the current request as a shareable URL which opens Slingshot with the copied data?
      </div>

      {hasAuthData && (
        <Alert type="warning" className="mt-3">
          Caution! Export contains secret/auth data.
        </Alert>
      )}

      <div class="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
        <Button
          onClick={generateShareableUrl}
          disabled={isLoading}
          loading={isLoading}
          variant="primary"
          size="md"
          className="w-full sm:ml-3 sm:w-auto"
        >
          Copy
        </Button>
        <Button
          type="button"
          onClick={handleClose}
          disabled={isLoading}
          variant="secondary"
          size="md"
          className="mt-3 w-full sm:mt-0 sm:w-auto"
        >
          Cancel
        </Button>
      </div>
    </Modal>
  );
}
