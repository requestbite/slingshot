import { useState, useRef, useEffect } from 'preact/hooks';
import { useLocation } from 'wouter-preact';
import { fetchFromURL, detectContentFormat } from '../../utils/urlImporter';
import { processImport } from '../../utils/importProcessor';
import { apiClient } from '../../api';
import { requestSubmitter } from '../../utils/requestSubmitter';
import { useAppContext } from '../../hooks/useAppContext';
import { Toast, useToast } from '../common/Toast';
import { Modal } from '../common/Modal';
import { TextInput } from '../common/TextInput';
import { Button } from '../common/Button';
import { Label } from '../common/Label';
import { FileBrowser } from '../common/FileBrowser';
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

  // Local file browser state
  const [enableLocalFiles, setEnableLocalFiles] = useState(false);
  const [isCheckingCapabilities, setIsCheckingCapabilities] = useState(true);
  const [directoryListing, setDirectoryListing] = useState([]);
  const [currentPath, setCurrentPath] = useState(null);
  const [currentDir, setCurrentDir] = useState(null);
  const [parentDir, setParentDir] = useState(null);
  const [isLoadingDirectory, setIsLoadingDirectory] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);

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

  // Fetch directory listing from proxy
  const fetchDirectoryListing = async (path) => {
    setIsLoadingDirectory(true);
    setSelectedItem(null); // Clear selection when navigating
    try {
      const proxyUrl = requestSubmitter.getCurrentProxyUrl();
      const dirUrl = `${proxyUrl.replace(/\/$/, '')}/dir`;

      const response = await fetch(dirUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({ path })
      });

      if (!response.ok) {
        throw new Error('Failed to fetch directory listing');
      }

      const data = await response.json();
      setCurrentPath(path);
      setCurrentDir(data.currentDir);
      setParentDir(data.parentDir);

      // Format directory listing for FileBrowser
      let items = [...(data.dir || [])];

      // Add parent directory entry if not at root
      if (data.parentDir !== null) {
        items.unshift({
          name: '..',
          type: 'directory'
        });
      }

      setDirectoryListing(items);
    } catch (error) {
      console.error('Failed to fetch directory listing:', error);
      // Fall back to standard URL input on network/proxy error
      setEnableLocalFiles(false);
      setToastMessage('Failed to load directory listing. Using URL input only.');
      setToastType('error');
      showToast();
    } finally {
      setIsLoadingDirectory(false);
    }
  };

  // Fetch file contents from proxy
  const fetchFileContents = async (filePath) => {
    try {
      const proxyUrl = requestSubmitter.getCurrentProxyUrl();
      const fileUrl = `${proxyUrl.replace(/\/$/, '')}/file`;

      const response = await fetch(fileUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'text/plain'
        },
        body: JSON.stringify({ path: filePath })
      });

      if (!response.ok) {
        throw new Error('Failed to fetch file contents');
      }

      const content = await response.text();
      return content;
    } catch (error) {
      console.error('Failed to fetch file contents:', error);
      throw error;
    }
  };

  // Check proxy capabilities when modal opens
  useEffect(() => {
    if (!isOpen) return;

    const checkProxyCapabilities = async () => {
      setIsCheckingCapabilities(true);
      try {
        const proxyUrl = requestSubmitter.getCurrentProxyUrl();
        const healthUrl = `${proxyUrl.replace(/\/$/, '')}/health`;

        const response = await fetch(healthUrl, {
          method: 'GET',
          headers: { 'Accept': 'application/json' }
        });

        if (response.ok) {
          const data = await response.json();
          const hasLocalFiles = data.enableLocalFiles === true;
          setEnableLocalFiles(hasLocalFiles);

          // If local files enabled, we'll fetch directory in separate effect
        }
      } catch (error) {
        console.error('Failed to check proxy capabilities:', error);
        // Fall back to standard URL input on error
        setEnableLocalFiles(false);
      } finally {
        setIsCheckingCapabilities(false);
      }
    };

    checkProxyCapabilities();
  }, [isOpen]);

  // Navigate to source file directory if local files enabled
  useEffect(() => {
    if (!isOpen || !enableLocalFiles || isCheckingCapabilities) return;

    const navigateToSourceDirectory = async () => {
      // Check if sourceUrl is a file path (not a URL)
      const isUrl = sourceUrl.startsWith('http://') || sourceUrl.startsWith('https://');

      if (!sourceUrl || isUrl) {
        // No source URL or it's a URL - fetch default directory if we haven't loaded anything yet
        if (currentDir === null) {
          await fetchDirectoryListing(null);
        }
        return;
      }

      // sourceUrl looks like a file path - extract directory
      const lastSlashIndex = sourceUrl.lastIndexOf('/');
      if (lastSlashIndex > 0) {
        const directoryPath = sourceUrl.substring(0, lastSlashIndex);

        // Only fetch if we're not already in this directory
        if (directoryPath !== currentDir) {
          try {
            // Try to fetch the source file's directory
            await fetchDirectoryListing(directoryPath);
          } catch (error) {
            // If that fails, fall back to default directory
            console.error('Failed to navigate to source directory, using default:', error);
            await fetchDirectoryListing(null);
          }
        }
      } else {
        // No directory separator - fetch default directory if we haven't loaded anything yet
        if (currentDir === null) {
          await fetchDirectoryListing(null);
        }
      }
    };

    navigateToSourceDirectory();
  }, [isOpen, enableLocalFiles, isCheckingCapabilities, sourceUrl]);

  // Handle file/folder click (selection)
  const handleFileBrowserClick = (item) => {
    setSelectedItem(item);

    // If it's a file, update the source URL input field with the full path
    if (item.type === 'file') {
      const filePath = currentDir ? `${currentDir}/${item.name}` : item.name;
      setSourceUrl(filePath);
    }
  };

  // Handle file/folder double-click (navigation or re-import)
  const handleFileBrowserDoubleClick = async (item) => {
    if (item.type === 'directory') {
      // Navigate into directory
      let targetPath;
      if (item.name === '..') {
        // Navigate to parent directory
        targetPath = parentDir;
      } else {
        // Navigate into subdirectory
        targetPath = currentDir ? `${currentDir}/${item.name}` : item.name;
      }
      await fetchDirectoryListing(targetPath);
    } else if (item.type === 'file') {
      // Check if file has allowed extension
      const allowedExtensions = ['.json', '.yml', '.yaml'];
      const fileName = item.name.toLowerCase();
      const isAllowed = allowedExtensions.some(ext => fileName.endsWith(ext));

      if (!isAllowed) {
        setToastMessage('Please select a JSON or YAML file.');
        setToastType('error');
        showToast();
        return;
      }

      // Re-import from local file
      setIsLoading(true);

      try {
        const filePath = currentDir ? `${currentDir}/${item.name}` : item.name;
        const fileContent = await fetchFileContents(filePath);

        // Detect content format
        const format = detectContentFormat(fileContent);

        if (format === 'unknown') {
          setToastMessage('Unable to detect file format. Please ensure the file is a valid OpenAPI specification or Postman collection.');
          setToastType('error');
          showToast();
          setIsLoading(false);
          return;
        }

        // For OpenAPI, check if there are multiple servers or missing host
        if (format === 'openapi') {
          try {
            let spec;

            // Try parsing as JSON first
            try {
              spec = JSON.parse(fileContent);
            } catch (_jsonError) {
              // If JSON fails, try YAML
              const { load: loadYAML } = await import('js-yaml');
              spec = loadYAML(fileContent);
            }

            // If OpenAPI 3.x and has multiple servers, show server selection modal
            if (spec && spec.openapi && spec.servers && spec.servers.length > 1) {
              setParsedSpec(spec);
              setSpecFormat(format);
              setSpecContent(fileContent);
              setShowServerSelectModal(true);
              setIsLoading(false);
              return;
            }

            // Check for Swagger 2.0 without host
            if (spec && spec.swagger === '2.0' && !spec.host) {
              setParsedSpec(spec);
              setSpecFormat(format);
              setSpecContent(fileContent);
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
        await executeReImport(fileContent, format, null);

      } catch (error) {
        console.error('Re-import from local file error:', error);

        // Check if this is a network/fetch error vs a validation error
        const isNetworkError = error.name === 'TypeError' ||
                               error.message?.includes('fetch') ||
                               error.message?.includes('network') ||
                               error.message?.includes('Failed to fetch');

        if (isNetworkError) {
          // Network/proxy error - fall back to URL input only
          setEnableLocalFiles(false);
          setToastMessage('Failed to fetch file from proxy. Using URL input only.');
          setToastType('error');
          showToast();
        } else {
          // Validation error - keep file browser, just show error
          setToastMessage(error.message || 'Failed to re-import from file. Please check the file format.');
          setToastType('error');
          showToast();
        }
      } finally {
        setIsLoading(false);
      }
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
      // Determine if sourceUrl is a file path or URL
      const isUrl = sourceUrl.startsWith('http://') || sourceUrl.startsWith('https://');
      let content;

      if (isUrl) {
        // Fetch content from URL
        const result = await fetchFromURL(sourceUrl.trim());
        content = result.content;
      } else {
        // Fetch content from local file via proxy
        content = await fetchFileContents(sourceUrl.trim());
      }

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
    setEnableLocalFiles(false);
    setDirectoryListing([]);
    setCurrentPath(null);
    setCurrentDir(null);
    setParentDir(null);
    setSelectedItem(null);
    setIsCheckingCapabilities(true);
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
                id="reimport-source-url"
                placeholder="https://example.com/api-spec.yaml"
                value={sourceUrl}
                onChange={handleUrlChange}
                disabled={isLoading}
                description="URL to import OpenAPI specification or Postman collection from."
              />
            </div>

            {/* Local File Browser */}
            {isCheckingCapabilities ? (
              <div>
                <Label>Local file</Label>
                <div class="mt-2 text-sm text-gray-500">
                  Checking proxy capabilities...
                </div>
              </div>
            ) : enableLocalFiles ? (
              <div>
                <Label>Local file</Label>
                <div class="mt-2">
                  {isLoadingDirectory ? (
                    <div class="text-sm text-gray-500">Loading directory...</div>
                  ) : (
                    <FileBrowser
                      items={directoryListing}
                      sort="alphabetical"
                      onClick={handleFileBrowserClick}
                      onDoubleClick={handleFileBrowserDoubleClick}
                      allowedExtensions={['.json', '.yml', '.yaml']}
                      selectedItem={selectedItem}
                    />
                  )}
                  {currentDir && (
                    <p class="mt-2 text-xs text-gray-500">
                      Current directory: {currentDir}
                    </p>
                  )}
                </div>
              </div>
            ) : null}

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
      <Toast
        message={toastMessage}
        isVisible={isToastVisible}
        onClose={hideToast}
        type={toastType}
      />
    </>
  );
}
