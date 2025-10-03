import { useState, useEffect, useRef } from 'preact/hooks';
import { useLocation } from 'wouter-preact';
import { useAppContext } from '../../hooks/useAppContext';
import { apiClient } from '../../api';
import { Modal } from '../common/Modal';

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

      // Auto-focus on name input
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

  // Generate auto name: "Untitled collection", "Untitled collection 2", etc.
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
    // Allow empty name - will auto-generate
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
      // Handle empty name by auto-generating
      const collectionName = formData.name.trim() || generateUntitledName();

      const collectionData = {
        name: collectionName,
        description: ''
      };

      const newCollection = await apiClient.createCollection(collectionData);

      // Refresh collections to update sidebar
      await loadCollections();

      // Auto-select the new collection and navigate to it
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

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Add Collection" size="md">
      <div class="text-sm text-gray-500">Create a new collection.</div>

      <form onSubmit={handleSubmit}>
        <div class="mt-6">
          <input
            ref={nameInputRef}
            type="text"
            placeholder="Name of collection"
            class="block w-full rounded-md px-3 py-1.5 text-gray-900 outline focus:outline-2 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus:-outline-offset-2 focus:outline-sky-500 text-sm/6"
            value={formData.name}
            onChange={(e) => handleInputChange(e.target.value)}
            disabled={isSubmitting}
          />
        </div>

        {error && (
          <div class="mt-2 text-sm text-red-600 bg-red-100 p-2 rounded-md">
            {error}
          </div>
        )}

        <div class="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
          <button
            type="submit"
            disabled={isSubmitting}
            class="inline-flex w-full justify-center rounded-md bg-sky-500 px-3 py-2 text-sm font-semibold text-white hover:bg-sky-400 disabled:bg-sky-300 disabled:cursor-not-allowed sm:ml-3 sm:w-auto cursor-pointer"
          >
            {isSubmitting ? 'Creating...' : 'Create'}
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
      </form>
    </Modal>
  );
}
