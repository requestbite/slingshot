import { useState, useEffect, useRef } from 'preact/hooks';
import { useAppContext } from '../../hooks/useAppContext';
import { apiClient } from '../../api';
import { Modal } from '../common/Modal';
import { Select } from '../common/Select';
import { Button } from '../common/Button';

export function AddFolderModal({ isOpen, onClose, parentFolder = null, onSuccess }) {
  const { selectedCollection, loadCollections } = useAppContext();
  const [formData, setFormData] = useState({
    name: '',
    parent_folder_id: ''
  });
  const [folders, setFolders] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const nameInputRef = useRef();

  // Initialize form data when modal opens
  useEffect(() => {
    if (isOpen && selectedCollection) {
      // Set parent folder if provided (for add subfolder)
      setFormData({
        name: '',
        parent_folder_id: parentFolder?.id || ''
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
  }, [isOpen, selectedCollection, parentFolder]);

  const loadFolders = async () => {
    if (!selectedCollection) return;

    try {
      const allFolders = await apiClient.getFoldersByCollection(selectedCollection.id);
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

  const validateForm = () => {
    // Allow empty name - will auto-generate "Untitled folder"
    if (formData.name.trim() && formData.name.trim().length > 100) {
      setError('Folder name must be 100 characters or less');
      return false;
    }

    // Check for duplicate names in the same parent folder
    const siblingsInSameParent = folders.filter(f =>
      f.parent_folder_id === (formData.parent_folder_id || null)
    );

    const folderName = formData.name.trim() || generateUntitledName(siblingsInSameParent);

    if (siblingsInSameParent.some(f => f.name.toLowerCase() === folderName.toLowerCase())) {
      setError('A folder with this name already exists in the selected location');
      return false;
    }

    return true;
  };

  // Generate auto name: "Untitled folder", "Untitled folder 2", etc.
  const generateUntitledName = (existingFolders) => {
    let baseName = 'Untitled folder';
    let counter = 0;
    let folderName = baseName;

    while (existingFolders.some(f => f.name.toLowerCase() === folderName.toLowerCase())) {
      counter++;
      folderName = `${baseName} ${counter}`;
    }

    return folderName;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsSubmitting(true);

    try {
      // Handle empty name by auto-generating
      const siblingsInSameParent = folders.filter(f =>
        f.parent_folder_id === (formData.parent_folder_id || null)
      );

      const folderName = formData.name.trim() || generateUntitledName(siblingsInSameParent);

      const folderData = {
        name: folderName,
        collection_id: selectedCollection.id,
        parent_folder_id: formData.parent_folder_id || null
      };

      const newFolder = await apiClient.createFolder(folderData);

      // Refresh collections to update sidebar
      await loadCollections();

      if (onSuccess) {
        onSuccess(newFolder);
      }

      onClose();
    } catch (error) {
      console.error('Failed to create folder:', error);
      setError('Failed to create folder. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setError(null);
      setFormData({ name: '', parent_folder_id: '' });
      onClose();
    }
  };

  // Build folder tree for display with sorting
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
    return folderTree.map(folder => [
      { value: folder.id, label: folder.displayName },
      ...flattenFolderTree(folder.children)
    ]).flat();
  };

  if (!selectedCollection) return null;

  const folderTree = buildFolderTree();
  const folderOptions = [
    { value: '', label: 'No parent folder' },
    ...flattenFolderTree(folderTree)
  ];

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Add Folder" size="md">
      <div class="text-sm text-gray-500">Create a new folder in this collection.</div>

      {error && (
        <div class="mt-2 text-sm text-red-600 bg-red-100 p-2 rounded-md">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div class="mt-6">
          <input
            ref={nameInputRef}
            type="text"
            placeholder="Name of folder"
            class="block w-full rounded-md px-3 py-1.5 text-gray-900 outline focus:outline-2 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus:-outline-offset-2 focus:outline-sky-500 text-sm/6"
            value={formData.name}
            onChange={(e) => handleInputChange('name', e.target.value)}
            disabled={isSubmitting}
          />
        </div>

        <div class="mt-6">
          <label for="parent-folder" class="block text-xs font-medium text-gray-600 mb-1">Parent Folder</label>
          <Select
            value={formData.parent_folder_id}
            onChange={(value) => handleInputChange('parent_folder_id', value)}
            options={folderOptions}
            disabled={isSubmitting || !!parentFolder}
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
            Create
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
      </form>
    </Modal>
  );
}
