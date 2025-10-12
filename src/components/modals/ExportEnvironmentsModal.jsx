import { useState } from 'preact/hooks';
import { apiClient } from '../../api';
import { decryptSecret } from '../../utils/encryption';
import { Modal } from '../common/Modal';

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

  // Helper function to decrypt secrets array
  const decryptSecretsArray = async (encryptedSecrets) => {
    if (!encryptedSecrets || !Array.isArray(encryptedSecrets)) return encryptedSecrets;
    
    const decryptedSecrets = await Promise.all(
      encryptedSecrets.map(async (secret) => {
        if (!secret || !secret.encrypted_value) return secret;
        try {
          const decryptedValue = await decryptSecret(secret.encrypted_value, secret.iv);
          return {
            key: secret.key,
            value: decryptedValue
          };
        } catch (error) {
          console.error('Failed to decrypt secret:', error);
          return secret;
        }
      })
    );
    
    return decryptedSecrets;
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

            // Decrypt secrets array if it exists
            if (environment.secrets) {
              const decryptedSecrets = await decryptSecretsArray(environment.secrets);
              decryptedEnvironment.secrets = decryptedSecrets;
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

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Export environments" size="md">
      <div>
        <div class="text-sm text-gray-500">
          By clicking "Export" you will generate a JSON file containing all of your environments data, including secrets and credentials, in plain-text.
        </div>
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
    </Modal>
  );
}
