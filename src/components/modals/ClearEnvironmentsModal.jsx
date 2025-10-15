import { useState, useEffect } from 'preact/hooks';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';

export function ClearEnvironmentsModal({ isOpen, onClose, onClear }) {
  const [isClearing, setIsClearing] = useState(false);

  // Initialize form when modal opens
  useEffect(() => {
    if (isOpen) {
      setIsClearing(false);
    }
  }, [isOpen]);

  const handleClear = async () => {
    setIsClearing(true);
    try {
      await onClear();
      onClose();
    } catch (error) {
      console.error('Failed to clear environments:', error);
    } finally {
      setIsClearing(false);
    }
  };

  const handleClose = () => {
    if (!isClearing) {
      onClose();
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Clear environments?" size="lg">
      <div class="mt-2">
        <p class="text-sm text-gray-500">
          If you don't remember your password, it's not possible to decrypt your environments. To continue, you can clear all your environments, meaning you have to start over creating any necessary credentials that you want to use in Slingshot.
        </p>
        <p class="text-sm text-gray-500 mt-2">
          Please note that this action is not possible to undo.
        </p>
      </div>
      <div class="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
        <Button
          onClick={handleClear}
          type="button"
          disabled={isClearing}
          loading={isClearing}
          variant="danger"
          className="w-full sm:ml-3 sm:w-auto bg-red-600 hover:bg-red-500 text-white"
        >
          Clear
        </Button>
        <Button
          onClick={handleClose}
          type="button"
          disabled={isClearing}
          variant="secondary"
          className="mt-3 w-full sm:mt-0 sm:w-auto"
        >
          Cancel
        </Button>
      </div>
    </Modal>
  );
}