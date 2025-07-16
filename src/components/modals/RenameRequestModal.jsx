import { useState, useEffect } from 'preact/hooks';
import { useAppContext } from '../../hooks/useAppContext';
import { apiClient } from '../../api';

export function RenameRequestModal({ isOpen, onClose, request, onUpdate }) {
  const { selectedCollection } = useAppContext();
  const [formData, setFormData] = useState({
    name: '',
    folder_id: ''
  });
  const [folders, setFolders] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState({});

  // Initialize form data when modal opens
  useEffect(() => {
    if (isOpen && request) {
      setFormData({
        name: request.name,
        folder_id: request.folder_id || ''
      });
      loadFolders();
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
    // Clear field error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
    }
  };

  const validateForm = async () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Request name is required';
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
        newErrors.name = 'A request with this name already exists in the selected folder';
      }
    } catch (error) {
      console.error('Error checking for duplicates:', error);
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
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
      setErrors({ submit: 'Failed to update request. Please try again.' });
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
          <h2 class="text-lg font-semibold text-gray-900">Rename / Move Request</h2>
          <p class="text-sm text-gray-600 mt-1">Update the request name and folder location</p>
        </div>

        <form onSubmit={handleSubmit} class="px-6 py-4 space-y-4">
          {/* Request Name */}
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">
              Request Name *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              class={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-1 focus:ring-sky-500 focus:border-sky-500 ${
                errors.name ? 'border-red-300' : 'border-gray-300'
              }`}
              placeholder="Enter request name"
              disabled={isSubmitting}
            />
            {errors.name && (
              <p class="text-red-600 text-xs mt-1">{errors.name}</p>
            )}
          </div>

          {/* Folder Selection */}
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">
              Folder
            </label>
            <select
              value={formData.folder_id}
              onChange={(e) => handleInputChange('folder_id', e.target.value)}
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-sky-500 focus:border-sky-500"
              disabled={isSubmitting}
            >
              <option value="">Root (No folder)</option>
              {renderFolderTree(folderTree)}
            </select>
            <p class="text-xs text-gray-500 mt-1">
              Select which folder to move this request to
            </p>
          </div>

          {/* Request Details */}
          <div class="bg-gray-50 p-3 rounded-md">
            <div class="text-xs text-gray-500 mb-1">Request Details</div>
            <div class="flex items-center space-x-2">
              <span class="text-xs font-medium px-2 py-1 rounded bg-blue-100 text-blue-800">
                {request?.method || 'GET'}
              </span>
              <span class="text-sm text-gray-700 truncate">
                {request?.url || 'No URL'}
              </span>
            </div>
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
            {isSubmitting ? 'Updating...' : 'Update Request'}
          </button>
        </div>
      </div>
    </div>
  );
}