import { useState, useEffect, useRef } from 'preact/hooks';
import { Modal } from '../common/Modal';
import { Label } from '../common/Label';
import { Button } from '../common/Button';
import { TextInput } from '../common/TextInput';
import { setupEncryptionKey, verifyPassword, base64ToBytes } from '../../utils/encryption';

export function AppEncryptionKeyModal({ isOpen, onClose, onSuccess, environmentCount, secretCount, onForgotPassword }) {
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const passwordInputRef = useRef();

  // Initialize form when modal opens
  useEffect(() => {
    if (isOpen) {
      setPassword('');
      setError(null);
      setIsSubmitting(false);

      // Auto-focus on password input
      setTimeout(() => {
        if (passwordInputRef.current) {
          passwordInputRef.current.focus();
        }
      }, 100);
    }
  }, [isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!password.trim()) {
      setError('Password is required');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      // First verify the password using the encrypted reference
      const isValidPassword = await verifyPassword(password);
      if (!isValidPassword) {
        setError('Invalid password. Please try again.');
        setIsSubmitting(false);
        return;
      }

      // Get the stored salt from the encrypted reference
      const storedReference = localStorage.getItem('encrypted-reference');
      if (!storedReference) {
        setError('No encryption reference found. Please set up encryption again.');
        setIsSubmitting(false);
        return;
      }

      const { salt } = JSON.parse(storedReference);
      const saltBytes = base64ToBytes(salt);

      // If password is valid, set up the encryption key using the stored salt
      await setupEncryptionKey(password, saltBytes);

      if (onSuccess) {
        onSuccess();
      }

      onClose();
    } catch (error) {
      console.error('Failed to setup encryption key:', error);
      setError('Invalid password. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setError(null);
      setPassword('');
      onClose();
    }
  };

  const handleForgotPasswordClick = (e) => {
    e.preventDefault();
    if (onForgotPassword) {
      onForgotPassword();
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Encryption key" size="md">
      <form onSubmit={handleSubmit}>
        <div class="text-sm text-gray-500">
          You have {environmentCount} environment{environmentCount !== 1 ? 's' : ''} with a total of {secretCount} secret{secretCount !== 1 ? 's' : ''}. To decrypt these secrets, and create new, you must provide your environment password below.
        </div>

        <div class="mt-6">
          <Label htmlFor="app-password">Password</Label>
          <TextInput
            ref={passwordInputRef}
            id="app-password"
            type="password"
            placeholder="Enter your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={isSubmitting}
            required
          />
          {error && (
            <div class="mt-2 text-sm text-red-600 bg-red-100 p-2 rounded-md">
              {error}
            </div>
          )}
        </div>

        <div class="mt-6">
          <Button
            type="submit"
            disabled={isSubmitting || !password.trim()}
            variant="primary"
            className="w-full"
          >
            {isSubmitting ? 'Unlocking...' : 'Ok'}
          </Button>
        </div>

        <div class="mt-4 text-right">
          <Button
            type="button"
            onClick={handleForgotPasswordClick}
            disabled={isSubmitting}
            variant="link"
            className="text-sm"
          >
            I don't remember my password
          </Button>
        </div>
      </form>
    </Modal>
  );
}
