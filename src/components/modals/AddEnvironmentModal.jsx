import { useState, useEffect, useRef } from 'preact/hooks';
import { apiClient } from '../../api';
import { Portal } from '../common/Portal';

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

      // Lock body scroll and hide scrollbars to prevent background scrolling
      const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
      document.body.style.overflow = 'hidden';
      document.body.style.paddingRight = `${scrollbarWidth}px`;

      // Auto-focus on name input
      setTimeout(() => {
        if (nameInputRef.current) {
          nameInputRef.current.focus();
        }
      }, 100);
    } else {
      // Restore body scroll
      document.body.style.overflow = '';
      document.body.style.paddingRight = '';
    }

    return () => {
      // Cleanup on unmount
      document.body.style.overflow = '';
      document.body.style.paddingRight = '';
    };
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

  // Handle escape key to close modal
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isOpen) {
        e.preventDefault();
        e.stopPropagation();
        handleClose();
      }
    };

    // Handle escape on input fields directly to bypass browser blur behavior
    const handleInputEscape = (e) => {
      if (e.key === 'Escape' && isOpen) {
        e.preventDefault();
        e.stopPropagation();
        handleClose();
      }
    };

    if (isOpen) {
      // Use keyup to fire after input blur completes
      document.addEventListener('keyup', handleEscape, true);

      // Also add direct listeners to input fields to catch escape before blur
      const inputs = document.querySelectorAll('input, select, textarea');
      inputs.forEach(input => {
        input.addEventListener('keydown', handleInputEscape, true);
      });

      return () => {
        document.removeEventListener('keyup', handleEscape, true);
        inputs.forEach(input => {
          input.removeEventListener('keydown', handleInputEscape, true);
        });
      };
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <Portal>
      <div class="relative z-[80]" role="dialog" aria-modal="true" style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 9999,
        WebkitBackfaceVisibility: 'hidden',
        backfaceVisibility: 'hidden',
        WebkitTransform: 'translate3d(0,0,0)',
        transform: 'translate3d(0,0,0)'
      }}>
        <div class="fixed inset-0 bg-gray-500/75 transition-opacity" aria-hidden="true" style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 9998
        }}></div>
        <div class="fixed inset-0 z-[80] w-screen overflow-y-auto" style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 9999,
          WebkitOverflowScrolling: 'touch'
        }}>
          <div class="flex min-h-full items-center justify-center p-4 text-center sm:items-center sm:p-0">
            <div
              class="relative transform overflow-hidden rounded-lg bg-white px-4 pb-4 pt-5 text-left shadow-xl transition-all sm:my-8 w-full sm:max-w-lg sm:p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <div>
                <div class="absolute right-0 top-0 hidden pr-4 pt-4 sm:block">
                  <button
                    onClick={handleClose}
                    type="button"
                    class="rounded-md bg-white text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 cursor-pointer"
                    disabled={isSubmitting}
                  >
                    <span class="sr-only">Close</span>
                    <svg class="size-6" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" aria-hidden="true">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <form onSubmit={handleSubmit}>
                  <div class="text-center mt-0 sm:text-left">
                    <h3 class="text-base font-semibold text-gray-900">Add Environment</h3>
                    <div class="mt-2 text-sm text-gray-500">Create a new environment for your encrypted secrets.</div>

                    <div class="mt-6">
                      <input
                        ref={nameInputRef}
                        type="text"
                        placeholder="Name of environment"
                        class="block w-full rounded-md px-3 py-1.5 text-gray-900 outline focus:outline-2 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus:-outline-offset-2 focus:outline-sky-500 text-sm/6"
                        value={formData.name}
                        onChange={(e) => handleInputChange('name', e.target.value)}
                        disabled={isSubmitting}
                      />
                    </div>

                    <div class="mt-4">
                      <textarea
                        placeholder="Description (optional)"
                        rows="3"
                        class="block w-full rounded-md px-3 py-1.5 text-gray-900 outline focus:outline-2 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus:-outline-offset-2 focus:outline-sky-500 text-sm/6"
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
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Portal>
  );
}