import { useState, useEffect } from 'preact/hooks';
import { UserManager } from 'oidc-client-ts';
import { apiClient } from '../../api';
import { encryptSecret, decryptSecret } from '../../utils/encryption';
import CodeMirror from '@uiw/react-codemirror';
import { json } from '@codemirror/lang-json';
import { dracula } from '@uiw/codemirror-theme-dracula';
import { EditorView } from '@codemirror/view';
import { bracketMatching } from '@codemirror/language';

// Helper function to encrypt auth configuration
const encryptAuthConfig = async (authConfig) => {
  if (!authConfig) return null;
  
  const configString = JSON.stringify(authConfig);
  const { encrypted_value, iv } = await encryptSecret(configString);
  
  return { encrypted_value, iv };
};

// Helper function to decrypt auth configuration  
const decryptAuthConfig = async (encryptedConfig) => {
  if (!encryptedConfig || !encryptedConfig.encrypted_value) return null;
  
  try {
    const decryptedString = await decryptSecret(encryptedConfig.encrypted_value, encryptedConfig.iv);
    return JSON.parse(decryptedString);
  } catch (error) {
    console.error('Failed to decrypt auth config:', error);
    return null;
  }
};

// Helper function to encrypt auth response
const encryptAuthResponse = async (authResponse) => {
  if (!authResponse) return null;
  
  const responseString = JSON.stringify(authResponse);
  const { encrypted_value, iv } = await encryptSecret(responseString);
  
  return { encrypted_value, iv };
};

// Helper function to decrypt auth response
const decryptAuthResponse = async (encryptedResponse) => {
  if (!encryptedResponse || !encryptedResponse.encrypted_value) return null;
  
  try {
    const decryptedString = await decryptSecret(encryptedResponse.encrypted_value, encryptedResponse.iv);
    return JSON.parse(decryptedString);
  } catch (error) {
    console.error('Failed to decrypt auth response:', error);
    return null;
  }
};

