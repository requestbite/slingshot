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

  // Local file browser state
  const [enableLocalFiles, setEnableLocalFiles] = useState(false);
  const [isCheckingCapabilities, setIsCheckingCapabilities] = useState(true);
  const [directoryListing, setDirectoryListing] = useState([]);
  const [currentPath, setCurrentPath] = useState(null);
  const [isLoadingDirectory, setIsLoadingDirectory] = useState(false);

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
      setErrors({
        general: 'Failed to load directory listing. Please try again or use file upload.'
      });
    } finally {
      setIsLoadingDirectory(false);
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
      setErrors({ ...errors, file: fileErrors.file });
      setFormData({ ...formData, file });
    }
  };

  const handleNameChange = (e) => {
    setFormData({ ...formData, name: e.target.value });
    if (errors.name) {
      setErrors({ ...errors, name: '' });
    }
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
  const processImport = async (content, collectionName, serverSelection = null) => {
    // Process OpenAPI spec with dynamic import
    const { processOpenAPISpec } = await import('../../utils/openApiProcessor');
    const processedData = await processOpenAPISpec(content, collectionName, serverSelection);

    // Create collection using our API client
    const collection = await apiClient.createCollection({
      name: processedData.collectionName,
      description: processedData.description || '',
      variables: processedData.variables || [],
      security_schemes: processedData.securitySchemes || null
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
      setErrors(fileErrors);
      return;
    }

    setIsLoading(true);
    setErrors({});

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
      setErrors({
        general: error.message || 'Failed to import OpenAPI specification. Please check the file format and try again.'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleServerSelectionConfirm = async (serverSelection) => {
    setShowServerSelectModal(false);
    setIsLoading(true);

    try {
      await processImport(fileContent, specCollectionName, serverSelection);
    } catch (error) {
      console.error('OpenAPI import error:', error);
      setErrors({
        general: error.message || 'Failed to import OpenAPI specification. Please check the file format and try again.'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleServerSelectionCancel = () => {
    setShowServerSelectModal(false);
    setParsedSpec(null);
    setFileContent('');
    setSpecCollectionName('');
    setIsLoading(false);
  };

  const resetForm = () => {
    setFormData({ name: '', file: null });
    setErrors({});
    setEnableLocalFiles(false);
    setDirectoryListing([]);
    setCurrentPath(null);
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
                  onClick={(item) => {
                    console.log('Clicked:', item);
                    // Future: Handle file selection
                  }}
                  onDoubleClick={(item) => {
                    console.log('Double-clicked:', item);
                    // Future: Navigate directories or select files
                  }}
                />
              )}
              <p class="mt-2 text-sm text-gray-500">
                Note: Directory navigation and file selection coming soon
              </p>
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
              {errors.file && (
                <div class="mt-2 text-sm text-red-600 bg-red-100 p-2 rounded-md">
                  {errors.file}
                </div>
              )}
            </>
          )}
        </div>

        {errors.general && (
          <div class="mt-2 text-sm text-red-600 bg-red-100 p-2 rounded-md">
            {errors.general}
          </div>
        )}

        <div class="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
          <Button
            type="submit"
            variant="primary"
            disabled={!formData.file || enableLocalFiles}
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
    </Modal>
  );
}
