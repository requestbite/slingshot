import { useState } from 'preact/hooks';
import { apiClient } from '../../api';
import { decryptSecret } from '../../utils/encryption';

export function ExportEnvironmentsModal({ isOpen, onClose, onExportSuccess }) {
  const [isLoading, setIsLoading] = useState(false);

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

  const handleExport = async () => {
    setIsLoading(true);

    try {
      // Get all environments data from IndexedDB (decrypted)
      const allEnvironments = await apiClient.getAllEnvironments();

      // Decrypt authConfig and authResponse for each environment
      const decryptedEnvironments = await Promise.all(
        allEnvironments.map(async (environment) => {
          let decryptedEnvironment = { ...environment };

          try {
            // Decrypt authConfig if it exists and is encrypted
            if (environment.authConfig?.encrypted_value) {
              const decryptedAuthConfig = await decryptAuthConfig(environment.authConfig);
              if (decryptedAuthConfig) {
                decryptedEnvironment.authConfig = decryptedAuthConfig;
              }
            }

            // Decrypt authResponse if it exists and is encrypted
            if (environment.authResponse?.encrypted_value) {
              const decryptedAuthResponse = await decryptAuthResponse(environment.authResponse);
              if (decryptedAuthResponse) {
                decryptedEnvironment.authResponse = decryptedAuthResponse;
              }
            }
          } catch (error) {
            console.error(`Failed to decrypt auth fields for environment ${environment.id}:`, error);
            // Continue with the original data if decryption fails
          }

          return decryptedEnvironment;
        })
      );

      // Create export data structure
      const exportData = {
        environments: decryptedEnvironments
      };

      // Convert to JSON
      const jsonData = JSON.stringify(exportData, null, 2);

      // Create and download file
      const blob = new Blob([jsonData], { type: 'application/json' });
      const url = URL.createObjectURL(blob);

      // Create a temporary anchor element to trigger download
      const a = document.createElement('a');
      a.href = url;
      a.download = 'slingshot-env.json';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      // Clean up the URL object
      URL.revokeObjectURL(url);

      onClose();

      // Notify parent component of successful export
      if (onExportSuccess) {
        onExportSuccess();
      }
    } catch (error) {
      console.error('Failed to export environments:', error);
      // Could add error state here if needed
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div class="fixed inset-0 bg-gray-500/75 transition-opacity z-50">
      <div class="fixed inset-0 z-10 w-screen overflow-y-auto">
        <div class="flex min-h-full items-center justify-center p-4 text-center sm:items-center sm:p-0">
          <div class="relative transform overflow-hidden rounded-lg bg-white px-4 pb-4 pt-5 text-left shadow-xl transition-all sm:my-8 w-full sm:max-w-lg sm:p-6">

            {/* Close button */}
            <div class="absolute right-0 top-0 hidden pr-4 pt-4 sm:block">
              <button
                onClick={onClose}
                type="button"
                class="rounded-md bg-white text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 cursor-pointer"
                disabled={isLoading}
              >
                <span class="sr-only">Close</span>
                <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal content */}
            <div class="text-center mt-0 sm:text-left">
              <h3 class="text-base font-semibold text-gray-900">Export environments</h3>
              <div class="mt-2 text-sm text-gray-500">
                By clicking "Export" you will generate a JSON file containing all of your environments data, including secrets and credentials, in plain-text.              </div>
              <div class="mt-2 text-sm text-gray-500">
                This can be used to backup your data or importing it into another Slingshot instance. Please handle the generated file with care as it might contain sensitive data.
              </div>

              {/* Action buttons */}
              <div class="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
                <button
                  onClick={handleExport}
                  disabled={isLoading}
                  class="inline-flex w-full justify-center rounded-md bg-sky-500 px-3 py-2 text-sm font-semibold text-white hover:bg-sky-400 disabled:bg-sky-300 disabled:cursor-not-allowed sm:ml-3 sm:w-auto cursor-pointer"
                >
                  {isLoading ? 'Exporting...' : 'Export'}
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isLoading}
                  class="mt-3 inline-flex w-full justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed sm:mt-0 sm:w-auto cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
