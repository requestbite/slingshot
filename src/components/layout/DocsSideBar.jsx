import { useState } from 'preact/hooks';
import { MarkdownPreview } from '../common/MarkdownPreview';
import { MarkdownModal } from '../modals/MarkdownModal';
import { useAppContext } from '../../hooks/useAppContext';
import { apiClient } from '../../api';
import { getMethodColor } from '../../utils/httpMethods';

export function DocsSideBar({ onClose: _onClose }) {
  const { selectedCollection, selectedRequest, loadCollections } = useAppContext();
  const [showMarkdownModal, setShowMarkdownModal] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  const handleEditDescription = async (newDescription) => {
    if (!selectedCollection?.id) return;

    setIsUpdating(true);
    try {
      await apiClient.updateCollection(selectedCollection.id, {
        description: newDescription
      });

      // Refresh collections to get updated data
      await loadCollections();
    } catch (error) {
      console.error('Failed to update collection description:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <>
      {/* Documentation Sidebar */}
      <aside class="bg-white rounded-lg md:border border-gray-300 h-full">
        <div class="flex grow flex-col gap-y-5 overflow-y-auto p-4">
          <nav class="flex flex-1 flex-col space-y-4">
            {selectedRequest ? (
              <>
                {/* Request Header */}
                <div class="flex items-center gap-2">
                  <span class={`text-[10px]/[12px] text-white py-0.5 px-1 rounded flex-shrink-0 ${getMethodColor(selectedRequest.method)}`}>
                    {selectedRequest.method}
                  </span>
                  <h2 class="text-sm font-medium text-gray-900 truncate" title={selectedRequest.name || selectedRequest.url || 'Untitled Request'}>
                    {selectedRequest.name || selectedRequest.url || 'Untitled Request'}
                  </h2>
                </div>

                {/* Request Documentation Placeholder */}
                <div class="flex-1 min-h-0">
                  <div class="text-left text-gray-500 italic text-sm">
                    Request documentation will be available here in future updates.
                  </div>
                </div>
              </>
            ) : selectedCollection ? (
              <>
                {/* Collection Header */}
                <div class="flex items-center justify-between">
                  <h2 class="text-sm font-medium text-gray-900 truncate" title={selectedCollection.name}>
                    {selectedCollection.name}
                  </h2>
                </div>

                {/* Edit Button */}
                <button
                  onClick={() => setShowMarkdownModal(true)}
                  disabled={isUpdating}
                  class="w-full cursor-pointer rounded-md px-3 py-2 text-xs focus-visible:outline focus-visible:outline-offset-2 focus-visible:outline-sky-500 bg-sky-100 hover:bg-sky-200 text-sky-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M12 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                    <path d="M18.375 2.625a1 1 0 0 1 3 3l-9.013 9.014a2 2 0 0 1-.853.505l-2.873.84a.5.5 0 0 1-.62-.62l.84-2.873a2 2 0 0 1 .506-.852z" />
                  </svg>
                  {isUpdating ? 'Updating...' : 'Edit Documentation'}
                </button>

                {/* Collection Documentation */}
                <div class="flex-1 min-h-0">
                  {selectedCollection.description && selectedCollection.description.trim() ? (
                    <div class="text-left">
                      <MarkdownPreview markdown={selectedCollection.description} />
                    </div>
                  ) : (
                    <div class="text-left text-gray-500 italic text-sm">
                      No documentation provided for this collection.
                    </div>
                  )}
                </div>
              </>
            ) : (
              <>
                {/* Default Header */}
                <div class="flex items-center justify-between">
                  <h2 class="text-sm font-medium text-gray-900">Documentation</h2>
                </div>

                {/* Placeholder content */}
                <div class="space-y-4">
                  <div class="text-sm text-gray-600">
                    <p class="mb-3">Collection documentation will appear here when you select a collection.</p>

                    <div class="space-y-2">
                      <div class="p-3 bg-gray-50 rounded-md">
                        <h3 class="text-xs font-medium text-gray-700 mb-1">Collection Info</h3>
                        <p class="text-xs text-gray-500">Collection description and documentation will be displayed here.</p>
                      </div>

                      <div class="p-3 bg-gray-50 rounded-md">
                        <h3 class="text-xs font-medium text-gray-700 mb-1">API Documentation</h3>
                        <p class="text-xs text-gray-500">Markdown-formatted documentation for your API collection.</p>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}
          </nav>
        </div>
      </aside>

      {/* Markdown Modal - only for collections, not requests */}
      {selectedCollection && !selectedRequest && (
        <MarkdownModal
          key={`${selectedCollection.id}-${showMarkdownModal}`}
          isOpen={showMarkdownModal}
          onClose={() => setShowMarkdownModal(false)}
          onSave={handleEditDescription}
          initialMarkdown={selectedCollection.description || ''}
          title="Edit Collection Documentation"
          subtitle="Update the documentation for this collection using CommonMark Markdown."
        />
      )}
    </>
  );
}