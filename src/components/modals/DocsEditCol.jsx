import { useState, useEffect } from 'preact/hooks';
import { Modal } from '../common/Modal';
import { MarkdownPreview } from '../common/MarkdownPreview';

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

  useEffect(() => {
    if (isOpen) {
      setName(initialName);
      setMarkdown(initialMarkdown);
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
          <p class="text-sm text-gray-500 mb-4">
            {subtitle}
          </p>

          {/* Name Field */}
          <div class="mb-4">
            <label class="block text-sm font-medium text-gray-700 mb-1">Name</label>
            <input
              type="text"
              value={name}
              onInput={(e) => setName(e.target.value)}
              disabled={isSaving}
              class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
              placeholder="Collection name..."
            />
          </div>

          {/* Description Field with Markdown Preview */}
          <div class="mb-4">
            <label class="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <div class="grid grid-cols-2 gap-4">
              {/* Textarea */}
              <div>
                <textarea
                  value={markdown}
                  onInput={handleMarkdownChange}
                  disabled={isSaving}
                  class="w-full h-64 resize-none rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                  placeholder="Enter markdown description..."
                />
              </div>
              {/* Preview */}
              <div class="h-64 overflow-y-auto rounded-md border border-gray-300 px-3 py-2 bg-gray-50">
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
          <button
            type="submit"
            disabled={isSaving}
            class="inline-flex w-full justify-center rounded-md bg-sky-500 px-3 py-2 text-sm font-semibold text-white hover:bg-sky-400 sm:ml-3 sm:w-auto cursor-pointer disabled:opacity-75 disabled:cursor-not-allowed"
          >
            {isSaving ? (
              <div class="flex items-center">
                <svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>Saving...</span>
              </div>
            ) : (
              'Save'
            )}
          </button>
          <button
            type="button"
            onClick={handleClose}
            disabled={isSaving}
            class="mt-3 inline-flex w-full justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 sm:mt-0 sm:w-auto cursor-pointer disabled:opacity-50"
          >
            Cancel
          </button>
        </div>
      </form>
    </Modal>
  );
}
