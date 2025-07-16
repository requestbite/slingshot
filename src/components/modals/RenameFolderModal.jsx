import { useState, useEffect } from 'preact/hooks';
import { useAppContext } from '../../hooks/useAppContext';
import { apiClient } from '../../api';

export function RenameFolderModal({ isOpen, onClose, folder, onUpdate }) {
  const { selectedCollection, collections } = useAppContext();
  const [formData, setFormData] = useState({
    name: '',
    collection_id: '',
    parent_folder_id: ''
  });
  const [folders, setFolders] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState({});

  // Initialize form data when modal opens
  useEffect(() => {
    if (isOpen && folder) {
      setFormData({
        name: folder.name,
        collection_id: folder.collection_id,
        parent_folder_id: folder.parent_folder_id || ''
      });
      loadFolders();
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
    // Clear field error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Folder name is required';
    }

    // Check for duplicate names in the same parent folder
    const siblingsInSameParent = folders.filter(f => 
      f.parent_folder_id === formData.parent_folder_id && f.id !== folder.id
    );
    
    if (siblingsInSameParent.some(f => f.name.toLowerCase() === formData.name.trim().toLowerCase())) {
      newErrors.name = 'A folder with this name already exists in the selected location';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
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
      setErrors({ submit: 'Failed to update folder. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setErrors({});
      onClose();
    }
  };

  // Build folder tree for display
  const buildFolderTree = (parentId = null, level = 0) => {
    return folders
      .filter(f => f.parent_folder_id === parentId)
      .map(f => ({
        ...f,
        level,
        children: buildFolderTree(f.id, level + 1)
      }));
  };

  const renderFolderOption = (folder, level = 0) => {
    const indent = '  '.repeat(level);
    return (
      <option key={folder.id} value={folder.id}>
        {indent}{folder.name}
      </option>
    );
  };

  const renderFolderTree = (folderTree) => {
    return folderTree.map(folder => [
      renderFolderOption(folder, folder.level),
      ...renderFolderTree(folder.children)
    ]).flat();
  };

  if (!isOpen) return null;

  const folderTree = buildFolderTree();

  return (
    <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={handleClose}>
      <div 
        class="bg-white rounded-lg shadow-xl max-w-md w-full mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div class="px-6 py-4 border-b border-gray-200">
          <h2 class="text-lg font-semibold text-gray-900">Rename / Move Folder</h2>
          <p class="text-sm text-gray-600 mt-1">Update the folder name and location</p>
        </div>

        <form onSubmit={handleSubmit} class="px-6 py-4 space-y-4">
          {/* Folder Name */}
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">
              Folder Name *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              class={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-1 focus:ring-sky-500 focus:border-sky-500 ${
                errors.name ? 'border-red-300' : 'border-gray-300'
              }`}
              placeholder="Enter folder name"
              disabled={isSubmitting}
            />
            {errors.name && (
              <p class="text-red-600 text-xs mt-1">{errors.name}</p>
            )}
          </div>

          {/* Parent Folder */}
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">
              Parent Folder
            </label>
            <select
              value={formData.parent_folder_id}
              onChange={(e) => handleInputChange('parent_folder_id', e.target.value)}
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-sky-500 focus:border-sky-500"
              disabled={isSubmitting}
            >
              <option value="">Root (No parent folder)</option>
              {renderFolderTree(folderTree)}
            </select>
            <p class="text-xs text-gray-500 mt-1">
              Select where to move this folder
            </p>
          </div>

          {errors.submit && (
            <div class="text-red-600 text-sm">{errors.submit}</div>
          )}
        </form>

        <div class="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
          <button
            type="button"
            onClick={handleClose}
            disabled={isSubmitting}
            class="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            onClick={handleSubmit}
            disabled={isSubmitting || !formData.name.trim()}
            class="px-4 py-2 text-sm font-medium text-white bg-sky-600 hover:bg-sky-700 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Updating...' : 'Update Folder'}
          </button>
        </div>
      </div>
    </div>
  );
}