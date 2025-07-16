import { useState, useEffect, useRef } from 'preact/hooks';
import { useAppContext } from '../../hooks/useAppContext';
import { apiClient } from '../../api';

export function AddFolderModal({ isOpen, onClose, parentFolder = null, onSuccess }) {
  const { selectedCollection, loadCollections } = useAppContext();
  const [formData, setFormData] = useState({
    name: '',
    parent_folder_id: ''
  });
  const [folders, setFolders] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState({});
  const nameInputRef = useRef();

  // Initialize form data when modal opens
  useEffect(() => {
    if (isOpen && selectedCollection) {
      // Set parent folder if provided (for add subfolder)
      setFormData({
        name: '',
        parent_folder_id: parentFolder?.id || ''
      });
      loadFolders();
      
      // Auto-focus on name input (matching Django behavior)
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
    // Clear field error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    // Allow empty name - will auto-generate "Untitled folder" (matching Django logic)
    if (formData.name.trim() && formData.name.trim().length > 100) {
      newErrors.name = 'Folder name must be 100 characters or less';
    }

    // Check for duplicate names in the same parent folder
    const siblingsInSameParent = folders.filter(f => 
      f.parent_folder_id === (formData.parent_folder_id || null)
    );
    
    const folderName = formData.name.trim() || generateUntitledName(siblingsInSameParent);
    
    if (siblingsInSameParent.some(f => f.name.toLowerCase() === folderName.toLowerCase())) {
      newErrors.name = 'A folder with this name already exists in the selected location';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Generate auto name like Django does: "Untitled folder", "Untitled folder 2", etc.
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
      // Handle empty name by auto-generating (matching Django behavior)
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
      setErrors({ submit: 'Failed to create folder. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setErrors({});
      setFormData({ name: '', parent_folder_id: '' });
      onClose();
    }
  };

  // Handle escape key to close modal (matching Django behavior)
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isOpen) {
        handleClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen]);

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

  if (!isOpen || !selectedCollection) return null;

  const folderTree = buildFolderTree();
  const isSubfolder = !!parentFolder;

  return (
    <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={handleClose}>
      <div 
        class="bg-white rounded-lg shadow-xl max-w-md w-full mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div class="px-6 py-4 border-b border-gray-200">
          <h2 class="text-lg font-semibold text-gray-900">
            {isSubfolder ? 'Add Subfolder' : 'Add Folder'}
          </h2>
          <p class="text-sm text-gray-600 mt-1">
            {isSubfolder 
              ? `Create a new subfolder inside "${parentFolder.name}"`
              : 'Create a new folder in this collection'
            }
          </p>
        </div>

        <form onSubmit={handleSubmit} class="px-6 py-4 space-y-4">
          {/* Folder Name */}
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">
              {isSubfolder ? 'Name of subfolder' : 'Name of folder'}
            </label>
            <input
              ref={nameInputRef}
              type="text"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              class={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-1 focus:ring-sky-500 focus:border-sky-500 ${
                errors.name ? 'border-red-300' : 'border-gray-300'
              }`}
              placeholder={isSubfolder ? 'Name of subfolder' : 'Name of folder'}
              disabled={isSubmitting}
            />
            {errors.name && (
              <p class="text-red-600 text-xs mt-1">{errors.name}</p>
            )}
            <p class="text-xs text-gray-500 mt-1">
              Leave empty to auto-generate a name
            </p>
          </div>

          {/* Parent Folder Selection */}
          {!isSubfolder && (
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
                <option value="">No parent folder</option>
                {renderFolderTree(folderTree)}
              </select>
              <p class="text-xs text-gray-500 mt-1">
                Select a parent folder or leave empty for root level
              </p>
            </div>
          )}

          {/* Collection Info */}
          <div class="bg-blue-50 p-3 rounded-md">
            <div class="text-xs text-blue-600 mb-1">Collection</div>
            <div class="font-medium text-blue-900">{selectedCollection.name}</div>
            {isSubfolder && (
              <div class="text-xs text-blue-600 mt-1">
                Parent: {parentFolder.name}
              </div>
            )}
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
            disabled={isSubmitting}
            class="px-4 py-2 text-sm font-medium text-white bg-sky-600 hover:bg-sky-700 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <div class="flex items-center space-x-2">
                <svg class="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <span>Creating...</span>
              </div>
            ) : (
              'Create'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}