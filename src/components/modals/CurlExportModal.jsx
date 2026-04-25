import { useState, useEffect, useRef } from 'preact/hooks';
import { generateFormattedCurlCommand } from '../../utils/curlGenerator';
import { resolveRequestVariables } from '../../utils/variableResolver';
import { useAppContext } from '../../hooks/useAppContext';
import { decryptSecret } from '../../utils/encryption';
import { Modal } from '../common/Modal';
import { Toast, useToast } from '../common/Toast';
import { Alert } from '../common/Alert';

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
    console.error('Failed to inject auth headers for cURL export:', error);
  }

  return { data: { ...resolvedData, headers }, hasAuth };
};

export function CurlExportModal({ isOpen, onClose, requestData }) {
  const { selectedCollection, currentEnvironment } = useAppContext();
  const [curlCommand, setCurlCommand] = useState('');
  const [hasAuthData, setHasAuthData] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const preRef = useRef();
  const [isToastVisible, showToast, hideToast] = useToast();

  // Generate curl command with resolved variables when modal opens or requestData changes
  useEffect(() => {
    if (isOpen && requestData) {
      setIsLoading(true);
      resolveRequestVariables(requestData, selectedCollection, currentEnvironment)
        .then(({ data: resolvedData, hasResolvedSecrets }) =>
          injectAuthHeaders(resolvedData, currentEnvironment)
            .then(({ data, hasAuth }) => ({ data, hasAuth: hasAuth || hasResolvedSecrets }))
        )
        .then(({ data, hasAuth }) => {
          const command = generateFormattedCurlCommand(data);
          setCurlCommand(command);
          setHasAuthData(hasAuth);
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
  }, [isOpen, requestData, selectedCollection, currentEnvironment]);

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
      showToast();
      onClose();
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
    onClose();
  };

  return (
    <>
      <Modal isOpen={isOpen} onClose={handleClose} title="Export cURL Command" size="md">
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

        {hasAuthData && (
          <Alert type="warning" className="mt-3">
            Caution! Export contains secret/auth data.
          </Alert>
        )}

        <div class="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
          <button
            onClick={handleCopy}
            type="button"
            class="inline-flex w-full justify-center rounded-md bg-sky-500 px-3 py-2 text-sm font-semibold text-white hover:bg-sky-400 sm:ml-3 sm:w-auto cursor-pointer"
          >
            Copy
          </button>
          <button
            onClick={handleClose}
            type="button"
            class="mt-3 inline-flex w-full justify-center rounded-md bg-white dark:bg-surface-dark-elevated px-3 py-2 text-sm font-semibold text-gray-900 dark:text-neutral-dark-900 ring-1 ring-inset ring-gray-300 dark:ring-neutral-dark-50 hover:bg-gray-50 dark:hover:bg-neutral-dark-200 sm:mt-0 sm:w-auto cursor-pointer"
          >
            Close
          </button>
        </div>
      </Modal>

      <Toast
        message="cURL command copied."
        isVisible={isToastVisible}
        onClose={hideToast}
        type="success"
      />
    </>
  );
}