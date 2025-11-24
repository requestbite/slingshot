import { useState, useEffect, useRef } from 'preact/hooks';
import { useAppContext } from '../../hooks/useAppContext';
import { apiClient } from '../../api';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { TextInput } from '../common/TextInput';
import { Label } from '../common/Label';
import { Select } from '../common/Select';

export function RenameRequestModal({ isOpen, onClose, request, onUpdate }) {
  const { selectedCollection } = useAppContext();
  const [formData, setFormData] = useState({
    name: '',
    folder_id: ''
  });
  const [folders, setFolders] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const nameInputRef = useRef();

  // Initialize form data when modal opens
  useEffect(() => {
    if (isOpen && request) {
      setFormData({
        name: request.name,
        folder_id: request.folder_id || ''
      });
      setError(null);
      loadFolders();

      // Auto-focus on name input
      setTimeout(() => {
        if (nameInputRef.current) {
          nameInputRef.current.focus();
        }
      }, 100);
    }
  }, [isOpen, request]);

  const loadFolders = async () => {
    try {
      const allFolders = await apiClient.getFoldersByCollection(request.collection_id);
      setFolders(allFolders);
    } catch (error) {
      console.error('Failed to load folders:', error);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (error) {
      setError(null);
    }
  };

  const validateForm = async () => {
    if (!formData.name.trim()) {
      setError('Request name is required');
      return false;
    }

    // Check for duplicate names in the same folder
    try {
      const requestsInSameFolder = formData.folder_id
        ? await apiClient.getRequestsByFolder(formData.folder_id)
        : await apiClient.getRequestsByCollection(request.collection_id).then(requests =>
          requests.filter(r => !r.folder_id)
        );

      const duplicateRequest = requestsInSameFolder.find(r =>
        r.id !== request.id &&
        r.name.toLowerCase() === formData.name.trim().toLowerCase()
      );

      if (duplicateRequest) {
        setError('A request with this name already exists in the selected folder');
        return false;
      }
    } catch (error) {
      console.error('Error checking for duplicates:', error);
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const isValid = await validateForm();
    if (!isValid) return;

    setIsSubmitting(true);

    try {
      const updates = {
        name: formData.name.trim(),
        folder_id: formData.folder_id || null
      };

      const updatedRequest = await apiClient.updateRequest(request.id, updates);

      if (onUpdate) {
        onUpdate(updatedRequest);
      }

      onClose();
    } catch (error) {
      console.error('Failed to update request:', error);
      setError('Failed to update request. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setError(null);
      onClose();
    }
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

  const flattenFolderTree = (folderTree) => {
    return folderTree.flatMap(folder => [
      { value: folder.id, label: folder.displayName },
      ...flattenFolderTree(folder.children)
    ]);
  };

  const folderTree = buildFolderTree();
  const folderOptions = [
    { value: '', label: 'Root folder' },
    ...flattenFolderTree(folderTree)
  ];

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Update Request" size="md">
      <form onSubmit={handleSubmit}>
        <div>
          <div class="text-sm text-gray-500">Update name and folder for this request.</div>

          {error && (
            <div class="mt-2 text-sm text-red-600 bg-red-100 p-2 rounded-md">
              {error}
            </div>
          )}

          <div class="mt-6">
            <Label htmlFor="name">Request Name</Label>
            <TextInput
              ref={nameInputRef}
              id="name"
              placeholder="Name of request"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              disabled={isSubmitting}
              required
            />
          </div>

          <div class="mt-6">
            <Label htmlFor="folder_id">Folder</Label>
            <Select
              id="folder_id"
              value={formData.folder_id}
              onChange={(value) => handleInputChange('folder_id', value)}
              options={folderOptions}
              disabled={isSubmitting}
              placeholder="Select a folder"
            />
          </div>

          <div class="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
            <Button
              type="submit"
              disabled={isSubmitting}
              loading={isSubmitting}
              variant="primary"
              size="md"
              className="w-full sm:ml-3 sm:w-auto"
            >
              Update
            </Button>
            <Button
              type="button"
              onClick={handleClose}
              disabled={isSubmitting}
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
