import { useState } from 'preact/hooks';
import { Modal } from '../common/Modal';
import { MarkdownPreview } from '../common/MarkdownPreview';

export function DocsEditIntroModal({ isOpen, onClose, request, onSave }) {
  // Initialize field values from request
  const [name, setName] = useState(request?.name || '');
  const [summary, setSummary] = useState(request?.summary || '');
  const [description, setDescription] = useState(request?.description || '');

  // Initialize enable flags - enabled if field has data
  const [enableName, setEnableName] = useState(Boolean(request?.name));
  const [enableSummary, setEnableSummary] = useState(Boolean(request?.summary));
  const [enableDescription, setEnableDescription] = useState(Boolean(request?.description));

  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(null);

  const handleSave = async () => {
    if (!request) return;

    setIsSaving(true);
    setError(null);

    try {
      // Build updates object - null for disabled fields
      const updates = {
        name: enableName ? name : null,
        summary: enableSummary ? summary : null,
        description: enableDescription ? description : null
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
          <p class="text-sm text-gray-500 mb-4">
            Edit the introductory details for this request.
          </p>

          {/* Name Field */}
          <div class="mb-4">
            <label class="block text-sm font-medium text-gray-700 mb-1">Name</label>
            <input
              type="text"
              value={name}
              onInput={(e) => setName(e.target.value)}
              disabled={!enableName || isSaving}
              class={`w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500 ${!enableName ? 'opacity-50 cursor-not-allowed bg-gray-50' : ''
                }`}
              placeholder="Request name..."
            />
            <label class="flex items-center mt-2 text-xs text-gray-600 cursor-pointer">
              <input
                type="checkbox"
                checked={enableName}
                onChange={(e) => setEnableName(e.target.checked)}
                disabled={isSaving}
                class="mr-2 text-sky-600 focus:ring-sky-500 cursor-pointer"
              />
              Enable field
            </label>
          </div>

          {/* Summary Field */}
          <div class="mb-4">
            <label class="block text-sm font-medium text-gray-700 mb-1">Summary</label>
            <input
              type="text"
              value={summary}
              onInput={(e) => setSummary(e.target.value)}
              disabled={!enableSummary || isSaving}
              class={`w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500 ${!enableSummary ? 'opacity-50 cursor-not-allowed bg-gray-50' : ''
                }`}
              placeholder="Brief summary..."
            />
            <label class="flex items-center mt-2 text-xs text-gray-600 cursor-pointer">
              <input
                type="checkbox"
                checked={enableSummary}
                onChange={(e) => setEnableSummary(e.target.checked)}
                disabled={isSaving}
                class="mr-2 text-sky-600 focus:ring-sky-500 cursor-pointer"
              />
              Enable field
            </label>
          </div>

          {/* Description Field with Markdown Preview */}
          <div class="mb-4">
            <label class="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <div class="grid grid-cols-2 gap-4 mb-2">
              {/* Textarea */}
              <div>
                <textarea
                  value={description}
                  onInput={(e) => setDescription(e.target.value)}
                  disabled={!enableDescription || isSaving}
                  class={`w-full h-48 resize-none rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500 ${!enableDescription ? 'opacity-50 cursor-not-allowed bg-gray-50' : ''
                    }`}
                  placeholder="Enter markdown description..."
                />
              </div>
              {/* Preview */}
              <div class={`h-48 overflow-y-auto rounded-md border border-gray-300 px-3 py-2 bg-gray-50 ${!enableDescription ? 'opacity-50' : ''
                }`}>
                <MarkdownPreview markdown={description} />
              </div>
            </div>
            <label class="flex items-center mt-2 text-xs text-gray-600 cursor-pointer">
              <input
                type="checkbox"
                checked={enableDescription}
                onChange={(e) => setEnableDescription(e.target.checked)}
                disabled={isSaving}
                class="mr-2 text-sky-600 focus:ring-sky-500 cursor-pointer"
              />
              Enable field
            </label>
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
