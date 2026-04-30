import { useState, useEffect, useRef } from 'preact/hooks';
import { Modal } from '../common/Modal';
import { MarkdownPreview } from '../common/MarkdownPreview';
import { TextInput } from '../common/TextInput';
import { Label } from '../common/Label';
import { Button } from '../common/Button';

export function DocsEditIntroModal({ isOpen, onClose, request, onSave }) {
  // Initialize field values from request
  const [name, setName] = useState(request?.name || '');
  const [summary, setSummary] = useState(request?.summary || '');
  const [description, setDescription] = useState(request?.description || '');

  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(null);
  const nameInputRef = useRef();

  useEffect(() => {
    if (isOpen) {
      // Auto-focus on name input
      setTimeout(() => {
        if (nameInputRef.current) {
          nameInputRef.current.focus();
        }
      }, 100);
    }
  }, [isOpen]);

  const handleSave = async () => {
    if (!request) return;

    setIsSaving(true);
    setError(null);

    try {
      // Build updates object - null for empty fields
      const updates = {
        name: name.trim() ? name : null,
        summary: summary.trim() ? summary : null,
        description: description.trim() ? description : null
      };

      if (onSave) {
        await onSave(updates);
      }

      onClose();
    } catch (err) {
      console.error('Failed to update intro:', err);
      setError('Failed to update intro. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleClose = () => {
    if (!isSaving) {
      setError(null);
      onClose();
    }
  };

  return (
    <Modal isOpen={isOpen && !!request} onClose={handleClose} title="Edit intro" size="xl">
      <form onSubmit={(e) => { e.preventDefault(); handleSave(); }}>
        <div class="mt-2">
          <p class="text-sm text-gray-500 dark:text-neutral-dark-500 mb-4 text-center sm:text-left">
            Edit the introductory details for this request.
          </p>

          {/* Name Field */}
          <div class="mb-4">
            <Label htmlFor="request-name">Name</Label>
            <TextInput
              ref={nameInputRef}
              id="request-name"
              value={name}
              onInput={(e) => setName(e.target.value)}
              disabled={isSaving}
              placeholder="Request name..."
            />
          </div>

          {/* Summary Field */}
          <div class="mb-4">
            <Label htmlFor="request-summary">Summary</Label>
            <TextInput
              id="request-summary"
              value={summary}
              onInput={(e) => setSummary(e.target.value)}
              disabled={isSaving}
              placeholder="Brief summary..."
            />
          </div>

          {/* Description Field with Markdown Preview */}
          <div class="mb-4">
            <Label htmlFor="request-description">Description</Label>
            <div class="grid grid-cols-2 gap-4">
              {/* Textarea */}
              <div>
                <TextInput
                  id="request-description"
                  type="textarea"
                  value={description}
                  onInput={(e) => setDescription(e.target.value)}
                  disabled={isSaving}
                  placeholder="Enter markdown description..."
                  className="h-48 resize-none"
                />
              </div>
              {/* Preview */}
              <div class="h-48 overflow-hidden rounded-md border border-gray-300 dark:border-neutral-dark-50 px-3 py-2 bg-gray-50 dark:bg-[#282a36]">
                <MarkdownPreview markdown={description} />
              </div>
            </div>
          </div>
        </div>

        {error && (
          <div class="mt-3 text-sm text-red-600">
            {error}
          </div>
        )}

        <div class="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
          <Button
            type="submit"
            disabled={isSaving}
            loading={isSaving}
            variant="primary"
            className="w-full sm:ml-3 sm:w-auto"
          >
            Save
          </Button>
          <Button
            type="button"
            onClick={handleClose}
            disabled={isSaving}
            variant="secondary"
            className="mt-3 w-full sm:mt-0 sm:w-auto"
          >
            Cancel
          </Button>
        </div>
      </form>
    </Modal>
  );
}
