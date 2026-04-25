import { useState, useEffect, useRef } from 'preact/hooks';
import { apiClient } from '../../api';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { TextInput } from '../common/TextInput';

export function AddEnvironmentModal({ isOpen, onClose, onSuccess }) {
  const [environments, setEnvironments] = useState([]);
  const [formData, setFormData] = useState({
    name: '',
    description: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const nameInputRef = useRef();

  // Load environments when modal opens
  useEffect(() => {
    if (isOpen) {
      loadEnvironments();
    }
  }, [isOpen]);

  const loadEnvironments = async () => {
    try {
      const allEnvironments = await apiClient.getAllEnvironments();
      setEnvironments(allEnvironments);
    } catch (error) {
      console.error('Failed to load environments:', error);
    }
  };

  // Initialize form data when modal opens
  useEffect(() => {
    if (isOpen) {
      setFormData({ name: '', description: '' });
      setError(null);

      // Auto-focus on name input
      setTimeout(() => {
        if (nameInputRef.current) {
          nameInputRef.current.focus();
        }
      }, 100);
    }
  }, [isOpen]);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (error) {
      setError(null);
    }
  };

  // Generate auto name: "Untitled environment", "Untitled environment 2", etc.
  const generateUntitledName = () => {
    let baseName = 'Untitled environment';
    let counter = 0;
    let environmentName = baseName;

    while (environments.some(e => e.name.toLowerCase() === environmentName.toLowerCase())) {
      counter++;
      environmentName = `${baseName} ${counter}`;
    }

    return environmentName;
  };

  const validateForm = () => {
    // Allow empty name - will auto-generate
    if (formData.name.trim() && formData.name.trim().length > 100) {
      setError('Environment name must be 100 characters or less');
      return false;
    }

    if (formData.description.trim() && formData.description.trim().length > 500) {
      setError('Environment description must be 500 characters or less');
      return false;
    }

    // Check for duplicate names
    const environmentName = formData.name.trim() || generateUntitledName();

    if (environments.some(e => e.name.toLowerCase() === environmentName.toLowerCase())) {
      setError('An environment with this name already exists');
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
      const environmentName = formData.name.trim() || generateUntitledName();

      const environmentData = {
        name: environmentName,
        description: formData.description.trim()
      };

      const newEnvironment = await apiClient.createEnvironment(environmentData);

      if (onSuccess) {
        onSuccess(newEnvironment);
      }

      onClose();
    } catch (error) {
      console.error('Failed to create environment:', error);
      setError('Failed to create environment. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setError(null);
      setFormData({ name: '', description: '' });
      onClose();
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Add Environment" size="md">
      <div class="text-sm text-gray-500 dark:text-neutral-dark-500">Create a new environment for your encrypted secrets.</div>

      <form onSubmit={handleSubmit}>
        <div class="mt-6">
          <TextInput
            ref={nameInputRef}
            placeholder="Name of environment"
            value={formData.name}
            onChange={(e) => handleInputChange('name', e.target.value)}
            disabled={isSubmitting}
          />
        </div>

        <div class="mt-4">
          <textarea
            placeholder="Description (optional)"
            rows="3"
            class="block w-full rounded-md px-3 py-1.5 text-gray-900 dark:text-neutral-dark-900 bg-white dark:bg-[#313340] outline focus:outline-2 -outline-offset-1 outline-gray-300 dark:outline-neutral-dark-50 placeholder:text-gray-400 dark:placeholder:text-neutral-dark-400 focus:-outline-offset-2 focus:outline-sky-500 text-sm/6"
            value={formData.description}
            onChange={(e) => handleInputChange('description', e.target.value)}
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