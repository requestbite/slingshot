import { useState, useEffect } from 'preact/hooks';
import { useLocation } from 'wouter-preact';
import { apiClient } from '../../api';
import { useAppContext } from '../../hooks/useAppContext';
import { Modal } from '../common/Modal';
import { Select } from '../common/Select';
import { Button } from '../common/Button';
import { TextInput } from '../common/TextInput';
import { Label } from '../common/Label';

export function SaveAsModal({ isOpen, onClose, requestData, collection, onSuccess }) {
  const { collections, selectedCollection, selectCollection, loadCollections, refreshCollectionData } = useAppContext();
  const [, setLocation] = useLocation();
  const [name, setName] = useState('');
  const [selectedCollectionId, setSelectedCollectionId] = useState('');
  const [selectedFolderId, setSelectedFolderId] = useState('');
  const [folders, setFolders] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      // Set default collection if one was passed
      if (collection) {
        setSelectedCollectionId(collection.id);
        loadFolders(collection.id);
      }
      // Only set default name when modal first opens, not on every requestData change
      if (name === '') {
        const defaultName = generateDefaultName(requestData);
        setName(defaultName);
      }
    }
  }, [isOpen, collection]);

  // Separate effect to update name only when modal is first opened (not on requestData changes)
  useEffect(() => {
    if (isOpen && name === '') {
      const defaultName = generateDefaultName(requestData);
      setName(defaultName);
    }
  }, [isOpen]);

  const loadFolders = async (collectionId) => {
    if (!collectionId) {
      setFolders([]);
      return;
    }
    try {
      const folderData = await apiClient.getFoldersByCollection(collectionId);
      setFolders(folderData);
    } catch (error) {
      console.error('Failed to load folders:', error);
      setFolders([]);
    }
  };

  const generateDefaultName = (requestData) => {
    // If no URL provided, use default name
    if (!requestData.url || !requestData.url.trim()) {
      return 'Untitled request';
    }
    
    try {
      const url = new URL(requestData.url);
      const path = url.pathname || '/';
      const method = requestData.method || 'GET';
      
      // Extract the last part of the path for a meaningful name
      const pathParts = path.split('/').filter(Boolean);
      const lastPart = pathParts.length > 0 ? pathParts[pathParts.length - 1] : 'root';
      
      return `${method} ${lastPart}`;
    } catch (error) {
      // If URL is invalid, use method + simplified URL or fallback
      const method = requestData.method || 'GET';
      
      if (requestData.url.trim()) {
        const urlPart = requestData.url.split('/').pop() || 'request';
        return `${method} ${urlPart}`;
      }
      
      return 'Untitled request';
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!name.trim()) {
      setError('Request name is required');
      return;
    }

    if (!selectedCollectionId) {
      setError('Please select a collection');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      // Convert request data to the format expected by apiClient
      const requestToSave = {
        name: name.trim(),
        collection_id: selectedCollectionId,
        folder_id: selectedFolderId || null,
        method: requestData.method || 'GET',
        url: requestData.url || '',  // Allow empty URL
        headers: requestData.headers || [],
        params: requestData.queryParams || [],
        path_params: requestData.pathParams || [],
        request_type: requestData.bodyType || 'none',
        content_type: requestData.contentType || '',  // Allow empty content type
        body: requestData.bodyContent || '',
        form_data: requestData.formData || [],
        url_encoded_data: requestData.urlEncodedData || []
      };

      const savedRequest = await apiClient.createRequest(requestToSave);
      
      // Refresh the sidebar to show the new request
      refreshCollectionData();
      
      // If the user selected a different collection than the currently active one, redirect to it
      if (selectedCollectionId !== selectedCollection?.id) {
        const targetCollection = collections.find(c => c.id === selectedCollectionId);
        if (targetCollection) {
          selectCollection(targetCollection);
          setLocation(`/${selectedCollectionId}`);
        }
      }
      
      if (onSuccess) {
        onSuccess(savedRequest);
      }
      
      onClose();
    } catch (error) {
      console.error('Failed to save request:', error);
      setError('Failed to save request. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    // Reset state when modal closes
    setName('');
    setSelectedCollectionId('');
    setSelectedFolderId('');
    setFolders([]);
    setError('');
    setIsLoading(false);
    onClose();
  };

  // Build folder tree for display with sorting and hierarchical names
  const buildFolderTree = (parentId = null, level = 0, parentPath = '') => {
    return folders
      .filter(f => f.parent_folder_id === parentId)
      .sort((a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase()))
      .map(f => {
        const currentPath = parentPath ? `${parentPath} / ${f.name}` : f.name;
        return {
          ...f,
          level,
          displayName: currentPath,
          children: buildFolderTree(f.id, level + 1, currentPath)
        };
      });
  };

  // Flatten folder tree into array of options for Select component
  const flattenFolderTree = (folderTree) => {
    return folderTree.flatMap(folder => [
      { value: folder.id, label: folder.displayName },
      ...flattenFolderTree(folder.children)
    ]);
  };

  const collectionOptions = collections.map(col => ({
    value: col.id,
    label: col.name
  }));

  const folderOptions = flattenFolderTree(buildFolderTree());

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Save Request" size="md">
      <form onSubmit={handleSubmit}>
        <div>
          <div class="text-sm text-gray-500">
            Save a new request to a collection.
          </div>

          {error && (
            <div class="mt-2 text-sm text-red-600 bg-red-100 p-2 rounded-md">
              {error}
            </div>
          )}

          <div class="mt-6">
            <Label htmlFor="request-name">
              Request Name
            </Label>
            <TextInput
              id="request-name"
              value={name}
              onInput={(e) => setName(e.target.value)}
              placeholder="Name of request"
              disabled={isLoading}
              required
            />
          </div>

          <div class="mt-6">
            <Label htmlFor="collection-select">
              Collection
            </Label>
            <Select
              value={selectedCollectionId}
              onChange={(collectionId) => {
                setSelectedCollectionId(collectionId);
                setSelectedFolderId(''); // Reset folder selection
                loadFolders(collectionId);
              }}
              options={collectionOptions}
              placeholder="Select a collection"
              disabled={isLoading}
            />
            {!selectedCollectionId && error && (
              <div class="mt-1 text-xs text-red-600">
                Please select a collection
              </div>
            )}
          </div>

          <div class="mt-6">
            <Label htmlFor="folder-select">
              Folder
            </Label>
            <Select
              value={selectedFolderId}
              onChange={(folderId) => setSelectedFolderId(folderId)}
              options={folderOptions}
              placeholder="No folder"
              disabled={isLoading}
            />
          </div>

          {/* Action buttons */}
          <div class="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
            <Button
              type="submit"
              disabled={isLoading || !name.trim() || !selectedCollectionId}
              loading={isLoading}
              variant="primary"
              size="md"
              className="w-full sm:ml-3 sm:w-auto"
            >
              Save
            </Button>
            <Button
              type="button"
              onClick={handleClose}
              disabled={isLoading}
              variant="secondary"
              size="md"
              className="mt-3 w-full sm:mt-0 sm:w-auto"
            >
              Cancel
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  );
}