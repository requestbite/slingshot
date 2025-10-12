import { useState, useEffect, useRef } from 'preact/hooks';
import { useAppContext } from '../../hooks/useAppContext';
import { apiClient } from '../../api';
import { Modal } from '../common/Modal';

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

  const validateForm = () => {
    if (!formData.name.trim()) {
      setError('Folder name is required');
      return false;
    }

    // Check for duplicate names in the same parent folder
    const siblingsInSameParent = folders.filter(f =>
      f.parent_folder_id === formData.parent_folder_id && f.id !== folder.id
    );

    if (siblingsInSameParent.some(f => f.name.toLowerCase() === formData.name.trim().toLowerCase())) {
      setError('A folder with this name already exists in the selected location');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) return;

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

  const renderFolderOption = (folder) => {
    return (
      <option key={folder.id} value={folder.id}>
        {folder.displayName}
      </option>
    );
  };

  const renderFolderTree = (folderTree) => {
    return folderTree.map(folder => [
      renderFolderOption(folder),
      ...renderFolderTree(folder.children)
    ]).flat();
  };

  const folderTree = buildFolderTree();

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
            <label for="name" class="block text-xs font-medium text-gray-600 mb-1">Folder Name</label>
            <input
              ref={nameInputRef}
              type="text"
              id="name"
              placeholder="Name of folder"
              class="block w-full rounded-md px-3 py-1.5 text-gray-900 outline focus:outline-2 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus:-outline-offset-2 focus:outline-sky-500 text-sm/6"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              disabled={isSubmitting}
              required
            />
          </div>

          <div class="mt-6">
            <label for="parent_folder_id" class="block text-xs font-medium text-gray-600 mb-1">Parent Folder</label>
            <select
              id="parent_folder_id"
              value={formData.parent_folder_id}
              onChange={(e) => handleInputChange('parent_folder_id', e.target.value)}
              class="w-full appearance-none rounded-md bg-white py-2 pl-3 pr-8 text-sm text-gray-900 outline -outline-offset-1 outline-gray-300 focus:outline focus:-outline-offset-2 focus:outline-sky-500"
              disabled={isSubmitting}
            >
              <option value="">No parent folder</option>
              {renderFolderTree(folderTree)}
            </select>
          </div>

          <div class="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
            <button
              type="submit"
              disabled={isSubmitting}
              class="inline-flex w-full justify-center rounded-md bg-sky-500 px-3 py-2 text-sm font-semibold text-white hover:bg-sky-400 disabled:bg-sky-300 disabled:cursor-not-allowed sm:ml-3 sm:w-auto cursor-pointer"
            >
              {isSubmitting ? 'Updating...' : 'Update'}
            </button>
            <button
              type="button"
              onClick={handleClose}
              disabled={isSubmitting}
              class="mt-3 inline-flex w-full justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed sm:mt-0 sm:w-auto cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </div>
      </form>
    </Modal>
  );
}
