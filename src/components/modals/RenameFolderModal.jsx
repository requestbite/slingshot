import { useState, useEffect, useRef } from 'preact/hooks';
import { useAppContext } from '../../hooks/useAppContext';
import { apiClient } from '../../api';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { TextInput } from '../common/TextInput';
import { Label } from '../common/Label';
import { Select } from '../common/Select';

export function RenameFolderModal({ isOpen, onClose, folder, onUpdate }) {
  const { selectedCollection, collections } = useAppContext();
  const [formData, setFormData] = useState({
    name: '',
    collection_id: '',
    parent_folder_id: ''
  });
  const [folders, setFolders] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const nameInputRef = useRef();

  // Initialize form data when modal opens
  useEffect(() => {
    if (isOpen && folder) {
      setFormData({
        name: folder.name,
        collection_id: folder.collection_id,
        parent_folder_id: folder.parent_folder_id || ''
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
  }, [isOpen, folder]);

  const loadFolders = async () => {
    try {
      const allFolders = await apiClient.getFoldersByCollection(folder.collection_id);
      // Filter out the current folder and its descendants to prevent circular references
      const validFolders = allFolders.filter(f => !isDescendantOf(f.id, folder.id, allFolders));
      setFolders(validFolders);
    } catch (error) {
      console.error('Failed to load folders:', error);
    }
  };

  // Check if a folder is a descendant of another folder
  const isDescendantOf = (folderId, ancestorId, allFolders) => {
    if (folderId === ancestorId) return true;

    const folderObj = allFolders.find(f => f.id === folderId);
    if (!folderObj || !folderObj.parent_folder_id) return false;

    return isDescendantOf(folderObj.parent_folder_id, ancestorId, allFolders);
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
      setError('Folder name is required');
      return false;
    }

    // Normalize parent_folder_id: empty string should be treated as null for comparison
    const targetParentId = formData.parent_folder_id || null;

    // Check for duplicate names in the same parent folder
    // We need to check against ALL folders in the collection, not just the filtered list,
    // because we need to validate against root folders too
    try {
      const allFolders = await apiClient.getFoldersByCollection(folder.collection_id);
      const siblingsInSameParent = allFolders.filter(f => {
        // Normalize the comparison folder's parent_folder_id too
        const fParentId = f.parent_folder_id || null;
        return fParentId === targetParentId && f.id !== folder.id;
      });

      if (siblingsInSameParent.some(f => f.name.toLowerCase() === formData.name.trim().toLowerCase())) {
        setError('A folder with this name already exists in the selected location');
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
        parent_folder_id: formData.parent_folder_id || null
      };

      const updatedFolder = await apiClient.updateFolder(folder.id, updates);

      if (onUpdate) {
        onUpdate(updatedFolder);
      }

      onClose();
    } catch (error) {
      console.error('Failed to update folder:', error);
      setError('Failed to update folder. Please try again.');
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
  const flattenedFolders = flattenFolderTree(folderTree);

  // Only show "Root folder" option if the current folder has a parent (is in a subfolder)
  // This prevents moving root folders to root again (which would be a no-op)
  const folderOptions = folder && folder.parent_folder_id
    ? [{ value: '', label: 'Root folder' }, ...flattenedFolders]
    : flattenedFolders;

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Update Folder" size="md">
      <form onSubmit={handleSubmit}>
        <div>
          <div class="text-sm text-gray-500">Update name and parent folder.</div>

          {error && (
            <div class="mt-2 text-sm text-red-600 bg-red-100 p-2 rounded-md">
              {error}
            </div>
          )}

          <div class="mt-6">
            <Label htmlFor="name">Folder Name</Label>
            <TextInput
              ref={nameInputRef}
              id="name"
              placeholder="Name of folder"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              disabled={isSubmitting}
              required
            />
          </div>

          <div class="mt-6">
            <Label htmlFor="parent_folder_id">Parent Folder</Label>
            <Select
              id="parent_folder_id"
              value={formData.parent_folder_id}
              onChange={(value) => handleInputChange('parent_folder_id', value)}
              options={folderOptions}
              disabled={isSubmitting}
              placeholder={folder && folder.parent_folder_id ? "Select a parent folder" : "No parent folder"}
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
