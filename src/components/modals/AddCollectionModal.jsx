import { useState, useEffect, useRef } from 'preact/hooks';
import { useLocation } from 'wouter-preact';
import { useAppContext } from '../../hooks/useAppContext';
import { apiClient } from '../../api';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { TextInput } from '../common/TextInput';

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
          <TextInput
            ref={nameInputRef}
            placeholder="Name of collection"
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
          <Button
            type="submit"
            disabled={isSubmitting}
            variant="primary"
            size="md"
            className="w-full sm:ml-3 sm:w-auto"
          >
            {isSubmitting ? 'Creating...' : 'Create'}
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
