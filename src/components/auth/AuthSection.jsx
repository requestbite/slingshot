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

export function AuthSection({ environment, onUpdate, onSave, onCancel }) {
  // Auth configuration state
  const [authType, setAuthType] = useState(environment?.auth || 'none');
  const [authConfig, setAuthConfig] = useState({
    domain: environment?.authConfig?.domain || '',
    clientId: environment?.authConfig?.clientId || '',
    clientSecret: environment?.authConfig?.clientSecret || '',
    scopes: environment?.authConfig?.scopes || 'openid profile email',
    // OAuth 2.0 PKCE specific fields
    authorization_url: environment?.authConfig?.authorization_url || '',
    token_url: environment?.authConfig?.token_url || '',
    redirect_uri: environment?.authConfig?.redirect_uri || '',
    scope: environment?.authConfig?.scope || '',
    state: environment?.authConfig?.state || '',
    code_challenge_method: environment?.authConfig?.code_challenge_method || 'SHA-256',
    refresh_token_url: environment?.authConfig?.refresh_token_url || '',
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
          // OAuth 2.0 PKCE specific fields
          authorization_url: decryptedAuthConfig?.authorization_url || '',
          token_url: decryptedAuthConfig?.token_url || '',
          redirect_uri: decryptedAuthConfig?.redirect_uri || '',
          scope: decryptedAuthConfig?.scope || '',
          state: decryptedAuthConfig?.state || '',
          code_challenge_method: decryptedAuthConfig?.code_challenge_method || 'SHA-256',
          refresh_token_url: decryptedAuthConfig?.refresh_token_url || '',
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
    } else if (newAuthType !== 'oidc_pkce' && newAuthType !== 'oauth2_pkce') {
      // Clear authResponse when switching away from OIDC PKCE or OAuth 2.0 PKCE
      setAuthResponse(null);
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

  // OAuth 2.0 PKCE helper functions
  const generateCodeVerifier = () => {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return btoa(String.fromCharCode.apply(null, array))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
  };

  const generateCodeChallenge = async (codeVerifier) => {
    if (authConfig.code_challenge_method === 'plain') {
      return codeVerifier;
    }
    
    const encoder = new TextEncoder();
    const data = encoder.encode(codeVerifier);
    const digest = await crypto.subtle.digest('SHA-256', data);
    return btoa(String.fromCharCode.apply(null, new Uint8Array(digest)))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
  };

  const handleOAuth2SaveConfig = async () => {
    if (!authConfig.authorization_url || !authConfig.token_url || !authConfig.clientId || !authConfig.redirect_uri || !authConfig.scope) {
      setError('Authorization URL, Token URL, Client ID, Redirect URI, and Scope are required');
      return;
    }

    try {
      await updateEnvironmentAuth('oauth2_pkce', authConfig, authResponse);
      setSuccess('OAuth 2.0 PKCE configuration saved');
    } catch (err) {
      setError('Failed to save OAuth 2.0 PKCE configuration');
    }
  };

  const handleOAuth2GetTokens = async () => {
    if (!authConfig.authorization_url || !authConfig.token_url || !authConfig.clientId || !authConfig.redirect_uri || !authConfig.scope) {
      setError('Authorization URL, Token URL, Client ID, Redirect URI, and Scope are required');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      // Generate PKCE parameters
      const codeVerifier = generateCodeVerifier();
      const codeChallenge = await generateCodeChallenge(codeVerifier);
      const state = authConfig.state || Math.random().toString(36).substring(2, 15);

      // Store PKCE parameters in session storage for later use
      sessionStorage.setItem('oauth2_code_verifier', codeVerifier);
      sessionStorage.setItem('oauth2_state', state);

      // Build authorization URL
      const authUrl = new URL(authConfig.authorization_url);
      authUrl.searchParams.set('response_type', 'code');
      authUrl.searchParams.set('client_id', authConfig.clientId);
      authUrl.searchParams.set('redirect_uri', authConfig.redirect_uri);
      authUrl.searchParams.set('scope', authConfig.scope);
      authUrl.searchParams.set('state', state);
      authUrl.searchParams.set('code_challenge', codeChallenge);
      authUrl.searchParams.set('code_challenge_method', authConfig.code_challenge_method === 'plain' ? 'plain' : 'S256');

      // Open popup for authorization
      const popup = window.open(
        authUrl.toString(),
        'oauth2_auth',
        'width=500,height=600,scrollbars=yes,resizable=yes'
      );

      if (!popup) {
        throw new Error('Failed to open popup window. Please allow popups for this site.');
      }

      // Listen for the popup to close or send a message
      const pollTimer = setInterval(() => {
        if (popup.closed) {
          clearInterval(pollTimer);
          setLoading(false);
          setError('Authorization cancelled by user');
        }
      }, 1000);

      // Listen for messages from the popup
      const messageHandler = async (event) => {
        if (event.origin !== window.location.origin) return;
        
        if (event.data.type === 'oauth2_callback') {
          clearInterval(pollTimer);
          popup.close();
          window.removeEventListener('message', messageHandler);

          const { code, state: returnedState, error } = event.data;

          if (error) {
            setLoading(false);
            setError(`Authorization failed: ${error}`);
            return;
          }

          if (!code) {
            setLoading(false);
            setError('No authorization code received');
            return;
          }

          if (returnedState !== state) {
            setLoading(false);
            setError('State parameter mismatch - possible security issue');
            return;
          }

          // Exchange code for tokens
          try {
            await exchangeCodeForTokens(code, codeVerifier);
          } catch (tokenError) {
            setLoading(false);
            setError(`Token exchange failed: ${tokenError.message}`);
          }
        }
      };

      window.addEventListener('message', messageHandler);

    } catch (err) {
      console.error('OAuth 2.0 authorization error:', err);
      setError(`Authorization failed: ${err.message}`);
      setLoading(false);
    }
  };

  const exchangeCodeForTokens = async (code, codeVerifier) => {
    try {
      const formData = new URLSearchParams();
      formData.append('grant_type', 'authorization_code');
      formData.append('client_id', authConfig.clientId);
      formData.append('code', code);
      formData.append('redirect_uri', authConfig.redirect_uri);
      formData.append('code_verifier', codeVerifier);

      // Include client secret if provided
      if (authConfig.clientSecret) {
        formData.append('client_secret', authConfig.clientSecret);
      }

      const response = await fetch(authConfig.token_url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error_description || errorData.error || `HTTP ${response.status}`);
      }

      const tokenData = await response.json();

      if (tokenData.access_token) {
        // Calculate access token expiration timestamp
        const now = Date.now();
        const expiresInMs = (tokenData.expires_in || 3600) * 1000; // Default to 1 hour if not provided
        const accessTokenExpires = new Date(now + expiresInMs).toISOString();

        const response = {
          access_token: tokenData.access_token,
          refresh_token: tokenData.refresh_token,
          expires_in: tokenData.expires_in,
          token_type: tokenData.token_type || 'Bearer',
          scope: tokenData.scope,
          access_token_expires: accessTokenExpires
        };

        setAuthResponse(response);
        setSuccess('OAuth 2.0 authentication successful! Tokens received.');

        // Save to environment
        await updateEnvironmentAuth('oauth2_pkce', authConfig, response);
      } else {
        throw new Error('No access token received');
      }
    } finally {
      setLoading(false);
      // Clean up session storage
      sessionStorage.removeItem('oauth2_code_verifier');
      sessionStorage.removeItem('oauth2_state');
    }
  };

  const handleOAuth2RefreshTokens = async () => {
    if (!authResponse?.refresh_token) {
      setError('No refresh token available');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const refreshUrl = authConfig.refresh_token_url || authConfig.token_url;
      
      if (!refreshUrl) {
        throw new Error('No refresh token URL configured');
      }

      const formData = new URLSearchParams();
      formData.append('grant_type', 'refresh_token');
      formData.append('refresh_token', authResponse.refresh_token);
      formData.append('client_id', authConfig.clientId);

      // Include client secret if available
      if (authConfig.clientSecret) {
        formData.append('client_secret', authConfig.clientSecret);
      }

      const response = await fetch(refreshUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error_description || errorData.error || `HTTP ${response.status}`);
      }

      const tokenData = await response.json();

      if (tokenData.access_token) {
        // Calculate new access token expiration timestamp
        const now = Date.now();
        const expiresInMs = (tokenData.expires_in || 3600) * 1000; // Default to 1 hour if not provided
        const accessTokenExpires = new Date(now + expiresInMs).toISOString();

        const updatedResponse = {
          ...authResponse,
          access_token: tokenData.access_token,
          expires_in: tokenData.expires_in,
          token_type: tokenData.token_type || authResponse.token_type,
          scope: tokenData.scope || authResponse.scope,
          access_token_expires: accessTokenExpires,
          // Update refresh token if a new one was provided
          ...(tokenData.refresh_token && { refresh_token: tokenData.refresh_token })
        };

        setAuthResponse(updatedResponse);
        setSuccess('OAuth 2.0 tokens refreshed successfully!');

        // Save updated tokens to environment
        await updateEnvironmentAuth('oauth2_pkce', authConfig, updatedResponse);
      } else {
        setError('Token refresh failed: No access token received');
      }
    } catch (err) {
      console.error('OAuth 2.0 token refresh error:', err);
      setError(`Token refresh failed: ${err.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
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
    if (authType === 'oidc_pkce' && (!authConfig.domain || !authConfig.clientId || !authConfig.scopes)) {
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

  const handleBasicAuthSave = async () => {
    try {
      await updateEnvironmentAuth('basic_auth', authConfig, null);
      setSuccess('Basic Auth configuration saved');
      
      // Use the comprehensive save function if provided
      if (onSave) {
        onSave();
      }
    } catch (err) {
      setError('Failed to save Basic Auth configuration');
    }
  };

  const handleBasicAuthCancel = () => {
    if (onCancel) {
      onCancel();
    }
  };

  const handleBearerTokenSave = async () => {
    if (!authConfig.token) {
      setError('Token is required');
      return;
    }

    try {
      await updateEnvironmentAuth('bearer_token', authConfig, null);
      setSuccess('Bearer Token configuration saved');
      
      // Use the comprehensive save function if provided
      if (onSave) {
        onSave();
      }
    } catch (err) {
      setError('Failed to save Bearer Token configuration');
    }
  };

  const handleBearerTokenCancel = () => {
    if (onCancel) {
      onCancel();
    }
  };

  const handleApiKeySave = async () => {
    if (!authConfig.key || !authConfig.value) {
      setError('Key and Value are required');
      return;
    }

    try {
      // Ensure addTo has a default value
      const configToSave = {
        key: authConfig.key,
        value: authConfig.value,
        addTo: authConfig.addTo || 'header'
      };

      await updateEnvironmentAuth('api_key', configToSave, null);
      setSuccess('API Key configuration saved');
      
      // Use the comprehensive save function if provided
      if (onSave) {
        onSave();
      }
    } catch (err) {
      setError('Failed to save API Key configuration');
    }
  };

  const handleApiKeyCancel = () => {
    if (onCancel) {
      onCancel();
    }
  };

  const handleRefreshTokens = async () => {
    if (!authResponse?.refresh_token) {
      setError('No refresh token available');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      // Determine the authority URL
      const authority = authConfig.domain.startsWith('http') ? authConfig.domain : `https://${authConfig.domain}`;

      // Create UserManager to get OpenID Connect configuration
      const oidcConfig = {
        authority,
        client_id: authConfig.clientId,
        redirect_uri: window.location.origin + '/auth/callback',
        response_type: 'code',
        scope: authConfig.scopes || 'openid profile email',
        code_challenge_method: 'S256',
        ...(authConfig.clientSecret && { client_secret: authConfig.clientSecret }),
        automaticSilentRenew: false,
        loadUserInfo: false
      };

      const userManager = new UserManager(oidcConfig);

      // Get the OpenID Connect metadata to find the token endpoint
      const metadata = await userManager.metadataService.getMetadata();

      if (!metadata.token_endpoint) {
        throw new Error('Token endpoint not found in OpenID Connect configuration');
      }

      // Create form data for token refresh request
      const formData = new URLSearchParams();
      formData.append('grant_type', 'refresh_token');
      formData.append('refresh_token', authResponse.refresh_token);
      formData.append('client_id', authConfig.clientId);

      // Include client secret if available
      if (authConfig.clientSecret) {
        formData.append('client_secret', authConfig.clientSecret);
      }

      const response = await fetch(metadata.token_endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error_description || errorData.error || `HTTP ${response.status}`);
      }

      const tokenData = await response.json();

      if (tokenData.access_token) {
        // Calculate new access token expiration timestamp
        const now = Date.now();
        const expiresInMs = (tokenData.expires_in || 3600) * 1000; // Default to 1 hour if not provided
        const accessTokenExpires = new Date(now + expiresInMs).toISOString();

        const updatedResponse = {
          ...authResponse,
          access_token: tokenData.access_token,
          expires_in: tokenData.expires_in,
          token_type: tokenData.token_type || authResponse.token_type,
          scope: tokenData.scope || authResponse.scope,
          access_token_expires: accessTokenExpires,
          // Update refresh token if a new one was provided
          ...(tokenData.refresh_token && { refresh_token: tokenData.refresh_token }),
          // Update ID token if a new one was provided
          ...(tokenData.id_token && { id_token: tokenData.id_token })
        };

        setAuthResponse(updatedResponse);
        setSuccess('Tokens refreshed successfully!');

        // Save updated tokens to environment
        await updateEnvironmentAuth(authType, authConfig, updatedResponse);
      } else {
        setError('Token refresh failed: No access token received');
      }
    } catch (err) {
      console.error('Token refresh error:', err);

      // Handle specific errors
      if (err.message && err.message.includes('Token endpoint not found')) {
        setError('Token refresh failed: Unable to discover token endpoint from OpenID Connect configuration');
      } else if (err.message && err.message.includes('NetworkError')) {
        setError('Token refresh failed: Network error while contacting the OIDC provider');
      } else {
        setError(`Token refresh failed: ${err.message || 'Unknown error'}`);
      }
    } finally {
      setLoading(false);
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
          <option value="api_key">API Key</option>
          <option value="basic_auth">Basic Auth</option>
          <option value="bearer_token">Bearer Token</option>
          <option value="oauth2_pkce">OAuth 2.0 (PKCE)</option>
          <option value="oidc_pkce">OpenID Connect (PKCE)</option>
        </select>
      </div>

      {/* API Key Configuration */}
      {authType === 'api_key' && (
        <div class="space-y-4">
          <div>
            <label for="api-key" class="block text-sm font-medium text-gray-700">
              Key <span class="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="api-key"
              value={authConfig.key || ''}
              onInput={(e) => handleConfigChange('key', e.target.value)}
              placeholder="X-API-Key"
              class="mt-1 block w-full rounded-md px-3 py-1.5 text-gray-900 outline outline-1 outline-gray-300 placeholder:text-gray-400 focus:outline-2 focus:outline-sky-500 text-sm"
            />
            <p class="mt-1 text-xs text-gray-500">
              The name of the API key parameter (e.g., "X-API-Key", "api_key")
            </p>
          </div>

          <div>
            <label for="api-value" class="block text-sm font-medium text-gray-700">
              Value <span class="text-red-500">*</span>
            </label>
            <input
              type="password"
              id="api-value"
              value={authConfig.value || ''}
              onInput={(e) => handleConfigChange('value', e.target.value)}
              placeholder="your-api-key-value"
              class="mt-1 block w-full rounded-md px-3 py-1.5 text-gray-900 outline outline-1 outline-gray-300 placeholder:text-gray-400 focus:outline-2 focus:outline-sky-500 text-sm"
            />
            <p class="mt-1 text-xs text-gray-500">
              The actual API key value
            </p>
          </div>

          <div>
            <label for="api-add-to" class="block text-sm font-medium text-gray-700">
              Add to
            </label>
            <select
              id="api-add-to"
              value={authConfig.addTo || 'header'}
              onChange={(e) => handleConfigChange('addTo', e.target.value)}
              class="mt-1 block w-full rounded-md px-3 py-2 text-gray-900 outline outline-1 outline-gray-300 focus:outline-2 focus:outline-sky-500 text-sm"
            >
              <option value="header">Header</option>
              <option value="query">Query Params</option>
            </select>
            <p class="mt-1 text-xs text-gray-500">
              Where to add the API key in the request
            </p>
          </div>

          {/* Save and Cancel Buttons */}
          <div class="flex items-center gap-3">
            <button
              onClick={handleApiKeySave}
              class="cursor-pointer rounded-md bg-sky-500 hover:bg-sky-400 px-3 py-2 text-sm font-semibold text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500"
            >
              Save
            </button>
            <button
              onClick={handleApiKeyCancel}
              class="cursor-pointer rounded-md bg-white hover:bg-gray-50 px-3 py-2 text-sm border border-gray-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Basic Auth Configuration */}
      {authType === 'basic_auth' && (
        <div class="space-y-4">
          <div>
            <label for="basic-username" class="block text-sm font-medium text-gray-700">
              Username
            </label>
            <input
              type="text"
              id="basic-username"
              value={authConfig.username || ''}
              onInput={(e) => handleConfigChange('username', e.target.value)}
              placeholder="your-username"
              class="mt-1 block w-full rounded-md px-3 py-1.5 text-gray-900 outline outline-1 outline-gray-300 placeholder:text-gray-400 focus:outline-2 focus:outline-sky-500 text-sm"
            />
            <p class="mt-1 text-xs text-gray-500">
              The username for basic authentication
            </p>
          </div>

          <div>
            <label for="basic-password" class="block text-sm font-medium text-gray-700">
              Password
            </label>
            <input
              type="password"
              id="basic-password"
              value={authConfig.password || ''}
              onInput={(e) => handleConfigChange('password', e.target.value)}
              placeholder="your-password"
              class="mt-1 block w-full rounded-md px-3 py-1.5 text-gray-900 outline outline-1 outline-gray-300 placeholder:text-gray-400 focus:outline-2 focus:outline-sky-500 text-sm"
            />
            <p class="mt-1 text-xs text-gray-500">
              The password for basic authentication
            </p>
          </div>

          {/* Save and Cancel Buttons */}
          <div class="flex items-center gap-3">
            <button
              onClick={handleBasicAuthSave}
              class="cursor-pointer rounded-md bg-sky-500 hover:bg-sky-400 px-3 py-2 text-sm font-semibold text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500"
            >
              Save
            </button>
            <button
              onClick={handleBasicAuthCancel}
              class="cursor-pointer rounded-md bg-white hover:bg-gray-50 px-3 py-2 text-sm border border-gray-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Bearer Token Configuration */}
      {authType === 'bearer_token' && (
        <div class="space-y-4">
          <div>
            <label for="bearer-token" class="block text-sm font-medium text-gray-700">
              Token <span class="text-red-500">*</span>
            </label>
            <input
              type="password"
              id="bearer-token"
              value={authConfig.token || ''}
              onInput={(e) => handleConfigChange('token', e.target.value)}
              placeholder="your-bearer-token"
              class="mt-1 block w-full rounded-md px-3 py-1.5 text-gray-900 outline outline-1 outline-gray-300 placeholder:text-gray-400 focus:outline-2 focus:outline-sky-500 text-sm"
            />
            <p class="mt-1 text-xs text-gray-500">
              The bearer token for authentication
            </p>
          </div>

          {/* Save and Cancel Buttons */}
          <div class="flex items-center gap-3">
            <button
              onClick={handleBearerTokenSave}
              class="cursor-pointer rounded-md bg-sky-500 hover:bg-sky-400 px-3 py-2 text-sm font-semibold text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500"
            >
              Save
            </button>
            <button
              onClick={handleBearerTokenCancel}
              class="cursor-pointer rounded-md bg-white hover:bg-gray-50 px-3 py-2 text-sm border border-gray-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* OAuth 2.0 PKCE Configuration */}
      {authType === 'oauth2_pkce' && (
        <div class="space-y-4">
          <div>
            <label for="oauth2-auth-url" class="block text-sm font-medium text-gray-700">
              Authorization URL <span class="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="oauth2-auth-url"
              value={authConfig.authorization_url || ''}
              onInput={(e) => handleConfigChange('authorization_url', e.target.value)}
              placeholder="https://accounts.google.com/o/oauth2/v2/auth"
              class="mt-1 block w-full rounded-md px-3 py-1.5 text-gray-900 outline outline-1 outline-gray-300 placeholder:text-gray-400 focus:outline-2 focus:outline-sky-500 text-sm"
            />
            <p class="mt-1 text-xs text-gray-500">
              The authorization endpoint of the OAuth 2.0 provider
            </p>
          </div>

          <div>
            <label for="oauth2-token-url" class="block text-sm font-medium text-gray-700">
              Token URL <span class="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="oauth2-token-url"
              value={authConfig.token_url || ''}
              onInput={(e) => handleConfigChange('token_url', e.target.value)}
              placeholder="https://oauth2.googleapis.com/token"
              class="mt-1 block w-full rounded-md px-3 py-1.5 text-gray-900 outline outline-1 outline-gray-300 placeholder:text-gray-400 focus:outline-2 focus:outline-sky-500 text-sm"
            />
            <p class="mt-1 text-xs text-gray-500">
              The token endpoint of the OAuth 2.0 provider
            </p>
          </div>

          <div>
            <label for="oauth2-client-id" class="block text-sm font-medium text-gray-700">
              Client ID <span class="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="oauth2-client-id"
              value={authConfig.clientId || ''}
              onInput={(e) => handleConfigChange('clientId', e.target.value)}
              placeholder="your-client-id"
              class="mt-1 block w-full rounded-md px-3 py-1.5 text-gray-900 outline outline-1 outline-gray-300 placeholder:text-gray-400 focus:outline-2 focus:outline-sky-500 text-sm"
            />
            <p class="mt-1 text-xs text-gray-500">
              The client ID for your OAuth 2.0 application
            </p>
          </div>

          <div>
            <label for="oauth2-client-secret" class="block text-sm font-medium text-gray-700">
              Client Secret
            </label>
            <input
              type="password"
              id="oauth2-client-secret"
              value={authConfig.clientSecret || ''}
              onInput={(e) => handleConfigChange('clientSecret', e.target.value)}
              placeholder="Leave empty for public clients"
              class="mt-1 block w-full rounded-md px-3 py-1.5 text-gray-900 outline outline-1 outline-gray-300 placeholder:text-gray-400 focus:outline-2 focus:outline-sky-500 text-sm"
            />
            <p class="mt-1 text-xs text-gray-500">
              The client secret (optional for public clients with PKCE)
            </p>
          </div>

          <div>
            <label for="oauth2-redirect-uri" class="block text-sm font-medium text-gray-700">
              Redirect URI <span class="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="oauth2-redirect-uri"
              value={authConfig.redirect_uri || `${window.location.origin}/auth/callback`}
              onInput={(e) => handleConfigChange('redirect_uri', e.target.value)}
              placeholder={`${window.location.origin}/auth/callback`}
              class="mt-1 block w-full rounded-md px-3 py-1.5 text-gray-900 outline outline-1 outline-gray-300 placeholder:text-gray-400 focus:outline-2 focus:outline-sky-500 text-sm"
            />
            <p class="mt-1 text-xs text-gray-500">
              The redirect URI configured in your OAuth 2.0 application
            </p>
          </div>

          <div>
            <label for="oauth2-scope" class="block text-sm font-medium text-gray-700">
              Scope <span class="text-red-500">*</span>
            </label>
            <textarea
              id="oauth2-scope"
              rows="2"
              value={authConfig.scope || ''}
              onInput={(e) => handleConfigChange('scope', e.target.value)}
              placeholder="https://www.googleapis.com/auth/userinfo.email"
              class="mt-1 block w-full rounded-md px-3 py-1.5 text-gray-900 outline outline-1 outline-gray-300 placeholder:text-gray-400 focus:outline-2 focus:outline-sky-500 text-sm"
            />
            <p class="mt-1 text-xs text-gray-500">
              Space-separated list of OAuth 2.0 scopes
            </p>
          </div>

          <div>
            <label for="oauth2-state" class="block text-sm font-medium text-gray-700">
              State
            </label>
            <input
              type="text"
              id="oauth2-state"
              value={authConfig.state || ''}
              onInput={(e) => handleConfigChange('state', e.target.value)}
              placeholder="random-state-value (optional)"
              class="mt-1 block w-full rounded-md px-3 py-1.5 text-gray-900 outline outline-1 outline-gray-300 placeholder:text-gray-400 focus:outline-2 focus:outline-sky-500 text-sm"
            />
            <p class="mt-1 text-xs text-gray-500">
              Optional state parameter for additional security
            </p>
          </div>

          <div>
            <label for="oauth2-challenge-method" class="block text-sm font-medium text-gray-700">
              Code Challenge Method <span class="text-red-500">*</span>
            </label>
            <select
              id="oauth2-challenge-method"
              value={authConfig.code_challenge_method || 'SHA-256'}
              onChange={(e) => handleConfigChange('code_challenge_method', e.target.value)}
              class="mt-1 block w-full rounded-md px-3 py-2 text-gray-900 outline outline-1 outline-gray-300 focus:outline-2 focus:outline-sky-500 text-sm"
            >
              <option value="SHA-256">SHA-256</option>
              <option value="plain">plain</option>
            </select>
            <p class="mt-1 text-xs text-gray-500">
              The method used to generate the code challenge for PKCE
            </p>
          </div>

          <div>
            <label for="oauth2-refresh-url" class="block text-sm font-medium text-gray-700">
              Refresh Token URL
            </label>
            <input
              type="text"
              id="oauth2-refresh-url"
              value={authConfig.refresh_token_url || ''}
              onInput={(e) => handleConfigChange('refresh_token_url', e.target.value)}
              placeholder="https://oauth2.googleapis.com/token (usually same as token URL)"
              class="mt-1 block w-full rounded-md px-3 py-1.5 text-gray-900 outline outline-1 outline-gray-300 placeholder:text-gray-400 focus:outline-2 focus:outline-sky-500 text-sm"
            />
            <p class="mt-1 text-xs text-gray-500">
              The endpoint for refreshing tokens (often same as token URL)
            </p>
          </div>

          {/* Save Configuration and Get Tokens Buttons */}
          <div class="flex items-center gap-3 flex-wrap">
            <button
              onClick={() => handleOAuth2SaveConfig()}
              class="cursor-pointer rounded-md bg-gray-500 hover:bg-gray-400 px-3 py-2 text-sm font-semibold text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-500"
            >
              Save Configuration
            </button>

            &middot;

            <button
              onClick={() => handleOAuth2GetTokens()}
              disabled={loading || !authConfig.authorization_url || !authConfig.token_url || !authConfig.clientId || !authConfig.redirect_uri || !authConfig.scope}
              class="cursor-pointer rounded-md bg-sky-500 hover:bg-sky-400 disabled:bg-gray-300 px-3 py-2 text-sm font-semibold text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500"
            >
              {loading ? 'Authenticating...' : 'Get Tokens'}
            </button>

            {authResponse?.refresh_token && (
              <button
                onClick={() => handleOAuth2RefreshTokens()}
                disabled={loading}
                class="cursor-pointer rounded-md bg-sky-500 hover:bg-sky-400 disabled:bg-gray-300 px-3 py-2 text-sm font-semibold text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
              >
                {loading ? 'Refreshing...' : 'Refresh Tokens'}
              </button>
            )}

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
          <div class="flex items-center gap-3 flex-wrap">
            <button
              onClick={handleSaveConfig}
              class="cursor-pointer rounded-md bg-gray-500 hover:bg-gray-400 px-3 py-2 text-sm font-semibold text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-500"
            >
              Save Configuration
            </button>

            &middot;

            <button
              onClick={handleGetTokens}
              disabled={loading || !authConfig.domain || !authConfig.clientId || !authConfig.scopes}
              class="cursor-pointer rounded-md bg-sky-500 hover:bg-sky-400 disabled:bg-gray-300 px-3 py-2 text-sm font-semibold text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500"
            >
              {loading ? 'Authenticating...' : 'Get Tokens'}
            </button>

            {authResponse?.refresh_token && (
              <button
                onClick={handleRefreshTokens}
                disabled={loading}
                class="cursor-pointer rounded-md bg-sky-500 hover:bg-sky-400 disabled:bg-gray-300 px-3 py-2 text-sm font-semibold text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
              >
                {loading ? 'Refreshing...' : 'Refresh Tokens'}
              </button>
            )}

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
        <div class="">
          <h3 class="text-base font-medium text-gray-900">Authentication Response</h3>
          <p class="mt-1 text-sm text-gray-600 mb-4">Any active access token will be used as Authoriation header in Slingshot if this environment is used.</p>
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
