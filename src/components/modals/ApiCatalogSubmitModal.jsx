import { useState, useEffect } from 'preact/hooks';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';

export function ApiCatalogSubmitModal({ isOpen, onClose }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [accessToken, setAccessToken] = useState(null);
  const [authenticated, setAuthenticated] = useState(false);

  // GitHub OAuth configuration
  const GITHUB_CLIENT_ID = 'Ov23liRuZV3sipTFXANY';
  const GITHUB_AUTH_URL = 'https://github.com/login/oauth/authorize';
  const GITHUB_TOKEN_URL = 'https://github.com/login/oauth/access_token';
  const REDIRECT_URI = `${import.meta.env.VITE_BASE_URL}/auth/callback`;
  const SCOPE = 'repo'; // Repository access for creating PRs

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setLoading(false);
      setError(null);
      setAccessToken(null);
      setAuthenticated(false);
    }
  }, [isOpen]);

  // Generate PKCE code verifier
  const generateCodeVerifier = () => {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return btoa(String.fromCharCode.apply(null, array))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
  };

  // Generate PKCE code challenge from verifier
  const generateCodeChallenge = async (codeVerifier) => {
    const encoder = new TextEncoder();
    const data = encoder.encode(codeVerifier);
    const digest = await crypto.subtle.digest('SHA-256', data);
    return btoa(String.fromCharCode.apply(null, new Uint8Array(digest)))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
  };

  // Exchange authorization code for access token
  const exchangeCodeForToken = async (code, codeVerifier) => {
    try {
      const params = new URLSearchParams({
        client_id: GITHUB_CLIENT_ID,
        code: code,
        redirect_uri: REDIRECT_URI,
        code_verifier: codeVerifier
      });

      const response = await fetch(`${GITHUB_TOKEN_URL}?${params.toString()}`, {
        method: 'POST',
        headers: {
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Token exchange failed: HTTP ${response.status}`);
      }

      const data = await response.json();

      if (data.error) {
        throw new Error(data.error_description || data.error);
      }

      if (!data.access_token) {
        throw new Error('No access token received from GitHub');
      }

      return data.access_token;
    } finally {
      // Clean up session storage
      sessionStorage.removeItem('github_code_verifier');
      sessionStorage.removeItem('github_state');
    }
  };

  // Handle GitHub OAuth authentication
  const handleSubmit = async () => {
    setLoading(true);
    setError(null);

    try {
      // Generate PKCE parameters
      const codeVerifier = generateCodeVerifier();
      const codeChallenge = await generateCodeChallenge(codeVerifier);
      const state = Math.random().toString(36).substring(2, 15);

      // Store PKCE parameters for later use
      sessionStorage.setItem('github_code_verifier', codeVerifier);
      sessionStorage.setItem('github_state', state);
      sessionStorage.setItem('oauth_flow_type', 'github_catalog_submit');

      // Build GitHub authorization URL
      const authUrl = new URL(GITHUB_AUTH_URL);
      authUrl.searchParams.set('client_id', GITHUB_CLIENT_ID);
      authUrl.searchParams.set('redirect_uri', REDIRECT_URI);
      authUrl.searchParams.set('scope', SCOPE);
      authUrl.searchParams.set('state', state);
      authUrl.searchParams.set('code_challenge', codeChallenge);
      authUrl.searchParams.set('code_challenge_method', 'S256');

      // Open popup for GitHub authorization
      const popup = window.open(
        authUrl.toString(),
        'github_auth',
        'width=500,height=600,scrollbars=yes,resizable=yes'
      );

      if (!popup) {
        throw new Error('Failed to open popup window. Please allow popups for this site.');
      }

      // Monitor popup closure
      const pollTimer = setInterval(() => {
        if (popup.closed) {
          clearInterval(pollTimer);
          setLoading(false);
          if (!authenticated) {
            setError('Authentication cancelled by user');
          }
        }
      }, 1000);

      // Listen for messages from the popup
      const messageHandler = async (event) => {
        if (event.origin !== window.location.origin) return;

        if (event.data.type === 'github_catalog_callback') {
          clearInterval(pollTimer);
          popup.close();
          window.removeEventListener('message', messageHandler);

          const { code, state: returnedState, error: authError } = event.data;

          if (authError) {
            setLoading(false);
            setError(`GitHub authentication failed: ${authError}`);
            return;
          }

          if (!code) {
            setLoading(false);
            setError('No authorization code received from GitHub');
            return;
          }

          if (returnedState !== state) {
            setLoading(false);
            setError('State parameter mismatch - possible security issue');
            return;
          }

          // Exchange code for access token
          try {
            const token = await exchangeCodeForToken(code, codeVerifier);
            setAccessToken(token);
            setAuthenticated(true);
            setLoading(false);
          } catch (tokenError) {
            setLoading(false);
            setError(`Token exchange failed: ${tokenError.message}`);
          }
        }
      };

      window.addEventListener('message', messageHandler);

    } catch (err) {
      console.error('GitHub OAuth error:', err);
      setError(`Authentication failed: ${err.message}`);
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      onClose();
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Submit to API catalog" size="md">
      <div class="text-sm text-gray-500 mb-6">
        By clicking the "Submit" button below, you will be asked to authenticate to GitHub to make a merge request to the API Catalog GitHub repo.
      </div>

      {/* Success Message */}
      {authenticated && accessToken && (
        <div class="mb-6 rounded-md bg-green-50 p-4">
          <div class="flex">
            <div class="flex-shrink-0">
              <svg class="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.236 4.53L7.53 10.47a.75.75 0 00-1.06 1.06l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clip-rule="evenodd" />
              </svg>
            </div>
            <div class="ml-3">
              <h3 class="text-sm font-medium text-green-800">Successfully authenticated!</h3>
              <div class="mt-2 text-sm text-green-700">
                <p class="mb-2">Access token received from GitHub:</p>
                <div class="bg-green-100 p-2 rounded font-mono text-xs break-all">
                  {accessToken}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div class="mb-6 rounded-md bg-red-50 p-4">
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

      {/* Buttons */}
      <div class="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
        <Button
          onClick={handleSubmit}
          disabled={loading || authenticated}
          variant="primary"
          className="w-full sm:ml-3 sm:w-auto"
        >
          {loading ? 'Authenticating...' : authenticated ? 'Authenticated' : 'Submit'}
        </Button>
        <Button
          onClick={handleClose}
          disabled={loading}
          variant="secondary"
          className="mt-3 w-full sm:mt-0 sm:w-auto"
        >
          Cancel
        </Button>
      </div>
    </Modal>
  );
}
