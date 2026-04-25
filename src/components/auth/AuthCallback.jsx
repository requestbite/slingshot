import { useEffect } from 'preact/hooks';
import { UserManager } from 'oidc-client-ts';

export function AuthCallback() {
  useEffect(() => {
    const handleCallback = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const error = urlParams.get('error');
      const code = urlParams.get('code');
      const state = urlParams.get('state');

      // Check if this is an OAuth 2.0 callback (has code parameter) but NOT OIDC PKCE
      const flowType = sessionStorage.getItem('oauth_flow_type') || 'oauth2_pkce';
      if ((code || error) && flowType !== 'oidc_pkce') {
        // Determine callback type based on sessionStorage
        
        try {
          if (window.opener) {
            // Send the result back to the parent window with appropriate callback type
            const callbackType = flowType === 'oauth2_code' ? 'oauth2_code_callback' : 'oauth2_callback';
            
            window.opener.postMessage({
              type: callbackType,
              code: code,
              state: state,
              error: error
            }, window.location.origin);
          }
          window.close();
        } catch (postError) {
          console.error('Failed to send OAuth 2.0 callback data to parent window:', postError);
          try {
            window.close();
          } catch (closeError) {
            console.error('Failed to close popup window:', closeError);
          }
        }
        return;
      }

      // Otherwise, try to handle as OIDC callback
      try {
        // Create a temporary UserManager to handle the callback
        // We don't need the full config here, just enough to process the callback
        const userManager = new UserManager({
          // These values don't matter for the callback processing
          authority: 'temp',
          client_id: 'temp',
          redirect_uri: window.location.origin + '/auth/callback'
        });

        // Process the callback and get the user
        const user = await userManager.signinPopupCallback();
        
        // Clean up session storage
        sessionStorage.removeItem('oauth_flow_type');
        
        // The popup will be closed automatically by the oidc-client-ts library
        // and the result will be passed back to the parent window
        console.log('OIDC callback processed successfully:', user);
        
      } catch (error) {
        console.error('Error processing OIDC callback:', error);
        
        // If there's an error, we still need to close the popup
        // The library should handle this, but we can add a fallback
        try {
          if (window.opener) {
            window.close();
          }
        } catch (closeError) {
          console.error('Failed to close popup window:', closeError);
        }
      }
    };

    handleCallback();
  }, []);

  return (
    <div class="h-full flex items-center justify-center">
      <div class="text-center">
        <div class="flex items-center justify-center mb-4">
          <svg class="animate-spin w-8 h-8 text-sky-500" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
        </div>
        <h2 class="text-lg font-medium text-gray-900 dark:text-neutral-dark-900 mb-2">Processing Authentication</h2>
        <p class="text-gray-600 dark:text-neutral-dark-600">Please wait while we complete the authentication process...</p>
        <p class="text-sm text-gray-500 dark:text-neutral-dark-500 mt-4">This window will close automatically.</p>
      </div>
    </div>
  );
}