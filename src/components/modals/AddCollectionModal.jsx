import { useState, useEffect, useRef } from 'preact/hooks';
import { useLocation } from 'wouter-preact';
import { useAppContext } from '../../hooks/useAppContext';
import { apiClient } from '../../api';

export function AddCollectionModal({ isOpen, onClose, onSuccess }) {
  const [, setLocation] = useLocation();
  const { collections, loadCollections, selectCollection } = useAppContext();
  const [formData, setFormData] = useState({
    name: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const nameInputRef = useRef();

  // Initialize form data when modal opens
  useEffect(() => {
    if (isOpen) {
      setFormData({ name: '' });
      setError(null);
      
      // Auto-focus on name input (matching Django behavior)
      setTimeout(() => {
        if (nameInputRef.current) {
          nameInputRef.current.focus();
        }
      }, 100);
    }
  }, [isOpen]);

  const handleInputChange = (value) => {
    setFormData({ name: value });
    // Clear error when user starts typing
    if (error) {
      setError(null);
    }
  };

  // Generate auto name like Django does: "Untitled collection", "Untitled collection 2", etc.
  const generateUntitledName = () => {
    let baseName = 'Untitled collection';
    let counter = 0;
    let collectionName = baseName;
    
    while (collections.some(c => c.name.toLowerCase() === collectionName.toLowerCase())) {
      counter++;
      collectionName = `${baseName} ${counter}`;
    }
    
    return collectionName;
  };

  const validateForm = () => {
    // Allow empty name - will auto-generate (matching Django logic)
    if (formData.name.trim() && formData.name.trim().length > 100) {
      setError('Collection name must be 100 characters or less');
      return false;
    }

    // Check for duplicate names
    const collectionName = formData.name.trim() || generateUntitledName();
    
    if (collections.some(c => c.name.toLowerCase() === collectionName.toLowerCase())) {
      setError('A collection with this name already exists');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setIsSubmitting(true);
    setError(null);
    
    try {
      // Handle empty name by auto-generating (matching Django behavior)
      const collectionName = formData.name.trim() || generateUntitledName();
      
      const collectionData = {
        name: collectionName,
        description: ''
      };

      const newCollection = await apiClient.createCollection(collectionData);
      
      // Refresh collections to update sidebar
      await loadCollections();
      
      // Auto-select the new collection and navigate to it (matching Django behavior)
      selectCollection(newCollection);
      setLocation(`/${newCollection.id}`);
      
      if (onSuccess) {
        onSuccess(newCollection);
      }
      
      onClose();
    } catch (error) {
      console.error('Failed to create collection:', error);
      setError('Failed to create collection. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setError(null);
      setFormData({ name: '' });
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

  if (!isOpen) return null;

  return (
    <div class="fixed inset-0 bg-gray-500/75 flex items-center justify-center z-50" onClick={handleClose}>
      <div 
        class="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 sm:max-w-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div class="px-6 py-4 border-b border-gray-200">
          <h2 class="text-lg font-semibold text-gray-900">Add Collection</h2>
          <p class="text-sm text-gray-600 mt-1">Create a new collection to organize your requests</p>
        </div>

        <form onSubmit={handleSubmit} class="px-6 py-4">
          <div class="space-y-4">
            {/* Collection Name */}
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">
                Collection Name
              </label>
              <input
                ref={nameInputRef}
                type="text"
                value={formData.name}
                onChange={(e) => handleInputChange(e.target.value)}
                class={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-1 focus:ring-sky-500 focus:border-sky-500 ${
                  error ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="Name of collection"
                disabled={isSubmitting}
              />
              <p class="text-xs text-gray-500 mt-1">
                Leave empty to auto-generate a name
              </p>
            </div>

            {/* Auto-generation Preview */}
            {!formData.name.trim() && (
              <div class="bg-blue-50 p-3 rounded-md">
                <div class="text-xs text-blue-600 mb-1">Auto-generated name</div>
                <div class="font-medium text-blue-900">{generateUntitledName()}</div>
              </div>
            )}

            {/* Error Display */}
            {error && (
              <div class="text-red-600 text-sm bg-red-50 border border-red-200 rounded p-2">
                {error}
              </div>
            )}
          </div>
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