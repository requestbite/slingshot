import { useState, useEffect } from 'preact/hooks';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { Label } from '../common/Label';
import { TextInput } from '../common/TextInput';

/**
 * SwaggerHostInputModal
 *
 * Prompts users to provide a host URL when importing Swagger 2.0 specifications
 * that lack the required 'host' field. The modal displays the resolved URL
 * (host + basePath) for user confirmation before import.
 *
 * @param {boolean} isOpen - Whether the modal is open
 * @param {string} basePath - The basePath from the Swagger 2.0 spec (optional)
 * @param {Function} onClose - Callback when modal is closed/cancelled
 * @param {Function} onConfirm - Callback when user confirms (receives { swaggerHost: string })
 */
export function SwaggerHostInputModal({ isOpen, basePath = '', onClose, onConfirm }) {
  const [hostUrl, setHostUrl] = useState('');
  const [resolvedUrl, setResolvedUrl] = useState('');
  const [isValid, setIsValid] = useState(false);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setHostUrl('');
      setResolvedUrl('');
      setIsValid(false);
    }
  }, [isOpen]);

  // Update resolved URL and validation whenever hostUrl or basePath changes
  useEffect(() => {
    if (!hostUrl.trim()) {
      setResolvedUrl('');
      setIsValid(false);
      return;
    }

    const result = parseHostUrl(hostUrl.trim(), basePath);
    setResolvedUrl(result.resolvedUrl);
    setIsValid(result.isValid);
  }, [hostUrl, basePath]);

  const handleHostChange = (e) => {
    setHostUrl(e.target.value);
  };

  const handleConfirm = () => {
    if (isValid) {
      // Parse the URL one more time to get the swaggerHost (origin + pathname)
      const result = parseHostUrl(hostUrl.trim(), basePath);
      onConfirm({ swaggerHost: result.swaggerHost });
    }
  };

  const handleCancel = () => {
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleCancel}
      title="API server URL"
      size="md"
    >
      <div class="text-sm text-gray-500 mb-6">
        The API spec does not include details about the API host. This is required in order to use this API. Please provide a valid URL to the API host.
      </div>

      <div class="space-y-4">
        {/* Host URL Input */}
        <div>
          <Label htmlFor="swagger-host-url" mandatory>
            URL
          </Label>
          <TextInput
            type="url"
            id="swagger-host-url"
            placeholder="https://api.example.com/v2"
            value={hostUrl}
            onChange={handleHostChange}
            description="Enter the base URL for the API server. You can include a path if needed."
          />
        </div>

        {/* Resolved URL Display */}
        {resolvedUrl && isValid && (
          <div class="pt-4 border-t border-gray-200">
            <Label>
              Resolved URL
            </Label>
            <div class="text-xs text-gray-500 mb-2">
              This URL will used for the baseUrl collection variable.
            </div>
            <div class="text-sm font-mono bg-gray-50 p-3 rounded-md border border-gray-200 break-all">
              {resolvedUrl}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div class="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse pt-4">
          <Button
            type="button"
            variant="primary"
            disabled={!isValid}
            onClick={handleConfirm}
            className="w-full sm:ml-3 sm:w-auto"
          >
            Import
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={handleCancel}
            className="mt-3 w-full sm:mt-0 sm:w-auto"
          >
            Cancel
          </Button>
        </div>
      </div>
    </Modal>
  );
}

/**
 * Parses a host URL and combines it with basePath to create the resolved URL
 * @param {string} input - User's input URL (can include path)
 * @param {string} basePath - The basePath from the Swagger spec
 * @returns {Object} { swaggerHost: string, resolvedUrl: string, isValid: boolean }
 */
function parseHostUrl(input, basePath) {
  if (!input || !input.trim()) {
    return { swaggerHost: '', resolvedUrl: '', isValid: false };
  }

  // Add https:// if no protocol specified
  let urlString = input.trim();
  if (!urlString.startsWith('http://') && !urlString.startsWith('https://')) {
    urlString = 'https://' + urlString;
  }

  try {
    const url = new URL(urlString);

    // Extract origin (protocol + host + port)
    const origin = url.origin; // e.g., "https://api.example.com:8080"

    // Extract pathname (path from URL input)
    const pathname = url.pathname; // e.g., "/v2" or "/" or ""

    // Normalize pathname - remove trailing slash if present
    const normalizedPathname = pathname === '/' ? '' : pathname.replace(/\/$/, '');

    // Combine origin + pathname + basePath
    // swaggerHost is what we pass to the processor (origin + pathname from user input)
    const swaggerHost = origin + normalizedPathname;

    // resolvedUrl is the full URL including basePath from spec
    const normalizedBasePath = basePath || '';
    const resolvedUrl = swaggerHost + normalizedBasePath;

    return { swaggerHost, resolvedUrl, isValid: true };
  } catch (error) {
    return { swaggerHost: '', resolvedUrl: '', isValid: false };
  }
}
