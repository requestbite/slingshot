import { useState, useRef, useEffect } from 'preact/hooks';
import { useLocation } from 'wouter-preact';
import { fetchFromURL, detectContentFormat } from '../../utils/urlImporter';
import { processImport } from '../../utils/importProcessor';
import { apiClient } from '../../api';
import { useAppContext } from '../../hooks/useAppContext';
import { Toast, useToast } from '../common/Toast';
import { Portal } from '../common/Portal';
import { Modal } from '../common/Modal';
import { TextInput } from '../common/TextInput';
import { Button } from '../common/Button';
import { Label } from '../common/Label';
import { OpenAPIServerSelectModal } from './OpenAPIServerSelectModal';
import { SwaggerHostInputModal } from './SwaggerHostInputModal';

/**
 * Modal for re-importing a collection from its source spec URL
 * Preserves collection settings like environment_id, timeout, etc.
 */
export function ReImportModal({ isOpen, collection, onClose, onSuccess }) {
  const [sourceUrl, setSourceUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const urlInputRef = useRef();
  const [, setLocation] = useLocation();
  const { addCollection, selectCollection, removeCollection, setHasManuallySelectedEnvironment } = useAppContext();

  // Toast state
  const [isToastVisible, showToast, hideToast] = useToast();
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState('error');

  // Server selection state (OpenAPI multi-server)
  const [showServerSelectModal, setShowServerSelectModal] = useState(false);
  const [parsedSpec, setParsedSpec] = useState(null);
  const [specFormat, setSpecFormat] = useState(null);
  const [specContent, setSpecContent] = useState(null);

  // Swagger host input state (Swagger 2.0 without host)
  const [showSwaggerHostModal, setShowSwaggerHostModal] = useState(false);
  const [swaggerBasePath, setSwaggerBasePath] = useState('');

  // Initialize form data when modal opens and auto-focus URL input
  useEffect(() => {
    if (isOpen && collection) {
      setSourceUrl(collection.source_openapi_url || '');

      // Auto-focus on URL input
      setTimeout(() => {
        if (urlInputRef.current) {
          urlInputRef.current.focus();
        }
      }, 100);
    }
  }, [isOpen, collection]);

  const showErrorToast = (message) => {
    setToastMessage(message);
    setToastType('error');
    showToast();
  };

  const handleUrlChange = (e) => {
    setSourceUrl(e.target.value);
  };

  /**
   * Extracts the origin (protocol + hostname) from a URL
   * Following Swagger 2.0 spec: if no host is provided, use the host serving the spec
   */
  const extractDefaultHost = (url) => {
    try {
      const urlObj = new URL(url);
      return urlObj.origin;
    } catch (error) {
      return '';
    }
  };

  /**
   * Main re-import handler
   * 1. Fetch spec from URL
   * 2. Detect format and check for special cases (server selection, host input)
   * 3. Create new collection with preserved settings
   * 4. Delete old collection
   * 5. Update app state and navigate to new collection
   */
  const handleReImport = async () => {
    if (!sourceUrl.trim()) {
      showErrorToast('Please enter a source URL');
      return;
    }

    if (!collection) {
      showErrorToast('No collection selected');
      return;
    }

    setIsLoading(true);

    try {
      // Fetch content from URL
      const { content } = await fetchFromURL(sourceUrl.trim());

      // Detect content format
      const format = detectContentFormat(content);

      if (format === 'unknown') {
        showErrorToast('Unable to detect file format. Please ensure the URL points to a valid OpenAPI specification or Postman collection.');
        return;
      }

      // For OpenAPI, check if there are multiple servers or missing host
      if (format === 'openapi') {
        try {
          let spec;

          // Try parsing as JSON first
          try {
            spec = JSON.parse(content);
          } catch (_jsonError) {
            // If JSON fails, try YAML
            const { load: loadYAML } = await import('js-yaml');
            spec = loadYAML(content);
          }

          // If OpenAPI 3.x and has multiple servers, show server selection modal
          if (spec && spec.openapi && spec.servers && spec.servers.length > 1) {
            setParsedSpec(spec);
            setSpecFormat(format);
            setSpecContent(content);
            setShowServerSelectModal(true);
            setIsLoading(false);
            return;
          }

          // Check for Swagger 2.0 without host
          if (spec && spec.swagger === '2.0' && !spec.host) {
            setParsedSpec(spec);
            setSpecFormat(format);
            setSpecContent(content);
            setSwaggerBasePath(spec.basePath || '');
            setShowSwaggerHostModal(true);
            setIsLoading(false);
            return;
          }
        } catch (_parseError) {
          // Parsing failed, continue with normal processing
        }
      }

      // Process without server selection
      await executeReImport(content, format, null);

    } catch (error) {
      console.error('Re-import error:', error);
      showErrorToast(error.message || 'Failed to re-import from URL. Please check the URL and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Execute the re-import process
   * Creates new collection, deletes old one, updates state
   */
  const executeReImport = async (content, format, serverSelection = null) => {
    try {
      // 1. Import and create new collection (using shared processImport utility)
      const { collection: newCollection } = await processImport({
        content,
        format,
        collectionName: collection.name,
        serverSelection,
        sourceUrl: sourceUrl.trim(),
        // Preserve collection settings
        environmentId: collection.environment_id,
        timeout: collection.timeout,
        followRedirects: collection.follow_redirects,
        parseAnsiColors: collection.parse_ansi_colors
      });

      // 2. Delete old collection BEFORE navigation (prevents race conditions)
      await apiClient.deleteCollection(collection.id);

      // 3. Update AppContext in correct order
      removeCollection(collection.id);                // Remove old (clears selectedCollection)
      addCollection(newCollection);                   // Add new
      selectCollection(newCollection);                // Select new
      setHasManuallySelectedEnvironment(false);      // Reset manual env selection

      // 4. Navigate to new collection
      setLocation(`/${newCollection.id}`);

      // 5. Success
      if (onSuccess) onSuccess(newCollection);
      onClose();
      resetForm();

    } catch (error) {
      console.error('Re-import execution error:', error);
      showErrorToast(error.message || 'Failed to complete re-import. The old collection has been preserved.');
      throw error;
    }
  };

  const handleServerSelectionConfirm = async (serverSelection) => {
    setShowServerSelectModal(false);
    setIsLoading(true);

    try {
      await executeReImport(specContent, specFormat, serverSelection);
    } catch (error) {
      console.error('Re-import with server selection error:', error);
      showErrorToast(error.message || 'Failed to re-import from URL.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleServerSelectionCancel = () => {
    setShowServerSelectModal(false);
    setParsedSpec(null);
    setSpecFormat(null);
    setSpecContent(null);
    setIsLoading(false);
  };

  const handleSwaggerHostConfirm = async (hostSelection) => {
    setShowSwaggerHostModal(false);
    setIsLoading(true);

    try {
      await executeReImport(specContent, specFormat, hostSelection);
    } catch (error) {
      console.error('Re-import with Swagger host error:', error);
      showErrorToast(error.message || 'Failed to re-import from URL.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSwaggerHostCancel = () => {
    setShowSwaggerHostModal(false);
    setParsedSpec(null);
    setSpecFormat(null);
    setSpecContent(null);
    setSwaggerBasePath('');
    setIsLoading(false);
  };

  const resetForm = () => {
    setSourceUrl('');
  };

  const handleClose = () => {
    if (!isLoading) {
      resetForm();
      hideToast();
      onClose();
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    handleReImport();
  };

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={handleClose}
        title="Re-Import Collection"
        size="md"
      >
        <div class="text-sm text-gray-500 mb-6">
          Re-import this collection from its source spec. Please note that this will overwrite any manual updates done to this collection.
        </div>

        <form onSubmit={handleSubmit}>
          <div class="space-y-4">
            <div>
              <Label htmlFor="reimport-source-url">
                Source spec
              </Label>
              <TextInput
                ref={urlInputRef}
                type="url"
                id="reimport-source-url"
                placeholder="https://example.com/api-spec.yaml"
                value={sourceUrl}
                onChange={handleUrlChange}
                disabled={isLoading}
                description="URL to import OpenAPI specification or Postman collection from."
              />
            </div>

            <div class="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
              <Button
                type="submit"
                variant="primary"
                disabled={isLoading || !sourceUrl.trim()}
                loading={isLoading}
                className="w-full sm:ml-3 sm:w-auto"
              >
                {isLoading ? 'Re-Importing...' : 'Import'}
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={handleClose}
                disabled={isLoading}
                className="mt-3 w-full sm:mt-0 sm:w-auto"
              >
                Cancel
              </Button>
            </div>
          </div>
        </form>
      </Modal>

      {/* Server Selection Modal */}
      {parsedSpec && (
        <OpenAPIServerSelectModal
          isOpen={showServerSelectModal}
          servers={parsedSpec.servers || []}
          onClose={handleServerSelectionCancel}
          onConfirm={handleServerSelectionConfirm}
        />
      )}

      {/* Swagger Host Input Modal */}
      {parsedSpec && (
        <SwaggerHostInputModal
          isOpen={showSwaggerHostModal}
          basePath={swaggerBasePath}
          defaultHostUrl={extractDefaultHost(sourceUrl)}
          onClose={handleSwaggerHostCancel}
          onConfirm={handleSwaggerHostConfirm}
        />
      )}

      {/* Toast Notification */}
      <Portal>
        <Toast
          message={toastMessage}
          isVisible={isToastVisible}
          onClose={hideToast}
          type={toastType}
        />
      </Portal>
    </>
  );
}
