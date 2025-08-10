import { useState, useEffect } from 'preact/hooks';
import { UserManager } from 'oidc-client-ts';
import { apiClient } from '../../api';

export function AuthSection({ environment, onUpdate }) {
  // Auth configuration state
  const [authType, setAuthType] = useState(environment?.auth || 'none');
  const [authConfig, setAuthConfig] = useState({
    domain: environment?.authConfig?.domain || '',
    clientId: environment?.authConfig?.clientId || '',
    ...environment?.authConfig
  });
  const [authResponse, setAuthResponse] = useState(environment?.authResponse || null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Update local state when environment changes
  useEffect(() => {
    if (environment) {
      setAuthType(environment.auth || 'none');
      setAuthConfig({
        domain: environment?.authConfig?.domain || '',
        clientId: environment?.authConfig?.clientId || '',
        ...environment?.authConfig
      });
      setAuthResponse(environment.authResponse || null);
    }
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
      await apiClient.updateEnvironment(environment.id, {
        ...environment,
        auth,
        authConfig: config,
        authResponse: response
      });
      if (onUpdate) {
        onUpdate(environment.id);
      }
    } catch (err) {
      console.error('Failed to update environment auth:', err);
      setError('Failed to update authentication configuration');
    }
  };

  const handleGetTokens = async () => {
    if (!authConfig.domain || !authConfig.clientId) {
      setError('Domain and Client ID are required');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      // Create OIDC client configuration
      const oidcConfig = {
        authority: authConfig.domain.startsWith('http') ? authConfig.domain : `https://${authConfig.domain}`,
        client_id: authConfig.clientId,
        redirect_uri: window.location.origin + '/auth/callback',
        response_type: 'code',
        scope: 'openid profile email',
        post_logout_redirect_uri: window.location.origin,
        // PKCE settings
        code_challenge_method: 'S256',
        automaticSilentRenew: false,
        loadUserInfo: true
      };

      const userManager = new UserManager(oidcConfig);

      // Start the OIDC flow
      const user = await userManager.signinPopup();

      if (user && user.access_token) {
        const response = {
          access_token: user.access_token,
          refresh_token: user.refresh_token,
          id_token: user.id_token,
          expires_in: user.expires_in,
          token_type: user.token_type,
          scope: user.scope,
          profile: user.profile,
          expires_at: user.expires_at
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
      setError(`Authentication failed: ${err.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveConfig = async () => {
    if (authType !== 'none' && (!authConfig.domain || !authConfig.clientId)) {
      setError('Domain and Client ID are required');
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

          {/* Get Tokens Button */}
          <div class="flex items-center gap-3">
            <button
              onClick={handleGetTokens}
              disabled={loading || !authConfig.domain || !authConfig.clientId}
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
          <div class="bg-gray-50 rounded-md p-4">
            <pre class="text-xs text-gray-800 whitespace-pre-wrap overflow-auto max-h-96">
              {JSON.stringify(authResponse, null, 2)}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}