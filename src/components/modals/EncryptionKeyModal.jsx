import { useState, useEffect, useRef } from 'preact/hooks';
import { Portal } from '../common/Portal';
import { setupEncryptionKey } from '../../utils/encryption';

export function EncryptionKeyModal({ isOpen, onClose, onSuccess, message = "Please enter your password to access encrypted environment secrets." }) {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [isNewPassword, setIsNewPassword] = useState(false);
  const passwordInputRef = useRef();

  // Initialize form when modal opens
  useEffect(() => {
    if (isOpen) {
      setPassword('');
      setConfirmPassword('');
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

    if (isNewPassword && password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (isNewPassword && password.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await setupEncryptionKey(password);
      
      if (onSuccess) {
        onSuccess();
      }
      
      onClose();
    } catch (error) {
      console.error('Failed to setup encryption key:', error);
      setError('Failed to setup encryption key. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setError(null);
      setPassword('');
      setConfirmPassword('');
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
                    <div class="mx-auto flex w-12 h-12 flex-shrink-0 items-center justify-center rounded-full bg-yellow-100 sm:mx-0 sm:w-10 sm:h-10 mb-4">
                      <svg class="w-6 h-6 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
                      </svg>
                    </div>
                    
                    <h3 class="text-base font-semibold text-gray-900">Encryption Key Required</h3>
                    <div class="mt-2 text-sm text-gray-500">{message}</div>

                    {error && (
                      <div class="mt-2 text-sm text-red-600 bg-red-100 p-2 rounded-md">
                        {error}
                      </div>
                    )}

                    <div class="mt-6">
                      <input
                        ref={passwordInputRef}
                        type="password"
                        placeholder="Enter your password"
                        class="block w-full rounded-md px-3 py-1.5 text-gray-900 outline focus:outline-2 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus:-outline-offset-2 focus:outline-sky-500 text-sm/6"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        disabled={isSubmitting}
                        required
                      />
                    </div>

                    {isNewPassword && (
                      <div class="mt-4">
                        <input
                          type="password"
                          placeholder="Confirm your password"
                          class="block w-full rounded-md px-3 py-1.5 text-gray-900 outline focus:outline-2 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus:-outline-offset-2 focus:outline-sky-500 text-sm/6"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          disabled={isSubmitting}
                          required
                        />
                      </div>
                    )}

                    <div class="mt-4">
                      <label class="flex items-center">
                        <input
                          type="checkbox"
                          checked={isNewPassword}
                          onChange={(e) => setIsNewPassword(e.target.checked)}
                          disabled={isSubmitting}
                          class="h-4 w-4 text-sky-600 focus:ring-sky-500 border-gray-300 rounded"
                        />
                        <span class="ml-2 text-sm text-gray-700">
                          This is a new password (I haven't set up encryption before)
                        </span>
                      </label>
                    </div>

                    <div class="mt-6 sm:mt-4 sm:flex sm:flex-row-reverse">
                      <button
                        type="submit"
                        disabled={isSubmitting}
                        class="inline-flex w-full justify-center rounded-md bg-sky-500 px-3 py-2 text-sm font-semibold text-white hover:bg-sky-400 disabled:bg-sky-300 disabled:cursor-not-allowed sm:ml-3 sm:w-auto cursor-pointer"
                      >
                        {isSubmitting ? 'Setting up...' : 'Unlock'}
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