import { useState } from 'preact/hooks';
import { PostmanExporter } from '../../utils/PostmanExporter';
import { Modal } from '../common/Modal';

export function ExportPostmanModal({ isOpen, onClose, collection }) {
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState(null);

  const handleExport = async () => {
    if (!collection) return;

    setIsExporting(true);
    setError(null);

    try {
      const postmanCollection = await PostmanExporter.exportCollection(collection.id);

      // Create and download the file
      const blob = new Blob([JSON.stringify(postmanCollection, null, 2)], {
        type: 'application/json'
      });

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${collection.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.postman_collection.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      onClose();
    } catch (error) {
      console.error('Failed to export collection:', error);
      setError('Failed to export collection. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleClose = () => {
    if (!isExporting) {
      setError(null);
      onClose();
    }
  };

  if (!collection) return null;

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Export collection" size="md">
      <form onSubmit={(e) => { e.preventDefault(); handleExport(); }}>
        <div>
          <p class="text-sm text-gray-500">
            Download the current collection in Postman Collection v2.1 format that can be used by supported API clients.
          </p>
          {error && (
            <div class="mt-2 text-sm text-red-600">
              {error}
            </div>
          )}
        </div>
        <div class="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
          <button
            type="submit"
            disabled={isExporting}
            class="inline-flex w-full justify-center rounded-md bg-sky-500 px-3 py-2 text-sm font-semibold text-white hover:bg-sky-400 disabled:bg-sky-300 disabled:cursor-not-allowed sm:ml-3 sm:w-auto cursor-pointer"
          >
            {isExporting ? (
              <div class="flex items-center">
                <svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>Exporting...</span>
              </div>
            ) : (
              'Export'
            )}
          </button>
          <button
            type="button"
            onClick={handleClose}
            disabled={isExporting}
            class="mt-3 inline-flex w-full justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 sm:mt-0 sm:w-auto cursor-pointer disabled:opacity-50"
          >
            Cancel
          </button>
        </div>
      </form>
    </Modal>
  );
}
