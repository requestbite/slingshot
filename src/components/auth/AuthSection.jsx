import { useState, useEffect } from 'preact/hooks';
import { UserManager } from 'oidc-client-ts';
import { apiClient } from '../../api';
import { encryptSecret, decryptSecret } from '../../utils/encryption';
import CodeMirror from '@uiw/react-codemirror';
import { json } from '@codemirror/lang-json';
import { dracula } from '@uiw/codemirror-theme-dracula';
import { EditorView } from '@codemirror/view';
import { bracketMatching } from '@codemirror/language';
import { Toast, useToast } from '../common/Toast';
import { TextInput } from '../common/TextInput';
import { Select } from '../common/Select';
import { Label } from '../common/Label';
import { Button } from '../common/Button';

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
    // Token request headers
    tokenHeaders: environment?.authConfig?.tokenHeaders || [],
    ...environment?.authConfig
  });
  const [authResponse, setAuthResponse] = useState(environment?.authResponse || null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Toast state
  const [isToastVisible, showToast, hideToast] = useToast();
  const [toastMessage, setToastMessage] = useState('');

  // Token headers state
  const [tokenHeaderForm, setTokenHeaderForm] = useState({
    key: '',
    value: '',
    sendIn: 'header'
  });
  const [editingTokenHeader, setEditingTokenHeader] = useState({
    _tempId: null,
    key: '',
    value: '',
    sendIn: 'header'
  });
  const [editTokenHeaderModal, setEditTokenHeaderModal] = useState(false);
  const [deleteTokenHeaderModal, setDeleteTokenHeaderModal] = useState(false);
  const [tokenHeaderToDelete, setTokenHeaderToDelete] = useState(null);

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
          // Token request headers
          tokenHeaders: decryptedAuthConfig?.tokenHeaders || [],
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
    } else if (newAuthType !== 'oidc_pkce' && newAuthType !== 'oauth2_pkce' && newAuthType !== 'oauth2_code') {
      // Clear authResponse when switching away from OIDC PKCE, OAuth 2.0 PKCE, or OAuth 2.0 Code Flow
      setAuthResponse(null);
    }

    // Set default values for OAuth 2.0 flows if switching to them and redirect_uri is not already set
    if ((newAuthType === 'oauth2_pkce' || newAuthType === 'oauth2_code') && !authConfig.redirect_uri) {
      setAuthConfig(prev => ({
        ...prev,
        redirect_uri: `${window.location.origin}/auth/callback`
      }));
    }
  };

  const handleConfigChange = (field, value) => {
    // Trim whitespace from sensitive fields to prevent authentication issues
    if (field === 'clientId' || field === 'clientSecret') {
      value = value.trim();
    }
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
      setToastMessage('Configuration saved');
      showToast();
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

      // Store flow type for callback handling
      sessionStorage.setItem('oauth_flow_type', 'oauth2_pkce');

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

      // Build headers including custom token headers
      const headers = {
        'Content-Type': 'application/x-www-form-urlencoded',
      };

      // Add custom token headers
      if (authConfig.tokenHeaders) {
        authConfig.tokenHeaders.forEach(header => {
          if (header.sendIn === 'header') {
            headers[header.key] = header.value;
          }
        });
      }

      const response = await fetch(authConfig.token_url, {
        method: 'POST',
        headers,
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

      // Build headers including custom token headers
      const headers = {
        'Content-Type': 'application/x-www-form-urlencoded',
      };

      // Add custom token headers
      if (authConfig.tokenHeaders) {
        authConfig.tokenHeaders.forEach(header => {
          if (header.sendIn === 'header') {
            headers[header.key] = header.value;
          }
        });
      }

      const response = await fetch(refreshUrl, {
        method: 'POST',
        headers,
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

  // OAuth 2.0 Code Flow handler functions
  const handleOAuth2CodeSaveConfig = async () => {
    if (!authConfig.authorization_url || !authConfig.token_url || !authConfig.clientId || !authConfig.clientSecret || !authConfig.redirect_uri) {
      setError('Authorization URL, Token URL, Client ID, Client Secret, and Redirect URI are required');
      return;
    }

    try {
      await updateEnvironmentAuth('oauth2_code', authConfig, authResponse);
      setSuccess('OAuth 2.0 Code Flow configuration saved');
      setToastMessage('Configuration saved');
      showToast();
    } catch (err) {
      setError('Failed to save OAuth 2.0 Code Flow configuration');
    }
  };

  const handleOAuth2CodeGetTokens = async () => {
    if (!authConfig.authorization_url || !authConfig.token_url || !authConfig.clientId || !authConfig.clientSecret || !authConfig.redirect_uri) {
      setError('Authorization URL, Token URL, Client ID, Client Secret, and Redirect URI are required');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      // Generate state parameter if not provided
      const state = authConfig.state || Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);

      // Store config for later use in callback
      sessionStorage.setItem('oauth2_code_config', JSON.stringify({
        ...authConfig,
        state
      }));

      // Build authorization URL
      const authUrl = new URL(authConfig.authorization_url);
      authUrl.searchParams.set('response_type', 'code');
      authUrl.searchParams.set('client_id', authConfig.clientId);
      authUrl.searchParams.set('redirect_uri', authConfig.redirect_uri);
      authUrl.searchParams.set('state', state);

      if (authConfig.scope) {
        authUrl.searchParams.set('scope', authConfig.scope);
      }

      // Store flow type for callback handling
      sessionStorage.setItem('oauth_flow_type', 'oauth2_code');

      // Open popup for authorization
      const popup = window.open(
        authUrl.toString(),
        'oauth2_code_auth',
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

        if (event.data.type === 'oauth2_code_callback') {
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

          // Exchange code for tokens via proxy
          try {
            await exchangeCodeForTokensViaProxy(code);
          } catch (tokenError) {
            setLoading(false);
            setError(`Token exchange failed: ${tokenError.message}`);
          }
        }
      };

      window.addEventListener('message', messageHandler);

    } catch (err) {
      console.error('OAuth 2.0 Code Flow authorization error:', err);
      setError(`Authorization failed: ${err.message}`);
      setLoading(false);
    }
  };

  const exchangeCodeForTokensViaProxy = async (code) => {
    try {
      // Get the current proxy URL from settings
      const getProxyUrl = () => {
        try {
          const savedSettings = localStorage.getItem('slingshot-settings');
          if (savedSettings) {
            const settings = JSON.parse(savedSettings);
            if (settings.proxyType === 'custom' && settings.customProxyUrl) {
              return settings.customProxyUrl;
            }
          }
        } catch (error) {
          console.warn('Failed to load proxy settings from localStorage:', error);
        }
        return import.meta.env.VITE_PROXY_HOST || 'http://localhost:8080';
      };

      const proxyUrl = getProxyUrl();

      // Create form data for token exchange request
      const formData = new URLSearchParams();
      formData.append('grant_type', 'authorization_code');
      formData.append('client_id', authConfig.clientId);
      formData.append('client_secret', authConfig.clientSecret);
      formData.append('code', code);
      formData.append('redirect_uri', authConfig.redirect_uri);

      if (authConfig.scope) {
        formData.append('scope', authConfig.scope);
      }

      // Build headers including custom token headers
      const headers = ['Content-Type: application/x-www-form-urlencoded'];
      if (authConfig.tokenHeaders) {
        authConfig.tokenHeaders.forEach(header => {
          if (header.sendIn === 'header') {
            headers.push(`${header.key}: ${header.value}`);
          }
        });
      }

      const requestPayload = {
        method: 'POST',
        url: authConfig.token_url,
        headers,
        body: formData.toString(),
        timeout: 30,
        passThrough: true
      };

      const response = await fetch(`${proxyUrl}/proxy/request`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestPayload)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const tokenData = await response.json();

      if (tokenData.access_token) {
        // Calculate access token expiration timestamp
        const now = Date.now();
        const expiresInMs = (tokenData.expires_in || 3600) * 1000; // Default to 1 hour if not provided
        const accessTokenExpires = new Date(now + expiresInMs).toISOString();

        const authResponseData = {
          access_token: tokenData.access_token,
          refresh_token: tokenData.refresh_token,
          expires_in: tokenData.expires_in,
          token_type: tokenData.token_type || 'Bearer',
          scope: tokenData.scope,
          access_token_expires: accessTokenExpires
        };

        setAuthResponse(authResponseData);
        setSuccess('OAuth 2.0 authentication successful! Tokens received.');

        // Save to environment
        await updateEnvironmentAuth('oauth2_code', authConfig, authResponseData);
      } else {
        throw new Error('No access token received');
      }
    } finally {
      setLoading(false);
      // Clean up session storage
      sessionStorage.removeItem('oauth2_code_config');
    }
  };

  const handleOAuth2CodeRefreshTokens = async () => {
    if (!authResponse?.refresh_token) {
      setError('No refresh token available');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      // Get the current proxy URL from settings
      const getProxyUrl = () => {
        try {
          const savedSettings = localStorage.getItem('slingshot-settings');
          if (savedSettings) {
            const settings = JSON.parse(savedSettings);
            if (settings.proxyType === 'custom' && settings.customProxyUrl) {
              return settings.customProxyUrl;
            }
          }
        } catch (error) {
          console.warn('Failed to load proxy settings from localStorage:', error);
        }
        return import.meta.env.VITE_PROXY_HOST || 'http://localhost:8080';
      };

      const proxyUrl = getProxyUrl();

      // Create form data for refresh token request
      const formData = new URLSearchParams();
      formData.append('grant_type', 'refresh_token');
      formData.append('refresh_token', authResponse.refresh_token);
      formData.append('client_id', authConfig.clientId);
      formData.append('client_secret', authConfig.clientSecret);

      // Build headers including custom token headers
      const headers = ['Content-Type: application/x-www-form-urlencoded'];
      if (authConfig.tokenHeaders) {
        authConfig.tokenHeaders.forEach(header => {
          if (header.sendIn === 'header') {
            headers.push(`${header.key}: ${header.value}`);
          }
        });
      }

      const requestPayload = {
        method: 'POST',
        url: authConfig.token_url,
        headers,
        body: formData.toString(),
        timeout: 30,
        passThrough: true
      };

      const response = await fetch(`${proxyUrl}/proxy/request`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestPayload)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
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
        await updateEnvironmentAuth('oauth2_code', authConfig, updatedResponse);
      } else {
        setError('Token refresh failed: No access token received');
      }
    } catch (err) {
      console.error('OAuth 2.0 Code Flow token refresh error:', err);
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
        // Popup settings
        popupWindowFeatures: 'width=500,height=600,scrollbars=yes,resizable=yes',
        popupWindowTarget: '_blank',
        // Extra parameters for offline access and refresh tokens
        extraQueryParams: {
          access_type: 'offline',
          prompt: 'consent'
        }
      };
      
      console.log('OIDC UserManager configuration:', oidcConfig);

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

      // Store flow type for callback handling
      sessionStorage.setItem('oauth_flow_type', 'oidc_pkce');
      
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
      // Clean up session storage
      sessionStorage.removeItem('oauth_flow_type');
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
      setToastMessage('Configuration saved');
      showToast();
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

  // Token header management functions
  const handleAddTokenHeader = (e) => {
    e.preventDefault();

    if (!tokenHeaderForm.key.trim() || !tokenHeaderForm.value.trim()) {
      setError('Both key and value are required');
      return;
    }

    // Check for duplicate keys
    const existingKey = authConfig.tokenHeaders.find(h => h.key === tokenHeaderForm.key.trim());
    if (existingKey) {
      setError('A token header with this key already exists');
      return;
    }

    const newHeader = {
      key: tokenHeaderForm.key.trim(),
      value: tokenHeaderForm.value.trim(),
      sendIn: tokenHeaderForm.sendIn,
      _tempId: `temp_${Date.now()}`
    };

    const updatedHeaders = [...authConfig.tokenHeaders, newHeader].sort((a, b) => a.key.localeCompare(b.key));
    setAuthConfig(prev => ({ ...prev, tokenHeaders: updatedHeaders }));
    setTokenHeaderForm({ key: '', value: '', sendIn: 'header' });
    setError('');
  };

  const handleEditTokenHeader = (header) => {
    setEditingTokenHeader({
      _tempId: header._tempId || header.key,
      key: header.key,
      value: header.value,
      sendIn: header.sendIn || 'header'
    });
    setEditTokenHeaderModal(true);
  };

  const handleUpdateTokenHeader = (e) => {
    e.preventDefault();

    if (!editingTokenHeader.key.trim() || !editingTokenHeader.value.trim()) {
      setError('Both key and value are required');
      return;
    }

    // Check for duplicate keys (excluding the current header)
    const existingKey = authConfig.tokenHeaders.find(h =>
      h.key === editingTokenHeader.key.trim() &&
      (h._tempId || h.key) !== editingTokenHeader._tempId
    );
    if (existingKey) {
      setError('A token header with this key already exists');
      return;
    }

    const updatedHeaders = authConfig.tokenHeaders.map(h => {
      if ((h._tempId || h.key) === editingTokenHeader._tempId) {
        return {
          ...h,
          key: editingTokenHeader.key.trim(),
          value: editingTokenHeader.value.trim(),
          sendIn: editingTokenHeader.sendIn
        };
      }
      return h;
    });

    setAuthConfig(prev => ({ ...prev, tokenHeaders: updatedHeaders.sort((a, b) => a.key.localeCompare(b.key)) }));
    setEditTokenHeaderModal(false);
    setError('');
  };

  const handleDeleteTokenHeader = () => {
    if (!tokenHeaderToDelete) return;

    const updatedHeaders = authConfig.tokenHeaders.filter(h => (h._tempId || h.key) !== tokenHeaderToDelete);
    setAuthConfig(prev => ({ ...prev, tokenHeaders: updatedHeaders }));
    setDeleteTokenHeaderModal(false);
    setTokenHeaderToDelete(null);
  };

  return (
    <div class="space-y-6">
      {/* Auth Type Selection */}
      <div>
        <Label htmlFor="auth-type">
          Authentication Type
        </Label>
        <Select
          value={authType}
          onChange={handleAuthTypeChange}
          options={[
            { value: 'none', label: 'No auth' },
            { value: 'api_key', label: 'API Key' },
            { value: 'basic_auth', label: 'Basic Auth' },
            { value: 'bearer_token', label: 'Bearer Token' },
            { value: 'oauth2_pkce', label: 'OAuth 2.0 (PKCE)' },
            { value: 'oauth2_code', label: 'OAuth 2.0 (Code Flow)' },
            { value: 'oidc_pkce', label: 'OpenID Connect (PKCE)' }
          ]}
        />
      </div>

      {/* OAuth 2.0 Code Flow Notice */}
      {authType === 'oauth2_code' && (
        <div class="group flex gap-x-3 rounded-md p-1.5 text-sm/6 w-full bg-sky-50 text-sky-700 border border-sky-200">
          <svg class="size-6 shrink-0 text-sky-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <path d="m9 12 2 2 4-4"></path>
          </svg>
          <div class="text-sm">
            Please note that some data, including your client secret, will pass through the proxy when exchanging the auth code for an access token.
          </div>
        </div>
      )}

      {/* API Key Configuration */}
      {authType === 'api_key' && (
        <div class="space-y-4">
          <div>
            <Label htmlFor="api-key" mandatory>
              Key
            </Label>
            <TextInput
              id="api-key"
              value={authConfig.key || ''}
              onInput={(e) => handleConfigChange('key', e.target.value)}
              placeholder="X-API-Key"
              description='The name of the API key parameter (e.g., "X-API-Key", "api_key")'
            />
          </div>

          <div>
            <Label htmlFor="api-value" mandatory>
              Value
            </Label>
            <TextInput
              type="password"
              id="api-value"
              value={authConfig.value || ''}
              onInput={(e) => handleConfigChange('value', e.target.value)}
              placeholder="your-api-key-value"
              description="The actual API key value"
            />
          </div>

          <div>
            <Label htmlFor="api-add-to">
              Add to
            </Label>
            <Select
              value={authConfig.addTo || 'header'}
              onChange={(value) => handleConfigChange('addTo', value)}
              options={[
                { value: 'header', label: 'Header' },
                { value: 'query', label: 'Query Params' }
              ]}
              className="mt-1"
            />
            <p class="mt-1 text-xs text-gray-500 dark:text-neutral-dark-500">
              Where to add the API key in the request
            </p>
          </div>

          {/* Save and Cancel Buttons */}
          <div class="flex items-center gap-3">
            <Button
              onClick={handleApiKeySave}
              variant="primary"
            >
              Save
            </Button>
            <Button
              onClick={handleApiKeyCancel}
              variant="secondary"
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Basic Auth Configuration */}
      {authType === 'basic_auth' && (
        <div class="space-y-4">
          <div>
            <Label htmlFor="basic-username">
              Username
            </Label>
            <TextInput
              id="basic-username"
              value={authConfig.username || ''}
              onInput={(e) => handleConfigChange('username', e.target.value)}
              placeholder="your-username"
              description="The username for basic authentication"
            />
          </div>

          <div>
            <Label htmlFor="basic-password">
              Password
            </Label>
            <TextInput
              type="password"
              id="basic-password"
              value={authConfig.password || ''}
              onInput={(e) => handleConfigChange('password', e.target.value)}
              placeholder="your-password"
              description="The password for basic authentication"
            />
          </div>

          {/* Save and Cancel Buttons */}
          <div class="flex items-center gap-3">
            <Button
              onClick={handleBasicAuthSave}
              variant="primary"
            >
              Save
            </Button>
            <Button
              onClick={handleBasicAuthCancel}
              variant="secondary"
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Bearer Token Configuration */}
      {authType === 'bearer_token' && (
        <div class="space-y-4">
          <div>
            <Label htmlFor="bearer-token" mandatory>
              Token
            </Label>
            <TextInput
              type="password"
              id="bearer-token"
              value={authConfig.token || ''}
              onInput={(e) => handleConfigChange('token', e.target.value)}
              placeholder="your-bearer-token"
              description="The bearer token for authentication"
            />
          </div>

          {/* Save and Cancel Buttons */}
          <div class="flex items-center gap-3">
            <Button
              onClick={handleBearerTokenSave}
              variant="primary"
            >
              Save
            </Button>
            <Button
              onClick={handleBearerTokenCancel}
              variant="secondary"
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* OAuth 2.0 PKCE Configuration */}
      {authType === 'oauth2_pkce' && (
        <div class="space-y-4">
          <div>
            <Label htmlFor="oauth2-auth-url" mandatory>
              Authorization URL
            </Label>
            <TextInput
              id="oauth2-auth-url"
              value={authConfig.authorization_url || ''}
              onInput={(e) => handleConfigChange('authorization_url', e.target.value)}
              placeholder="https://example.com/oauth2/auth"
              description="The authorization endpoint of the OAuth 2.0 provider"
            />
          </div>

          <div>
            <Label htmlFor="oauth2-token-url" mandatory>
              Token URL
            </Label>
            <TextInput
              id="oauth2-token-url"
              value={authConfig.token_url || ''}
              onInput={(e) => handleConfigChange('token_url', e.target.value)}
              placeholder="https://example.com/oauth2/token"
              description="The token endpoint of the OAuth 2.0 provider"
            />
          </div>

          <div>
            <Label htmlFor="oauth2-client-id" mandatory>
              Client ID
            </Label>
            <TextInput
              id="oauth2-client-id"
              value={authConfig.clientId || ''}
              onInput={(e) => handleConfigChange('clientId', e.target.value)}
              placeholder="your-client-id"
              description="The client ID for your OAuth 2.0 application"
            />
          </div>

          <div>
            <Label htmlFor="oauth2-client-secret">
              Client Secret
            </Label>
            <TextInput
              type="password"
              id="oauth2-client-secret"
              value={authConfig.clientSecret || ''}
              onInput={(e) => handleConfigChange('clientSecret', e.target.value)}
              placeholder="Leave empty for public clients"
              description="The client secret (optional for public clients with PKCE)"
            />
          </div>

          <div>
            <Label htmlFor="oauth2-redirect-uri" mandatory>
              Redirect URI
            </Label>
            <TextInput
              id="oauth2-redirect-uri"
              value={authConfig.redirect_uri || `${window.location.origin}/auth/callback`}
              onInput={(e) => handleConfigChange('redirect_uri', e.target.value)}
              placeholder={`${window.location.origin}/auth/callback`}
              description="The redirect URI configured in your OAuth 2.0 application"
            />
          </div>

          <div>
            <Label htmlFor="oauth2-scope" mandatory>
              Scope
            </Label>
            <TextInput
              type="textarea"
              id="oauth2-scope"
              rows={2}
              value={authConfig.scope || ''}
              onInput={(e) => handleConfigChange('scope', e.target.value)}
              placeholder=""
              description="Space-separated list of OAuth 2.0 scopes"
            />
          </div>

          <div>
            <Label htmlFor="oauth2-state">
              State
            </Label>
            <TextInput
              id="oauth2-state"
              value={authConfig.state || ''}
              onInput={(e) => handleConfigChange('state', e.target.value)}
              placeholder="random-state-value (optional)"
              description="Optional state parameter for additional security"
            />
          </div>

          <div>
            <Label htmlFor="oauth2-challenge-method" mandatory>
              Code Challenge Method
            </Label>
            <Select
              value={authConfig.code_challenge_method || 'SHA-256'}
              onChange={(value) => handleConfigChange('code_challenge_method', value)}
              options={[
                { value: 'SHA-256', label: 'SHA-256' },
                { value: 'plain', label: 'plain' }
              ]}
              className="mt-1"
            />
            <p class="mt-1 text-xs text-gray-500 dark:text-neutral-dark-500">
              The method used to generate the code challenge for PKCE
            </p>
          </div>

          <div>
            <Label htmlFor="oauth2-refresh-url">
              Refresh Token URL
            </Label>
            <TextInput
              id="oauth2-refresh-url"
              value={authConfig.refresh_token_url || ''}
              onInput={(e) => handleConfigChange('refresh_token_url', e.target.value)}
              placeholder="https://example.com/oauth2/token (usually same as token URL)"
              description="The endpoint for refreshing tokens (often same as token URL)"
            />
          </div>

          {/* Token Request Headers */}
          <div class="border-b border-gray-200 dark:border-neutral-dark-300 pb-2 mb-6">
            <h3 class="text-sm font-medium text-gray-700 dark:text-neutral-dark-700 mb-1">Token Request</h3>
            <p class="text-sm text-gray-600 dark:text-neutral-dark-600 mb-4">Custom headers to include when making token requests.</p>

            {/* Add new token header form */}
            <form onSubmit={handleAddTokenHeader} class="mb-4">
              <div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div>
                  <Label htmlFor="oauth2-token-header-key">Key</Label>
                  <TextInput
                    id="oauth2-token-header-key"
                    value={tokenHeaderForm.key}
                    onInput={(e) => setTokenHeaderForm({ ...tokenHeaderForm, key: e.target.value })}
                    placeholder="Accept"
                  />
                </div>
                <div>
                  <Label htmlFor="oauth2-token-header-value">Value</Label>
                  <TextInput
                    id="oauth2-token-header-value"
                    value={tokenHeaderForm.value}
                    onInput={(e) => setTokenHeaderForm({ ...tokenHeaderForm, value: e.target.value })}
                    placeholder="application/json"
                  />
                </div>
                <div class="flex items-end gap-2">
                  <div class="flex-1">
                    <Label htmlFor="oauth2-token-header-send-in">Send in</Label>
                    <Select
                      value={tokenHeaderForm.sendIn}
                      onChange={(value) => setTokenHeaderForm({ ...tokenHeaderForm, sendIn: value })}
                      options={[
                        { value: 'header', label: 'Header' }
                      ]}
                      className="mt-1"
                    />
                  </div>
                  <Button
                    type="submit"
                    disabled={!tokenHeaderForm.key || !tokenHeaderForm.value}
                    variant="primary"
                    size="sm"
                  >
                    Add
                  </Button>
                </div>
              </div>
            </form>

            {/* Token Headers Table */}
            {authConfig.tokenHeaders && authConfig.tokenHeaders.length > 0 && (
              <div class="overflow-hidden border border-gray-300 dark:border-neutral-dark-50 rounded-lg mb-4">
                <table class="min-w-full divide-y divide-gray-300">
                  <thead class="bg-gray-50 dark:bg-neutral-dark-200">
                    <tr>
                      <th class="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 dark:text-neutral-dark-900 sm:pl-6">Key</th>
                      <th class="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-neutral-dark-900">Value</th>
                      <th class="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-neutral-dark-900">Send in</th>
                      <th class="relative py-3.5 pl-3 pr-4 sm:pr-6 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-gray-200 dark:divide-neutral-dark-300 bg-white dark:bg-surface-dark-elevated">
                    {authConfig.tokenHeaders.map((header) => (
                      <tr key={header._tempId || header.key}>
                        <td class="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 dark:text-neutral-dark-900 sm:pl-6">
                          {header.key}
                        </td>
                        <td class="whitespace-nowrap px-3 py-4 text-sm text-gray-900 dark:text-neutral-dark-900">
                          {header.value}
                        </td>
                        <td class="whitespace-nowrap px-3 py-4 text-sm text-gray-900 dark:text-neutral-dark-900">
                          {header.sendIn === 'header' ? 'Header' : 'Query Param'}
                        </td>
                        <td class="whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6 space-x-2">
                          <button
                            type="button"
                            onClick={() => handleEditTokenHeader(header)}
                            class="px-2 py-1 bg-sky-100 hover:bg-sky-200 text-sky-700 text-sm font-medium rounded-md cursor-pointer inline-block"
                          >
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setTokenHeaderToDelete(header._tempId || header.key);
                              setDeleteTokenHeaderModal(true);
                            }}
                            class="px-2 py-1 bg-red-100 hover:bg-red-200 text-red-700 text-sm font-medium rounded-md cursor-pointer inline-block"
                          >
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Save Configuration and Get Tokens Buttons */}
          <div class="flex items-center gap-3 flex-wrap">
            <Button
              onClick={() => handleOAuth2SaveConfig()}
              variant="none"
              className="cursor-pointer rounded-md bg-gray-500 hover:bg-gray-400 px-3 py-2 text-sm font-semibold text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-500"
            >
              Save Configuration
            </Button>

            &middot;

            <Button
              onClick={() => handleOAuth2GetTokens()}
              disabled={loading || !authConfig.authorization_url || !authConfig.token_url || !authConfig.clientId || !authConfig.redirect_uri || !authConfig.scope}
              variant="primary"
            >
              {loading ? 'Authenticating...' : 'Get Tokens'}
            </Button>

            {authResponse?.refresh_token && (
              <Button
                onClick={() => handleOAuth2RefreshTokens()}
                disabled={loading}
                variant="primary"
              >
                {loading ? 'Refreshing...' : 'Refresh Tokens'}
              </Button>
            )}

            {authResponse && (
              <Button
                onClick={clearTokens}
                variant="none"
                className="cursor-pointer rounded-md bg-red-500 hover:bg-red-400 px-3 py-2 text-sm font-semibold text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-500"
              >
                Clear Tokens
              </Button>
            )}
          </div>
        </div>
      )}

      {/* OAuth 2.0 Code Flow Configuration */}
      {authType === 'oauth2_code' && (
        <div class="space-y-4">
          <div>
            <Label htmlFor="oauth2-code-auth-url" mandatory>
              Authorization URL
            </Label>
            <TextInput
              id="oauth2-code-auth-url"
              value={authConfig.authorization_url || ''}
              onInput={(e) => handleConfigChange('authorization_url', e.target.value)}
              placeholder="https://example.com/oauth/authorize"
              description="The authorization endpoint of the OAuth 2.0 provider"
            />
          </div>

          <div>
            <Label htmlFor="oauth2-code-token-url" mandatory>
              Token URL
            </Label>
            <TextInput
              id="oauth2-code-token-url"
              value={authConfig.token_url || ''}
              onInput={(e) => handleConfigChange('token_url', e.target.value)}
              placeholder="https://example.com/oauth/access_token"
              description="The token endpoint of the OAuth 2.0 provider"
            />
          </div>

          <div>
            <Label htmlFor="oauth2-code-client-id" mandatory>
              Client ID
            </Label>
            <TextInput
              id="oauth2-code-client-id"
              value={authConfig.clientId || ''}
              onInput={(e) => handleConfigChange('clientId', e.target.value)}
              placeholder="your-oauth-app-client-id"
              description="The client ID for your OAuth 2.0 application"
            />
          </div>

          <div>
            <Label htmlFor="oauth2-code-client-secret" mandatory>
              Client Secret
            </Label>
            <TextInput
              type="password"
              id="oauth2-code-client-secret"
              value={authConfig.clientSecret || ''}
              onInput={(e) => handleConfigChange('clientSecret', e.target.value)}
              placeholder="your-oauth-app-client-secret"
              description="The client secret for your OAuth 2.0 application (required for server-side flow)"
            />
          </div>

          <div>
            <Label htmlFor="oauth2-code-redirect-uri" mandatory>
              Redirect URI
            </Label>
            <TextInput
              id="oauth2-code-redirect-uri"
              value={authConfig.redirect_uri || `${window.location.origin}/auth/callback`}
              onInput={(e) => handleConfigChange('redirect_uri', e.target.value)}
              placeholder={`${window.location.origin}/auth/callback`}
              description="The redirect URI configured in your OAuth 2.0 application"
            />
          </div>

          <div>
            <Label htmlFor="oauth2-code-scope">
              Scope
            </Label>
            <TextInput
              type="textarea"
              id="oauth2-code-scope"
              rows={2}
              value={authConfig.scope || ''}
              onInput={(e) => handleConfigChange('scope', e.target.value)}
              placeholder=""
              description="Space-separated list of OAuth 2.0 scopes (optional)"
            />
          </div>

          <div>
            <Label htmlFor="oauth2-code-state">
              State
            </Label>
            <TextInput
              id="oauth2-code-state"
              value={authConfig.state || ''}
              onInput={(e) => handleConfigChange('state', e.target.value)}
              placeholder="random-state-value (optional)"
              description="Optional state parameter for additional security"
            />
          </div>

          {/* Token Request Headers */}
          <div class="border-b border-gray-200 dark:border-neutral-dark-300 pb-2 mb-6">
            <h3 class="text-sm font-medium text-gray-700 dark:text-neutral-dark-700 mb-1">Token Request</h3>
            <p class="text-sm text-gray-600 dark:text-neutral-dark-600 mb-4">Custom headers to include when making token requests.</p>

            {/* Add new token header form */}
            <form onSubmit={handleAddTokenHeader} class="mb-4">
              <div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div>
                  <Label htmlFor="oauth2-code-token-header-key">Key</Label>
                  <TextInput
                    id="oauth2-code-token-header-key"
                    value={tokenHeaderForm.key}
                    onInput={(e) => setTokenHeaderForm({ ...tokenHeaderForm, key: e.target.value })}
                    placeholder="Authorization"
                  />
                </div>
                <div>
                  <Label htmlFor="oauth2-code-token-header-value">Value</Label>
                  <TextInput
                    id="oauth2-code-token-header-value"
                    value={tokenHeaderForm.value}
                    onInput={(e) => setTokenHeaderForm({ ...tokenHeaderForm, value: e.target.value })}
                    placeholder="Bearer xyz123"
                  />
                </div>
                <div class="flex items-end gap-2">
                  <div class="flex-1">
                    <Label htmlFor="oauth2-code-token-header-send-in">Send in</Label>
                    <Select
                      value={tokenHeaderForm.sendIn}
                      onChange={(value) => setTokenHeaderForm({ ...tokenHeaderForm, sendIn: value })}
                      options={[
                        { value: 'header', label: 'Header' }
                      ]}
                      className="mt-1"
                    />
                  </div>
                  <Button
                    type="submit"
                    disabled={!tokenHeaderForm.key || !tokenHeaderForm.value}
                    variant="primary"
                    size="sm"
                  >
                    Add
                  </Button>
                </div>
              </div>
            </form>

            {/* Token Headers Table */}
            {authConfig.tokenHeaders && authConfig.tokenHeaders.length > 0 && (
              <div class="overflow-hidden border border-gray-300 dark:border-neutral-dark-50 rounded-lg mb-4">
                <table class="min-w-full divide-y divide-gray-300">
                  <thead class="bg-gray-50 dark:bg-neutral-dark-200">
                    <tr>
                      <th class="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 dark:text-neutral-dark-900 sm:pl-6">Key</th>
                      <th class="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-neutral-dark-900">Value</th>
                      <th class="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-neutral-dark-900">Send in</th>
                      <th class="relative py-3.5 pl-3 pr-4 sm:pr-6 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-gray-200 dark:divide-neutral-dark-300 bg-white dark:bg-surface-dark-elevated">
                    {authConfig.tokenHeaders.map((header) => (
                      <tr key={header._tempId || header.key}>
                        <td class="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 dark:text-neutral-dark-900 sm:pl-6">
                          {header.key}
                        </td>
                        <td class="whitespace-nowrap px-3 py-4 text-sm text-gray-900 dark:text-neutral-dark-900">
                          {header.value}
                        </td>
                        <td class="whitespace-nowrap px-3 py-4 text-sm text-gray-900 dark:text-neutral-dark-900">
                          {header.sendIn === 'header' ? 'Header' : 'Query Param'}
                        </td>
                        <td class="whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6 space-x-2">
                          <button
                            type="button"
                            onClick={() => handleEditTokenHeader(header)}
                            class="px-2 py-1 bg-sky-100 hover:bg-sky-200 text-sky-700 text-sm font-medium rounded-md cursor-pointer inline-block"
                          >
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setTokenHeaderToDelete(header._tempId || header.key);
                              setDeleteTokenHeaderModal(true);
                            }}
                            class="px-2 py-1 bg-red-100 hover:bg-red-200 text-red-700 text-sm font-medium rounded-md cursor-pointer inline-block"
                          >
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Save Configuration and Get Tokens Buttons */}
          <div class="flex items-center gap-3 flex-wrap">
            <Button
              onClick={() => handleOAuth2CodeSaveConfig()}
              variant="none"
              className="cursor-pointer rounded-md bg-gray-500 hover:bg-gray-400 px-3 py-2 text-sm font-semibold text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-500"
            >
              Save Configuration
            </Button>

            &middot;

            <Button
              onClick={() => handleOAuth2CodeGetTokens()}
              disabled={loading || !authConfig.authorization_url || !authConfig.token_url || !authConfig.clientId || !authConfig.clientSecret || !authConfig.redirect_uri}
              variant="primary"
            >
              {loading ? 'Authenticating...' : 'Get Tokens'}
            </Button>

            {authResponse?.refresh_token && (
              <Button
                onClick={() => handleOAuth2CodeRefreshTokens()}
                disabled={loading}
                variant="primary"
              >
                {loading ? 'Refreshing...' : 'Refresh Tokens'}
              </Button>
            )}

            {authResponse && (
              <Button
                onClick={clearTokens}
                variant="none"
                className="cursor-pointer rounded-md bg-red-500 hover:bg-red-400 px-3 py-2 text-sm font-semibold text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-500"
              >
                Clear Tokens
              </Button>
            )}
          </div>
        </div>
      )}

      {/* OIDC Configuration */}
      {authType === 'oidc_pkce' && (
        <div class="space-y-4">
          <div>
            <Label htmlFor="oidc-domain" mandatory>
              Domain
            </Label>
            <TextInput
              id="oidc-domain"
              value={authConfig.domain}
              onInput={(e) => handleConfigChange('domain', e.target.value)}
              placeholder="auth.example.com or https://auth.example.com"
              description="The domain of your OIDC provider (without protocol, or with https://)"
            />
          </div>

          <div>
            <Label htmlFor="oidc-client-id" mandatory>
              Client ID
            </Label>
            <TextInput
              id="oidc-client-id"
              value={authConfig.clientId}
              onInput={(e) => handleConfigChange('clientId', e.target.value)}
              placeholder="your-client-id"
              description="The client ID for your OIDC application"
            />
          </div>

          <div>
            <Label htmlFor="oidc-client-secret">
              Client Secret
            </Label>
            <TextInput
              type="password"
              id="oidc-client-secret"
              value={authConfig.clientSecret || ''}
              onInput={(e) => handleConfigChange('clientSecret', e.target.value)}
              placeholder="Leave empty for PKCE-only (if supported)"
              description="Google OAuth2 requires client secret even with PKCE. Other providers may not need this."
            />
          </div>

          <div>
            <Label htmlFor="oidc-scopes" mandatory>
              Scopes
            </Label>
            <TextInput
              type="textarea"
              id="oidc-scopes"
              rows={3}
              value={authConfig.scopes}
              onInput={(e) => handleConfigChange('scopes', e.target.value)}
              placeholder="openid profile email"
              description='Space-separated list of OAuth2 scopes (e.g., "openid profile email offline_access")'
            />
          </div>

          {/* Get Tokens Button */}
          <div class="flex items-center gap-3 flex-wrap">
            <Button
              onClick={handleSaveConfig}
              variant="none"
              className="cursor-pointer rounded-md bg-gray-500 hover:bg-gray-400 px-3 py-2 text-sm font-semibold text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-500"
            >
              Save Configuration
            </Button>

            &middot;

            <Button
              onClick={handleGetTokens}
              disabled={loading || !authConfig.domain || !authConfig.clientId || !authConfig.scopes}
              variant="primary"
            >
              {loading ? 'Authenticating...' : 'Get Tokens'}
            </Button>

            {authResponse?.refresh_token && (
              <Button
                onClick={handleRefreshTokens}
                disabled={loading}
                variant="primary"
              >
                {loading ? 'Refreshing...' : 'Refresh Tokens'}
              </Button>
            )}

            {authResponse && (
              <Button
                onClick={clearTokens}
                variant="none"
                className="cursor-pointer rounded-md bg-red-500 hover:bg-red-400 px-3 py-2 text-sm font-semibold text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-500"
              >
                Clear Tokens
              </Button>
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

      {/* Edit Token Header Modal */}
      {editTokenHeaderModal && (
        <div class="fixed inset-0 bg-gray-500/75 transition-opacity z-50">
          <div class="fixed inset-0 z-10 w-screen overflow-y-auto">
            <div class="flex min-h-full items-center justify-center p-4 text-center sm:items-center sm:p-0">
              <div class="relative transform overflow-hidden rounded-lg bg-white px-4 pb-4 pt-5 text-left shadow-xl transition-all sm:my-8 w-full sm:max-w-lg sm:p-6">
                <form onSubmit={handleUpdateTokenHeader}>
                  <div class="absolute right-0 top-0 hidden pr-4 pt-4 sm:block">
                    <button
                      onClick={() => setEditTokenHeaderModal(false)}
                      type="button"
                      class="rounded-md bg-white text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 cursor-pointer"
                    >
                      <span class="sr-only">Close</span>
                      <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                  <div class="mt-0 sm:text-left">
                    <h3 class="text-base font-semibold text-gray-900">Edit Token Header</h3>
                    <div class="mt-2">
                      <p class="text-sm text-gray-500">Update your token request header.</p>
                    </div>
                    <div class="mt-6 space-y-4">
                      <div>
                        <Label htmlFor="edit_token_header_key">Key</Label>
                        <TextInput
                          id="edit_token_header_key"
                          value={editingTokenHeader.key}
                          onInput={(e) => setEditingTokenHeader({ ...editingTokenHeader, key: e.target.value })}
                        />
                      </div>
                      <div>
                        <Label htmlFor="edit_token_header_value">Value</Label>
                        <TextInput
                          id="edit_token_header_value"
                          value={editingTokenHeader.value}
                          onInput={(e) => setEditingTokenHeader({ ...editingTokenHeader, value: e.target.value })}
                        />
                      </div>
                      <div>
                        <Label htmlFor="edit_token_header_send_in">Send in</Label>
                        <Select
                          id="edit_token_header_send_in"
                          value={editingTokenHeader.sendIn}
                          onChange={(value) => setEditingTokenHeader({ ...editingTokenHeader, sendIn: value })}
                          options={[
                            { value: 'header', label: 'Header' }
                          ]}
                          className="mt-1"
                        />
                      </div>
                    </div>
                  </div>
                  <div class="mt-8 flex justify-end">
                    <Button
                      onClick={() => setEditTokenHeaderModal(false)}
                      type="button"
                      variant="secondary"
                      className="mr-3"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      variant="primary"
                    >
                      Save
                    </Button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Token Header Modal */}
      {deleteTokenHeaderModal && (
        <div class="fixed inset-0 bg-gray-500/75 transition-opacity z-50">
          <div class="fixed inset-0 z-10 w-screen overflow-y-auto">
            <div class="flex min-h-full items-center justify-center p-4 text-center sm:items-center sm:p-0">
              <div class="relative transform overflow-hidden rounded-lg bg-white px-4 pb-4 pt-5 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg sm:p-6">
                <div class="absolute right-0 top-0 hidden pr-4 pt-4 sm:block">
                  <button
                    onClick={() => setDeleteTokenHeaderModal(false)}
                    type="button"
                    class="rounded-md bg-white text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 cursor-pointer"
                  >
                    <span class="sr-only">Close</span>
                    <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                <div class="sm:flex sm:items-start">
                  <div class="mx-auto flex w-12 h-12 flex-shrink-0 items-center justify-center rounded-full bg-red-100 sm:mx-0 sm:w-10 sm:h-10">
                    <svg class="w-6 h-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
                    </svg>
                  </div>
                  <div class="mt-3 text-center sm:ml-4 sm:mt-0 sm:text-left">
                    <h3 class="text-base font-semibold text-gray-900">Delete Token Header</h3>
                    <div class="mt-2">
                      <p class="text-sm text-gray-500">
                        Are you sure you want to delete this token header? This action cannot be undone.
                      </p>
                    </div>
                  </div>
                </div>
                <div class="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
                  <Button
                    onClick={handleDeleteTokenHeader}
                    type="button"
                    variant="none"
                    className="inline-flex w-full justify-center rounded-md bg-red-600 px-3 py-2 text-sm font-semibold text-white hover:bg-red-500 sm:ml-3 sm:w-auto cursor-pointer"
                  >
                    Delete Header
                  </Button>
                  <Button
                    onClick={() => setDeleteTokenHeaderModal(false)}
                    type="button"
                    variant="secondary"
                    className="mt-3 inline-flex w-full justify-center sm:mt-0 sm:w-auto"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      <Toast
        message={toastMessage}
        isVisible={isToastVisible}
        onClose={hideToast}
        type="success"
      />
    </div>
  );
}
