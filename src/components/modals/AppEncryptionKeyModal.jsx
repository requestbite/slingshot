import { useState, useEffect, useRef } from 'preact/hooks';
import { Portal } from '../common/Portal';
import { setupEncryptionKey, verifyPassword } from '../../utils/encryption';

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

      // Lock body scroll and hide scrollbars to prevent background scrolling
      const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
      document.body.style.overflow = 'hidden';
      document.body.style.paddingRight = `${scrollbarWidth}px`;

      // Auto-focus on password input
      setTimeout(() => {
        if (passwordInputRef.current) {
          passwordInputRef.current.focus();
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

      // If password is valid, set up the encryption key
      await setupEncryptionKey(password);
      
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
      const inputs = document.querySelectorAll('input[type="password"]');
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
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 99999 }}>
      <div class="relative z-[80]" role="dialog" aria-modal="true" style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 99999,
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
          zIndex: 99999,
          WebkitOverflowScrolling: 'touch'
        }}>
          <div class="flex min-h-full items-center justify-center p-4 text-center sm:items-center sm:p-0">
            <div
              class="relative transform overflow-hidden rounded-lg bg-white px-4 pb-4 pt-5 text-left shadow-xl transition-all sm:my-8 w-full sm:max-w-lg sm:p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <div>
                <form onSubmit={handleSubmit}>
                  <div class="text-center mt-0 sm:text-left">
                    <h3 class="text-base font-semibold text-gray-900">Encryption key</h3>
                    <div class="mt-2 text-sm text-gray-500">
                      You have {environmentCount} environment{environmentCount !== 1 ? 's' : ''} with a total of {secretCount} secret{secretCount !== 1 ? 's' : ''}. To decrypt these secrets, and create new, you must provide your environment password below.
                    </div>

                    <div class="mt-6">
                      <label for="app-password" class="block text-sm font-medium text-gray-700 mb-1">Password</label>
                      <input
                        ref={passwordInputRef}
                        id="app-password"
                        type="password"
                        placeholder="Enter your password"
                        class="block w-full rounded-md px-3 py-1.5 text-gray-900 outline focus:outline-2 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus:-outline-offset-2 focus:outline-sky-500 text-sm/6"
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
                      <button
                        type="submit"
                        disabled={isSubmitting || !password.trim()}
                        class="inline-flex w-full justify-center rounded-md bg-sky-500 px-3 py-2 text-sm font-semibold text-white hover:bg-sky-400 disabled:bg-sky-300 disabled:cursor-not-allowed cursor-pointer"
                      >
                        {isSubmitting ? 'Unlocking...' : 'Ok'}
                      </button>
                    </div>

                    <div class="mt-4 text-right">
                      <button
                        type="button"
                        onClick={handleForgotPasswordClick}
                        disabled={isSubmitting}
                        class="text-sm text-sky-600 hover:text-sky-500 hover:underline cursor-pointer disabled:opacity-50"
                      >
                        I don't remember my password
                      </button>
                    </div>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}