import { useState } from 'preact/hooks';
import { apiClient } from '../../api';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';

export function DeleteEnvironmentModal({ isOpen, onClose, environment, onDelete }) {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDeleteEnvironment = async () => {
    if (!environment) return;
    
    setIsDeleting(true);
    try {
      await apiClient.deleteEnvironment(environment.id);
      
      if (onDelete) {
        onDelete(environment);
      }
      
      onClose();
    } catch (error) {
      console.error('Failed to delete environment:', error);
      // Let the parent handle error notifications
    } finally {
      setIsDeleting(false);
    }
  };

  if (!environment) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Delete Environment" size="md">
      <p class="text-sm text-gray-500">
        This will permanently delete the environment "{environment.name}" and all its encrypted secrets. This action cannot be undone. Do you wish to continue?
      </p>
      <div class="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
        <Button
          onClick={handleDeleteEnvironment}
          type="button"
          disabled={isDeleting}
          loading={isDeleting}
          variant="danger"
          size="md"
          className="w-full sm:ml-3 sm:w-auto bg-red-600 hover:bg-red-500 text-white"
        >
          Delete Environment
        </Button>
        <Button
          onClick={onClose}
          type="button"
          disabled={isDeleting}
          variant="secondary"
          size="md"
          className="mt-3 w-full sm:mt-0 sm:w-auto"
        >
          Cancel
        </Button>
      </div>
    </Modal>
  );
}