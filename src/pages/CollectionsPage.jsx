import { useState, useEffect, useRef } from 'preact/hooks';
import { useLocation } from 'wouter-preact';
import { AddCollectionModal } from '../components/modals/AddCollectionModal';
import { DeleteCollectionModal } from '../components/modals/DeleteCollectionModal';
import { ContextMenu } from '../components/common/ContextMenu';
import { Toast, useToast } from '../components/common/Toast';
import { useAppContext } from '../hooks/useAppContext';
import { apiClient } from '../api';

export function CollectionsPage() {
  const [, setLocation] = useLocation();
  const { collections, loadCollections, selectCollection } = useAppContext();
  const [collectionsWithCounts, setCollectionsWithCounts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedCollection, setSelectedCollection] = useState(null);
  const [contextMenuOpen, setContextMenuOpen] = useState(false);
  const [contextMenuTrigger, setContextMenuTrigger] = useState(null);
  const [contextMenuCollection, setContextMenuCollection] = useState(null);
  const [isToastVisible, showToast, hideToast] = useToast();
  const [toastMessage, setToastMessage] = useState('');

  useEffect(() => {
    loadCollectionsWithCounts();
  }, []);

  const loadCollectionsWithCounts = async () => {
    try {
      setIsLoading(true);

      // Load collections directly (don't depend on context)
      const allCollections = await apiClient.getAllCollections();

      const collectionsData = await Promise.all(
        allCollections.map(async (collection) => {
          try {
            // Get request count
            const requests = await apiClient.getRequestsByCollection(collection.id);
            const requestCount = requests.length;

            // Get secret count
            const secrets = await apiClient.getSecretsByCollection(collection.id);
            const secretCount = secrets.length;

            return {
              ...collection,
              request_count: requestCount,
              secret_count: secretCount
            };
          } catch (error) {
            console.error(`Error loading counts for collection ${collection.id}:`, error);
            return {
              ...collection,
              request_count: 0,
              secret_count: 0
            };
          }
        })
      );

      // Sort by name
      collectionsData.sort((a, b) => a.name.localeCompare(b.name));
      setCollectionsWithCounts(collectionsData);

      // Also update the context collections for consistency
      await loadCollections();

    } catch (error) {
      console.error('Failed to load collections:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenInAPIClient = () => {
    if (contextMenuCollection) {
      selectCollection(contextMenuCollection);
      setLocation(`/${contextMenuCollection.id}`);
    }
  };

  const handleEditCollection = (collection = null) => {
    const targetCollection = collection || contextMenuCollection;
    if (targetCollection) {
      setLocation(`/collections/${targetCollection.id}`);
    }
  };

  const handleDeleteCollection = () => {
    if (contextMenuCollection) {
      setSelectedCollection(contextMenuCollection);
      setShowDeleteModal(true);
    }
  };

  const handleContextMenuOpen = (e, collection) => {
    e.stopPropagation();
    setContextMenuTrigger(e.currentTarget);
    setContextMenuCollection(collection);
    setContextMenuOpen(true);
  };

  const handleContextMenuClose = () => {
    setContextMenuOpen(false);
    setContextMenuTrigger(null);
    setContextMenuCollection(null);
  };

  const handleDeleteSuccess = async () => {
    await loadCollectionsWithCounts();
    setToastMessage('Collection deleted successfully');
    showToast();
  };

  const handleCreateSuccess = async (collection) => {
    await loadCollectionsWithCounts();
    setToastMessage('Collection created successfully');
    showToast();
  };

  const showNotification = (message) => {
    setToastMessage(message);
    showToast();
  };

  const copyToClipboard = async (text, message) => {
    try {
      await navigator.clipboard.writeText(text);
      showNotification(message);
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
    }
  };


  return (
    <div class="h-full bg-gray-100 overflow-y-auto">
      <div class="min-h-full pt-[83px] pb-6">
        {/* Main Container */}
        <div class="max-w-4xl mx-auto px-4">
          <div class="bg-white rounded-lg border border-gray-300">
            {/* Header Section */}
            <div class="sm:flex sm:items-start p-6">
              <div class="sm:flex-auto">
                <h1 class="text-base/7 font-semibold text-gray-900">
                  Collections
                </h1>
                <p class="mt-1 text-sm/6 text-gray-600">
                  Manage your collections.
                </p>
              </div>
              <div class="mt-4 sm:ml-16 sm:mt-0 sm:flex-none">
                <button
                  onClick={() => setShowAddModal(true)}
                  type="button"
                  class="cursor-pointer block rounded-md bg-sky-500 px-3 py-2 text-center text-sm font-semibold text-white hover:bg-sky-400 focus-visible:outline-offset-2 focus-visible:outline-sky-500"
                >
                  Add Collection
                </button>
              </div>
            </div>

            {/* Content Section */}
            <div class="p-0 pt-6 sm:p-6">
              {isLoading ? (
                <div class="flex items-center justify-center p-8">
                  <div class="flex items-center space-x-3 text-gray-500">
                    <svg class="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    <span>Loading collections...</span>
                  </div>
                </div>
              ) : collectionsWithCounts.length === 0 ? (
                <p class="px-6 sm:p-0">No collections found.</p>
              ) : (
                <table class="w-full table-fixed divide-y divide-gray-300">
                  <thead>
                    <tr>
                      <th scope="col" class="w-auto py-3.5 pl-6 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-0">
                        <div class="truncate">Name</div>
                      </th>
                      <th scope="col" class="hidden sm:table-cell w-26 py-3.5 pl-6 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-0">
                        <div class="truncate">Requests</div>
                      </th>
                      <th scope="col" class="hidden sm:table-cell w-26 py-3.5 pl-6 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-0">
                        <div class="truncate">Variables</div>
                      </th>
                      <th scope="col" class="table-cell w-20 pl-3 pr-6 py-3.5 sm:pr-0 text-right text-sm font-semibold text-gray-900">
                        <div>Actions</div>
                      </th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-gray-200">
                    {collectionsWithCounts.map((collection) => (
                      <tr key={collection.id}>
                        <td class="py-4 pl-6 pr-3 text-sm sm:pl-0">
                          <div class="truncate">
                            <a href="#" onClick={(e) => { e.preventDefault(); handleEditCollection(collection); }} class="text-sky-500 hover:text-sky-700 hover:underline block truncate">
                              {collection.name}
                            </a>
                          </div>
                        </td>
                        <td class="hidden sm:table-cell py-4 pl-6 pr-3 text-sm sm:pl-0">
                          <div class="truncate">
                            {collection.request_count}
                          </div>
                        </td>
                        <td class="hidden sm:table-cell py-4 pl-6 pr-3 text-sm sm:pl-0">
                          <div class="truncate">
                            {collection.secret_count}
                          </div>
                        </td>
                        <td class="table-cell py-4 pl-3 pr-6 text-right text-sm sm:pr-0">
                          <div class="flex justify-end">
                            <button
                              onClick={(e) => handleContextMenuOpen(e, collection)}
                              type="button"
                              class="cursor-pointer inline-flex items-center text-sky-500 hover:text-sky-700 hover:underline flex-shrink-0"
                              id={`collection-menu-button-${collection.id}`}
                              aria-expanded="false"
                              aria-haspopup="true"
                            >
                              <span class="sr-only">Open options menu for {collection.name}</span>
                              <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <circle cx="12" cy="12" r="1" />
                                <circle cx="19" cy="12" r="1" />
                                <circle cx="5" cy="12" r="1" />
                              </svg>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Toast Notification */}
      <Toast
        message={toastMessage}
        isVisible={isToastVisible}
        onClose={hideToast}
        type="success"
      />

      {/* Context Menu */}
      <ContextMenu
        isOpen={contextMenuOpen}
        onClose={handleContextMenuClose}
        trigger={contextMenuTrigger}
        items={[
          {
            label: 'Open in API client',
            onClick: handleOpenInAPIClient
          },
          { divider: true },
          {
            label: 'Edit collection',
            onClick: () => handleEditCollection()
          },
          {
            label: 'Delete collection ...',
            onClick: handleDeleteCollection
          }
        ]}
      />

      {/* Add Collection Modal */}
      <AddCollectionModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSuccess={handleCreateSuccess}
      />

      {/* Delete Collection Modal */}
      <DeleteCollectionModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        collection={selectedCollection}
        onDelete={handleDeleteSuccess}
      />
    </div>
  );
}
