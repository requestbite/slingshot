import { useState, useRef, useEffect } from 'preact/hooks';
import { useLocation } from 'wouter-preact';
import { fetchFromURL, detectContentFormat, extractDefaultName } from '../../utils/urlImporter';
import { processImport } from '../../utils/importProcessor';
import { apiClient } from '../../api';
import { useAppContext } from '../../hooks/useAppContext';
import { Toast, useToast } from '../common/Toast';
import { Portal } from '../common/Portal';
import { Modal } from '../common/Modal';
import { TextInput } from '../common/TextInput';
import { Button } from '../common/Button';
import { Label } from '../common/Label';
import { OpenAPIServerSelectModal } from '../modals/OpenAPIServerSelectModal';
import { SwaggerHostInputModal } from '../modals/SwaggerHostInputModal';

export function URLImportModal({ isOpen, importUrl, collectionName = '', onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    name: '',
    url: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const nameInputRef = useRef();
    const [, setLocation] = useLocation();
    const { addCollection, selectCollection } = useAppContext();

  // Toast state
  const [isToastVisible, showToast, hideToast] = useToast();
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState('error');

  // Server selection state
  const [showServerSelectModal, setShowServerSelectModal] = useState(false);
  const [parsedSpec, setParsedSpec] = useState(null);
  const [specFormat, setSpecFormat] = useState(null);
  const [specCollectionName, setSpecCollectionName] = useState('');

  // Swagger host input state
  const [showSwaggerHostModal, setShowSwaggerHostModal] = useState(false);
  const [swaggerBasePath, setSwaggerBasePath] = useState('');
  const [swaggerSourceUrl, setSwaggerSourceUrl] = useState('');

  // Initialize form data when modal opens and auto-focus name input
  useEffect(() => {
    if (isOpen) {
      setFormData({
        name: collectionName || '',
        url: importUrl || ''
      });
      setErrors({});

      // Auto-focus on name input
      setTimeout(() => {
        if (nameInputRef.current) {
          nameInputRef.current.focus();
        }
      }, 100);
    }
  }, [isOpen, importUrl, collectionName]);

  const showErrorToast = (message) => {
    setToastMessage(message);
    setToastType('error');
    showToast();
  };

  const handleNameChange = (e) => {
    setFormData({ ...formData, name: e.target.value });
    if (errors.name) {
      setErrors({ ...errors, name: '' });
    }
  };

  const handleUrlChange = (e) => {
    setFormData({ ...formData, url: e.target.value });
    if (errors.url) {
      setErrors({ ...errors, url: '' });
    }
  };

  /**
   * Extracts the origin (protocol + hostname) from a URL
   * Following Swagger 2.0 spec: if no host is provided, use the host serving the spec
   * @param {string} url - The source URL
   * @returns {string} The origin (e.g., "https://api.example.com")
   */
  const extractDefaultHost = (url) => {
    try {
      const urlObj = new URL(url);
      return urlObj.origin;
    } catch (error) {
      return '';
    }
  };

  // Helper function to process the import and create collection
  const executeImport = async (content, format, collectionName, serverSelection = null, sourceUrl = null) => {
    // Use the shared processImport utility
    const { collection } = await processImport({
      content,
      format,
      collectionName,
      serverSelection,
      sourceUrl
    });

    // Success - add to context, navigate to collection, and notify parent
    addCollection(collection);
    selectCollection(collection);
    setLocation(`/${collection.id}`);

    if (onSuccess) onSuccess(collection);
    onClose();
    resetForm();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.url.trim()) {
      showErrorToast('No import URL provided');
      return;
    }

    setIsLoading(true);
    setErrors({});

    try {
      // Fetch content from URL
      const { content } = await fetchFromURL(formData.url.trim());

      // Detect content format
      const format = detectContentFormat(content);

      if (format === 'unknown') {
        showErrorToast('Unable to detect file format. Please ensure the URL points to a valid OpenAPI specification or Postman collection.');
        return;
      }

      // Extract default name if user didn't provide one
      const collectionName = formData.name.trim() || extractDefaultName(content, format, formData.url.trim());

      // For OpenAPI, check if there are multiple servers
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
            setSpecCollectionName(collectionName);
            setShowServerSelectModal(true);
            setIsLoading(false);
            return;
          }

          // Check for Swagger 2.0 without host
          if (spec && spec.swagger === '2.0' && !spec.host) {
            setParsedSpec(spec);
            setSpecFormat(format);
            setSpecCollectionName(collectionName);
            setSwaggerBasePath(spec.basePath || '');
            setSwaggerSourceUrl(formData.url.trim());
            setShowSwaggerHostModal(true);
            setIsLoading(false);
            return;
          }
        } catch (_parseError) {
          // Parsing failed, continue with normal processing
        }
      }

      // Process without server selection
      await executeImport(content, format, collectionName, null, formData.url.trim());

    } catch (error) {
      console.error('URL import error:', error);
      showErrorToast(error.message || 'Failed to import from URL. Please check the URL and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleServerSelectionConfirm = async (serverSelection) => {
    setShowServerSelectModal(false);
    setIsLoading(true);

    try {
      // Convert spec back to string for processing
      const content = JSON.stringify(parsedSpec);
      await executeImport(content, specFormat, specCollectionName, serverSelection, formData.url.trim());
    } catch (error) {
      console.error('URL import error:', error);
      showErrorToast(error.message || 'Failed to import from URL. Please check the URL and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleServerSelectionCancel = () => {
    setShowServerSelectModal(false);
    setParsedSpec(null);
    setSpecFormat(null);
    setSpecCollectionName('');
    setIsLoading(false);
  };

  const handleSwaggerHostConfirm = async (hostSelection) => {
    setShowSwaggerHostModal(false);
    setIsLoading(true);

    try {
      // Convert spec back to string for processing
      const content = JSON.stringify(parsedSpec);
      await executeImport(content, specFormat, specCollectionName, hostSelection, swaggerSourceUrl);
    } catch (error) {
      console.error('URL import error:', error);
      showErrorToast(error.message || 'Failed to import from URL. Please check the URL and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSwaggerHostCancel = () => {
    setShowSwaggerHostModal(false);
    setParsedSpec(null);
    setSpecFormat(null);
    setSpecCollectionName('');
    setSwaggerBasePath('');
    setSwaggerSourceUrl('');
    setIsLoading(false);
  };

  const resetForm = () => {
    setFormData({ name: '', url: '' });
    setErrors({});
  };

  const handleClose = () => {
    if (!isLoading) {
      resetForm();
      hideToast();
      onClose();
    }
  };

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={handleClose}
        title="Import"
        size="md"
      >
        <div class="text-sm text-gray-500 dark:text-neutral-dark-500 mb-6">
          Import an OpenAPI spec or Postman collection via a URL.
        </div>

        <form onSubmit={handleSubmit}>
          <div class="space-y-4">
            <div>
              <Label htmlFor="import-collection-name">
                Name
              </Label>
              <TextInput
                ref={nameInputRef}
                id="import-collection-name"
                placeholder="My API collection"
                value={formData.name}
                onChange={handleNameChange}
                disabled={isLoading}
                description="If left empty, the name will be taken from the imported file."
              />
            </div>

            <div>
              <Label htmlFor="import-collection-url">
                Import URL
              </Label>
              <TextInput
                type="url"
                id="import-collection-url"
                placeholder="https://example.com/api-spec.yaml"
                value={formData.url}
                onChange={handleUrlChange}
                disabled={isLoading}
                description="URL to import OpenAPI specification or Postman collection from."
              />
            </div>

            {errors.general && (
              <div class="text-sm text-red-600 bg-red-100 p-2 rounded-md">
                {errors.general}
              </div>
            )}

            <div class="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
              <Button
                type="submit"
                variant="primary"
                disabled={isLoading}
                loading={isLoading}
                className="w-full sm:ml-3 sm:w-auto"
              >
                {isLoading ? 'Importing...' : 'Import'}
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
          defaultHostUrl={extractDefaultHost(swaggerSourceUrl)}
          onClose={handleSwaggerHostCancel}
          onConfirm={handleSwaggerHostConfirm}
        />
      )}

      {/* Toast Notification */}
      <Toast
        message={toastMessage}
        isVisible={isToastVisible}
        onClose={hideToast}
        type={toastType}
      />
    </>
  );
}
