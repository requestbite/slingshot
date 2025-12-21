import { useState, useRef, useEffect } from 'preact/hooks';
import { useLocation } from 'wouter-preact';
// processOpenAPISpec will be dynamically imported when needed
import { apiClient } from '../../api';
import { requestSubmitter } from '../../utils/requestSubmitter';
import { useAppContext } from '../../hooks/useAppContext';
import { Modal } from '../common/Modal';
import { TextInput } from '../common/TextInput';
import { Button } from '../common/Button';
import { Label } from '../common/Label';
import { FileBrowser } from '../common/FileBrowser';
import { Toast, useToast } from '../common/Toast';
import { OpenAPIServerSelectModal } from '../modals/OpenAPIServerSelectModal';

export function OpenAPIImportModal({ isOpen, onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    name: '',
    file: null
  });
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const fileInputRef = useRef();
  const nameInputRef = useRef();
  const [, setLocation] = useLocation();
  const { addCollection, selectCollection } = useAppContext();

  // Server selection state
  const [showServerSelectModal, setShowServerSelectModal] = useState(false);
  const [parsedSpec, setParsedSpec] = useState(null);
  const [fileContent, setFileContent] = useState('');
  const [specCollectionName, setSpecCollectionName] = useState('');
  const [sourceFilePath, setSourceFilePath] = useState(null);

  // Local file browser state
  const [enableLocalFiles, setEnableLocalFiles] = useState(false);
  const [isCheckingCapabilities, setIsCheckingCapabilities] = useState(true);
  const [directoryListing, setDirectoryListing] = useState([]);
  const [currentPath, setCurrentPath] = useState(null);
  const [currentDir, setCurrentDir] = useState(null);
  const [parentDir, setParentDir] = useState(null);
  const [isLoadingDirectory, setIsLoadingDirectory] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);

  // Toast notifications
  const [isToastVisible, showToast, hideToast] = useToast();
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState('error');

  // Initialize form data when modal opens and auto-focus name input
  useEffect(() => {
    if (isOpen) {
      setFormData({ name: '', file: null });
      setErrors({});

      // Auto-focus on name input
      setTimeout(() => {
        if (nameInputRef.current) {
          nameInputRef.current.focus();
        }
      }, 100);
    }
  }, [isOpen]);

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
      // Fall back to standard file input on network/proxy error
      setEnableLocalFiles(false);
      setToastMessage('Failed to load directory listing. Falling back to file upload.');
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

          // If local files enabled, fetch initial directory listing
          if (hasLocalFiles) {
            await fetchDirectoryListing(null);
          }
        }
      } catch (error) {
        console.error('Failed to check proxy capabilities:', error);
        // Fall back to standard file input on error
        setEnableLocalFiles(false);
      } finally {
        setIsCheckingCapabilities(false);
      }
    };

    checkProxyCapabilities();
  }, [isOpen]);

  // Handle file/folder click (selection)
  const handleFileBrowserClick = (item) => {
    setSelectedItem(item);
  };

  // Handle file/folder double-click (navigation or import)
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
        setToastMessage('Please select a YAML or JSON file.');
        setToastType('error');
        showToast();
        return;
      }

      // Import file
      setIsLoading(true);
      setErrors({});

      try {
        const filePath = currentDir ? `${currentDir}/${item.name}` : item.name;
        const content = await fetchFileContents(filePath);

        // Parse to check for multiple servers
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
            setFileContent(content);
            setSpecCollectionName(formData.name);
            setSourceFilePath(filePath);
            setShowServerSelectModal(true);
            setIsLoading(false);
            return;
          }
        } catch (_parseError) {
          // Parsing failed, continue with normal processing
        }

        // Process without server selection
        await processImport(content, formData.name, null, filePath);

      } catch (error) {
        console.error('OpenAPI import error:', error);

        // Check if this is a network/fetch error (should fall back to file input)
        // vs a validation error (keep file browser)
        const isNetworkError = error.name === 'TypeError' ||
                               error.message?.includes('fetch') ||
                               error.message?.includes('network') ||
                               error.message?.includes('Failed to fetch');

        if (isNetworkError) {
          // Network/proxy error - fall back to file input
          setEnableLocalFiles(false);
          setToastMessage('Failed to fetch file from proxy. Falling back to file upload.');
          setToastType('error');
          showToast();
        } else {
          // Validation error - keep file browser, just show error
          setToastMessage(error.message || 'Failed to import OpenAPI specification. Please check the file format.');
          setToastType('error');
          showToast();
        }
      } finally {
        setIsLoading(false);
      }
    }
  };

  const validateFile = (file) => {
    const errors = {};

    if (!file) {
      errors.file = 'Please select a file to upload.';
      return errors;
    }

    // Check file type
    const allowedTypes = ['.yaml', '.yml', '.json'];
    const fileExtension = '.' + file.name.split('.').pop().toLowerCase();
    if (!allowedTypes.includes(fileExtension)) {
      errors.file = 'Please upload a YAML or JSON file.';
      return errors;
    }

    // Check file size (10MB limit)
    const maxSize = 10 * 1024 * 1024; // 10MB in bytes
    if (file.size > maxSize) {
      errors.file = 'File size must be less than 10MB.';
      return errors;
    }

    return errors;
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const fileErrors = validateFile(file);
      if (fileErrors.file) {
        setToastMessage(fileErrors.file);
        setToastType('error');
        showToast();
      }
      setFormData({ ...formData, file });
    }
  };

  const handleNameChange = (e) => {
    setFormData({ ...formData, name: e.target.value });
  };

  const readFileContent = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.onerror = (_e) => reject(new Error('Failed to read file'));
      reader.readAsText(file);
    });
  };

  // Helper function to process the import and create collection
  const processImport = async (content, collectionName, serverSelection = null, sourceUrl = null) => {
    // Process OpenAPI spec with dynamic import
    const { processOpenAPISpec } = await import('../../utils/openApiProcessor');
    const processedData = await processOpenAPISpec(content, collectionName, serverSelection);

    // Create collection using our API client
    const collection = await apiClient.createCollection({
      name: processedData.collectionName,
      description: processedData.description || '',
      variables: processedData.variables || [],
      security_schemes: processedData.securitySchemes || null,
      source_openapi_url: sourceUrl || undefined
    });

    // Create individual variable records for collection management UI
    for (const variable of processedData.variables || []) {
      await apiClient.createSecret({
        collection_id: collection.id,
        key: variable.key,
        value: variable.value,
        description: variable.description || ''
      });
    }

    // Create folders and requests
    const folderMap = new Map();

    // Create folders first
    for (const folderName of processedData.folders) {
      const folder = await apiClient.createFolder({
        name: folderName,
        collection_id: collection.id
      });
      folderMap.set(folderName, folder.id);
    }

    // Create requests
    for (const requestData of processedData.requests) {
      const folderId = requestData.folderName ? folderMap.get(requestData.folderName) : null;

      await apiClient.createRequest({
        collection_id: collection.id,
        folder_id: folderId,
        name: requestData.name,
        method: requestData.method,
        url: requestData.url,
        headers: requestData.headers || [],
        params: requestData.params || [],
        path_params: requestData.pathParams || [],
        request_type: requestData.requestType || 'none',
        content_type: requestData.contentType || 'json',
        body: requestData.body || '',
        // Include OpenAPI metadata
        description: requestData.description,
        summary: requestData.summary,
        operation_id: requestData.operation_id,
        tags: requestData.tags,
        parameters_schema: requestData.parameters_schema,
        request_body_schema: requestData.request_body_schema,
        response_schemas: requestData.response_schemas
      });
    }

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

    // Validate form
    const fileErrors = validateFile(formData.file);
    if (Object.keys(fileErrors).length > 0) {
      setToastMessage(fileErrors.file || 'Please check the file and try again.');
      setToastType('error');
      showToast();
      return;
    }

    setIsLoading(true);

    try {
      // Read file content
      const content = await readFileContent(formData.file);

      // Parse to check for multiple servers
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
          setFileContent(content);
          setSpecCollectionName(formData.name);
          setShowServerSelectModal(true);
          setIsLoading(false);
          return;
        }
      } catch (_parseError) {
        // Parsing failed, continue with normal processing
      }

      // Process without server selection
      await processImport(content, formData.name, null);

    } catch (error) {
      console.error('OpenAPI import error:', error);
      setToastMessage(error.message || 'Failed to import OpenAPI specification. Please check the file format and try again.');
      setToastType('error');
      showToast();
    } finally {
      setIsLoading(false);
    }
  };

  const handleServerSelectionConfirm = async (serverSelection) => {
    setShowServerSelectModal(false);
    setIsLoading(true);

    try {
      await processImport(fileContent, specCollectionName, serverSelection, sourceFilePath);
    } catch (error) {
      console.error('OpenAPI import error:', error);
      setToastMessage(error.message || 'Failed to import OpenAPI specification. Please check the file format and try again.');
      setToastType('error');
      showToast();
    } finally {
      setIsLoading(false);
    }
  };

  const handleServerSelectionCancel = () => {
    setShowServerSelectModal(false);
    setParsedSpec(null);
    setFileContent('');
    setSpecCollectionName('');
    setSourceFilePath(null);
    setIsLoading(false);
  };

  const resetForm = () => {
    setFormData({ name: '', file: null });
    setEnableLocalFiles(false);
    setDirectoryListing([]);
    setCurrentPath(null);
    setCurrentDir(null);
    setParentDir(null);
    setSelectedItem(null);
    setIsCheckingCapabilities(true);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleClose = () => {
    if (!isLoading) {
      resetForm();
      onClose();
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Import OpenAPI">
      <div class="text-sm text-gray-500">Import an OpenAPI or Swagger spec to create new collection.</div>

      <form onSubmit={handleSubmit}>
        <div class="mt-6">
          <Label htmlFor="import-collection-name">Name</Label>
          <TextInput
            ref={nameInputRef}
            id="import-collection-name"
            placeholder="My API collection"
            value={formData.name}
            onChange={handleNameChange}
            disabled={isLoading}
            description="If left empty, the name will be taken from the OpenAPI specification."
          />

          <Label htmlFor="openapi-file" className="mt-4">
            Specification file (YAML or JSON)
          </Label>

          {isCheckingCapabilities ? (
            <div class="mt-2 text-sm text-gray-500">
              Checking proxy capabilities...
            </div>
          ) : enableLocalFiles ? (
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
          ) : (
            <>
              <TextInput
                ref={fileInputRef}
                id="openapi-file"
                type="file"
                accept=".yaml,.yml,.json"
                required
                onChange={handleFileChange}
                disabled={isLoading}
                description="Maximum file size: 10 MB"
              />
            </>
          )}
        </div>

        <div class="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
          <Button
            type="submit"
            variant="primary"
            disabled={
              enableLocalFiles
                ? !selectedItem || selectedItem.type !== 'file' || !['.json', '.yml', '.yaml'].some(ext => selectedItem.name.toLowerCase().endsWith(ext))
                : !formData.file
            }
            loading={isLoading}
            className="w-full sm:ml-3 sm:w-auto"
            onClick={enableLocalFiles ? (e) => {
              e.preventDefault();
              if (selectedItem && selectedItem.type === 'file') {
                handleFileBrowserDoubleClick(selectedItem);
              }
            } : undefined}
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
      </form>

      {/* Server Selection Modal */}
      {parsedSpec && (
        <OpenAPIServerSelectModal
          isOpen={showServerSelectModal}
          servers={parsedSpec.servers || []}
          onClose={handleServerSelectionCancel}
          onConfirm={handleServerSelectionConfirm}
        />
      )}

      {/* Toast Notification */}
      <Toast
        message={toastMessage}
        isVisible={isToastVisible}
        onClose={hideToast}
        type={toastType}
      />
    </Modal>
  );
}
