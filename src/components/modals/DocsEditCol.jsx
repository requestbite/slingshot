import { useState, useEffect, useRef } from 'preact/hooks';
import { Modal } from '../common/Modal';
import { MarkdownPreview } from '../common/MarkdownPreview';
import { TextInput } from '../common/TextInput';
import { Label } from '../common/Label';
import { Button } from '../common/Button';

export function DocsEditCol({
  isOpen,
  onClose,
  onSave,
  initialMarkdown = '',
  initialName = '',
  title = 'Edit Collection',
  subtitle = 'Edit the collection details below.'
}) {
  const [name, setName] = useState(initialName);
  const [markdown, setMarkdown] = useState(initialMarkdown);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(null);
  const nameInputRef = useRef();

  useEffect(() => {
    if (isOpen) {
      setName(initialName);
      setMarkdown(initialMarkdown);

      // Auto-focus on name input
      setTimeout(() => {
        if (nameInputRef.current) {
          nameInputRef.current.focus();
        }
      }, 100);
    }
  }, [isOpen, initialMarkdown, initialName]);

  const handleMarkdownChange = (e) => {
    setMarkdown(e.target.value);
  };

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);

    try {
      if (onSave) {
        // Default to "Untitled collection" if name is empty or just whitespace
        const finalName = name.trim() || 'Untitled collection';
        await onSave({ name: finalName, markdown });
      }
      onClose();
    } catch (err) {
      console.error('Failed to update collection:', err);
      setError('Failed to update collection. Please try again.');
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
    <Modal isOpen={isOpen} onClose={handleClose} title={title} size="xl">
      <form onSubmit={(e) => { e.preventDefault(); handleSave(); }}>
        <div class="mt-2">
          <p class="text-sm text-gray-500 dark:text-neutral-dark-500 mb-4 text-center sm:text-left">
            {subtitle}
          </p>

          {/* Name Field */}
          <div class="mb-4">
            <Label htmlFor="collection-name">Name</Label>
            <TextInput
              ref={nameInputRef}
              id="collection-name"
              value={name}
              onInput={(e) => setName(e.target.value)}
              disabled={isSaving}
              placeholder="Collection name..."
            />
          </div>

          {/* Description Field with Markdown Preview */}
          <div class="mb-4">
            <Label htmlFor="collection-description">Description</Label>
            <div class="grid grid-cols-2 gap-4">
              {/* Textarea */}
              <div>
                <TextInput
                  id="collection-description"
                  type="textarea"
                  value={markdown}
                  onInput={handleMarkdownChange}
                  disabled={isSaving}
                  placeholder="Enter markdown description..."
                  className="h-64 resize-none"
                  rows={16}
                />
              </div>
              {/* Preview */}
              <div class="h-64 overflow-hidden rounded-md border border-gray-300 dark:border-neutral-dark-50 px-3 py-2 bg-gray-50 dark:bg-[#282a36]">
                <MarkdownPreview markdown={markdown} />
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
