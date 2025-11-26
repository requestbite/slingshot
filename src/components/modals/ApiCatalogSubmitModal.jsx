import { useState, useEffect, useRef } from 'preact/hooks';
import { useLocation } from 'wouter-preact';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { TextInput } from '../common/TextInput';
import { Label } from '../common/Label';

export function ApiCatalogSubmitModal({ isOpen, onClose, imageFile }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [email, setEmail] = useState('');
  const [, setLocation] = useLocation();
  const emailInputRef = useRef(null);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setLoading(false);
      setError(null);
      setEmail('');

      // Focus email input after a short delay to ensure modal is rendered
      setTimeout(() => {
        if (emailInputRef.current) {
          emailInputRef.current.focus();
        }
      }, 100);
    }
  }, [isOpen]);

  // Simple email validation
  const isValidEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  // Handle API proposal submission
  const handleSubmit = async () => {
    setLoading(true);
    setError(null);

    try {
      // Get draft entry from localStorage
      const draftEntry = localStorage.getItem('api-catalog-draft-entry');
      if (!draftEntry) {
        throw new Error('No draft entry found. Please go back and try again.');
      }

      const formData = JSON.parse(draftEntry);

      // Create FormData for multipart/form-data submission
      const formDataToSend = new FormData();

      // Add name field
      formDataToSend.append('name', formData.name);

      // Create metadata object matching backend ProposalMetadata structure
      const metadata = {
        name: formData.name,
        version: formData.version,
        url: formData.url,
        provider: formData.provider,
        serviceName: formData.serviceName,
        categories: formData.categories,
        source: formData.source,
        description: formData.description || null,
        urlExtDoc: formData.urlExtDoc || null,
        region: formData.region || null
      };

      // Add metadata as JSON string
      formDataToSend.append('metadata', JSON.stringify(metadata));

      // Add image file if provided
      if (imageFile) {
        formDataToSend.append('image', imageFile);
      }

      // Add email
      formDataToSend.append('email', email);

      // Submit to backend API
      const response = await fetch(
        `${import.meta.env.VITE_CATALOG_API}/v1/apis/propose`,
        {
          method: 'POST',
          body: formDataToSend
          // Note: Don't set Content-Type header - browser will set it with boundary
        }
      );

      if (!response.ok) {
        // Try to get error message from response
        let errorMessage = `Submission failed with status ${response.status}`;
        try {
          const errorData = await response.json();
          if (errorData.message) {
            errorMessage = errorData.message;
          }
        } catch (e) {
          // If we can't parse JSON, use the default error message
        }
        throw new Error(errorMessage);
      }

      // Success! Clear the draft entry and redirect
      localStorage.removeItem('api-catalog-draft-entry');
      setLocation('/catalog?submitted=true');

    } catch (err) {
      console.error('API proposal submission error:', err);
      setError(err.message || 'An unexpected error occurred');
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      onClose();
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Submit to API catalog" size="md">
      <div class="text-sm text-gray-600 mb-6">
        By clicking the "Submit" button below, your API proposal will be submitted to the RequestBite API catalog for review.
      </div>

      {/* Email Input */}
      <div class="mb-6">
        <Label htmlFor="email" mandatory={true}>Your email</Label>
        <TextInput
          id="email"
          type="email"
          value={email}
          onInput={(e) => setEmail(e.target.value)}
          placeholder="your.email@example.com"
          disabled={loading}
          description="Get notified when your proposal has been reviewed."
          ref={emailInputRef}
        />
      </div>

      {/* Error Message */}
      {error && (
        <div class="mb-6 rounded-md bg-red-50 p-4">
          <div class="flex">
            <div class="flex-shrink-0">
              <svg class="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clip-rule="evenodd" />
              </svg>
            </div>
            <div class="ml-3">
              <p class="text-sm text-red-800">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Buttons */}
      <div class="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
        <Button
          onClick={handleSubmit}
          disabled={loading || !isValidEmail(email)}
          variant="primary"
          className="w-full sm:ml-3 sm:w-auto"
        >
          {loading ? 'Submitting...' : 'Submit'}
        </Button>
        <Button
          onClick={handleClose}
          disabled={loading}
          variant="secondary"
          className="mt-3 w-full sm:mt-0 sm:w-auto"
        >
          Cancel
        </Button>
      </div>
    </Modal>
  );
}
