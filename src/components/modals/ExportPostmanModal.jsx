import { useState } from 'preact/hooks';
import { PostmanExporter } from '../../utils/PostmanExporter';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';

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
          <Button
            type="submit"
            disabled={isExporting}
            loading={isExporting}
            variant="primary"
            size="md"
            className="w-full sm:ml-3 sm:w-auto"
          >
            Export
          </Button>
          <Button
            type="button"
            onClick={handleClose}
            disabled={isExporting}
            variant="secondary"
            size="md"
            className="mt-3 w-full sm:mt-0 sm:w-auto"
          >
            Cancel
          </Button>
        </div>
      </form>
    </Modal>
  );
}