export function AuthSection({ environment, onUpdate }) {
  // Auth configuration state
  const [authType, setAuthType] = useState(environment?.auth || 'none');
  const [authConfig, setAuthConfig] = useState({
    domain: environment?.authConfig?.domain || '',
    clientId: environment?.authConfig?.clientId || '',
    clientSecret: environment?.authConfig?.clientSecret || '',
    scopes: environment?.authConfig?.scopes || 'openid profile email',
    ...environment?.authConfig
  });
  const [authResponse, setAuthResponse] = useState(environment?.authResponse || null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Update local state when environment changes
  useEffect(() => {
    const loadAuthData = async () => {
      if (environment) {
        setAuthType(environment.auth || 'none');
        
        // Decrypt authConfig if it exists and is encrypted
        let decryptedAuthConfig = null;
        if (environment.authConfig) {
          if (environment.authConfig.encrypted_value) {
            // Config is encrypted, decrypt it
            decryptedAuthConfig = await decryptAuthConfig(environment.authConfig);
          } else {
            // Config is not encrypted (legacy data), use as-is
            decryptedAuthConfig = environment.authConfig;
          }
        }
        
        setAuthConfig({
          domain: decryptedAuthConfig?.domain || '',
          clientId: decryptedAuthConfig?.clientId || '',
          clientSecret: decryptedAuthConfig?.clientSecret || '',
          scopes: decryptedAuthConfig?.scopes || 'openid profile email',
          ...decryptedAuthConfig
        });
        
        // Decrypt authResponse if it exists and is encrypted
        let decryptedAuthResponse = null;
        if (environment.authResponse) {
          if (environment.authResponse.encrypted_value) {
            // Response is encrypted, decrypt it
            decryptedAuthResponse = await decryptAuthResponse(environment.authResponse);
          } else {
            // Response is not encrypted (legacy data), use as-is
            decryptedAuthResponse = environment.authResponse;
          }
        }
        
        setAuthResponse(decryptedAuthResponse);
      }
    };
    
    loadAuthData();
  }, [environment]);

  const handleAuthTypeChange = async (newAuthType) => {
    setAuthType(newAuthType);
    setError('');
    setSuccess('');
    
    if (newAuthType === 'none') {
      // Clear auth configuration
      await updateEnvironmentAuth(null, null, null);
    }
  };

  const handleConfigChange = (field, value) => {
    setAuthConfig(prev => ({ ...prev, [field]: value }));
  };

  const updateEnvironmentAuth = async (auth, config, response) => {
    try {
      // Encrypt the config and response before saving
      const encryptedConfig = config ? await encryptAuthConfig(config) : null;
      const encryptedResponse = response ? await encryptAuthResponse(response) : null;
      
      await apiClient.updateEnvironment(environment.id, {
        ...environment,
        auth,
        authConfig: encryptedConfig,
        authResponse: encryptedResponse
      });
      if (onUpdate) {
        onUpdate(environment.id);
      }
    } catch (err) {
      console.error('Failed to update environment auth:', err);
      if (err.message && err.message.includes('encryption key')) {
        setError('Failed to update authentication: Encryption key required. Please provide your password.');
      } else {
        setError('Failed to update authentication configuration');
      }
    }
  };

  const handleGetTokens = async () => {
    if (!authConfig.domain || !authConfig.clientId || !authConfig.scopes) {
      setError('Domain, Client ID, and Scopes are required');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      // Determine the authority URL
      const authority = authConfig.domain.startsWith('http') ? authConfig.domain : `https://${authConfig.domain}`;
      const redirectUri = window.location.origin + '/auth/callback';
      
      console.log('OIDC Configuration Debug:', {
        authority,
        client_id: authConfig.clientId,
        redirect_uri: redirectUri,
        current_origin: window.location.origin
      });

      // Create OIDC client configuration optimized for Google OAuth2 with PKCE
      const oidcConfig = {
        authority,
        client_id: authConfig.clientId,
        redirect_uri: redirectUri,
        response_type: 'code',
        scope: authConfig.scopes || 'openid profile email',
        // PKCE configuration
        code_challenge_method: 'S256',
        // Include client_secret if provided (Google requires it even with PKCE)
        ...(authConfig.clientSecret && { client_secret: authConfig.clientSecret }),
        automaticSilentRenew: false,
        loadUserInfo: true,
        // Additional settings for better compatibility
        filterProtocolClaims: true,
        clockSkew: 300,
        // Extra parameters for offline access and refresh tokens
        extraQueryParams: {
          access_type: 'offline',
          prompt: 'consent'
        }
      };

      const userManager = new UserManager(oidcConfig);

      // Check if PKCE is supported by the provider
      try {
        const metadata = await userManager.metadataService.getMetadata();
        const supportedMethods = metadata.code_challenge_methods_supported;
        
        if (supportedMethods && !supportedMethods.includes('S256')) {
          throw new Error('PKCE (S256) is not supported by this OIDC provider. Please use a provider that supports PKCE or configure a confidential client.');
        }
      } catch (metadataError) {
        console.warn('Could not verify PKCE support from metadata:', metadataError);
        // Continue anyway - some providers don't expose this in metadata
      }

      // Start the OIDC flow
      const user = await userManager.signinPopup();

      if (user && user.access_token) {
        // Calculate access token expiration timestamp
        const now = Date.now();
        const expiresInMs = (user.expires_in || 3600) * 1000; // Default to 1 hour if not provided
        const accessTokenExpires = new Date(now + expiresInMs).toISOString();

        const response = {
          access_token: user.access_token,
          refresh_token: user.refresh_token,
          id_token: user.id_token,
          expires_in: user.expires_in,
          token_type: user.token_type,
          scope: user.scope,
          profile: user.profile,
          expires_at: user.expires_at,
          access_token_expires: accessTokenExpires
        };

        setAuthResponse(response);
        setSuccess('Authentication successful! Tokens received.');

        // Save to environment
        await updateEnvironmentAuth('oidc_pkce', authConfig, response);
      } else {
        setError('Authentication failed: No tokens received');
      }
    } catch (err) {
      console.error('OIDC authentication error:', err);
      
      // Handle specific PKCE-related errors
      if (err.message && err.message.includes('client_secret')) {
        setError('Authentication failed: This OIDC provider requires a client secret, but PKCE should not need one. Please check if the provider supports public clients with PKCE, or contact your OIDC administrator to configure the client as a public client.');
      } else if (err.message && err.message.includes('invalid_client')) {
        setError('Authentication failed: Invalid client configuration. Make sure your Client ID is correct and the client is configured as a public client (no client secret required) with PKCE support.');
      } else if (err.message && err.message.includes('unsupported_response_type')) {
        setError('Authentication failed: The authorization code flow is not supported by this provider. PKCE requires the authorization code flow to be enabled.');
      } else if (err.message && err.message.includes('NetworkError')) {
        setError(`Authentication failed: Network error while contacting the OIDC provider. For Google OAuth2, ensure: 1) Your client is configured as a "Web application", 2) ${window.location.origin}/auth/callback is added to "Authorized redirect URIs", 3) ${window.location.origin} is added to "Authorized JavaScript origins". Check the console for detailed configuration info.`);
      } else if (err.message && (err.message.includes('CORS') || err.message.includes('cors'))) {
        setError(`Authentication failed: CORS error. Add ${window.location.origin} to your OAuth2 client's "Authorized JavaScript origins" in the Google Cloud Console.`);
      } else {
        setError(`Authentication failed: ${err.message || 'Unknown error'}. For Google OAuth2 setup, check: 1) Application type is "Web application", 2) Redirect URI: ${window.location.origin}/auth/callback, 3) JavaScript origins: ${window.location.origin}. Note: Google requires a client secret even with PKCE.`);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSaveConfig = async () => {
    if (authType !== 'none' && (!authConfig.domain || !authConfig.clientId || !authConfig.scopes)) {
      setError('Domain, Client ID, and Scopes are required');
      return;
    }

    try {
      await updateEnvironmentAuth(authType === 'none' ? null : authType, authType === 'none' ? null : authConfig, authResponse);
      setSuccess('Authentication configuration saved');
    } catch (err) {
      setError('Failed to save configuration');
    }
  };

  const clearTokens = async () => {
    setAuthResponse(null);
    await updateEnvironmentAuth(authType === 'none' ? null : authType, authType === 'none' ? null : authConfig, null);
    setSuccess('Tokens cleared');
  };

  return (
    <div class="space-y-6">
      {/* Auth Type Selection */}
      <div>
        <label for="auth-type" class="block text-sm font-medium text-gray-700 mb-2">
          Authentication Type
        </label>
        <select
          id="auth-type"
          value={authType}
          onChange={(e) => handleAuthTypeChange(e.target.value)}
          class="block w-full rounded-md px-3 py-2 text-gray-900 outline outline-1 outline-gray-300 focus:outline-2 focus:outline-sky-500 text-sm"
        >
          <option value="none">No auth</option>
          <option value="oidc_pkce">OpenID Connect (PKCE)</option>
        </select>
      </div>

      {/* OIDC Configuration */}
      {authType === 'oidc_pkce' && (
        <div class="space-y-4">
          <div>
            <label for="oidc-domain" class="block text-sm font-medium text-gray-700">
              Domain <span class="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="oidc-domain"
              value={authConfig.domain}
              onInput={(e) => handleConfigChange('domain', e.target.value)}
              placeholder="auth.example.com or https://auth.example.com"
              class="mt-1 block w-full rounded-md px-3 py-1.5 text-gray-900 outline outline-1 outline-gray-300 placeholder:text-gray-400 focus:outline-2 focus:outline-sky-500 text-sm"
            />
            <p class="mt-1 text-xs text-gray-500">
              The domain of your OIDC provider (without protocol, or with https://)
            </p>
          </div>

          <div>
            <label for="oidc-client-id" class="block text-sm font-medium text-gray-700">
              Client ID <span class="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="oidc-client-id"
              value={authConfig.clientId}
              onInput={(e) => handleConfigChange('clientId', e.target.value)}
              placeholder="your-client-id"
              class="mt-1 block w-full rounded-md px-3 py-1.5 text-gray-900 outline outline-1 outline-gray-300 placeholder:text-gray-400 focus:outline-2 focus:outline-sky-500 text-sm"
            />
            <p class="mt-1 text-xs text-gray-500">
              The client ID for your OIDC application
            </p>
          </div>

          <div>
            <label for="oidc-client-secret" class="block text-sm font-medium text-gray-700">
              Client Secret
            </label>
            <input
              type="password"
              id="oidc-client-secret"
              value={authConfig.clientSecret || ''}
              onInput={(e) => handleConfigChange('clientSecret', e.target.value)}
              placeholder="Leave empty for PKCE-only (if supported)"
              class="mt-1 block w-full rounded-md px-3 py-1.5 text-gray-900 outline outline-1 outline-gray-300 placeholder:text-gray-400 focus:outline-2 focus:outline-sky-500 text-sm"
            />
            <p class="mt-1 text-xs text-gray-500">
              Google OAuth2 requires client secret even with PKCE. Other providers may not need this.
            </p>
          </div>

          <div>
            <label for="oidc-scopes" class="block text-sm font-medium text-gray-700">
              Scopes <span class="text-red-500">*</span>
            </label>
            <textarea
              id="oidc-scopes"
              rows="3"
              value={authConfig.scopes}
              onInput={(e) => handleConfigChange('scopes', e.target.value)}
              placeholder="openid profile email"
              class="mt-1 block w-full rounded-md px-3 py-1.5 text-gray-900 outline outline-1 outline-gray-300 placeholder:text-gray-400 focus:outline-2 focus:outline-sky-500 text-sm"
            />
            <p class="mt-1 text-xs text-gray-500">
              Space-separated list of OAuth2 scopes (e.g., "openid profile email offline_access")
            </p>
          </div>

          {/* Get Tokens Button */}
          <div class="flex items-center gap-3">
            <button
              onClick={handleGetTokens}
              disabled={loading || !authConfig.domain || !authConfig.clientId || !authConfig.scopes}
              class="cursor-pointer rounded-md bg-sky-500 hover:bg-sky-400 disabled:bg-gray-300 px-3 py-2 text-sm font-semibold text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500"
            >
              {loading ? 'Authenticating...' : 'Get Tokens'}
            </button>

            <button
              onClick={handleSaveConfig}
              class="cursor-pointer rounded-md bg-gray-500 hover:bg-gray-400 px-3 py-2 text-sm font-semibold text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-500"
            >
              Save Configuration
            </button>

            {authResponse && (
              <button
                onClick={clearTokens}
                class="cursor-pointer rounded-md bg-red-500 hover:bg-red-400 px-3 py-2 text-sm font-semibold text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-500"
              >
                Clear Tokens
              </button>
            )}
          </div>
        </div>
      )}

      {/* Messages */}
      {error && (
        <div class="rounded-md bg-red-50 p-4">
          <div class="flex">
            <div class="flex-shrink-0">
              <svg class="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clip-rule="evenodd" />
              </svg>
            </div>
            <div class="ml-3">
              <p class="text-sm text-red-800">{error}</p>
            </div>
          </div>
        </div>
      )}

      {success && (
        <div class="rounded-md bg-green-50 p-4">
          <div class="flex">
            <div class="flex-shrink-0">
              <svg class="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.236 4.53L7.53 10.47a.75.75 0 00-1.06 1.06l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clip-rule="evenodd" />
              </svg>
            </div>
            <div class="ml-3">
              <p class="text-sm text-green-800">{success}</p>
            </div>
          </div>
        </div>
      )}

      {/* Auth Response Display */}
      {authResponse && (
        <div class="space-y-4">
          <h3 class="text-base font-medium text-gray-900">Authentication Response</h3>
          <div class="w-full max-w-full overflow-hidden">
            <CodeMirror
              value={JSON.stringify(authResponse, null, 2)}
              extensions={[
                bracketMatching(),
                json(),
                EditorView.theme({
                  "&": {
                    minHeight: "200px",
                    width: "100%",
                    maxWidth: "100%",
                    boxSizing: "border-box"
                  },
                  ".cm-content, .cm-gutter": {
                    minHeight: "200px !important"
                  },
                  ".cm-scroller": {
                    overflow: "auto",
                    width: "100%",
                    maxWidth: "100%"
                  },
                  ".cm-editor": {
                    width: "100%",
                    maxWidth: "100%"
                  }
                }),
                EditorView.editable.of(false)
              ]}
              theme={dracula}
              editable={false}
              basicSetup={{
                lineNumbers: true,
                foldGutter: true,
                dropCursor: false,
                allowMultipleSelections: false,
                indentOnInput: false,
                bracketMatching: true,
                closeBrackets: false,
                autocompletion: false,
                rectangularSelection: false,
                searchKeymap: false,
                highlightSelectionMatches: false
              }}
              style={{
                border: '1px solid #44475a',
                borderRadius: '0.375rem',
                fontSize: '12px',
                fontFamily: 'ui-monospace, SFMono-Regular, Consolas, "Liberation Mono", Menlo, monospace'
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}